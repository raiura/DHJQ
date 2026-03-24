/**
 * Toast通知组件 - 轻量级消息提示
 * @module Components/Toast
 * @description 提供多种类型的消息提示，支持自动关闭和队列管理
 */

/**
 * Toast类型配置
 * @constant {Object}
 */
const TOAST_TYPES = {
    SUCCESS: { icon: '✓', className: 'toast-success', defaultDuration: 3000 },
    ERROR: { icon: '✕', className: 'toast-error', defaultDuration: 5000 },
    WARNING: { icon: '⚠', className: 'toast-warning', defaultDuration: 4000 },
    INFO: { icon: 'ℹ', className: 'toast-info', defaultDuration: 3000 }
};

/**
 * Toast位置配置
 * @constant {Object}
 */
const TOAST_POSITIONS = {
    TOP_LEFT: 'top-left',
    TOP_CENTER: 'top-center',
    TOP_RIGHT: 'top-right',
    BOTTOM_LEFT: 'bottom-left',
    BOTTOM_CENTER: 'bottom-center',
    BOTTOM_RIGHT: 'bottom-right'
};

/**
 * Toast管理器
 * @class ToastManager
 */
class ToastManager {
    /**
     * @param {Object} [options={}] - 配置选项
     * @param {string} [options.position='top-right'] - 位置
     * @param {number} [options.maxVisible=5] - 最大显示数量
     * @param {boolean} [options.pauseOnHover=true] - 悬停暂停
     */
    constructor(options = {}) {
        this.options = {
            position: TOAST_POSITIONS.TOP_RIGHT,
            maxVisible: 5,
            pauseOnHover: true,
            ...options
        };
        
        this.toasts = new Map();
        this.queue = [];
        this.container = null;
        this.init();
    }
    
    /**
     * 初始化容器
     * @private
     */
    init() {
        // 创建全局容器
        this.container = document.getElementById('toast-container');
        if (!this.container) {
            this.container = DOM.create('div', {
                id: 'toast-container',
                className: `toast-container ${this.options.position}`
            });
            document.body.appendChild(this.container);
        }
        
        // 添加基础样式
        this.injectStyles();
    }
    
    /**
     * 注入CSS样式
     * @private
     */
    injectStyles() {
        if (document.getElementById('toast-styles')) return;
        
        const styles = `
            .toast-container {
                position: fixed;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
            }
            .toast-container.top-left { top: 20px; left: 20px; }
            .toast-container.top-center { top: 20px; left: 50%; transform: translateX(-50%); }
            .toast-container.top-right { top: 20px; right: 20px; }
            .toast-container.bottom-left { bottom: 20px; left: 20px; flex-direction: column-reverse; }
            .toast-container.bottom-center { bottom: 20px; left: 50%; transform: translateX(-50%); flex-direction: column-reverse; }
            .toast-container.bottom-right { bottom: 20px; right: 20px; flex-direction: column-reverse; }
            
            .toast-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 14px 18px;
                border-radius: 8px;
                background: #fff;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                pointer-events: all;
                min-width: 280px;
                max-width: 400px;
                animation: toast-in 0.3s ease;
                position: relative;
                overflow: hidden;
            }
            
            .toast-item.toast-success { border-left: 4px solid #52c41a; }
            .toast-item.toast-error { border-left: 4px solid #f5222d; }
            .toast-item.toast-warning { border-left: 4px solid #faad14; }
            .toast-item.toast-info { border-left: 4px solid #1890ff; }
            
            .toast-item.closing {
                animation: toast-out 0.3s ease forwards;
            }
            
            .toast-icon {
                width: 24px;
                height: 24px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                flex-shrink: 0;
            }
            .toast-success .toast-icon { background: #f6ffed; color: #52c41a; }
            .toast-error .toast-icon { background: #fff1f0; color: #f5222d; }
            .toast-warning .toast-icon { background: #fffbe6; color: #faad14; }
            .toast-info .toast-icon { background: #e6f7ff; color: #1890ff; }
            
            .toast-content {
                flex: 1;
                min-width: 0;
            }
            .toast-title {
                font-size: 14px;
                font-weight: 500;
                color: #262626;
                margin-bottom: 4px;
            }
            .toast-message {
                font-size: 13px;
                color: #595959;
                line-height: 1.5;
            }
            
            .toast-close {
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                border-radius: 4px;
                color: #8c8c8c;
                transition: all 0.2s;
                flex-shrink: 0;
            }
            .toast-close:hover { background: #f0f0f0; color: #262626; }
            
            .toast-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: rgba(0,0,0,0.1);
                width: 100%;
            }
            .toast-progress-bar {
                height: 100%;
                background: currentColor;
                opacity: 0.3;
                transition: width linear;
            }
            
            @keyframes toast-in {
                from { opacity: 0; transform: translateX(20px); }
                to { opacity: 1; transform: translateX(0); }
            }
            @keyframes toast-out {
                from { opacity: 1; transform: translateX(0); }
                to { opacity: 0; transform: translateX(20px); }
            }
            
            @media (max-width: 480px) {
                .toast-container { left: 10px !important; right: 10px !important; top: 10px !important; transform: none !important; }
                .toast-item { max-width: none; min-width: auto; }
            }
        `;
        
        const styleEl = DOM.create('style', { id: 'toast-styles' }, styles);
        document.head.appendChild(styleEl);
    }
    
