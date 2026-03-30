/**
 * 统一存储服务
 * 实现API优先、本地缓存为辅的存储策略
 * 
 * 架构：
 * API后端 (MongoDB) ← 唯一真相源
 *     ↓
 * 本地缓存 (LocalStorage/IndexedDB)
 *     ↓
 * 内存缓存 (运行时)
 */

class StorageService {
    constructor(options = {}) {
        this.apiBase = options.apiBase || 'http://localhost:3000/api';
        this.gameId = options.gameId || null;
        
        // 内存缓存
        this.cache = new Map();
        this.cacheExpiry = 60000; // 1分钟过期
        
        // 缓存键前缀
        this.keyPrefix = `galgame_${this.gameId || 'global'}_`;
    }

    /**
     * 设置当前游戏ID
     */
    setGameId(gameId) {
        this.gameId = gameId;
        this.keyPrefix = `galgame_${gameId}_`;
        this.clearCache();
    }

    // ==================== 核心存储方法 ====================

    /**
     * 获取数据 - API优先策略
     * @param {string} key - 数据键
     * @param {Object} options - 选项
     * @returns {Promise<Object>} { data, source: 'api'|'cache'|'local' }
     */
    async get(key, options = {}) {
        const { useCache = true, fallback = true } = options;
        const cacheKey = this.keyPrefix + key;
        
        // 1. 检查内存缓存
        if (useCache && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.time < this.cacheExpiry) {
                console.log(`[Storage] 命中内存缓存: ${key}`);
                return { data: cached.data, source: 'cache' };
            }
        }
        
        // 2. 尝试从API获取
        try {
            const data = await this._fetchFromAPI(key);
            this._setCache(cacheKey, data);
            this._setLocalStorage(cacheKey, data);
            console.log(`[Storage] 从API获取: ${key}`);
            return { data, source: 'api' };
        } catch (error) {
            console.warn(`[Storage] API获取失败: ${key}`, error.message);
        }
        
        // 3. 降级到本地存储
        if (fallback) {
            const localData = this._getLocalStorage(cacheKey);
            if (localData !== null) {
                console.log(`[Storage] 降级到本地存储: ${key}`);
                return { data: localData, source: 'local' };
            }
        }
        
        return { data: null, source: 'none' };
    }

    /**
     * 保存数据 - 先API后本地
     */
    async set(key, data, options = {}) {
        const { syncLocal = true } = options;
        const cacheKey = this.keyPrefix + key;
        
        // 1. 尝试保存到API
        try {
            await this._saveToAPI(key, data);
            console.log(`[Storage] 已保存到API: ${key}`);
        } catch (error) {
            console.warn(`[Storage] API保存失败: ${key}`, error.message);
            // 标记为待同步
            this._markPendingSync(cacheKey, data);
        }
        
        // 2. 更新本地缓存
        this._setCache(cacheKey, data);
        
        // 3. 同步到本地存储
        if (syncLocal) {
            this._setLocalStorage(cacheKey, data);
        }
        
        return { success: true };
    }

    /**
     * 删除数据
     */
    async remove(key) {
        const cacheKey = this.keyPrefix + key;
        
        try {
            await this._deleteFromAPI(key);
        } catch (error) {
            console.warn(`[Storage] API删除失败: ${key}`, error.message);
        }
        
        this.cache.delete(cacheKey);
        localStorage.removeItem(cacheKey);
        
        return { success: true };
    }

    // ==================== 批量操作 ====================

    /**
     * 批量获取
     */
    async getMultiple(keys) {
        const results = {};
        await Promise.all(
            keys.map(async (key) => {
                const result = await this.get(key);
                results[key] = result.data;
            })
        );
        return results;
    }

    /**
     * 批量保存
     */
    async setMultiple(dataMap) {
        const entries = Object.entries(dataMap);
        await Promise.all(
            entries.map(([key, data]) => this.set(key, data))
        );
        return { success: true };
    }

    // ==================== 同步机制 ====================

    /**
     * 同步待同步的数据
     */
    async syncPending() {
        const pendingKey = this.keyPrefix + '__pendingSync';
        const pending = JSON.parse(localStorage.getItem(pendingKey) || '{}');
        
        if (Object.keys(pending).length === 0) {
            return { synced: 0 };
        }
        
        let synced = 0;
        for (const [key, data] of Object.entries(pending)) {
            try {
                await this._saveToAPI(key.replace(this.keyPrefix, ''), data);
                delete pending[key];
                synced++;
            } catch (error) {
                console.error(`[Storage] 同步失败: ${key}`, error);
            }
        }
        
        localStorage.setItem(pendingKey, JSON.stringify(pending));
        return { synced, remaining: Object.keys(pending).length };
    }

    /**
     * 标记待同步
     */
    _markPendingSync(key, data) {
        const pendingKey = this.keyPrefix + '__pendingSync';
        const pending = JSON.parse(localStorage.getItem(pendingKey) || '{}');
        pending[key] = data;
        localStorage.setItem(pendingKey, JSON.stringify(pending));
    }

    // ==================== 私有方法 ====================

    async _fetchFromAPI(key) {
        // 根据key类型调用不同API
        const endpoint = this._getEndpoint(key);
        const response = await fetch(`${this.apiBase}${endpoint}`, {
            headers: this._getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        return result.data;
    }

    async _saveToAPI(key, data) {
        const endpoint = this._getEndpoint(key);
        const response = await fetch(`${this.apiBase}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...this._getAuthHeaders()
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
    }

    async _deleteFromAPI(key) {
        const endpoint = this._getEndpoint(key);
        const response = await fetch(`${this.apiBase}${endpoint}`, {
            method: 'DELETE',
            headers: this._getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
    }

    _getEndpoint(key) {
        // 根据key映射到API端点
        const map = {
            'characters': `/games/${this.gameId}/characters`,
            'worldbook': `/worldbook/${this.gameId}`,
            'memories': `/memories/${this.gameId}`,
            'gallery': `/gallery/${this.gameId}`,
            'settings': `/settings/${this.gameId}`
        };
        return map[key] || `/data/${this.gameId}/${key}`;
    }

    _getAuthHeaders() {
        const token = localStorage.getItem('galgame_token');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    _setCache(key, data) {
        this.cache.set(key, {
            data,
            time: Date.now()
        });
    }

    _getLocalStorage(key) {
        try {
            const json = localStorage.getItem(key);
            return json ? JSON.parse(json) : null;
        } catch (e) {
            return null;
        }
    }

    _setLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.warn('[Storage] LocalStorage写入失败:', e);
        }
    }

    clearCache() {
        this.cache.clear();
    }

    // ==================== 特定数据类型方法 ====================

    async getCharacters() {
        return this.get('characters');
    }

    async saveCharacters(characters) {
        return this.set('characters', characters);
    }

    async getWorldbook() {
        return this.get('worldbook');
    }

    async saveWorldbook(worldbook) {
        return this.set('worldbook', worldbook);
    }

    async getGallery() {
        return this.get('gallery');
    }

    async saveGallery(gallery) {
        return this.set('gallery', gallery);
    }
}

// 单例实例
let storageServiceInstance = null;

function getStorageService(options = {}) {
    if (!storageServiceInstance) {
        storageServiceInstance = new StorageService(options);
    }
    return storageServiceInstance;
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StorageService, getStorageService };
}

if (typeof window !== 'undefined') {
    window.StorageService = StorageService;
    window.getStorageService = getStorageService;
}
