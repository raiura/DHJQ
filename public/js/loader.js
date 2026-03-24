/**
 * 模块加载器 - 支持按需加载和依赖管理
 * @module Loader
 * @description 提供脚本和样式的动态加载，支持依赖解析
 */

/**
 * 模块注册表
 * @type {Map<string, Object>}
 */
const moduleRegistry = new Map();

/**
 * 已加载的模块
 * @type {Set<string>}
 */
const loadedModules = new Set();

/**
 * 模块定义
 * @typedef {Object} ModuleDefinition
 * @property {string} name - 模块名称
 * @property {string[]} [deps] - 依赖模块
 * @property {string[]} [scripts] - 脚本URL列表
 * @property {string[]} [styles] - 样式URL列表
 * @property {Function} [init] - 初始化函数
 */

/**
 * 模块加载器
 * @namespace Loader
 */
const Loader = {
    /**
     * 注册模块
     * @param {ModuleDefinition} definition - 模块定义
     */
    register(definition) {
        moduleRegistry.set(definition.name, definition);
    },
    
    /**
     * 加载模块
     * @param {string|string[]} names - 模块名称或名称数组
     * @returns {Promise<void>}
     */
    async load(names) {
        const nameList = Array.isArray(names) ? names : [names];
        
        for (const name of nameList) {
            await this.loadSingle(name);
        }
    },
    
    /**
     * 加载单个模块
     * @private
     * @param {string} name - 模块名称
     * @returns {Promise<void>}
     */
    async loadSingle(name) {
        // 已加载则跳过
        if (loadedModules.has(name)) return;
        
        const definition = moduleRegistry.get(name);
        if (!definition) {
            throw new Error(`Module not found: ${name}`);
        }
        
        // 先加载依赖
        if (definition.deps) {
            await this.load(definition.deps);
        }
        
        // 加载样式
        if (definition.styles) {
            await Promise.all(definition.styles.map(s => this.loadStyle(s)));
        }
        
        // 加载脚本
        if (definition.scripts) {
            await Promise.all(definition.scripts.map(s => this.loadScript(s)));
        }
        
        // 执行初始化
        if (definition.init) {
            await definition.init();
        }
        
        loadedModules.add(name);
        console.log(`✅ Module loaded: ${name}`);
    },
    
    /**
     * 加载脚本
     * @param {string} url - 脚本URL
     * @param {number} [timeout=10000] - 超时时间（毫秒）
     * @returns {Promise<void>}
     */
    loadScript(url, timeout = 10000) {
        return new Promise((resolve, reject) => {
            // 检查是否已存在
            if (document.querySelector(`script[src="${url}"]`)) {
                resolve();
                return;
            }
            
            // 设置超时
            const timer = setTimeout(() => {
                reject(new Error(`Load timeout: ${url}`));
            }, timeout);
            
            const script = document.createElement('script');
            script.src = url;
            script.async = true;
            script.onload = () => {
                clearTimeout(timer);
                resolve();
            };
            script.onerror = () => {
                clearTimeout(timer);
                reject(new Error(`Failed to load: ${url}`));
            };
            document.head.appendChild(script);
        });
    },
    
    /**
     * 加载样式
     * @param {string} url - 样式URL
     * @returns {Promise<void>}
     */
    loadStyle(url) {
        return new Promise((resolve, reject) => {
            // 检查是否已存在
            if (document.querySelector(`link[href="${url}"]`)) {
                resolve();
                return;
            }
            
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            link.onload = resolve;
            link.onerror = () => reject(new Error(`Failed to load: ${url}`));
            document.head.appendChild(link);
        });
    },
    
    /**
     * 预加载模块
     * @param {string[]} names - 模块名称数组
     */
    preload(names) {
        requestIdleCallback(() => {
            names.forEach(name => {
                const def = moduleRegistry.get(name);
                if (def?.scripts) {
                    def.scripts.forEach(url => {
                        const link = document.createElement('link');
                        link.rel = 'prefetch';
                        link.href = url;
                        document.head.appendChild(link);
                    });
                }
            });
        });
    },
    
    /**
     * 检查模块是否已加载
     * @param {string} name - 模块名称
     * @returns {boolean}
     */
    isLoaded(name) {
        return loadedModules.has(name);
    },
    
    /**
     * 获取已加载模块列表
     * @returns {string[]}
     */
    getLoadedModules() {
        return [...loadedModules];
    }
};

// ===== 注册默认模块 =====

Loader.register({
    name: 'core',
    scripts: [
        'js/core/api.js',
        'js/core/store.js',
        'js/core/utils.js',
        'js/core/auth.js'
    ]
});

Loader.register({
    name: 'components',
    deps: ['core'],
    scripts: [
        'js/components/Toast.js',
        'js/components/Modal.js',
        'js/components/CharacterCard.js',
        'js/components/MemoryList.js'
    ]
});

Loader.register({
    name: 'services',
    deps: ['core'],
    scripts: [
        'js/services/characterService.js',
        'js/services/memoryService.js',
        'js/services/dialogueService.js'
    ]
});

Loader.register({
    name: 'app',
    deps: ['core', 'components', 'services'],
    scripts: ['js/app.js'],
    styles: ['css/base.css', 'css/components.css']
});

// ===== 工具模块 =====
Loader.register({
    name: 'utils',
    scripts: [
        'js/utils/lazyLoad.js'
    ],
    styles: ['css/lazyload.css'],
    init() {
        // 自动初始化懒加载
        if (typeof autoInit !== 'undefined') {
            autoInit();
        }
    }
});

// ===== 游戏模块（用于 galgame_framework.html）=====
Loader.register({
    name: 'game',
    deps: ['core', 'components', 'utils'],
    scripts: [
        'js/core/chapterTemplates.js',
        'js/core/experienceTriggers.js',
        'js/core/experienceGenerator.js',
        'js/core/playerMemorySystem.js',
        'js/core/saveTypes.js',
        'js/services/chapterSaveManager.js',
        'js/services/dialogueProcessor.js',
        'js/services/saveManager.js',
        'js/game/game-main.js'
    ],
    styles: ['css/game.css']
});

// ===== 设置模块（用于 settings.html）=====
Loader.register({
    name: 'settings',
    deps: ['core', 'components'],
    scripts: [
        'js/core/chapterTemplates.js',
        'js/services/chapterSaveManager.js',
        'js/settings/settings-main.js'
    ],
    styles: ['css/base.css', 'css/components.css']
});

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Loader };
}
