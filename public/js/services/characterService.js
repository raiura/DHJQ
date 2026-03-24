/**
 * 角色服务 - 处理角色相关业务逻辑
 * @module Services/CharacterService
 * @description 角色CRUD、好感度管理、经历获取
 */

/**
 * 角色服务
 * @class CharacterService
 */
class CharacterService {
    /**
     * 获取所有角色
     * @param {Object} [params={}] - 查询参数
     * @param {boolean} [params.includeStats=false] - 是否包含统计
     * @returns {Promise<Array>}
     */
    static async getAll(params = {}) {
        try {
            const response = await API.get('/characters', params);
            
            // 合并本地存储的好感度数据
            const characters = response.data || response;
            return characters.map(char => this.mergeLocalData(char));
        } catch (error) {
            console.error('获取角色列表失败:', error);
            throw error;
        }
    }
    
    /**
     * 获取单个角色
     * @param {string} id - 角色ID
     * @returns {Promise<Object>}
     */
    static async getById(id) {
        try {
            const response = await API.get(`/characters/${id}`);
            return this.mergeLocalData(response.data || response);
        } catch (error) {
            console.error(`获取角色 ${id} 失败:`, error);
            throw error;
        }
    }
    
    /**
     * 创建角色
     * @param {Object} data - 角色数据
     * @returns {Promise<Object>}
     */
    static async create(data) {
        try {
            const response = await API.post('/characters', {
                ...data,
                favor: data.favor ?? 50,
                trust: data.trust ?? 50,
                stats: data.stats || {
                    mood: '平静',
                    encounters: 0,
                    dialogueTurns: 0
                }
            });
            
            // 初始化本地好感度
            this.saveLocalFavor(response.data?._id, {
                favor: response.data?.favor ?? 50,
                trust: response.data?.trust ?? 50
            });
            
            return response.data || response;
        } catch (error) {
            console.error('创建角色失败:', error);
            throw error;
        }
    }
    
    /**
     * 更新角色
     * @param {string} id - 角色ID
     * @param {Object} data - 更新数据
     * @returns {Promise<Object>}
     */
    static async update(id, data) {
        try {
            const response = await API.put(`/characters/${id}`, data);
            
            // 同步本地好感度
            if (data.favor !== undefined || data.trust !== undefined) {
                this.saveLocalFavor(id, {
                    favor: data.favor,
                    trust: data.trust
                });
            }
            
            return response.data || response;
        } catch (error) {
            console.error(`更新角色 ${id} 失败:`, error);
            throw error;
        }
    }
    
    /**
     * 删除角色
     * @param {string} id - 角色ID
     * @returns {Promise<void>}
     */
    static async delete(id) {
        try {
            await API.delete(`/characters/${id}`);
            // 清除本地数据
            this.clearLocalData(id);
        } catch (error) {
            console.error(`删除角色 ${id} 失败:`, error);
            throw error;
        }
    }
    
    /**
     * 获取角色经历
     * @param {string} id - 角色ID
     * @returns {Promise<Array>}
     */
    static async getExperiences(id) {
        try {
            const response = await API.get(`/characters/${id}/experiences`);
            return response.data || response || [];
        } catch (error) {
            console.error(`获取角色经历失败:`, error);
            return [];
        }
    }
    
    /**
     * 更新好感度
     * @param {string} id - 角色ID
     * @param {Object} changes - 变化值 {favor: number, trust: number}
     * @returns {Promise<Object>}
     */
    static async updateFavor(id, changes) {
        const current = this.getLocalFavor(id);
        const newFavor = Math.max(0, Math.min(100, current.favor + (changes.favor || 0)));
        const newTrust = Math.max(0, Math.min(100, current.trust + (changes.trust || 0)));
        
        // 本地更新（立即反馈）
        this.saveLocalFavor(id, { favor: newFavor, trust: newTrust });
        
        // 异步同步到服务器
        try {
            await this.update(id, { favor: newFavor, trust: newTrust });
        } catch (error) {
            console.warn('好感度同步失败，已保存到本地:', error);
        }
        
        return { favor: newFavor, trust: newTrust };
    }
    
    /**
     * 批量更新好感度
     * @param {Object} updates - { [characterId]: {favor, trust} }
     * @returns {Promise<void>}
     */
    static async batchUpdateFavor(updates) {
        const promises = Object.entries(updates).map(([id, changes]) => 
            this.updateFavor(id, changes)
        );
        await Promise.allSettled(promises);
    }
    
    /**
     * 修复角色图片
     * @returns {Promise<Array>}
     */
    static async fixImages() {
        try {
            const response = await API.post('/characters/fix-images');
            return response.data || response || [];
        } catch (error) {
            console.error('修复图片失败:', error);
            throw error;
        }
    }
    
    // ===== 本地数据管理 =====
    
    /**
     * 获取本地好感度数据
     * @param {string} id - 角色ID
     * @returns {Object}
     */
    static getLocalFavor(id) {
        const all = AppStores.favor.get('characters') || {};
        return all[id] || { favor: 50, trust: 50 };
    }
    
    /**
     * 保存本地好感度数据
     * @param {string} id - 角色ID
     * @param {Object} data - {favor, trust}
     */
    static saveLocalFavor(id, data) {
        const all = AppStores.favor.get('characters') || {};
        all[id] = { ...all[id], ...data, updatedAt: new Date().toISOString() };
        AppStores.favor.set('characters', all);
    }
    
    /**
     * 清除角色本地数据
     * @param {string} id - 角色ID
     */
    static clearLocalData(id) {
        const all = AppStores.favor.get('characters') || {};
        delete all[id];
        AppStores.favor.set('characters', all);
    }
    
    /**
     * 合并本地数据到角色对象
     * @private
     * @param {Object} character - 角色数据
     * @returns {Object}
     */
    static mergeLocalData(character) {
        if (!character?._id && !character?.id) return character;
        
        const id = character._id || character.id;
        const local = this.getLocalFavor(id);
        
        return {
            ...character,
            favor: local.favor ?? character.favor ?? 50,
            trust: local.trust ?? character.trust ?? 50,
            _localUpdatedAt: local.updatedAt
        };
    }
    
    // ===== 缓存管理 =====
    
    /**
     * 获取缓存的角色列表
     * @returns {Array|null}
     */
    static getCachedList() {
        return AppStores.game.get('cached_characters');
    }
    
    /**
     * 缓存角色列表
     * @param {Array} characters - 角色数组
     */
    static cacheList(characters) {
        AppStores.game.setWithExpiry('cached_characters', characters, 5 * 60 * 1000); // 5分钟过期
    }
    
    /**
     * 清除缓存
     */
    static clearCache() {
        AppStores.game.remove('cached_characters');
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CharacterService };
}
