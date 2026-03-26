/**
 * 世界书引擎 (Worldbook Engine)
 * 
 * 设计目标：
 * - 支持 SillyTavern 风格的世界书系统
 * - 提供高效的关键词匹配
 * - 支持分组、优先级、多位置注入
 * - 全局世界书 + 用户世界书合并
 * 
 * @author 大荒九丘
 * @version 2.0
 */

class WorldbookEngine {
    constructor(options = {}) {
        // 全局世界书条目（作者设定）
        this.globalEntries = options.globalEntries || [];
        
        // 用户世界书条目（玩家自定义）
        this.userEntries = options.userEntries || [];
        
        // 分组配置
        this.groups = options.groups || {};
        
        // 统计信息
        this.stats = options.stats || {};
        
        // 缓存
        this._cache = new Map();
        this._cacheExpiry = 5000; // 缓存5秒
    }

    /**
     * 添加全局条目（作者用）
     */
    addGlobalEntry(entry) {
        const newEntry = this._normalizeEntry(entry);
        this.globalEntries.push(newEntry);
        this._clearCache();
        return newEntry;
    }

    /**
     * 添加用户条目（玩家用）
     */
    addUserEntry(entry) {
        const newEntry = this._normalizeEntry(entry);
        // 用户条目默认优先级高于全局
        newEntry.isUserEntry = true;
        this.userEntries.push(newEntry);
        this._clearCache();
        return newEntry;
    }

    /**
     * 获取所有有效条目（合并全局和用户）
     */
    getAllEntries() {
        const cacheKey = 'all_entries';
        if (this._cache.has(cacheKey)) {
            return this._cache.get(cacheKey);
        }

        // 合并条目：用户条目优先级高于全局
        const entryMap = new Map();
        
        // 先添加全局条目
        this.globalEntries.forEach(entry => {
            if (entry.enabled !== false) {
                entryMap.set(entry.id, { ...entry, source: 'global' });
            }
        });
        
        // 用户条目覆盖或补充
        this.userEntries.forEach(entry => {
            if (entry.enabled !== false) {
                // 如果用户条目有 overrideGlobal 标记，则覆盖同名条目
                if (entry.overrideGlobal && entry.overrideId) {
                    entryMap.set(entry.overrideId, { ...entry, source: 'user', isOverride: true });
                } else {
                    entryMap.set(entry.id, { ...entry, source: 'user' });
                }
            }
        });

        const result = Array.from(entryMap.values());
        this._cache.set(cacheKey, result);
        setTimeout(() => this._cache.delete(cacheKey), this._cacheExpiry);
        
        return result;
    }

    /**
     * 检测文本触发的条目
     * @param {string} text - 要检测的文本
     * @param {Object} context - 上下文信息
     * @returns {Array} 触发的条目列表（按优先级排序）
     */
    detectTriggers(text, context = {}) {
        if (!text) return [];
        
        const allEntries = this.getAllEntries();
        const triggered = [];
        const searchText = String(text);
        
        for (const entry of allEntries) {
            if (!this._shouldCheckEntry(entry, context)) continue;
            
            const isTriggered = this._checkEntryTrigger(entry, searchText);
            
            if (isTriggered) {
                triggered.push(entry);
                this._updateStats(entry.id);
            }
        }
        
        // 按优先级排序（高优先级在前）
        return triggered.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }

    /**
     * 批量检测（支持对话历史）
     */
    detectTriggersBatch(texts, context = {}) {
        const allTriggered = new Map();
        
        for (const text of texts) {
            const triggered = this.detectTriggers(text, context);
            for (const entry of triggered) {
                if (!allTriggered.has(entry.id)) {
                    allTriggered.set(entry.id, entry);
                }
            }
        }
        
        return Array.from(allTriggered.values())
            .sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }

    /**
     * 构建提示词注入
     * @param {Array} triggeredEntries - 触发的条目
     * @param {Object} options - 构建选项
     * @returns {Object} 按位置分组的内容
     */
    buildInjection(triggeredEntries, options = {}) {
        const injection = {
            system: [],      // 系统级世界观
            character: [],   // 角色相关知识
            user: [],        // 用户提示词补充
            example: []      // 示例对话
        };

        const variables = {
            user: options.userName || '玩家',
            char: options.characterName || '角色',
            world: options.worldName || '世界',
            location: options.location || '',
            time: new Date().toLocaleString('zh-CN'),
            ...options.variables
        };

        for (const entry of triggeredEntries) {
            const position = entry.insertPosition || 'character';
            let content = entry.content || '';
            
            // 变量替换
            content = this._replaceVariables(content, variables);
            
            // 递归插入处理（如果内容中有 {{insert::entryId}}）
            content = this._processInsertions(content, triggeredEntries, variables);
            
            injection[position].push({
                content: content,
                priority: entry.priority || 100,
                depth: entry.insertDepth || 0,
                entryId: entry.id,
                entryName: entry.name,
                group: entry.group || '默认'
            });
        }

        // 每个位置内排序
        for (const pos in injection) {
            injection[pos].sort((a, b) => {
                if (b.priority !== a.priority) {
                    return b.priority - a.priority;
                }
                return a.depth - b.depth;
            });
        }

        return injection;
    }

