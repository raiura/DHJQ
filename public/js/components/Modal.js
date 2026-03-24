/**
 * Modal弹窗组件 - 通用对话框
 * @module Components/Modal
 * @description 提供可复用的模态对话框，支持多种预设类型
 */

/**
 * Modal配置
 * @constant {Object}
 */
const MODAL_CONFIG = {
    zIndex: 1000,
    animationDuration: 300,
    closeOnBackdrop: true,
    closeOnEscape: true
};

/**
 * Modal管理器
 * @class ModalManager
 */
class ModalManager {
    constructor() {
        this.modals = new Map();
        this.stack = [];
        this.overlay = null;
        this.init();
    }
    
    init() {
        this.injectStyles();
        this.bindGlobalEvents();
    }
    
    injectStyles() {
        if (document.getElementById('modal-styles')) return;
        
        const styles = `
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: ${MODAL_CONFIG.zIndex};
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            }
            .modal-overlay.active {
                opacity: 1;
                visibility: visible;
            }
            
            .modal-container {
                background: #fff;
                border-radius: 12px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                max-width: 90vw;
                max-height: 90vh;
                display: flex;
                flex-direction: column;
                transform: scale(0.9) translateY(-20px);
                transition: all 0.3s ease;
                overflow: hidden;
            }
            .modal-overlay.active .modal-container {
                transform: scale(1) translateY(0);
            }
            
            .modal-small { width: 400px; }
            .modal-medium { width: 560px; }
            .modal-large { width: 800px; }
            .modal-fullscreen { width: 95vw; height: 95vh; }
            
            .modal-header {
                padding: 20px 24px;
                border-bottom: 1px solid #e8e8e8;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .modal-title {
                font-size: 18px;
                font-weight: 600;
                color: #262626;
                margin: 0;
            }
            .modal-close {
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                border-radius: 6px;
                color: #8c8c8c;
                transition: all 0.2s;
                font-size: 20px;
            }
            .modal-close:hover { background: #f0f0f0; color: #262626; }
            
            .modal-body {
                padding: 24px;
                overflow-y: auto;
                flex: 1;
            }
            
            .modal-footer {
                padding: 16px 24px;
                border-top: 1px solid #e8e8e8;
                display: flex;
                justify-content: flex-end;
                gap: 12px;
            }
            
            /* 预设类型样式 */
            .modal-confirm .modal-body { text-align: center; padding: 32px 24px; }
            .modal-confirm-icon {
                width: 64px;
                height: 64px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 32px;
                margin: 0 auto 16px;
            }
            .modal-confirm-icon.warning { background: #fffbe6; color: #faad14; }
            .modal-confirm-icon.error { background: #fff1f0; color: #f5222d; }
            .modal-confirm-icon.info { background: #e6f7ff; color: #1890ff; }
            .modal-confirm-icon.success { background: #f6ffed; color: #52c41a; }
            
            .modal-btn {
                padding: 8px 20px;
                border-radius: 6px;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s;
                border: none;
            }
            .modal-btn-primary {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }
            .modal-btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
            .modal-btn-default {
                background: #f0f0f0;
                color: #262626;
            }
            .modal-btn-default:hover { background: #e0e0e0; }
            .modal-btn-danger {
                background: #ff4d4f;
                color: white;
            }
            .modal-btn-danger:hover { background: #ff7875; }
            
            @media (max-width: 576px) {
                .modal-container { width: 95vw !important; max-height: 85vh; }
                .modal-small, .modal-medium, .modal-large { width: 95vw !important; }
            }
        `;
        
        const styleEl = DOM.create('style', { id: 'modal-styles' }, styles);
        document.head.appendChild(styleEl);
    }
    
