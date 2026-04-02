/**
 * 世界书 (World Book) - SillyTavern 风格的多书本管理
 * 
 * 概念：
 * - WorldBook: 一本完整的世界书，包含元数据和条目列表
 * - 支持同时激活多本世界书
 * - 每本书可独立导入/导出
 * 
 * @author 大荒九丘
 * @version 2.0
 */

class WorldBook {
    constructor(options = {}) {
        // 书本元数据
        this.id = options.id || 'wb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        this.name = options.name || '未命名世界书';
        this.description = options.description || '';
        this.author = options.author || '';
        this.version = options.version || '1.0';
        this.cover = options.cover || ''; // 封面图片URL
        
        // 书本状态
        this.enabled = options.enabled !== false; // 是否启用
        this.isGlobal = options.isGlobal || false; // 是否全局（所有存档共享）
        this.isUserBook = options.isUserBook || false; // 是否是用户书（非作者创建）
        
        // 条目列表
        this.entries = options.entries || [];
        
        // 分组定义（这本书特有的分组）
        this.groups = options.groups || {};
        
        // 创建时间
        this.createdAt = options.createdAt || new Date().toISOString();
        this.updatedAt = options.updatedAt || new Date().toISOString();
        
        // 统计
        this.stats = {
            triggerCount: options.stats?.triggerCount || 0,
            lastTriggered: options.stats?.lastTriggered || null
        };
    }

    /**
     * 添加条目到本书
     */
    addEntry(entry) {
        const newEntry = {
            id: 'entry_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            bookId: this.id, // 标记属于哪本书
            enabled: true,
            ...entry,
            createdAt: new Date().toISOString()
        };
        this.entries.push(newEntry);
        this.updatedAt = new Date().toISOString();
        return newEntry;
    }

    /**
     * 更新条目
     */
    updateEntry(entryId, updates) {
        const idx = this.entries.findIndex(e => e.id === entryId || e._id === entryId);
        if (idx >= 0) {
            this.entries[idx] = { 
                ...this.entries[idx], 
                ...updates, 
                updatedAt: new Date().toISOString() 
            };
            this.updatedAt = new Date().toISOString();
            return this.entries[idx];
        }
        return null;
    }

    /**
     * 删除条目
     */
    deleteEntry(entryId) {
        const idx = this.entries.findIndex(e => e.id === entryId || e._id === entryId);
        if (idx >= 0) {
            this.entries.splice(idx, 1);
            this.updatedAt = new Date().toISOString();
            return true;
        }
        return false;
    }

    /**
     * 获取启用的条目
     */
    getEnabledEntries() {
        return this.entries.filter(e => e.enabled !== false);
    }

    /**
     * 按分组获取条目
     */
    getEntriesByGroup(groupName) {
        if (groupName) {
            return this.entries.filter(e => e.group === groupName);
        }
        // 按分组组织
        const groups = {};
        this.entries.forEach(e => {
            const g = e.group || '未分组';
            if (!groups[g]) groups[g] = [];
            groups[g].push(e);
        });
        return groups;
    }

    /**
     * 设置分组颜色
     */
    setGroupColor(groupName, color) {
        this.groups[groupName] = { color, updatedAt: new Date().toISOString() };
    }

    /**
     * 获取分组颜色
     */
    getGroupColor(groupName) {
        return this.groups[groupName]?.color || '#888888';
    }

    /**
     * 导出为 SillyTavern Lorebook 格式
     */
    exportToLorebook() {
        return {
            name: this.name,
            description: this.description,
            entries: this.entries.map(e => ({
                uid: e.id,
                key: e.keys,
                keysecondary: e.excludeKeys || [],
                comment: e.name,
                content: e.content,
                constant: e.constant || false,
                selective: false,
                order: e.priority || 100,
                position: this._convertInsertPosition(e.insertPosition),
                disable: !e.enabled
            }))
        };
    }

    /**
     * 从 SillyTavern Lorebook 导入
     */
    static importFromLorebook(lorebook, options = {}) {
        const book = new WorldBook({
            name: lorebook.name || '导入的世界书',
            description: lorebook.description || '',
            author: options.author || '',
            isUserBook: options.isUserBook || false,
            ...options
        });

        if (lorebook.entries) {
            lorebook.entries.forEach(entry => {
                book.addEntry({
                    name: entry.comment || entry.uid,
                    keys: Array.isArray(entry.key) ? entry.key : [entry.key].filter(Boolean),
                    excludeKeys: entry.keysecondary || [],
                    content: entry.content,
                    priority: entry.order || 100,
                    insertPosition: book._convertPositionBack(entry.position),
                    constant: entry.constant,
                    enabled: !entry.disable
                });
            });
        }

        return book;
    }

    /**
     * 转换为 JSON
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            author: this.author,
            version: this.version,
            cover: this.cover,
            enabled: this.enabled,
            isGlobal: this.isGlobal,
            isUserBook: this.isUserBook,
            entries: this.entries,
            groups: this.groups,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            stats: this.stats
        };
    }

    /**
     * 从 JSON 恢复
     */
    static fromJSON(json) {
        return new WorldBook(json);
    }

    // 辅助方法：转换插入位置格式
    _convertInsertPosition(position) {
        const map = {
            'system': 0,      // Before Prompt
            'character': 1,   // After Scenario
            'user': 2,        // Before Example
            'example': 3,     // After Example
            'depth': 4        // At Depth
        };
        return map[position] || 1;
    }

    _convertPositionBack(position) {
        const map = {
            0: 'system',
            1: 'character',
            2: 'user',
            3: 'example',
            4: 'depth'
        };
        return map[position] || 'character';
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorldBook;
}

// 浏览器全局暴露
if (typeof window !== 'undefined') {
    window.WorldBook = WorldBook;
}
