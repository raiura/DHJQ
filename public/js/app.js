/**
 * 应用入口 - 模块统一导出
 * @module App
 * @description 整合所有模块，提供全局访问
 */

/**
 * 应用命名空间
 * @namespace App
 */
const App = {
    /**
     * 核心模块
     * @namespace
     */
    Core: {
        API,
        APIError,
        API_CONFIG,
        ResponseHandler,
        getAuthHeaders,
        Auth,
        STORAGE_KEYS,
        Store,
        SessionStore,
        StoreManager,
        createNamespaceStore,
        AppStores,
        DOM,
        Fn,
        Data,
        Format,
        Validate,
        Color
    },
    
    /**
     * UI组件
     * @namespace
     */
    Components: {
        Toast,
        ToastManager,
        TOAST_TYPES,
        TOAST_POSITIONS,
        Modal,
        ModalManager,
        MODAL_CONFIG,
        CharacterCard,
        FAVOR_LEVELS,
        MemoryList,
        MEMORY_TYPES
    },
    
    /**
     * 业务服务
     * @namespace
     */
    Services: {
        CharacterService,
        MemoryService,
        DialogueService
    },
    
    /**
     * 初始化应用
     * @returns {Promise<void>}
     */
    async init() {
        console.log('🎮 Galgame Framework Initializing...');
        
        // 初始化认证状态
        Auth.init();
        
        // 检查存储空间
        this.checkStorage();
        
        console.log('✅ App initialized');
    },
    
    /**
     * 检查存储空间
     * @private
     */
    checkStorage() {
        try {
            const size = Store.size();
            const maxSize = 5 * 1024 * 1024; // 5MB预警
            
            if (size > maxSize) {
                console.warn('⚠️ LocalStorage使用过多，建议清理');
                Toast.warning('存储空间不足，建议清理历史数据');
            }
        } catch (e) {
            console.error('Storage check failed:', e);
        }
    },
    
    /**
     * 全局错误处理
     * @param {Error} error - 错误对象
     * @param {Object} [context={}] - 上下文信息
     */
    handleError(error, context = {}) {
        console.error('App Error:', error, context);
        
        // 显示错误提示
        const message = error.message || '发生未知错误';
        Toast.error(message, { title: '错误' });
        
        // 如果是认证错误，重定向到登录
        if (error.statusCode === 401) {
            Auth.logout();
        }
    },
    
    /**
     * 页面加载器 - 按顺序加载脚本
     * @param {string[]} scripts - 脚本URL数组
     * @returns {Promise<void>}
     */
    async loadScripts(scripts) {
        for (const src of scripts) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }
    }
};

// 全局错误监听
window.addEventListener('error', (e) => {
    App.handleError(e.error, { type: 'window.error' });
});

window.addEventListener('unhandledrejection', (e) => {
    App.handleError(e.reason, { type: 'unhandledrejection' });
});

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { App };
}
