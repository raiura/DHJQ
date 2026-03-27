/**
 * 记忆管理服务 - 与后端三层记忆结构对接
 * 短期记忆 / 长期记忆 / 核心记忆
 */

class MemoryService {
    constructor(options = {}) {
        this.apiBase = options.apiBase || 'http://localhost:3000/api';
        this.gameId = options.gameId || null;
        
        // 记忆类型
        this.MemoryType = {
            SHORT: 'short',
            LONG: 'long',
            CORE: 'core'
        };
        
        // 本地缓存
        this.cache = new Map();
        this.cacheExpiry = 30000; // 30秒
    }

    /**
     * 设置当前游戏ID
     */
    setGameId(gameId) {
        this.gameId = gameId;
        this.clearCache();
    }

    /**
     * 获取Token
     */
    _getToken() {
        return localStorage.getItem('galgame_token');
    }

    /**
     * API请求封装
     */
    async _request(url, options = {}) {
        const token = this._getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(`${this.apiBase}${url}`, {
                ...options,
                headers
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('[MemoryService] Request failed:', error);
            throw error;
        }
    }

    /**
     * 获取记忆列表
     */
    async getMemories(options = {}) {
        if (!this.gameId) {
            throw new Error('Game ID not set');
        }

        const { types = ['short', 'long', 'core'], limit = 50 } = options;
        const cacheKey = `memories_${this.gameId}_${types.join(',')}_${limit}`;
        
        // 检查缓存
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.time < this.cacheExpiry) {
            return cached.data;
        }

        try {
            const result = await this._request(
                `/memories/${this.gameId}?types=${types.join(',')}&limit=${limit}`
            );
            
            // 更新缓存
            this.cache.set(cacheKey, {
                data: result.data,
                time: Date.now()
            });
            
            return result.data;
        } catch (error) {
            // 如果API失败，尝试从localStorage加载
            console.warn('[MemoryService] API failed, falling back to localStorage');
            return this._getMemoriesFromStorage(options);
        }
    }

    /**
     * 从localStorage获取记忆（降级方案）
     */
    _getMemoriesFromStorage(options = {}) {
        const { types = ['short', 'long', 'core'] } = options;
        const storageKey = `game_${this.gameId}_memories`;
        const data = localStorage.getItem(storageKey);
        
        if (!data) {
            return { memories: [], count: 0 };
        }

        try {
            const allMemories = JSON.parse(data);
            const filtered = allMemories.filter(m => types.includes(m.type));
            return {
                memories: filtered,
                count: filtered.length
            };
        } catch (e) {
            return { memories: [], count: 0 };
        }
    }

    /**
     * 添加记忆
     */
    async addMemory(content, options = {}) {
        if (!this.gameId) {
            throw new Error('Game ID not set');
        }

        const { type = 'short', tags = [], importance = 50 } = options;

        try {
            const result = await this._request(`/memories/${this.gameId}`, {
                method: 'POST',
                body: JSON.stringify({ content, type, tags, importance })
            });
            
            this.clearCache();
            return result.data;
        } catch (error) {
            // 降级到localStorage
            return this._addMemoryToStorage(content, { type, tags, importance });
        }
    }

    /**
     * 添加记忆到localStorage
     */
    _addMemoryToStorage(content, options = {}) {
        const storageKey = `game_${this.gameId}_memories`;
        const memories = JSON.parse(localStorage.getItem(storageKey) || '[]');
        
        const newMemory = {
            _id: 'mem_' + Date.now(),
            gameId: this.gameId,
            type: options.type || 'short',
            content,
            timestamp: new Date().toISOString(),
            turn: memories.length + 1,
            tags: options.tags || [],
            importance: options.importance || 50,
            status: 'active',
            isSolidified: false
        };
        
        memories.push(newMemory);
        localStorage.setItem(storageKey, JSON.stringify(memories));
        
        return newMemory;
    }

    /**
     * 删除记忆
     */
    async deleteMemory(memoryId) {
        try {
            await this._request(`/memories/${memoryId}`, {
                method: 'DELETE'
            });
            this.clearCache();
            return true;
        } catch (error) {
            // 降级到localStorage
            return this._deleteMemoryFromStorage(memoryId);
        }
    }

    /**
     * 从localStorage删除记忆
     */
    _deleteMemoryFromStorage(memoryId) {
        const storageKey = `game_${this.gameId}_memories`;
        const memories = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const filtered = memories.filter(m => m._id !== memoryId);
        localStorage.setItem(storageKey, JSON.stringify(filtered));
        return true;
    }