    /**
     * 显示Toast
     * @param {Object} options - Toast选项
     * @param {string} options.type - 类型
     * @param {string} options.message - 消息内容
     * @param {string} [options.title] - 标题
     * @param {number} [options.duration] - 持续时间
     * @param {boolean} [options.closable=true] - 是否可关闭
     * @param {Function} [options.onClose] - 关闭回调
     * @returns {string} Toast ID
     */
    show(options) {
        const { type = 'INFO', message, title, duration, closable = true, onClose } = options;
        const typeConfig = TOAST_TYPES[type] || TOAST_TYPES.INFO;
        
        // 检查队列
        if (this.toasts.size >= this.options.maxVisible) {
            this.queue.push(options);
            return null;
        }
        
        const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const actualDuration = duration || typeConfig.defaultDuration;
        
        // 创建Toast元素
        const toastEl = this.createToastElement(id, typeConfig, message, title, closable, actualDuration);
        this.container.appendChild(toastEl);
        
        // 保存引用
        const toastData = {
            el: toastEl,
            id,
            startTime: Date.now(),
            duration: actualDuration,
            remaining: actualDuration,
            timer: null,
            onClose
        };
        
        this.toasts.set(id, toastData);
        
        // 启动计时器
        this.startTimer(id);
        
        // 绑定事件
        this.bindEvents(id, toastEl);
        
        return id;
    }
    
    /**
     * 创建Toast元素
     * @private
     */
    createToastElement(id, typeConfig, message, title, closable, duration) {
        const toast = DOM.create('div', {
            id,
            className: `toast-item ${typeConfig.className}`
        });
        
        // 图标
        const icon = DOM.create('div', { className: 'toast-icon' }, typeConfig.icon);
        toast.appendChild(icon);
        
        // 内容
        const content = DOM.create('div', { className: 'toast-content' });
        if (title) {
            content.appendChild(DOM.create('div', { className: 'toast-title' }, DOM.escape(title)));
        }
        content.appendChild(DOM.create('div', { className: 'toast-message' }, DOM.escape(message)));
        toast.appendChild(content);
        
        // 关闭按钮
        if (closable) {
            const closeBtn = DOM.create('div', {
                className: 'toast-close',
                onclick: () => this.close(id)
            }, '×');
            toast.appendChild(closeBtn);
        }
        
        // 进度条
        if (duration > 0) {
            const progress = DOM.create('div', { className: 'toast-progress' });
            const bar = DOM.create('div', {
                className: 'toast-progress-bar',
                style: `transition-duration: ${duration}ms; width: 100%;`
            });
            progress.appendChild(bar);
            toast.appendChild(progress);
            
            // 触发动画
            requestAnimationFrame(() => {
                bar.style.width = '0%';
            });
        }
        
        return toast;
    }
    
    /**
     * 绑定事件
     * @private
     */
    bindEvents(id, el) {
        if (!this.options.pauseOnHover) return;
        
        el.addEventListener('mouseenter', () => this.pauseTimer(id));
        el.addEventListener('mouseleave', () => this.resumeTimer(id));
    }
    
    /**
     * 启动计时器
     * @private
     */
    startTimer(id) {
        const toast = this.toasts.get(id);
        if (!toast || toast.duration <= 0) return;
        
        toast.timer = setTimeout(() => {
            this.close(id);
        }, toast.remaining);
    }
    
    /**
     * 暂停计时器
     * @private
     */
    pauseTimer(id) {
        const toast = this.toasts.get(id);
        if (!toast || !toast.timer) return;
        
        clearTimeout(toast.timer);
        toast.timer = null;
        toast.remaining -= Date.now() - toast.startTime;
    }
    
    /**
     * 恢复计时器
     * @private
     */
    resumeTimer(id) {
        const toast = this.toasts.get(id);
        if (!toast) return;
        
        toast.startTime = Date.now();
        if (toast.remaining > 0) {
            this.startTimer(id);
        }
    }
    
    /**
     * 关闭指定Toast
     * @param {string} id - Toast ID
     */
    close(id) {
        const toast = this.toasts.get(id);
        if (!toast) return;
        
        // 清除计时器
        if (toast.timer) clearTimeout(toast.timer);
        
        // 添加关闭动画
        toast.el.classList.add('closing');
        
        // 执行回调
        if (toast.onClose) toast.onClose();
        
        // 移除元素
        setTimeout(() => {
            toast.el.remove();
            this.toasts.delete(id);
            this.processQueue();
        }, 300);
    }
    
    /**
     * 处理队列
     * @private
     */
    processQueue() {
        if (this.queue.length === 0) return;
        if (this.toasts.size >= this.options.maxVisible) return;
        
        const next = this.queue.shift();
        this.show(next);
    }
    
    /**
     * 关闭所有Toast
     */
    closeAll() {
        [...this.toasts.keys()].forEach(id => this.close(id));
        this.queue = [];
    }
    
    /**
     * 更新配置
     * @param {Object} options - 新配置
     */
    updateOptions(options) {
        this.options = { ...this.options, ...options };
        
        // 更新位置
        if (options.position) {
            this.container.className = `toast-container ${options.position}`;
        }
    }
}

/**
 * 全局Toast实例
 * @constant {ToastManager}
 */
const Toast = new ToastManager();

/**
 * 快捷方法
 */
Toast.success = (message, options = {}) => Toast.show({ type: 'SUCCESS', message, ...options });
Toast.error = (message, options = {}) => Toast.show({ type: 'ERROR', message, ...options });
Toast.warning = (message, options = {}) => Toast.show({ type: 'WARNING', message, ...options });
Toast.info = (message, options = {}) => Toast.show({ type: 'INFO', message, ...options });

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ToastManager, Toast, TOAST_TYPES, TOAST_POSITIONS };
}