    bindGlobalEvents() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && MODAL_CONFIG.closeOnEscape && this.stack.length > 0) {
                const topModal = this.stack[this.stack.length - 1];
                if (topModal.options.closeOnEscape !== false) {
                    this.close(topModal.id);
                }
            }
        });
    }
    
    /**
     * 创建并显示Modal
     * @param {Object} options - 配置选项
     * @returns {Promise<any>} 用户操作结果
     */
    open(options) {
        return new Promise((resolve) => {
            const id = `modal_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            
            const config = {
                size: 'medium',
                closeOnBackdrop: MODAL_CONFIG.closeOnBackdrop,
                closeOnEscape: MODAL_CONFIG.closeOnEscape,
                ...options,
                id,
                resolve
            };
            
            const modalEl = this.createModalElement(config);
            document.body.appendChild(modalEl);
            
            this.modals.set(id, { el: modalEl, options: config });
            this.stack.push({ id, options: config });
            
            // 触发显示动画
            requestAnimationFrame(() => {
                modalEl.classList.add('active');
            });
            
            // 背景点击关闭
            if (config.closeOnBackdrop) {
                modalEl.addEventListener('click', (e) => {
                    if (e.target === modalEl) this.close(id);
                });
            }
        });
    }
    
    createModalElement(config) {
        const overlay = DOM.create('div', {
            id: config.id,
            className: `modal-overlay ${config.type || ''}`
        });
        
        const container = DOM.create('div', {
            className: `modal-container modal-${config.size}`
        });
        
        // 头部
        if (config.title !== false) {
            const header = DOM.create('div', { className: 'modal-header' });
            const title = DOM.create('h3', { className: 'modal-title' }, 
                DOM.escape(config.title || ''));
            header.appendChild(title);
            
            if (config.closable !== false) {
                const closeBtn = DOM.create('div', {
                    className: 'modal-close',
                    onclick: () => this.close(config.id)
                }, '×');
                header.appendChild(closeBtn);
            }
            
            container.appendChild(header);
        }
        
        // 内容
        const body = DOM.create('div', { className: 'modal-body' });
        if (typeof config.content === 'string') {
            body.innerHTML = config.content;
        } else if (config.content instanceof HTMLElement) {
            body.appendChild(config.content);
        } else if (config.render) {
            const rendered = config.render(body);
            if (rendered) body.appendChild(rendered);
        }
        container.appendChild(body);
        
        // 底部按钮
        if (config.footer !== false) {
            const footer = DOM.create('div', { className: 'modal-footer' });
            
            if (config.footerButtons) {
                config.footerButtons.forEach(btn => {
                    const btnEl = DOM.create('button', {
                        className: `modal-btn modal-btn-${btn.type || 'default'}`,
                        onclick: () => {
                            if (btn.onClick) btn.onClick();
                            if (btn.autoClose !== false) {
                                this.close(config.id, btn.result);
                            }
                        }
                    }, btn.text);
                    footer.appendChild(btnEl);
                });
            } else if (config.type === 'confirm') {
                // 确认框默认按钮
                footer.appendChild(DOM.create('button', {
                    className: 'modal-btn modal-btn-default',
                    onclick: () => this.close(config.id, false)
                }, config.cancelText || '取消'));
                
                footer.appendChild(DOM.create('button', {
                    className: `modal-btn modal-btn-${config.confirmType || 'primary'}`,
                    onclick: () => this.close(config.id, true)
                }, config.okText || '确定'));
            }
            
            if (footer.children.length > 0) {
                container.appendChild(footer);
            }
        }
        
        overlay.appendChild(container);
        return overlay;
    }
    
    close(id, result = null) {
        const modal = this.modals.get(id);
        if (!modal) return;
        
        const { el, options } = modal;
        
        // 触发关闭动画
        el.classList.remove('active');
        
        setTimeout(() => {
            el.remove();
            this.modals.delete(id);
            
            // 从栈中移除
            const stackIndex = this.stack.findIndex(m => m.id === id);
            if (stackIndex > -1) {
                this.stack.splice(stackIndex, 1);
            }
            
            // 执行回调
            if (options.onClose) options.onClose(result);
            options.resolve(result);
        }, MODAL_CONFIG.animationDuration);
    }
    
    closeAll() {
        [...this.modals.keys()].forEach(id => this.close(id));
    }
    
    // ===== 预设弹窗类型 =====
    
    /**
     * 确认对话框
     * @param {Object} options - 配置
     * @returns {Promise<boolean>}
     */
    confirm(options) {
        const config = {
            type: 'confirm',
            size: 'small',
            title: false,
            ...options
        };
        
        // 构建确认框内容
        const iconMap = {
            warning: '⚠',
            error: '✕',
            info: 'ℹ',
            success: '✓'
        };
        
        config.content = `
            <div class="modal-confirm-icon ${options.iconType || 'warning'}">
                ${iconMap[options.iconType] || iconMap.warning}
            </div>
            <p style="font-size: 16px; color: #262626; margin: 0;">
                ${DOM.escape(options.message || '确认执行此操作？')}
            </p>
        `;
        
        return this.open(config);
    }
    
    /**
     * 警告确认
     * @param {string} message - 消息
     * @param {Object} options - 额外配置
     */
    warning(message, options = {}) {
        return this.confirm({
            iconType: 'warning',
            message,
            confirmType: 'danger',
            ...options
        });
    }
    
    /**
     * 信息提示
     * @param {string} message - 消息
     * @param {Object} options - 额外配置
     */
    info(message, options = {}) {
        return this.confirm({
            iconType: 'info',
            message,
            cancelText: null, // 信息提示不需要取消按钮
            ...options
        });
    }
    
    /**
     * 成功提示
     * @param {string} message - 消息
     * @param {Object} options - 额外配置
     */
    success(message, options = {}) {
        return this.confirm({
            iconType: 'success',
            message,
            cancelText: null,
            ...options
        });
    }
    
    /**
     * 表单对话框
     * @param {Object} options - 配置
     * @returns {Promise<Object|null>} 表单数据
     */
    form(options) {
        return new Promise((resolve) => {
            const formData = {};
            
            const config = {
                size: 'medium',
                title: options.title || '表单',
                ...options,
                render: (container) => {
                    const form = DOM.create('form', { className: 'modal-form' });
                    
                    options.fields.forEach(field => {
                        const group = DOM.create('div', { 
                            className: 'form-group',
                            style: 'margin-bottom: 16px;'
                        });
                        
                        if (field.label) {
                            const label = DOM.create('label', {
                                style: 'display: block; margin-bottom: 6px; font-size: 14px; color: #262626;'
                            }, DOM.escape(field.label));
                            group.appendChild(label);
                        }
                        
                        let input;
                        if (field.type === 'textarea') {
                            input = DOM.create('textarea', {
                                className: 'form-control',
                                placeholder: field.placeholder || '',
                                rows: field.rows || 3,
                                style: 'width: 100%; padding: 8px 12px; border: 1px solid #d9d9d9; border-radius: 6px; font-size: 14px;'
                            });
                        } else if (field.type === 'select') {
                            input = DOM.create('select', {
                                className: 'form-control',
                                style: 'width: 100%; padding: 8px 12px; border: 1px solid #d9d9d9; border-radius: 6px; font-size: 14px;'
                            });
                            field.options.forEach(opt => {
                                input.appendChild(DOM.create('option', {
                                    value: opt.value
                                }, opt.label));
                            });
                        } else {
                            input = DOM.create('input', {
                                type: field.type || 'text',
                                className: 'form-control',
                                placeholder: field.placeholder || '',
                                value: field.defaultValue || '',
                                style: 'width: 100%; padding: 8px 12px; border: 1px solid #d9d9d9; border-radius: 6px; font-size: 14px;'
                            });
                        }
                        
                        input.addEventListener('input', (e) => {
                            formData[field.name] = e.target.value;
                        });
                        
                        if (field.defaultValue) {
                            formData[field.name] = field.defaultValue;
                        }
                        
                        group.appendChild(input);
                        form.appendChild(group);
                    });
                    
                    return form;
                },
                footerButtons: [
                    { text: '取消', type: 'default', result: null },
                    { 
                        text: options.submitText || '提交', 
                        type: 'primary',
                        onClick: () => {},
                        autoClose: false
                    }
                ],
                resolve: (result) => {
                    resolve(result ? formData : null);
                }
            };
            
            // 修改提交按钮行为
            this.open(config).then(() => resolve(null));
        });
    }
}

/**
 * 全局Modal实例
 * @constant {ModalManager}
 */
const Modal = new ModalManager();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ModalManager, Modal, MODAL_CONFIG };
}