    /**
     * 固化时间线
     */
    async solidifyTimeline(customContent = null) {
        if (!this.gameId) {
            throw new Error('Game ID not set');
        }

        try {
            const result = await this._request(`/memories/${this.gameId}/solidify`, {
                method: 'POST',
                body: JSON.stringify({ customContent })
            });
            
            this.clearCache();
            return result.data;
        } catch (error) {
            console.error('[MemoryService] Solidify failed:', error);
            throw error;
        }
    }

    /**
     * 获取时间线存档
     */
    async getTimelineArchive() {
        if (!this.gameId) {
            throw new Error('Game ID not set');
        }

        try {
            const result = await this._request(`/memories/${this.gameId}/timeline`);
            return result.data;
        } catch (error) {
            console.error('[MemoryService] Get timeline failed:', error);
            return { exists: false };
        }
    }

    /**
     * 清空记忆
     */
    async clearMemories(keepCore = true) {
        if (!this.gameId) {
            throw new Error('Game ID not set');
        }

        try {
            const result = await this._request(
                `/memories/${this.gameId}/clear?keepCore=${keepCore}`,
                { method: 'DELETE' }
            );
            
            this.clearCache();
            return result.data;
        } catch (error) {
            // 降级到localStorage
            return this._clearMemoriesFromStorage(keepCore);
        }
    }

    /**
     * 从localStorage清空记忆
     */
    _clearMemoriesFromStorage(keepCore = true) {
        const storageKey = `game_${this.gameId}_memories`;
        
        if (keepCore) {
            const memories = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const coreOnly = memories.filter(m => m.type === 'core');
            localStorage.setItem(storageKey, JSON.stringify(coreOnly));
            return { deletedCount: memories.length - coreOnly.length, keepCore: true };
        } else {
            localStorage.removeItem(storageKey);
            return { deletedCount: -1, keepCore: false };
        }
    }

    /**
     * 获取记忆统计
     */
    async getStats() {
        if (!this.gameId) {
            throw new Error('Game ID not set');
        }

        try {
            const result = await this._request(`/memories/${this.gameId}/stats`);
            return result.data;
        } catch (error) {
            // 从localStorage计算
            return this._getStatsFromStorage();
        }
    }

    /**
     * 从localStorage获取统计
     */
    _getStatsFromStorage() {
        const storageKey = `game_${this.gameId}_memories`;
        const memories = JSON.parse(localStorage.getItem(storageKey) || '[]');
        
        return {
            short: memories.filter(m => m.type === 'short').length,
            long: memories.filter(m => m.type === 'long').length,
            core: memories.filter(m => m.type === 'core').length,
            total: memories.length,
            solidified: memories.filter(m => m.isSolidified).length,
            hasArchive: false,
            lastArchiveTime: null
        };
    }

    /**
     * 导出所有记忆
     */
    async exportMemories() {
        const data = await this.getMemories({ types: ['short', 'long', 'core'], limit: 1000 });
        return {
            version: '1.0',
            gameId: this.gameId,
            exportedAt: new Date().toISOString(),
            memories: data.memories
        };
    }

    /**
     * 导入记忆
     */
    async importMemories(data) {
        if (!data.memories || !Array.isArray(data.memories)) {
            throw new Error('Invalid memory data format');
        }

        const results = [];
        for (const mem of data.memories) {
            try {
                const result = await this.addMemory(mem.content, {
                    type: mem.type,
                    tags: mem.tags,
                    importance: mem.importance
                });
                results.push(result);
            } catch (e) {
                console.error('[MemoryService] Failed to import memory:', e);
            }
        }

        return results;
    }

    /**
     * 清除缓存
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * 获取格式化的记忆类型标签
     */
    getTypeLabel(type) {
        const labels = {
            short: '短期记忆',
            long: '长期记忆',
            core: '核心记忆'
        };
        return labels[type] || type;
    }

    /**
     * 获取记忆类型颜色
     */
    getTypeColor(type) {
        const colors = {
            short: '#4a9eff',  // 蓝色
            long: '#9b59b6',   // 紫色
            core: '#e74c3c'    // 红色
        };
        return colors[type] || '#888';
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MemoryService;
}

// 浏览器全局暴露
if (typeof window !== 'undefined') {
    window.MemoryService = MemoryService;
}
