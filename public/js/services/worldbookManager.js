/**
 * 世界书管理器 (Worldbook Manager)
 * 
 * 职责：
 * - 整合全局世界书 + 用户世界书
 * - 与存档系统集成（每个存档有自己的用户世界书）
 * - 提供设置页面使用的 API
 * - 持久化到 localStorage
 */

// 存储键名 - 如果全局未定义则创建，但不会覆盖已有的
if (typeof STORAGE_KEYS === 'undefined') {
    var STORAGE_KEYS = {
        WORLDBOOK: (gameId) => `galgame_${gameId}_worldbook`
    };
}

class WorldbookManager {
    constructor(options = {}) {
        this.gameId = options.gameId || null;
        
        // 全局世界书（作者设定）- 存储在后端或本地
        this.globalWorldbook = {
            entries: [],
            groups: {},
            version: '1.0'
        };
        
        // 用户世界书（玩家自定义）- 按存档隔离
        this.userWorldbooks = new Map(); // saveId -> { entries: [], stats: {} }
        
        // 当前激活的存档ID
        this.currentSaveId = null;
        
        // 引擎实例（懒加载）
        this._engine = null;
        
        // 初始化
        this._loadFromStorage();
    }

    /**
     * 获取当前存档的世界书
     */
    getCurrentSaveWorldbook() {
        if (!this.currentSaveId) return null;
        
        if (!this.userWorldbooks.has(this.currentSaveId)) {
            // 创建新的用户世界书
            this.userWorldbooks.set(this.currentSaveId, {
                entries: [],
                stats: {},
                createdAt: new Date().toISOString()
            });
        }
        
        return this.userWorldbooks.get(this.currentSaveId);
    }

    /**
     * 设置当前存档
     */
    setCurrentSave(saveId) {
        this.currentSaveId = saveId;
        this._engine = null; // 重置引擎缓存
        return this.getCurrentSaveWorldbook();
    }

    /**
     * 获取世界书引擎（合并全局 + 用户）
     */
    getEngine() {
        if (this._engine) return this._engine;
        
        const userWb = this.getCurrentSaveWorldbook();
        
        this._engine = new WorldbookEngine({
            globalEntries: this.globalWorldbook.entries,
            userEntries: userWb ? userWb.entries : [],
            groups: this.globalWorldbook.groups,
            stats: userWb ? userWb.stats : {}
        });
        
        return this._engine;
    }

    /**
     * 检测文本触发的条目
     */
    detectTriggers(text, context = {}) {
        const engine = this.getEngine();
        return engine.detectTriggers(text, context);
    }

    /**
     * 构建提示词注入
     */
    buildInjection(triggeredEntries, options = {}) {
        const engine = this.getEngine();
        return engine.buildInjection(triggeredEntries, options);
    }

    // ==================== 全局世界书管理（作者用）====================

    /**
     * 加载全局世界书
     */
    async loadGlobalWorldbook(gameId = this.gameId) {
        if (!gameId) return null;
        
        console.log('[Worldbook] Loading global worldbook for gameId:', gameId);
        
        try {
            // 尝试从后端加载
            const response = await fetch(`${API_BASE}/games/${gameId}/worldbook`, {
                headers: getAuthHeaders()
            });
            
            console.log('[Worldbook] Backend response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('[Worldbook] Backend response data:', data);
                
                if (data.success) {
                    // 确保数据结构正确
                    this.globalWorldbook = {
                        entries: data.data.entries || [],
                        groups: data.data.groups || {},
                        version: '1.0'
                    };
                    this._engine = null;
                    this._saveToStorage();
                    console.log('[Worldbook] Loaded from backend:', this.globalWorldbook.entries.length, 'entries');
                    console.log('[Worldbook] Sample entry:', this.globalWorldbook.entries[0]);
                    return this.globalWorldbook;
                }
            } else if (response.status === 404) {
                // API 不存在，使用本地存储（这是正常的）
                console.log('[Worldbook] Backend API not available, using local storage');
            }
        } catch (error) {
            // 网络错误，使用本地存储
            console.log('[Worldbook] Network error, using local storage:', error.message);
        }
        
        // 使用本地缓存
        console.log('[Worldbook] Using local cache:', this.globalWorldbook.entries.length, 'entries');
        if (this.globalWorldbook.entries.length > 0) {
            console.log('[Worldbook] Sample cached entry:', this.globalWorldbook.entries[0]);
        }
        return this.globalWorldbook;
    }

