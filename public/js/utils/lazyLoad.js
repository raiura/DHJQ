/**
 * 懒加载工具
 * @module Utils/LazyLoad
 * @description 提供图片和组件的懒加载功能
 */

/**
 * 图片懒加载器
 * @class LazyImageLoader
 */
class LazyImageLoader {
    /**
     * @param {Object} options - 配置选项
     * @param {string} [options.selector='[data-lazy]'] - 懒加载图片选择器
     * @param {string} [options.srcAttr='data-src'] - 图片URL属性
     * @param {string} [options.rootMargin='50px'] - 根边距
     * @param {number} [options.threshold=0.01] - 交叉阈值
     * @param {number} [options.timeout=10000] - 加载超时时间
     */
    constructor(options = {}) {
        this.selector = options.selector || '[data-lazy]';
        this.srcAttr = options.srcAttr || 'data-src';
        this.rootMargin = options.rootMargin || '50px';
        this.threshold = options.threshold || 0.01;
        this.timeout = options.timeout || 10000;
        
        this.imageCache = new Map();
        this.observer = null;
        this.loadedCount = 0;
        this.errorCount = 0;
    }

    /**
     * 初始化懒加载
     */
    init() {
        // 检查浏览器支持
        if (!('IntersectionObserver' in window)) {
            console.warn('[LazyImageLoader] IntersectionObserver not supported, loading all images');
            this.loadAll();
            return;
        }

        // 创建观察器
        this.observer = new IntersectionObserver(
            (entries) => this.handleIntersect(entries),
            {
                rootMargin: this.rootMargin,
                threshold: this.threshold
            }
        );

        // 观察所有目标图片
        const images = document.querySelectorAll(this.selector);
        images.forEach(img => {
            // 添加加载动画样式
            img.classList.add('lazy-loading');
            this.observer.observe(img);
        });

        console.log(`[LazyImageLoader] Initialized, watching ${images.length} images`);
    }

    /**
     * 处理交叉观察回调
     * @private
     * @param {IntersectionObserverEntry[]} entries
     */
    handleIntersect(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                this.loadImage(entry.target);
                this.observer.unobserve(entry.target);
            }
        });
    }

    /**
     * 加载单张图片
     * @private
     * @param {HTMLImageElement} img
     */
    loadImage(img) {
        const src = img.getAttribute(this.srcAttr);
        if (!src) {
            console.warn('[LazyImageLoader] No data-src found:', img);
            return;
        }

        // 如果已在缓存中，直接显示
        if (this.imageCache.has(src)) {
            this.applyImage(img, src);
            return;
        }

        // 创建加载器
        const loader = new Image();
        let timeoutId;

        // 加载成功
        loader.onload = () => {
            clearTimeout(timeoutId);
            this.imageCache.set(src, true);
            this.applyImage(img, src);
            this.loadedCount++;
        };

        // 加载失败
        loader.onerror = () => {
            clearTimeout(timeoutId);
            this.handleError(img, src);
            this.errorCount++;
        };

        // 超时处理
        timeoutId = setTimeout(() => {
            loader.src = '';
            this.handleError(img, src, 'timeout');
            this.errorCount++;
        }, this.timeout);

        loader.src = src;
    }

    /**
     * 应用图片到元素
     * @private
     * @param {HTMLImageElement} img
     * @param {string} src
     */
    applyImage(img, src) {
        img.src = src;
        img.classList.remove('lazy-loading');
        img.classList.add('lazy-loaded');
        
        // 触发自定义事件
        img.dispatchEvent(new CustomEvent('lazyLoaded', { detail: { src } }));
    }

    /**
     * 处理加载错误
     * @private
     * @param {HTMLImageElement} img
     * @param {string} src
     * @param {string} [reason='error']
     */
    handleError(img, src, reason = 'error') {
        console.error(`[LazyImageLoader] Failed to load image (${reason}):`, src);
        img.classList.remove('lazy-loading');
        img.classList.add('lazy-error');
        
        // 设置备用图片
        if (img.dataset.fallback) {
            img.src = img.dataset.fallback;
        }
        
        // 触发自定义事件
        img.dispatchEvent(new CustomEvent('lazyError', { detail: { src, reason } }));
    }

    /**
     * 加载所有图片（用于不支持 IntersectionObserver 的浏览器）
     * @private
     */
    loadAll() {
        document.querySelectorAll(this.selector).forEach(img => {
            this.loadImage(img);
        });
    }

    /**
     * 刷新（重新观察新添加的图片）
     */
    refresh() {
        if (!this.observer) return;
        
        document.querySelectorAll(this.selector).forEach(img => {
            if (!img.classList.contains('lazy-loaded') && !img.classList.contains('lazy-loading')) {
                img.classList.add('lazy-loading');
                this.observer.observe(img);
            }
        });
    }

    /**
     * 销毁观察器
     */
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        this.imageCache.clear();
    }

    /**
     * 获取统计信息
     * @returns {Object}
     */
    getStats() {
        return {
            loaded: this.loadedCount,
            errors: this.errorCount,
            cached: this.imageCache.size
        };
    }
}

/**
 * 组件懒加载器
 * @class LazyComponentLoader
 */
class LazyComponentLoader {
    /**
     * @param {Object} components - 组件映射 { name: loaderFunction }
     */
    constructor(components = {}) {
        this.components = components;
        this.loaded = new Map();
    }

    /**
     * 注册组件
     * @param {string} name - 组件名称
     * @param {Function} loader - 加载函数，返回 Promise
     */
    register(name, loader) {
        this.components[name] = loader;
    }

    /**
     * 加载组件
     * @param {string} name - 组件名称
     * @returns {Promise<any>}
     */
    async load(name) {
        if (this.loaded.has(name)) {
            return this.loaded.get(name);
        }

        const loader = this.components[name];
        if (!loader) {
            throw new Error(`Component not found: ${name}`);
        }

        try {
            const component = await loader();
            this.loaded.set(name, component);
            return component;
        } catch (error) {
            console.error(`[LazyComponentLoader] Failed to load component: ${name}`, error);
            throw error;
        }
    }

    /**
     * 预加载组件
     * @param {string[]} names - 组件名称列表
     */
    preload(names) {
        requestIdleCallback(() => {
            names.forEach(name => {
                if (!this.loaded.has(name)) {
                    this.load(name).catch(() => {});
                }
            });
        });
    }

    /**
     * 检查组件是否已加载
     * @param {string} name
     * @returns {boolean}
     */
    isLoaded(name) {
        return this.loaded.has(name);
    }
}

/**
 * 创建默认懒加载实例
 */
const lazyImageLoader = new LazyImageLoader();
const lazyComponentLoader = new LazyComponentLoader();

/**
 * 自动初始化（DOMContentLoaded 后）
 */
function autoInit() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            lazyImageLoader.init();
        });
    } else {
        lazyImageLoader.init();
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        LazyImageLoader,
        LazyComponentLoader,
        lazyImageLoader,
        lazyComponentLoader,
        autoInit
    };
}
