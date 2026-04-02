/**
 * 世界书图书馆 (Worldbook Library) - SillyTavern 风格的多书本管理
 * 
 * 功能：
 * - 管理多本世界书
 * - 支持书本的激活/停用
 * - 合并所有激活书本的条目
 * - 书本级导入/导出
 * 
 * @author 大荒九丘
 * @version 2.0
 */

class WorldbookLibrary {
    constructor(options = {}) {
        this.gameId = options.gameId || null;
        
        // 世界书集合
        this.books = new Map(); // Map<bookId, WorldBook>
        
        // 当前激活的书本ID列表（可同时激活多本）
        this.activeBookIds = new Set();
        
        // 当前选中的书本（用于编辑）
        this.selectedBookId = null;
        
        // 缓存的 Engine 实例
        this._engine = null;
        
        // 加载数据
        this._loadFromStorage();
    }

    // ==================== 书本管理 ====================

    /**
     * 创建新书
     */
    createBook(options = {}) {
        const book = new WorldBook({
            gameId: this.gameId,
            ...options
        });
        this.books.set(book.id, book);
        
        // 自动激活第一个创建的书本
        if (this.activeBookIds.size === 0) {
            this.activateBook(book.id);
        }
        
        this._saveToStorage();
        return book;
    }

    /**
     * 删除书本
     */
    deleteBook(bookId) {
        this.books.delete(bookId);
        this.activeBookIds.delete(bookId);
        
        if (this.selectedBookId === bookId) {
            this.selectedBookId = this.books.size > 0 ? this.books.keys().next().value : null;
        }
        
        this._clearEngineCache();
        this._saveToStorage();
        return true;
    }

    /**
     * 获取书本
     */
    getBook(bookId) {
        return this.books.get(bookId);
    }

    /**
     * 获取所有书本
     */
    getAllBooks() {
        return Array.from(this.books.values());
    }

    /**
     * 获取激活的书本
     */
    getActiveBooks() {
        return Array.from(this.activeBookIds)
            .map(id => this.books.get(id))
            .filter(Boolean);
    }

    /**
     * 更新书本元数据
     */
    updateBook(bookId, updates) {
        const book = this.books.get(bookId);
        if (book) {
            Object.assign(book, updates, { updatedAt: new Date().toISOString() });
            this._saveToStorage();
            return book;
        }
        return null;
    }

    // ==================== 书本激活/停用 ====================

    /**
     * 激活书本
     */
    activateBook(bookId) {
        if (this.books.has(bookId)) {
            this.activeBookIds.add(bookId);
            this._clearEngineCache();
            this._saveToStorage();
            return true;
        }
        return false;
    }

    /**
     * 停用书本
     */
    deactivateBook(bookId) {
        this.activeBookIds.delete(bookId);
        this._clearEngineCache();
        this._saveToStorage();
        return true;
    }

    /**
     * 切换书本激活状态
     */
    toggleBook(bookId) {
        if (this.activeBookIds.has(bookId)) {
            this.deactivateBook(bookId);
        } else {
            this.activateBook(bookId);
        }
    }

    /**
     * 是否已激活
     */
    isBookActive(bookId) {
        return this.activeBookIds.has(bookId);
    }

    /**
     * 设置当前选中的书本
     */
    selectBook(bookId) {
        if (this.books.has(bookId)) {
            this.selectedBookId = bookId;
            return true;
        }
        return false;
    }

    /**
     * 获取选中的书本
     */
    getSelectedBook() {
        return this.selectedBookId ? this.books.get(this.selectedBookId) : null;
    }

    // ==================== 条目管理（代理到具体书本） ====================

    /**
     * 在当前选中的书本中添加条目
     */
    addEntry(entryData) {
        const book = this.getSelectedBook();
        if (book) {
            const entry = book.addEntry(entryData);
            this._clearEngineCache();
            this._saveToStorage();
            return entry;
        }
        return null;
    }

    /**
     * 更新条目
     */
    updateEntry(bookId, entryId, updates) {
        const book = this.books.get(bookId);
        if (book) {
            const entry = book.updateEntry(entryId, updates);
            if (entry) {
                this._clearEngineCache();
                this._saveToStorage();
            }
            return entry;
        }
        return null;
    }

    /**
     * 删除条目
     */
    deleteEntry(bookId, entryId) {
        const book = this.books.get(bookId);
        if (book) {
            const result = book.deleteEntry(entryId);
            if (result) {
                this._clearEngineCache();
                this._saveToStorage();
            }
            return result;
        }
        return false;
    }

    /**
     * 获取所有激活书本的条目（用于触发检测）
     */
    getAllActiveEntries() {
        const entries = [];
        this.getActiveBooks().forEach(book => {
            if (book && book.getEnabledEntries) {
                const bookEntries = book.getEnabledEntries().map(e => ({
                    ...e,
                    _bookId: book.id,
                    _bookName: book.name
                }));
                entries.push(...bookEntries);
            }
        });
        console.log('[WorldbookLibrary] 获取激活条目:', entries.length, '条');
        return entries;
    }

    // ==================== 触发检测 ====================