    /**
     * 保存全局世界书
     */
    async saveGlobalWorldbook() {
        if (!this.gameId) return false;
        
        try {
            const response = await fetch(`${API_BASE}/games/${this.gameId}/worldbook`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ entries: this.globalWorldbook.entries })
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    // 更新本地条目 ID（后端可能创建了新的）
                    if (result.data?.entries) {
                        this.globalWorldbook.entries = result.data.entries;
                        this._saveToStorage();
                    }
                    return true;
                }
            } else if (response.status === 404) {
                console.log('[WorldbookManager] Backend API not available, saved to local only');
            }
        } catch (error) {
            console.error('[WorldbookManager] 保存全局世界书失败:', error);
        }
        
        return false;
    }

    /**
     * 添加全局条目
     */
    async addGlobalEntry(entry) {
        const engine = new WorldbookEngine({ globalEntries: this.globalWorldbook.entries });
        const newEntry = engine.addGlobalEntry(entry);
        this.globalWorldbook.entries = engine.globalEntries;
        this._engine = null;
        
        // 先保存到本地（快速响应）
        this._saveToStorage();
        
        // 然后同步到后端
        try {
            await this.saveGlobalWorldbook();
            console.log('[WorldbookManager] Global entry added and synced to backend');
        } catch (err) {
            console.warn('[WorldbookManager] Failed to sync to backend, kept in local storage:', err);
        }
        
        return newEntry;
    }

    /**
     * 更新全局条目
     */
    async updateGlobalEntry(entryId, updates) {
        const engine = new WorldbookEngine({ globalEntries: this.globalWorldbook.entries });
        const updated = engine.updateEntry(entryId, updates, false);
        if (updated) {
            this.globalWorldbook.entries = engine.globalEntries;
            this._engine = null;
            
            // 先保存到本地（快速响应）
            this._saveToStorage();
            
            // 然后同步到后端
            try {
                await this.saveGlobalWorldbook();
                console.log('[WorldbookManager] Global entry updated and synced to backend');
            } catch (err) {
                console.warn('[WorldbookManager] Failed to sync to backend, kept in local storage:', err);
            }
        }
        return updated;
    }

    /**
     * 删除全局条目
     */
    async deleteGlobalEntry(entryId) {
        const engine = new WorldbookEngine({ globalEntries: this.globalWorldbook.entries });
        const deleted = engine.deleteEntry(entryId, false);
        if (deleted) {
            this.globalWorldbook.entries = engine.globalEntries;
            this._engine = null;
            
            // 先保存到本地（快速响应）
            this._saveToStorage();
            
            // 然后同步到后端
            try {
                await this.saveGlobalWorldbook();
                console.log('[WorldbookManager] Global entry deleted and synced to backend');
            } catch (err) {
                console.warn('[WorldbookManager] Failed to sync to backend, kept in local storage:', err);
            }
        }
        return deleted;
    }

    // ==================== 用户世界书管理（玩家用）====================

    /**
     * 添加用户条目
     */
    addUserEntry(entry, saveId = this.currentSaveId) {
        if (!saveId) throw new Error('No save selected');
        
        const saveWb = this.getCurrentSaveWorldbook();
        const engine = new WorldbookEngine({ userEntries: saveWb.entries });
        
        const newEntry = engine.addUserEntry(entry);
        saveWb.entries = engine.userEntries;
        saveWb.updatedAt = new Date().toISOString();
        
        this._engine = null;
        this._saveToStorage();
        
        // 同时更新存档数据
        this._syncToSaveSlot(saveId);
        
        return newEntry;
    }

    /**
     * 更新用户条目
     */
    updateUserEntry(entryId, updates, saveId = this.currentSaveId) {
        if (!saveId) throw new Error('No save selected');
        
        const saveWb = this.getCurrentSaveWorldbook();
        const engine = new WorldbookEngine({ userEntries: saveWb.entries });
        
        const updated = engine.updateEntry(entryId, updates, true);
        if (updated) {
            saveWb.entries = engine.userEntries;
            saveWb.updatedAt = new Date().toISOString();
            this._engine = null;
            this._saveToStorage();
            this._syncToSaveSlot(saveId);
        }
        return updated;
    }

    /**
     * 删除用户条目
     */
    deleteUserEntry(entryId, saveId = this.currentSaveId) {
        if (!saveId) throw new Error('No save selected');
        
        const saveWb = this.getCurrentSaveWorldbook();
        const engine = new WorldbookEngine({ userEntries: saveWb.entries });
        
        const deleted = engine.deleteEntry(entryId, true);
        if (deleted) {
            saveWb.entries = engine.userEntries;
            saveWb.updatedAt = new Date().toISOString();
            this._engine = null;
            this._saveToStorage();
            this._syncToSaveSlot(saveId);
        }
        return deleted;
    }

    /**
     * 获取所有条目（用于设置页面显示）
     */
    getAllEntriesForDisplay() {
        const engine = this.getEngine();
        const entries = engine.getAllEntries();
        
        // 添加分组信息
        return entries.map(entry => ({
            ...entry,
            groupColor: entry.color || engine._getGroupColor(entry.group),
            isUserEntry: entry.source === 'user'
        }));
    }

    /**
     * 获取分组统计
     */
    getGroupStats() {
        const engine = this.getEngine();
        return engine.getGroupStats();
    }

    // ==================== 导入/导出 ====================

    /**
     * 导出全局世界书
     */
    exportGlobalWorldbook() {
        return {
            type: 'global_worldbook',
            version: '2.0',
            data: this.globalWorldbook,
            exportTime: new Date().toISOString()
        };
    }

    /**
     * 导出用户世界书（当前存档）
     */
    exportUserWorldbook(saveId = this.currentSaveId) {
        const saveWb = this.userWorldbooks.get(saveId);
        if (!saveWb) return null;
        
        return {
            type: 'user_worldbook',
            version: '2.0',
            saveId: saveId,
            data: saveWb,
            exportTime: new Date().toISOString()
        };
    }

    /**
     * 导入世界书
     */
    import(data, options = {}) {
        if (!data || !data.type) throw new Error('Invalid import data');
        
        if (data.type === 'global_worldbook' && !options.userOnly) {
            // 导入全局世界书
            this.globalWorldbook = {
                ...this.globalWorldbook,
                ...data.data
            };
        } else if (data.type === 'user_worldbook') {
            // 导入用户世界书到指定存档
            const targetSaveId = options.targetSaveId || this.currentSaveId;
            if (targetSaveId) {
                this.userWorldbooks.set(targetSaveId, {
                    ...data.data,
                    importedAt: new Date().toISOString()
                });
            }
        }
        
        this._engine = null;
        this._saveToStorage();
    }

    // ==================== 私有方法 ====================

    _loadFromStorage() {
        try {
            // 加载全局世界书（尝试 gameId 和 'default'）
            const globalKey = STORAGE_KEYS.WORLDBOOK(this.gameId || 'default');
            let globalData = localStorage.getItem(globalKey);
            
            // 兼容旧数据：如果没有 gameId 特定的数据，尝试 'default'
            if (!globalData && this.gameId) {
                globalData = localStorage.getItem(STORAGE_KEYS.WORLDBOOK('default'));
            }
            
            if (globalData) {
                this.globalWorldbook = JSON.parse(globalData);
                console.log('[WorldbookManager] Loaded global from', globalKey, 'entries:', this.globalWorldbook.entries.length);
            } else {
                console.log('[WorldbookManager] No global data found for', globalKey);
            }
            
            // 加载用户世界书
            const userData = localStorage.getItem('wb_user_data');
            if (userData) {
                const parsed = JSON.parse(userData);
                this.userWorldbooks = new Map(Object.entries(parsed));
                console.log('[WorldbookManager] Loaded user data, saves:', this.userWorldbooks.size);
            } else {
                console.log('[WorldbookManager] No user data found');
            }
        } catch (error) {
            console.error('[WorldbookManager] 加载世界书数据失败:', error);
        }
    }

    _saveToStorage() {
        try {
            // 保存全局世界书（使用 gameId 或 'default'）
            const globalKey = STORAGE_KEYS.WORLDBOOK(this.gameId || 'default');
            localStorage.setItem(globalKey, JSON.stringify(this.globalWorldbook));
            console.log('[WorldbookManager] Saved global to', globalKey, 'entries:', this.globalWorldbook.entries.length);
            
            // 保存用户世界书
            const userData = Object.fromEntries(this.userWorldbooks);
            localStorage.setItem('wb_user_data', JSON.stringify(userData));
            console.log('[WorldbookManager] Saved user data, saves:', this.userWorldbooks.size);
        } catch (error) {
            console.error('[WorldbookManager] 保存世界书数据失败:', error);
        }
    }

    _syncToSaveSlot(saveId) {
        // 同步到存档系统
        const saveWb = this.userWorldbooks.get(saveId);
        if (saveWb && typeof updateSaveData === 'function') {
            updateSaveData({
                userWorldbook: saveWb,
                updatedAt: new Date().toISOString()
            });
        }
    }
}

// 创建全局实例（使用不同变量名避免冲突）
let _worldbookManagerInstance = null;

function getWorldbookManager(gameId) {
    if (!_worldbookManagerInstance || _worldbookManagerInstance.gameId !== gameId) {
        _worldbookManagerInstance = new WorldbookManager({ gameId });
    }
    return _worldbookManagerInstance;
}

// 浏览器全局暴露
if (typeof window !== 'undefined') {
    window.WorldbookManager = WorldbookManager;
    window.getWorldbookManager = getWorldbookManager;
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WorldbookManager, getWorldbookManager };
}
