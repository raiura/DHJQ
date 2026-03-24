/**
 * 存储模块 - 本地存储封装
 * @module Core/Store
 * @description 提供localStorage/sessionStorage的增强封装，支持对象序列化
 */

/**
 * 存储类型
 * @readonly
 * @enum {string}
 */
const StorageType = {
    LOCAL: 'localStorage',
    SESSION: 'sessionStorage'
};

/**
 * 存储管理器类
 * @class StoreManager
 */
class StoreManager {
    /**
     * @param {StorageType} type - 存储类型
     * @param {string} prefix - 键名前缀
     */
    constructor(type = StorageType.LOCAL, prefix = 'galgame_') {
        this.storage = type === StorageType.LOCAL ? localStorage : sessionStorage;
        this.prefix = prefix;
    }
    
    /**
     * 生成完整键名
     * @private
     * @param {string} key - 原始键名
     * @returns {string} 带前缀的键名
     */
    _key(key) {
        return `${this.prefix}${key}`;
    }
    
    /**
     * 设置值
     * @param {string} key - 键名
     * @param {*} value - 值（支持对象）
     * @returns {StoreManager} 链式调用
     */
    set(key, value) {
        try {
            const serialized = JSON.stringify({
                value,
                timestamp: new Date().toISOString()
            });
            this.storage.setItem(this._key(key), serialized);
        } catch (e) {
            console.error('Store set error:', e);
        }
        return this;
    }
    
    /**
     * 获取值
     * @param {string} key - 键名
     * @param {*} defaultValue - 默认值
     * @returns {*} 存储的值或默认值
     */
    get(key, defaultValue = null) {
        try {
            const item = this.storage.getItem(this._key(key));
            if (!item) return defaultValue;
            
            const parsed = JSON.parse(item);
            return parsed.value;
        } catch (e) {
            console.error('Store get error:', e);
            return defaultValue;
        }
    }
    
    /**
     * 删除值
     * @param {string} key - 键名
     * @returns {StoreManager}
     */
    remove(key) {
        this.storage.removeItem(this._key(key));
        return this;
    }
    
    /**
     * 清空所有值
     * @returns {StoreManager}
     */
    clear() {
        // 只清除带前缀的键
        const keys = [];
        for (let i = 0; i < this.storage.length; i++) {
            const key = this.storage.key(i);
            if (key?.startsWith(this.prefix)) {
                keys.push(key);
            }
        }
        keys.forEach(key => this.storage.removeItem(key));
        return this;
    }
    
    /**
     * 检查键是否存在
     * @param {string} key - 键名
     * @returns {boolean}
     */
    has(key) {
        return this._key(key) in this.storage;
    }
    
    /**
     * 获取所有键
     * @returns {string[]}
     */
    keys() {
        const keys = [];
        for (let i = 0; i < this.storage.length; i++) {
            const key = this.storage.key(i);
            if (key?.startsWith(this.prefix)) {
                keys.push(key.slice(this.prefix.length));
            }
        }
        return keys;
    }
    
    /**
     * 获取存储大小（字节）
     * @returns {number}
     */
    size() {
        let size = 0;
        for (let i = 0; i < this.storage.length; i++) {
            const key = this.storage.key(i);
            if (key?.startsWith(this.prefix)) {
                size += key.length + (this.storage.getItem(key)?.length || 0);
            }
        }
        return size * 2; // UTF-16编码，每个字符2字节
    }
    
    /**
     * 设置带过期时间的值
     * @param {string} key - 键名
     * @param {*} value - 值
     * @param {number} ttl - 过期时间（毫秒）
     * @returns {StoreManager}
     */
    setWithExpiry(key, value, ttl) {
        const item = {
            value,
            expiry: new Date().getTime() + ttl
        };
        this.storage.setItem(this._key(key), JSON.stringify(item));
        return this;
    }
    
    /**
     * 获取值（自动检查过期）
     * @param {string} key - 键名
     * @param {*} defaultValue - 默认值
     * @returns {*} 值或默认值
     */
    getWithExpiry(key, defaultValue = null) {
        try {
            const item = this.storage.getItem(this._key(key));
            if (!item) return defaultValue;
            
            const parsed = JSON.parse(item);
            
            // 检查是否过期
            if (parsed.expiry && new Date().getTime() > parsed.expiry) {
                this.remove(key);
                return defaultValue;
            }
            
            return parsed.value;
        } catch (e) {
            return defaultValue;
        }
    }
}

/**
 * 全局本地存储实例
 * @constant {StoreManager}
 */
const Store = new StoreManager(StorageType.LOCAL);

/**
 * 全局会话存储实例
 * @constant {StoreManager}
 */
const SessionStore = new StoreManager(StorageType.SESSION);

/**
 * 命名空间存储 - 创建带特定前缀的存储实例
 * @param {string} namespace - 命名空间
 * @param {StorageType} type - 存储类型
 * @returns {StoreManager}
 */
function createNamespaceStore(namespace, type = StorageType.LOCAL) {
    return new StoreManager(type, `galgame_${namespace}_`);
}

/**
 * 特定用途的存储命名空间
 * @namespace AppStores
 */
const AppStores = {
    /** @type {StoreManager} 角色好感度数据 */
    favor: createNamespaceStore('favor'),
    
    /** @type {StoreManager} 游戏记忆数据 */
    memories: createNamespaceStore('memories'),
    
    /** @type {StoreManager} 用户设置 */
    settings: createNamespaceStore('settings'),
    
    /** @type {StoreManager} 游戏状态 */
    game: createNamespaceStore('game'),
    
    /** @type {StoreManager} 用户偏好 */
    preferences: createNamespaceStore('preferences')
};

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StoreManager, Store, SessionStore, createNamespaceStore, AppStores, StorageType };
}
