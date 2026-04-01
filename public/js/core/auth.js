/**
 * 认证模块 - 处理用户认证和授权
 * @module Core/Auth
 * @description 管理JWT令牌、用户会话和权限验证
 */

/**
 * 认证模块存储键名常量
 * @constant {Object}
 */
const AUTH_STORAGE_KEYS = {
    TOKEN: 'token',
    USER: 'user',
    REFRESH_TOKEN: 'refresh_token',
    TOKEN_EXPIRY: 'token_expiry'
};

/**
 * 认证状态对象
 * @type {Object}
 */
const authState = {
    isAuthenticated: false,
    user: null,
    token: null,
    listeners: new Set()
};

/**
 * 认证管理器
 * @namespace Auth
 */
const Auth = {
    /**
     * 初始化认证状态
     * @returns {boolean} 是否已认证
     */
    init() {
        const token = localStorage.getItem(AUTH_STORAGE_KEYS.TOKEN);
        const user = Store.get(AUTH_STORAGE_KEYS.USER);
        
        if (token && user) {
            // 检查令牌是否过期
            if (this.isTokenExpired()) {
                this.logout();
                return false;
            }
            
            authState.token = token;
            authState.user = user;
            authState.isAuthenticated = true;
            this._notifyListeners();
        }
        
        return authState.isAuthenticated;
    },
    
    /**
     * 检查令牌是否过期
     * @returns {boolean}
     */
    isTokenExpired() {
        const expiry = localStorage.getItem(AUTH_STORAGE_KEYS.TOKEN_EXPIRY);
        if (!expiry) return false;
        return new Date().getTime() > parseInt(expiry);
    },
    
    /**
     * 登录
     * @param {string} token - JWT令牌
     * @param {Object} user - 用户信息
     * @param {number} expiresIn - 过期时间（秒）
     */
    login(token, user, expiresIn = 7 * 24 * 60 * 60) {
        authState.token = token;
        authState.user = user;
        authState.isAuthenticated = true;
        
        localStorage.setItem(AUTH_STORAGE_KEYS.TOKEN, token);
        Store.set(AUTH_STORAGE_KEYS.USER, user);
        
        // 设置过期时间
        const expiryTime = new Date().getTime() + (expiresIn * 1000);
        localStorage.setItem(AUTH_STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());
        
        this._notifyListeners();
    },
    
    /**
     * 登出
     */
    logout() {
        authState.token = null;
        authState.user = null;
        authState.isAuthenticated = false;
        
        Object.values(STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
        
        this._notifyListeners();
        
        // 重定向到登录页
        window.location.href = '/login.html';
    },
    
    /**
     * 获取当前令牌
     * @returns {string|null}
     */
    getToken() {
        return authState.token;
    },
    
    /**
     * 获取当前用户
     * @returns {Object|null}
     */
    getUser() {
        return authState.user;
    },
    
    /**
     * 检查是否已认证
     * @returns {boolean}
     */
    isLoggedIn() {
        return authState.isAuthenticated;
    },
    
    /**
     * 检查用户角色
     * @param {string} role - 角色名称
     * @returns {boolean}
     */
    hasRole(role) {
        return authState.user?.role === role;
    },
    
    /**
     * 检查是否为管理员
     * @returns {boolean}
     */
    isAdmin() {
        return this.hasRole('admin');
    },
    
    /**
     * 订阅认证状态变化
     * @param {Function} callback - 回调函数
     * @returns {Function} 取消订阅函数
     */
    subscribe(callback) {
        authState.listeners.add(callback);
        return () => authState.listeners.delete(callback);
    },
    
    /**
     * 通知所有监听器
     * @private
     */
    _notifyListeners() {
        authState.listeners.forEach(cb => cb(authState));
    },
    
    /**
     * 更新用户信息
     * @param {Object} updates - 更新的字段
     */
    updateUser(updates) {
        authState.user = { ...authState.user, ...updates };
        Store.set(AUTH_STORAGE_KEYS.USER, authState.user);
        this._notifyListeners();
    },
    
    /**
     * 保护路由 - 未登录时重定向
     * @param {string} [redirectUrl='/login.html'] - 重定向地址
     * @returns {boolean} 是否已通过检查
     */
    guard(redirectUrl = '/login.html') {
        if (!this.isLoggedIn()) {
            window.location.href = redirectUrl;
            return false;
        }
        return true;
    }
};

/**
 * 权限检查装饰器
 * @param {string[]} allowedRoles - 允许的角色列表
 * @returns {Function} 装饰器函数
 */
function requireRole(...allowedRoles) {
    return function(target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        
        descriptor.value = function(...args) {
            if (!Auth.isLoggedIn()) {
                throw new Error('请先登录');
            }
            
            if (!allowedRoles.includes(Auth.getUser()?.role)) {
                throw new Error('权限不足');
            }
            
            return originalMethod.apply(this, args);
        };
        
        return descriptor;
    };
}

// 自动初始化
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => Auth.init());
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Auth, requireRole, STORAGE_KEYS };
}