    /**
     * 构建完整的提示词文本
     */
    buildPromptText(triggeredEntries, options = {}) {
        const injection = this.buildInjection(triggeredEntries, options);
        const parts = [];

        // System 部分
        if (injection.system.length > 0) {
            parts.push('【世界设定】\n' + 
                injection.system.map(e => e.content).join('\n\n'));
        }

        // Character 部分
        if (injection.character.length > 0) {
            parts.push('【相关知识】\n' + 
                injection.character.map(e => e.content).join('\n\n'));
        }

        // User 部分
        if (injection.user.length > 0) {
            parts.push('【补充信息】\n' + 
                injection.user.map(e => e.content).join('\n\n'));
        }

        return parts.join('\n\n');
    }

    /**
     * 获取分组统计
     */
    getGroupStats() {
        const allEntries = this.getAllEntries();
        const stats = {};
        
        for (const entry of allEntries) {
            const group = entry.group || '未分组';
            if (!stats[group]) {
                stats[group] = {
                    count: 0,
                    enabled: 0,
                    triggered: 0,
                    color: entry.color || '#888888'
                };
            }
            stats[group].count++;
            if (entry.enabled !== false) stats[group].enabled++;
            if (this.stats[entry.id]?.triggeredCount > 0) {
                stats[group].triggered++;
            }
        }
        
        return stats;
    }

    /**
     * 更新条目
     */
    updateEntry(entryId, updates, isUserEntry = false) {
        const list = isUserEntry ? this.userEntries : this.globalEntries;
        const idx = list.findIndex(e => e.id === entryId);
        
        if (idx >= 0) {
            list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
            this._clearCache();
            return list[idx];
        }
        return null;
    }

    /**
     * 删除条目
     */
    deleteEntry(entryId, isUserEntry = false) {
        const list = isUserEntry ? this.userEntries : this.globalEntries;
        const idx = list.findIndex(e => e.id === entryId);
        
        if (idx >= 0) {
            const deleted = list.splice(idx, 1)[0];
            this._clearCache();
            delete this.stats[entryId];
            return deleted;
        }
        return null;
    }

    /**
     * 测试条目匹配
     */
    testEntry(entry, testText) {
        return this._checkEntryTrigger(entry, testText);
    }

    /**
     * 导出配置
     */
    export() {
        return {
            globalEntries: this.globalEntries,
            userEntries: this.userEntries,
            groups: this.groups,
            stats: this.stats,
            exportTime: new Date().toISOString()
        };
    }

    /**
     * 导入配置
     */
    import(data, options = {}) {
        if (options.clearExisting) {
            this.globalEntries = [];
            this.userEntries = [];
        }
        
        if (data.globalEntries && !options.userOnly) {
            this.globalEntries = [...this.globalEntries, ...data.globalEntries];
        }
        
        if (data.userEntries) {
            this.userEntries = [...this.userEntries, ...data.userEntries];
        }
        
        if (data.groups) {
            this.groups = { ...this.groups, ...data.groups };
        }
        
        this._clearCache();
    }

    // ==================== 私有方法 ====================

    _normalizeEntry(entry) {
        return {
            id: entry.id || 'wb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: entry.name || '未命名条目',
            keys: Array.isArray(entry.keys) ? entry.keys : [entry.keys || ''].filter(Boolean),
            matchType: entry.matchType || 'contains',
            caseSensitive: entry.caseSensitive || false,
            excludeKeys: entry.excludeKeys || [],
            priority: entry.priority ?? 100,
            content: entry.content || '',
            insertPosition: entry.insertPosition || 'character',
            insertDepth: entry.insertDepth || 0,
            group: entry.group || '默认',
            color: entry.color || this._getGroupColor(entry.group),
            enabled: entry.enabled !== false,
            constant: entry.constant || false,
            createdAt: entry.createdAt || new Date().toISOString(),
            updatedAt: entry.updatedAt || new Date().toISOString(),
            ...entry
        };
    }

    _getGroupColor(group) {
        const colors = {
            '地理': '#8B4513',
            '人物': '#4A90E2',
            '组织': '#E74C3C',
            '历史': '#9B59B6',
            '物品': '#27AE60',
            '事件': '#F39C12',
            '默认': '#888888'
        };
        return colors[group] || colors['默认'];
    }

