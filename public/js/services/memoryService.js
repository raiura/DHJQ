/**
 * 记忆服务 - 处理记忆相关业务逻辑
 * @module Services/MemoryService
 * @description 记忆管理、分类、检索
 */

/**
 * 记忆服务
 * @class MemoryService
 */
class MemoryService {
    /**
     * 获取角色记忆
     * @param {string} characterId - 角色ID
     * @param {Object} [params={}] - 查询参数
     * @returns {Promise<Object>} {short, long, core, experiences}
     */
    static async getCharacterMemories(characterId, params = {}) {
        try {
            const [memories, experiences] = await Promise.all([
                this.getMemories(characterId, params),
                CharacterService.getExperiences(characterId)
            ]);
            
            // 按类型分类
            return {
                short: memories.filter(m => m.type === 'SHORT' || !m.type),
                long: memories.filter(m => m.type === 'LONG'),
                core: memories.filter(m => m.type === 'CORE'),
                experiences: experiences.map(e => ({
                    ...e,
                    type: 'EXPERIENCE'
                }))
            };
        } catch (error) {
            console.error('获取记忆失败:', error);
            return { short: [], long: [], core: [], experiences: [] };
        }
    }
    
    /**
     * 获取所有记忆
     * @param {string} characterId - 角色ID
     * @param {Object} params - 查询参数
     * @returns {Promise<Array>}
     */
    static async getMemories(characterId, params = {}) {
        try {
            const response = await API.get(`/memories/character/${characterId}`, params);
            return response.data || response || [];
        } catch (error) {
            // 如果API不可用，从本地获取
            return this.getLocalMemories(characterId);
        }
    }
    
    /**
     * 创建记忆
     * @param {Object} data - 记忆数据
     * @returns {Promise<Object>}
     */
    static async create(data) {
        try {
            const response = await API.post('/memories', {
                ...data,
                timestamp: new Date().toISOString()
            });
            
            // 同步到本地
            this.addLocalMemory(data.characterId, response.data || response);
            
            return response.data || response;
        } catch (error) {
            // 保存到本地作为备份
            this.addLocalMemory(data.characterId, data);
            throw error;
        }
    }
    
    /**
     * 更新记忆重要性
     * @param {string} id - 记忆ID
     * @param {number} importance - 重要性 (1-5)
     * @returns {Promise<Object>}
     */
    static async updateImportance(id, importance) {
        return API.put(`/memories/${id}/importance`, { importance });
    }
    
    /**
     * 归档记忆（短期→长期）
     * @param {string} id - 记忆ID
     * @returns {Promise<Object>}
     */
    static async archive(id) {
        return API.post(`/memories/${id}/archive`);
    }
    
    /**
     * 提升为核心记忆
     * @param {string} id - 记忆ID
     * @returns {Promise<Object>}
     */
    static async promoteToCore(id) {
        return API.post(`/memories/${id}/promote`);
    }
    
    /**
     * 删除记忆
     * @param {string} id - 记忆ID
     * @returns {Promise<void>}
     */
    static async delete(id) {
        return API.delete(`/memories/${id}`);
    }
    
    /**
     * 搜索记忆
     * @param {string} characterId - 角色ID
     * @param {string} keyword - 关键词
     * @returns {Promise<Array>}
     */
    static async search(characterId, keyword) {
        try {
            const response = await API.get('/memories/search', {
                characterId,
                keyword
            });
            return response.data || response || [];
        } catch (error) {
            // 本地搜索作为降级
            const all = this.getLocalMemories(characterId);
            return all.filter(m => 
                m.content?.includes(keyword) || 
                m.summary?.includes(keyword)
            );
        }
    }
    
    /**
     * 获取记忆统计
     * @param {string} characterId - 角色ID
     * @returns {Promise<Object>}
     */
    static async getStats(characterId) {
        try {
            const response = await API.get(`/memories/character/${characterId}/stats`);
            return response.data || response;
        } catch (error) {
            const memories = this.getLocalMemories(characterId);
            return {
                total: memories.length,
                byType: Data.groupBy(memories, 'type')
            };
        }
    }
    
    // ===== 本地记忆管理 =====
    
    /**
     * 获取本地记忆
     * @param {string} characterId - 角色ID
     * @returns {Array}
     */
    static getLocalMemories(characterId) {
        const key = `memories_${characterId}`;
        return AppStores.memories.get(key) || [];
    }
    
    /**
     * 添加本地记忆
     * @param {string} characterId - 角色ID
     * @param {Object} memory - 记忆数据
     */
    static addLocalMemory(characterId, memory) {
        const key = `memories_${characterId}`;
        const memories = this.getLocalMemories(characterId);
        
        // 限制本地存储数量
        if (memories.length >= 100) {
            memories.pop(); // 移除最旧的
        }
        
        memories.unshift({
            ...memory,
            _local: true,
            createdAt: new Date().toISOString()
        });
        
        AppStores.memories.set(key, memories);
    }
    
    /**
     * 同步本地记忆到服务器
     * @param {string} characterId - 角色ID
     * @returns {Promise<void>}
     */
    static async syncLocalMemories(characterId) {
        const local = this.getLocalMemories(characterId);
        const unsynced = local.filter(m => m._local && !m._synced);
        
        for (const memory of unsynced) {
            try {
                await this.create({
                    characterId,
                    content: memory.content,
                    type: memory.type,
                    importance: memory.importance
                });
                memory._synced = true;
            } catch (error) {
                console.warn('同步记忆失败:', error);
                break;
            }
        }
        
        // 更新本地存储
        const key = `memories_${characterId}`;
        AppStores.memories.set(key, local);
    }
    
    /**
     * 清空本地记忆
     * @param {string} characterId - 角色ID
     */
    static clearLocalMemories(characterId) {
        const key = `memories_${characterId}`;
        AppStores.memories.remove(key);
    }
    
    /**
     * 获取所有本地记忆的统计
     * @returns {Object}
     */
    static getLocalStats() {
        const keys = AppStores.memories.keys().filter(k => k.startsWith('memories_'));
        const stats = {};
        
        keys.forEach(key => {
            const characterId = key.replace('memories_', '');
            const memories = AppStores.memories.get(key) || [];
            stats[characterId] = {
                count: memories.length,
                unsynced: memories.filter(m => m._local && !m._synced).length
            };
        });
        
        return stats;
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MemoryService };
}
