/**
 * 工具函数模块 - 通用工具集合
 * @module Core/Utils
 * @description 提供常用的工具函数，包括DOM操作、数据处理、格式化等
 */

/**
 * DOM工具
 * @namespace DOM
 */
const DOM = {
    /**
     * 选择单个元素
     * @param {string} selector - CSS选择器
     * @param {Element} [context=document] - 上下文元素
     * @returns {Element|null}
     */
    $(selector, context = document) {
        return context.querySelector(selector);
    },
    
    /**
     * 选择多个元素
     * @param {string} selector - CSS选择器
     * @param {Element} [context=document] - 上下文元素
     * @returns {NodeListOf<Element>}
     */
    $$(selector, context = document) {
        return context.querySelectorAll(selector);
    },
    
    /**
     * 创建元素并设置属性
     * @param {string} tag - 标签名
     * @param {Object} [attrs={}] - 属性对象
     * @param {string|Element} [content] - 内容
     * @returns {Element}
     */
    create(tag, attrs = {}, content) {
        const el = document.createElement(tag);
        
        Object.entries(attrs).forEach(([key, value]) => {
            if (key === 'className') {
                el.className = value;
            } else if (key === 'dataset') {
                Object.assign(el.dataset, value);
            } else if (key.startsWith('on') && typeof value === 'function') {
                el.addEventListener(key.slice(2).toLowerCase(), value);
            } else {
                el.setAttribute(key, value);
            }
        });
        
        if (content) {
            if (typeof content === 'string') {
                el.innerHTML = content;
            } else {
                el.appendChild(content);
            }
        }
        
        return el;
    },
    
    /**
     * 安全的HTML转义
     * @param {string} text - 原始文本
     * @returns {string} 转义后的HTML
     */
    escape(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    /**
     * 添加/移除/切换类名
     * @param {Element} el - 目标元素
     * @param {string} className - 类名
     * @param {boolean} [force] - 强制添加或移除
     */
    toggleClass(el, className, force) {
        if (force === undefined) {
            el.classList.toggle(className);
        } else {
            el.classList.toggle(className, force);
        }
    },
    
    /**
     * 插入HTML到指定位置
     * @param {Element} el - 目标元素
     * @param {string} position - 插入位置
     * @param {string} html - HTML字符串
     */
    insertHTML(el, position, html) {
        el.insertAdjacentHTML(position, html);
    },
    
    /**
     * 移除元素
     * @param {Element|string} el - 元素或选择器
     */
    remove(el) {
        const element = typeof el === 'string' ? this.$(el) : el;
        element?.remove();
    },
    
    /**
     * 事件委托
     * @param {Element} container - 容器元素
     * @param {string} selector - 目标选择器
     * @param {string} eventType - 事件类型
     * @param {Function} handler - 处理函数
     */
    delegate(container, selector, eventType, handler) {
        container.addEventListener(eventType, (e) => {
            const target = e.target.closest(selector);
            if (target && container.contains(target)) {
                handler.call(target, e);
            }
        });
    }
};

/**
 * 函数工具
 * @namespace Fn
 */
const Fn = {
    /**
     * 防抖
     * @param {Function} fn - 目标函数
     * @param {number} delay - 延迟时间（毫秒）
     * @returns {Function}
     */
    debounce(fn, delay) {
        let timer;
        return function(...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    },
    
    /**
     * 节流
     * @param {Function} fn - 目标函数
     * @param {number} limit - 限制时间（毫秒）
     * @returns {Function}
     */
    throttle(fn, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                fn.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    /**
     * 函数柯里化
     * @param {Function} fn - 目标函数
     * @returns {Function}
     */
    curry(fn) {
        const arity = fn.length;
        return function curried(...args) {
            if (args.length >= arity) {
                return fn.apply(this, args);
            }
            return (...nextArgs) => curried(...args, ...nextArgs);
        };
    },
    
    /**
     * 睡眠函数
     * @param {number} ms - 毫秒
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    /**
     * 重试函数
     * @param {Function} fn - 目标函数
     * @param {number} maxAttempts - 最大重试次数
     * @param {number} delay - 重试延迟
     * @returns {Promise<any>}
     */
    async retry(fn, maxAttempts = 3, delay = 1000) {
        let lastError;
        for (let i = 0; i < maxAttempts; i++) {
            try {
                return await fn();
            } catch (e) {
                lastError = e;
                if (i < maxAttempts - 1) {
                    await this.sleep(delay * (i + 1));
                }
            }
        }
        throw lastError;
    }
};

/**
 * 数据处理工具
 * @namespace Data
 */
const Data = {
    /**
     * 深拷贝
     * @param {*} obj - 目标对象
     * @returns {*} 拷贝后的对象
     */
    clone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj);
        if (Array.isArray(obj)) return obj.map(item => this.clone(item));
        return Object.fromEntries(
            Object.entries(obj).map(([k, v]) => [k, this.clone(v)])
        );
    },
    
    /**
     * 对象合并
     * @param {...Object} objects - 要合并的对象
     * @returns {Object}
     */
    merge(...objects) {
        return objects.reduce((acc, obj) => {
            if (!obj) return acc;
            Object.entries(obj).forEach(([k, v]) => {
                if (v && typeof v === 'object' && !Array.isArray(v)) {
                    acc[k] = this.merge(acc[k] || {}, v);
                } else {
                    acc[k] = v;
                }
            });
            return acc;
        }, {});
    },
    
    /**
     * 数组分组
     * @param {Array} arr - 目标数组
     * @param {string|Function} key - 分组键
     * @returns {Object}
     */
    groupBy(arr, key) {
        const getKey = typeof key === 'function' ? key : item => item[key];
        return arr.reduce((groups, item) => {
            const groupKey = getKey(item);
            (groups[groupKey] = groups[groupKey] || []).push(item);
            return groups;
        }, {});
    },
    
    /**
     * 数组去重
     * @param {Array} arr - 目标数组
     * @param {string|Function} [key] - 去重键
     * @returns {Array}
     */
    unique(arr, key) {
        if (!key) return [...new Set(arr)];
        
        const seen = new Set();
        const getKey = typeof key === 'function' ? key : item => item[key];
        
        return arr.filter(item => {
            const k = getKey(item);
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
        });
    },
    
    /**
     * 分页
     * @param {Array} arr - 目标数组
     * @param {number} page - 页码（从1开始）
     * @param {number} limit - 每页数量
     * @returns {Object}
     */
    paginate(arr, page = 1, limit = 10) {
        const start = (page - 1) * limit;
        const end = start + limit;
        return {
            data: arr.slice(start, end),
            total: arr.length,
            page,
            limit,
            totalPages: Math.ceil(arr.length / limit)
        };
    }
};

/**
 * 格式化工具
 * @namespace Format
 */
const Format = {
    /**
     * 格式化日期
     * @param {Date|string|number} date - 日期
     * @param {string} [format='YYYY-MM-DD HH:mm'] - 格式
     * @returns {string}
     */
    date(date, format = 'YYYY-MM-DD HH:mm') {
        const d = new Date(date);
        const pad = n => n.toString().padStart(2, '0');
        
        return format
            .replace('YYYY', d.getFullYear())
            .replace('MM', pad(d.getMonth() + 1))
            .replace('DD', pad(d.getDate()))
            .replace('HH', pad(d.getHours()))
            .replace('mm', pad(d.getMinutes()))
            .replace('ss', pad(d.getSeconds()));
    },
    
    /**
     * 格式化数字（千分位）
     * @param {number} num - 数字
     * @returns {string}
     */
    number(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },
    
    /**
     * 截断文本
     * @param {string} text - 文本
     * @param {number} maxLength - 最大长度
     * @param {string} [suffix='...'] - 后缀
     * @returns {string}
     */
    truncate(text, maxLength, suffix = '...') {
        if (text.length <= maxLength) return text;
        return text.slice(0, maxLength - suffix.length) + suffix;
    },
    
    /**
     * 首字母大写
     * @param {string} str - 字符串
     * @returns {string}
     */
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },
    
    /**
     * 格式化文件大小
     * @param {number} bytes - 字节数
     * @returns {string}
     */
    fileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
};

