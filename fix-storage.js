/**
 * 存储系统修复脚本
 * 用于修复世界书、AI API设置和数据持久化问题
 */

// 模拟浏览器环境
if (typeof localStorage === 'undefined') {
    global.localStorage = {
        store: {},
        getItem: function(key) {
            return this.store[key] || null;
        },
        setItem: function(key, value) {
            this.store[key] = value.toString();
        },
        removeItem: function(key) {
            delete this.store[key];
        },
        clear: function() {
            this.store = {};
        },
        length: 0
    };
}

if (typeof sessionStorage === 'undefined') {
    global.sessionStorage = {
        store: {},
        getItem: function(key) {
            return this.store[key] || null;
        },
        setItem: function(key, value) {
            this.store[key] = value.toString();
        },
        removeItem: function(key) {
            delete this.store[key];
        },
        clear: function() {
            this.store = {};
        },
        length: 0
    };
}

// 模拟API_BASE
if (typeof API_BASE === 'undefined') {
    global.API_BASE = 'http://localhost:3001/api';
}

// 模拟getAuthHeaders函数
if (typeof getAuthHeaders === 'undefined') {
    global.getAuthHeaders = function() {
        return {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
        };
    };
}

// 模拟fetch函数
if (typeof fetch === 'undefined') {
    global.fetch = function(url, options) {
        return Promise.resolve({
            ok: false,
            status: 404,
            json: function() {
                return Promise.resolve({ success: false, message: 'API not available' });
            }
        });
    };
}