    /**
     * 获取 Engine 实例
     */
    getEngine() {
        if (this._engine) return this._engine;
        
        const activeEntries = this.getAllActiveEntries();
        console.log('[WorldbookLibrary] 创建引擎，使用', activeEntries.length, '条激活条目');
        this._engine = new WorldbookEngine({
            globalEntries: activeEntries,
            userEntries: [], // 条目已经在 activeEntries 中合并了
            groups: this._collectGroups()
        });
        
        return this._engine;
    }

    /**
     * 检测触发器
     */
    detectTriggers(text, context = {}) {
        return this.getEngine().detectTriggers(text, context);
    }

    /**
     * 构建注入内容
     */
    buildInjection(triggeredEntries, options = {}) {
        return this.getEngine().buildInjection(triggeredEntries, options);
    }

    _clearEngineCache() {
        this._engine = null;
    }

    _collectGroups() {
        const groups = {};
        this.books.forEach(book => {
            Object.assign(groups, book.groups);
        });
        return groups;
    }

    // ==================== 导入/导出 ====================

    /**
     * 导出书本为 JSON
     */
    exportBook(bookId, format = 'native') {
        const book = this.books.get(bookId);
        if (!book) return null;

        if (format === 'lorebook') {
            return book.exportToLorebook();
        }
        return book.toJSON();
    }

    /**
     * 导入书本
     */
    importBook(data, format = 'auto', options = {}) {
        let book;
        
        // 自动检测格式
        if (format === 'auto') {
            if (data.entries && Array.isArray(data.entries) && !data.groups) {
                format = 'lorebook';
            } else {
                format = 'native';
            }
        }

        if (format === 'lorebook') {
            book = WorldBook.importFromLorebook(data, { gameId: this.gameId, ...options });
        } else {
            book = WorldBook.fromJSON({ ...data, gameId: this.gameId, ...options });
        }

        // 确保ID唯一
        book.id = 'wb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        this.books.set(book.id, book);
        this._saveToStorage();
        
        return book;
    }

    /**
     * 导出整个图书馆（所有书本）
     */
    exportLibrary() {
        return {
            version: '2.0',
            gameId: this.gameId,
            exportedAt: new Date().toISOString(),
            books: this.getAllBooks().map(b => b.toJSON()),
            activeBookIds: Array.from(this.activeBookIds)
        };
    }

    /**
     * 导入整个图书馆
     */
    importLibrary(data, options = {}) {
        if (data.books && Array.isArray(data.books)) {
            data.books.forEach(bookData => {
                this.importBook(bookData, 'native', options);
            });
            
            // 恢复激活状态
            if (data.activeBookIds) {
                data.activeBookIds.forEach(id => this.activateBook(id));
            }
        }
    }

    // ==================== 持久化 ====================

    _getStorageKey() {
        return this.gameId ? `wblibrary_${this.gameId}` : 'wblibrary_global';
    }

    _saveToStorage() {
        try {
            const data = {
                books: Array.from(this.books.values()).map(b => b.toJSON()),
                activeBookIds: Array.from(this.activeBookIds),
                selectedBookId: this.selectedBookId,
                version: '2.0'
            };
            localStorage.setItem(this._getStorageKey(), JSON.stringify(data));
        } catch (e) {
            console.error('[WorldbookLibrary] 保存失败:', e);
        }
    }

    _loadFromStorage() {
        try {
            const data = localStorage.getItem(this._getStorageKey());
            if (data) {
                const parsed = JSON.parse(data);
                
                // 加载书本
                if (parsed.books) {
                    parsed.books.forEach(bookData => {
                        try {
                            const book = WorldBook.fromJSON(bookData);
                            this.books.set(book.id, book);
                        } catch (bookError) {
                            console.error('[WorldbookLibrary] 加载书本失败:', bookError);
                        }
                    });
                }
                
                // 恢复激活状态
                if (parsed.activeBookIds) {
                    parsed.activeBookIds.forEach(id => {
                        if (this.books.has(id)) {
                            this.activeBookIds.add(id);
                        }
                    });
                }
                
                // 恢复选中的书本
                this.selectedBookId = parsed.selectedBookId;
                if (this.selectedBookId && !this.books.has(this.selectedBookId)) {
                    this.selectedBookId = this.books.size > 0 ? this.books.keys().next().value : null;
                }
                
                console.log('[WorldbookLibrary] 已加载', this.books.size, '本世界书');
                
                // 如果没有书本，创建默认世界书
                if (this.books.size === 0) {
                    this._createDefaultBook();
                }
            } else {
                // 首次使用，创建默认世界书
                this._createDefaultBook();
            }
        } catch (e) {
            console.error('[WorldbookLibrary] 加载失败:', e);
            // 加载失败时，清空现有数据并创建默认世界书
            this.books.clear();
            this.activeBookIds.clear();
            this.selectedBookId = null;
            this._createDefaultBook();
        }
    }