    _shouldCheckEntry(entry, context) {
        // 检查是否启用
        if (entry.enabled === false) return false;
        
        // 恒常条目始终检查
        if (entry.constant) return true;
        
        // 检查冷却时间
        if (entry.cooldown && this.stats[entry.id]?.lastTriggered) {
            const lastTime = new Date(this.stats[entry.id].lastTriggered).getTime();
            const now = Date.now();
            if (now - lastTime < entry.cooldown * 1000) return false;
        }
        
        // 检查最大触发次数
        if (entry.maxTriggers && this.stats[entry.id]?.triggeredCount >= entry.maxTriggers) {
            return false;
        }
        
        // 检查位置过滤
        if (context.location && entry.requireLocation) {
            if (!entry.requireLocation.includes(context.location)) return false;
        }
        
        return true;
    }

    _checkEntryTrigger(entry, text) {
        const { keys, matchType, caseSensitive, excludeKeys } = entry;
        
        if (!keys || keys.length === 0) return false;
        
        const searchText = caseSensitive ? text : text.toLowerCase();
        
        // 检查关键词匹配
        const isTriggered = keys.some(key => {
            const searchKey = caseSensitive ? key : key.toLowerCase();
            
            switch (matchType) {
                case 'exact':
                    return searchText === searchKey;
                case 'prefix':
                    return searchText.startsWith(searchKey);
                case 'suffix':
                    return searchText.endsWith(searchKey);
                case 'regex':
                    try {
                        const regex = new RegExp(key, caseSensitive ? '' : 'i');
                        return regex.test(text);
                    } catch (e) {
                        console.error('Invalid regex:', key);
                        return false;
                    }
                case 'contains':
                default:
                    return searchText.includes(searchKey);
            }
        });
        
        // 检查排除关键词
        if (isTriggered && excludeKeys?.length > 0) {
            const isExcluded = excludeKeys.some(key => {
                const searchKey = caseSensitive ? key : key.toLowerCase();
                return searchText.includes(searchKey);
            });
            if (isExcluded) return false;
        }
        
        return isTriggered;
    }

    _replaceVariables(content, variables) {
        let result = content;
        
        // 标准变量
        const varMap = {
            '{{user}}': variables.user || '玩家',
            '{{char}}': variables.char || '角色',
            '{{world}}': variables.world || '世界',
            '{{location}}': variables.location || '',
            '{{time}}': variables.time || new Date().toLocaleString('zh-CN'),
            '{{date}}': new Date().toLocaleDateString('zh-CN'),
            '{{random}}': Math.random(),
        };
        
        for (const [key, value] of Object.entries(varMap)) {
            result = result.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
        }
        
        // 自定义变量
        if (variables.custom) {
            for (const [key, value] of Object.entries(variables.custom)) {
                result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
            }
        }
        
        return result;
    }

    _processInsertions(content, availableEntries, variables) {
        // 处理 {{insert::entryId}} 语法
        const insertPattern = /\{\{insert::([^}]+)\}\}/g;
        return content.replace(insertPattern, (match, entryId) => {
            const entry = availableEntries.find(e => e.id === entryId);
            if (entry) {
                return this._replaceVariables(entry.content, variables);
            }
            return '';
        });
    }

    _updateStats(entryId) {
        if (!this.stats[entryId]) {
            this.stats[entryId] = { triggeredCount: 0, lastTriggered: null };
        }
        this.stats[entryId].triggeredCount++;
        this.stats[entryId].lastTriggered = new Date().toISOString();
    }

    _clearCache() {
        this._cache.clear();
    }
}

// ==================== 静态工具方法 ====================

WorldbookEngine.createDefaultEntry = function(overrides = {}) {
    return {
        id: 'wb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        name: '新条目',
        keys: ['关键词'],
        matchType: 'contains',
        caseSensitive: false,
        excludeKeys: [],
        priority: 100,
        content: '',
        insertPosition: 'character',
        insertDepth: 0,
        group: '默认',
        enabled: true,
        constant: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...overrides
    };
};

WorldbookEngine.validateEntry = function(entry) {
    const errors = [];
    
    if (!entry.name || entry.name.trim() === '') {
        errors.push('条目名称不能为空');
    }
    
    if (!entry.keys || entry.keys.length === 0 || entry.keys.every(k => !k.trim())) {
        errors.push('至少需要一个关键词');
    }
    
    if (!entry.content || entry.content.trim() === '') {
        errors.push('内容不能为空');
    }
    
    if (entry.matchType === 'regex') {
        try {
            new RegExp(entry.keys[0]);
        } catch (e) {
            errors.push('正则表达式无效');
        }
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorldbookEngine;
}

// 浏览器全局暴露
if (typeof window !== 'undefined') {
    window.WorldbookEngine = WorldbookEngine;
}