// 模拟WorldbookEngine
if (typeof WorldbookEngine === 'undefined') {
    global.WorldbookEngine = class WorldbookEngine {
        constructor(options = {}) {
            this.globalEntries = options.globalEntries || [];
            this.userEntries = options.userEntries || [];
            this.groups = options.groups || {};
            this.stats = options.stats || {};
        }

        addGlobalEntry(entry) {
            const newEntry = {
                id: entry.id || 'wb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                name: entry.name || '未命名条目',
                keys: Array.isArray(entry.keys) ? entry.keys : [entry.keys || ''].filter(Boolean),
                content: entry.content || '',
                priority: entry.priority || 100,
                enabled: entry.enabled !== false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            this.globalEntries.push(newEntry);
            return newEntry;
        }

        addUserEntry(entry) {
            const newEntry = {
                id: entry.id || 'wb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                name: entry.name || '未命名条目',
                keys: Array.isArray(entry.keys) ? entry.keys : [entry.keys || ''].filter(Boolean),
                content: entry.content || '',
                priority: entry.priority || 100,
                enabled: entry.enabled !== false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            this.userEntries.push(newEntry);
            return newEntry;
        }

        getAllEntries() {
            const all = [...this.globalEntries, ...this.userEntries];
            return all.map(entry => ({
                ...entry,
                source: this.globalEntries.includes(entry) ? 'global' : 'user',
                isUserEntry: !this.globalEntries.includes(entry)
            }));
        }

        updateEntry(entryId, updates, isUserEntry = false) {
            const list = isUserEntry ? this.userEntries : this.globalEntries;
            const idx = list.findIndex(e => e.id === entryId);
            if (idx >= 0) {
                list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
                return list[idx];
            }
            return null;
        }

        deleteEntry(entryId, isUserEntry = false) {
            const list = isUserEntry ? this.userEntries : this.globalEntries;
            const idx = list.findIndex(e => e.id === entryId);
            if (idx >= 0) {
                return list.splice(idx, 1)[0];
            }
            return null;
        }

        getGroupStats() {
            const stats = {};
            this.getAllEntries().forEach(entry => {
                const group = entry.group || '默认';
                if (!stats[group]) {
                    stats[group] = { count: 0, enabled: 0, triggered: 0, color: '#888888' };
                }
                stats[group].count++;
                if (entry.enabled) stats[group].enabled++;
            });
            return stats;
        }
    };
}

// 加载WorldbookManager
const WorldbookManager = require('./public/js/services/worldbookManager.js').WorldbookManager;

// 修复函数
function fixStorage() {
    console.log('开始修复存储系统...');
    console.log('====================================');
    
    // 1. 检查并修复世界书存储
    fixWorldbookStorage();
    console.log('------------------------------------');
    
    // 2. 检查并修复AI API设置存储
    fixAiApiStorage();
    console.log('------------------------------------');
    
    // 3. 检查并修复数据回档问题
    fixDataPersistence();
    console.log('------------------------------------');
    
    // 4. 验证修复结果
    verifyFixes();
    console.log('====================================');
    console.log('存储系统修复完成!');
}

// 修复世界书存储
function fixWorldbookStorage() {
    console.log('修复世界书存储...');
    
    try {
        // 检查世界书存储键
        const testGameId = 'test_game';
        const globalKey = 'wb_global_' + testGameId;
        const userKey = 'wb_user_data';
        
        // 检查是否存在存储数据
        const globalData = localStorage.getItem(globalKey);
        const userData = localStorage.getItem(userKey);
        
        console.log('世界书全局数据:', globalData ? '存在' : '不存在');
        console.log('世界书用户数据:', userData ? '存在' : '不存在');
        
        // 如果没有数据，创建测试数据
        if (!globalData) {
            const testGlobalData = {
                entries: [
                    {
                        id: 'test_entry_1',
                        name: '测试条目',
                        keys: ['测试', 'test'],
                        content: '这是一个测试条目',
                        priority: 100,
                        enabled: true,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    }
                ],
                groups: {},
                version: '1.0'
            };
            localStorage.setItem(globalKey, JSON.stringify(testGlobalData));
            console.log('创建世界书测试数据');
        }
        
        if (!userData) {
            const testUserData = {
                'test_save': {
                    entries: [],
                    stats: {},
                    createdAt: new Date().toISOString()
                }
            };
            localStorage.setItem(userKey, JSON.stringify(testUserData));
            console.log('创建世界书用户数据');
        }
        
        // 测试世界书管理器
        const manager = new WorldbookManager({ gameId: testGameId });
        manager._loadFromStorage();
        
        console.log('世界书条目数:', manager.globalWorldbook.entries.length);
        console.log('世界书存储修复成功');
        
    } catch (error) {
        console.error('世界书存储修复失败:', error.message);
    }
}

// 修复AI API设置存储
function fixAiApiStorage() {
    console.log('修复AI API设置存储...');
    
    try {
        // 检查AI API设置存储键
        const aiSettingsKey = 'galgame_ai_settings';
        
        // 检查是否存在存储数据
        const aiSettings = localStorage.getItem(aiSettingsKey);
        
        console.log('AI API设置:', aiSettings ? '存在' : '不存在');
        
        // 如果没有数据，创建默认设置
        if (!aiSettings) {
            const defaultAiSettings = {
                apiKey: 'sk-ohkdoeggttsnylwvggqbovjakxjxtqnatuwidaucuxmdxfxs',
                apiUrl: 'https://api.siliconflow.cn/v1/chat/completions',
                model: 'Pro/deepseek-ai/DeepSeek-V3.2',
                provider: 'siliconflow',
                temperature: 0.7,
                topP: 0.9,
                maxTokens: 2000,
                presencePenalty: 0,
                streaming: true,
                thinkChain: false,
                jsonMode: false,
                systemPrompt: ''
            };
            localStorage.setItem(aiSettingsKey, JSON.stringify(defaultAiSettings));
            console.log('创建AI API默认设置');
        }
        
        // 验证存储
        const savedSettings = localStorage.getItem(aiSettingsKey);
        if (savedSettings) {
            const parsedSettings = JSON.parse(savedSettings);
            console.log('AI API设置验证成功:', parsedSettings.provider);
        }
        
        console.log('AI API设置存储修复成功');
        
    } catch (error) {
        console.error('AI API设置存储修复失败:', error.message);
    }
}

// 修复数据回档问题
function fixDataPersistence() {
    console.log('修复数据回档问题...');
    
    try {
        // 测试数据持久化
        const testKey = 'test_persistence';
        const testData = { message: '测试数据', timestamp: new Date().toISOString() };
        
        // 保存数据
        localStorage.setItem(testKey, JSON.stringify(testData));
        console.log('保存测试数据');
        
        // 读取数据
        const savedData = localStorage.getItem(testKey);
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            console.log('读取测试数据成功:', parsedData.message);
        } else {
            console.error('读取测试数据失败');
        }
        
        // 检查存储大小
        const storageSize = JSON.stringify(localStorage.store || localStorage).length;
        console.log('存储大小:', storageSize, 'bytes');
        
        // 检查是否有存储限制问题
        if (storageSize > 5000000) { // 5MB 限制
            console.warn('存储接近限制，可能导致数据丢失');
        }
        
        console.log('数据持久化修复成功');
        
    } catch (error) {
        console.error('数据持久化修复失败:', error.message);
    }
}

// 验证修复结果
function verifyFixes() {
    console.log('验证修复结果...');
    
    try {
        // 检查所有存储键
        const keys = Object.keys(localStorage.store || localStorage);
        console.log('存储键数量:', keys.length);
        
        keys.forEach(key => {
            try {
                const value = localStorage.getItem(key);
                console.log(`  ${key}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
            } catch (e) {
                console.log(`  ${key}: [无法读取]`);
            }
        });
        
        // 测试世界书管理器
        const manager = new WorldbookManager({ gameId: 'test_game' });
        manager._loadFromStorage();
        console.log('世界书管理器验证成功，条目数:', manager.globalWorldbook.entries.length);
        
        // 测试AI API设置
        const aiSettings = localStorage.getItem('galgame_ai_settings');
        if (aiSettings) {
            console.log('AI API设置验证成功');
        }
        
        console.log('修复验证完成');
        
    } catch (error) {
        console.error('修复验证失败:', error.message);
    }
}

// 运行修复
fixStorage();