    _createDefaultBook() {
        // 创建默认世界书
        const defaultBook = this.createBook({
            name: '默认世界书',
            description: '自动创建的世界书，包含游戏的默认设定',
            isGlobal: true
        });
        
        // 从旧格式迁移数据
        this._migrateFromOldFormat(defaultBook);
        
        // 从worldbookManager同步全局世界书数据
        this._syncFromWorldbookManager(defaultBook);
        
        // 确保至少有一个激活的世界书
        if (this.activeBookIds.size === 0) {
            this.activateBook(defaultBook.id);
        }
        
        // 确保有选中的世界书
        if (!this.selectedBookId) {
            this.selectBook(defaultBook.id);
        }
        
        console.log('[WorldbookLibrary] 创建默认世界书:', defaultBook.name, '条目数:', defaultBook.entries.length);
    }
    
    /**
     * 从worldbookManager同步全局世界书数据
     */
    _syncFromWorldbookManager(targetBook) {
        try {
            // 检查是否存在worldbookManager实例
            if (typeof worldbookManager !== 'undefined' && worldbookManager.globalWorldbook) {
                const globalEntries = worldbookManager.globalWorldbook.entries || [];
                if (globalEntries.length > 0) {
                    console.log('[WorldbookLibrary] 从worldbookManager同步', globalEntries.length, '个条目');
                    
                    globalEntries.forEach(entry => {
                        targetBook.addEntry({
                            name: entry.name || '未命名条目',
                            keys: entry.keys || [],
                            excludeKeys: entry.excludeKeys || [],
                            content: entry.content || '',
                            priority: entry.priority || 100,
                            insertPosition: entry.insertPosition || 'character',
                            group: entry.group || '默认分组',
                            constant: entry.constant || false,
                            enabled: entry.enabled !== false
                        });
                    });
                    
                    // 同步分组信息
                    if (worldbookManager.globalWorldbook.groups) {
                        Object.assign(targetBook.groups, worldbookManager.globalWorldbook.groups);
                    }
                }
            }
        } catch (e) {
            console.error('[WorldbookLibrary] 从worldbookManager同步失败:', e);
        }
    }

    /**
     * 从旧格式迁移数据
     */
    _migrateFromOldFormat(targetBook) {
        try {
            // 尝试从旧的全局世界书格式迁移
            const oldKeys = [
                `wb_global_${this.gameId}`,
                `worldbook_${this.gameId}`,
                'worldbook_global',
                // 添加worldbookManager的存储键
                `galgame_${this.gameId}_worldbook`,
                `galgame_default_worldbook`
            ];
            
            for (const key of oldKeys) {
                const oldData = localStorage.getItem(key);
                if (oldData) {
                    try {
                        const parsed = JSON.parse(oldData);
                        // 处理不同格式的数据
                        let entries = [];
                        if (parsed.entries && Array.isArray(parsed.entries)) {
                            // 标准格式
                            entries = parsed.entries;
                        } else if (Array.isArray(parsed)) {
                            // 直接是条目数组
                            entries = parsed;
                        }
                        
                        if (entries.length > 0) {
                            console.log('[WorldbookLibrary] 从', key, '迁移', entries.length, '个条目');
                            
                            entries.forEach(entry => {
                                targetBook.addEntry({
                                    name: entry.name || entry.comment || '迁移条目',
                                    keys: entry.keys || entry.key || [],
                                    excludeKeys: entry.excludeKeys || entry.keysecondary || [],
                                    content: entry.content,
                                    priority: entry.priority || entry.order || 100,
                                    insertPosition: entry.insertPosition || 'character',
                                    group: entry.group || '默认分组',
                                    constant: entry.constant || false,
                                    enabled: entry.enabled !== false
                                });
                            });
                            
                            // 迁移分组信息
                            if (parsed.groups) {
                                Object.assign(targetBook.groups, parsed.groups);
                            }
                            
                            // 不删除旧数据，只是迁移
                        }
                    } catch (parseError) {
                        console.error('[WorldbookLibrary] 解析', key, '失败:', parseError);
                    }
                }
            }
        } catch (e) {
            console.error('[WorldbookLibrary] 迁移失败:', e);
        }
    }

    // ==================== 统计 ====================

    /**
     * 获取统计信息
     */
    getStats() {
        const books = this.getAllBooks();
        const activeBooks = this.getActiveBooks();
        
        return {
            totalBooks: books.length,
            activeBooks: activeBooks.length,
            totalEntries: books.reduce((sum, b) => sum + b.entries.length, 0),
            activeEntries: activeBooks.reduce((sum, b) => sum + b.getEnabledEntries().length, 0),
            groups: this._collectAllGroups()
        };
    }

    _collectAllGroups() {
        const groups = {};
        this.books.forEach(book => {
            const bookGroups = book.getEntriesByGroup();
            Object.keys(bookGroups).forEach(groupName => {
                if (!groups[groupName]) {
                    groups[groupName] = { count: 0, color: book.getGroupColor(groupName) };
                }
                groups[groupName].count += bookGroups[groupName].length;
            });
        });
        return groups;
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WorldbookLibrary };
}

// 浏览器全局暴露
if (typeof window !== 'undefined') {
    window.WorldbookLibrary = WorldbookLibrary;
}
