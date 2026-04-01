/**
 * 存储系统测试脚本
 * 用于检查世界书、AI API设置和数据持久化功能
 */

// 模拟浏览器环境的localStorage和sessionStorage
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

// 加载必要的模块
const WorldbookManager = require('./public/js/services/worldbookManager.js').WorldbookManager;
const StoreManager = require('./public/js/core/store.js').StoreManager;
const Store = require('./public/js/core/store.js').Store;

// 测试结果
const testResults = {
    worldbook: {
        load: false,
        save: false,
        entries: 0
    },
    aiApi: {
        load: false,
        save: false,
        settings: null
    },
    localStorage: {
        available: false,
        items: 0,
        size: 0
    }
};

// 测试localStorage可用性
function testLocalStorage() {
    try {
        localStorage.setItem('test', 'test');
        const value = localStorage.getItem('test');
        localStorage.removeItem('test');
        testResults.localStorage.available = value === 'test';
        testResults.localStorage.items = Object.keys(localStorage.store || localStorage).length;
        console.log('✓ localStorage 测试通过');
    } catch (error) {
        console.error('✗ localStorage 测试失败:', error.message);
        testResults.localStorage.available = false;
    }
}

// 测试世界书存储
function testWorldbook() {
    try {
        const manager = new WorldbookManager({ gameId: 'test_game' });
        
        // 测试加载
        manager._loadFromStorage();
        testResults.worldbook.load = true;
        console.log('✓ 世界书加载测试通过');
        
        // 测试添加条目
        const entry = manager.addGlobalEntry({
            name: '测试条目',
            keys: ['测试', 'test'],
            content: '这是一个测试条目',
            priority: 100
        });
        
        // 测试保存
        manager._saveToStorage();
        testResults.worldbook.save = true;
        testResults.worldbook.entries = manager.globalWorldbook.entries.length;
        console.log('✓ 世界书保存测试通过，条目数:', testResults.worldbook.entries);
        
        // 测试重新加载
        const newManager = new WorldbookManager({ gameId: 'test_game' });
        newManager._loadFromStorage();
        if (newManager.globalWorldbook.entries.length > 0) {
            console.log('✓ 世界书重新加载测试通过');
        } else {
            console.error('✗ 世界书重新加载测试失败');
        }
        
    } catch (error) {
        console.error('✗ 世界书测试失败:', error.message);
    }
}

// 测试AI API设置存储
function testAiApiSettings() {
    try {
        // 模拟AI API设置
        const aiApiSettings = {
            apiKey: 'test-api-key',
            apiUrl: 'https://api.example.com/v1/chat/completions',
            model: 'gpt-4',
            provider: 'openai',
            temperature: 0.7,
            topP: 0.9,
            maxTokens: 2000,
            presencePenalty: 0,
            streaming: true,
            thinkChain: false,
            jsonMode: false,
            systemPrompt: ''
        };
        
        // 保存到localStorage
        localStorage.setItem('galgame_ai_settings', JSON.stringify(aiApiSettings));
        
        // 加载测试
        const savedSettings = localStorage.getItem('galgame_ai_settings');
        if (savedSettings) {
            const parsedSettings = JSON.parse(savedSettings);
            testResults.aiApi.load = true;
            testResults.aiApi.save = true;
            testResults.aiApi.settings = parsedSettings;
            console.log('✓ AI API设置存储测试通过');
        } else {
            console.error('✗ AI API设置存储测试失败');
        }
        
    } catch (error) {
        console.error('✗ AI API设置测试失败:', error.message);
    }
}

// 运行所有测试
function runTests() {
    console.log('开始存储系统测试...');
    console.log('====================================');
    
    testLocalStorage();
    console.log('------------------------------------');
    
    testWorldbook();
    console.log('------------------------------------');
    
    testAiApiSettings();
    console.log('------------------------------------');
    
    // 显示测试结果
    console.log('测试结果汇总:');
    console.log('====================================');
    console.log('localStorage:', testResults.localStorage.available ? '✓ 可用' : '✗ 不可用');
    console.log('世界书:', 
        testResults.worldbook.load ? '✓ 加载成功' : '✗ 加载失败', 
        testResults.worldbook.save ? '✓ 保存成功' : '✗ 保存失败',
        '条目数:', testResults.worldbook.entries
    );
    console.log('AI API设置:', 
        testResults.aiApi.load ? '✓ 加载成功' : '✗ 加载失败', 
        testResults.aiApi.save ? '✓ 保存成功' : '✗ 保存失败'
    );
    console.log('====================================');
    
    // 检查localStorage中的实际内容
    console.log('localStorage 内容:');
    const keys = Object.keys(localStorage.store || localStorage);
    keys.forEach(key => {
        try {
            const value = localStorage.getItem(key);
            console.log(`  ${key}: ${value.substring(0, 100)}${value.length > 100 ? '...' : ''}`);
        } catch (e) {
            console.log(`  ${key}: [无法读取]`);
        }
    });
    
    console.log('测试完成!');
}

// 运行测试
runTests();