/**
 * 验证工具
 * @namespace Validate
 */
const Validate = {
    /**
     * 邮箱验证
     * @param {string} email - 邮箱地址
     * @returns {boolean}
     */
    email(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },
    
    /**
     * 手机号验证（中国）
     * @param {string} phone - 手机号
     * @returns {boolean}
     */
    phone(phone) {
        return /^1[3-9]\d{9}$/.test(phone);
    },
    
    /**
     * URL验证
     * @param {string} url - URL
     * @returns {boolean}
     */
    url(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },
    
    /**
     * 空值检查
     * @param {*} value - 值
     * @returns {boolean}
     */
    isEmpty(value) {
        if (value == null) return true;
        if (typeof value === 'string') return value.trim() === '';
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
    }
};

/**
 * 颜色工具
 * @namespace Color
 */
const Color = {
    /**
     * 调整亮度
     * @param {string} hex - 十六进制颜色
     * @param {number} percent - 百分比（-100 ~ 100）
     * @returns {string}
     */
    lighten(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, Math.max(0, (num >> 16) + amt));
        const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
        const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    },
    
    /**
     * 十六进制转RGB
     * @param {string} hex - 十六进制颜色
     * @returns {{r:number,g:number,b:number}|null}
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
};

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DOM, Fn, Data, Format, Validate, Color };
}
