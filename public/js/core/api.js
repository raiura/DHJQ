/**
 * API核心模块 - 统一处理HTTP请求
 * @module Core/API
 * @description 提供统一的axios实例、请求拦截器和错误处理
 */

/**
 * API配置对象
 * @constant {Object}
 */
const API_CONFIG = {
    BASE_URL: 'http://localhost:3000/api',
    TIMEOUT: 30000,
    RETRY_COUNT: 3,
    RETRY_DELAY: 1000
};

/**
 * 自定义API错误类
 * @class APIError
 * @extends Error
 */
class APIError extends Error {
    /**
     * @param {string} message - 错误消息
     * @param {number} statusCode - HTTP状态码
     * @param {Object} data - 错误详情
     */
    constructor(message, statusCode = 500, data = null) {
        super(message);
        this.name = 'APIError';
        this.statusCode = statusCode;
        this.data = data;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * 网络请求队列（用于管理并发请求）
 * @type {Map<string, Promise>}
 */
const requestQueue = new Map();

/**
 * 获取认证头部
 * @returns {Object} 包含Authorization头部的对象
 */
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

/**
 * 构建完整URL
 * @param {string} endpoint - API端点
 * @returns {string} 完整URL
 */
function buildURL(endpoint) {
    const base = endpoint.startsWith('http') ? '' : API_CONFIG.BASE_URL;
    return `${base}${endpoint}`;
}

/**
 * 序列化请求体
 * @param {*} body - 请求体
 * @returns {string} JSON字符串
 */
function serializeBody(body) {
    if (body === null || body === undefined) return null;
    if (typeof body === 'string') return body;
    return JSON.stringify(body);
}

/**
 * 延迟函数（用于重试）
 * @param {number} ms - 毫秒
 * @returns {Promise<void>}
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 执行HTTP请求（带重试机制）
 * @param {string} endpoint - API端点
 * @param {Object} options - fetch选项
 * @param {number} retryCount - 剩余重试次数
 * @returns {Promise<any>} 响应数据
 * @throws {APIError}
 */
async function executeRequest(endpoint, options = {}, retryCount = API_CONFIG.RETRY_COUNT) {
    const url = buildURL(endpoint);
    const requestKey = `${options.method || 'GET'}_${url}_${JSON.stringify(options.body)}`;
    
    // 检查重复请求
    if (requestQueue.has(requestKey)) {
        return requestQueue.get(requestKey);
    }
    
    const requestPromise = (async () => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
            
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders(),
                    ...options.headers
                }
            });
            
            clearTimeout(timeoutId);
            
            // 处理HTTP错误
            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch {
                    errorData = { message: response.statusText };
                }
                throw new APIError(
                    errorData.message || `HTTP ${response.status}`,
                    response.status,
                    errorData
                );
            }
            
            // 解析响应
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            return await response.text();
            
        } catch (error) {
            // 重试逻辑
            if (retryCount > 0 && (error.name === 'TypeError' || error.name === 'AbortError')) {
                await delay(API_CONFIG.RETRY_DELAY * (API_CONFIG.RETRY_COUNT - retryCount + 1));
                return executeRequest(endpoint, options, retryCount - 1);
            }
            
            if (error instanceof APIError) throw error;
            throw new APIError(error.message, 0, null);
        } finally {
            requestQueue.delete(requestKey);
        }
    })();
    
    requestQueue.set(requestKey, requestPromise);
    return requestPromise;
}

/**
 * API请求对象 - 提供HTTP方法封装
 * @namespace API
 */
const API = {
    /**
     * GET请求
     * @param {string} endpoint - API端点
     * @param {Object} params - URL参数
     * @returns {Promise<any>}
     */
    get(endpoint, params = {}) {
        const queryString = Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join('&');
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return executeRequest(url, { method: 'GET' });
    },
    
    /**
     * POST请求
     * @param {string} endpoint - API端点
     * @param {Object} data - 请求体
     * @returns {Promise<any>}
     */
    post(endpoint, data) {
        return executeRequest(endpoint, {
            method: 'POST',
            body: serializeBody(data)
        });
    },
    
    /**
     * PUT请求
     * @param {string} endpoint - API端点
     * @param {Object} data - 请求体
     * @returns {Promise<any>}
     */
    put(endpoint, data) {
        return executeRequest(endpoint, {
            method: 'PUT',
            body: serializeBody(data)
        });
    },
    
    /**
     * DELETE请求
     * @param {string} endpoint - API端点
     * @returns {Promise<any>}
     */
    delete(endpoint) {
        return executeRequest(endpoint, { method: 'DELETE' });
    },
    
    /**
     * 上传文件
     * @param {string} endpoint - API端点
     * @param {FormData} formData - 表单数据
     * @param {Function} onProgress - 进度回调
     * @returns {Promise<any>}
     */
    upload(endpoint, formData, onProgress) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable && onProgress) {
                    onProgress((e.loaded / e.total) * 100);
                }
            });
            
            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        resolve(JSON.parse(xhr.responseText));
                    } catch {
                        resolve(xhr.responseText);
                    }
                } else {
                    reject(new APIError(xhr.statusText, xhr.status));
                }
            });
            
            xhr.addEventListener('error', () => {
                reject(new APIError('Network error', 0));
            });
            
            xhr.open('POST', buildURL(endpoint));
            const token = localStorage.getItem('token');
            if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.send(formData);
        });
    }
};

/**
 * 响应处理器 - 统一处理API响应
 * @namespace ResponseHandler
 */
const ResponseHandler = {
    /**
     * 成功响应
     * @param {any} data - 响应数据
     * @param {string} message - 成功消息
     * @returns {Object} 标准成功格式
     */
    success(data, message = '操作成功') {
        return { success: true, data, message };
    },
    
    /**
     * 错误响应
     * @param {string} message - 错误消息
     * @param {number} code - 错误码
     * @returns {Object} 标准错误格式
     */
    error(message, code = 500) {
        return { success: false, message, code };
    },
    
    /**
     * 处理列表数据（带分页）
     * @param {Array} list - 数据列表
     * @param {Object} pagination - 分页信息
     * @returns {Object} 标准列表格式
     */
    list(list = [], pagination = {}) {
        return {
            success: true,
            data: list,
            pagination: {
                page: pagination.page || 1,
                limit: pagination.limit || 20,
                total: pagination.total || list.length,
                ...pagination
            }
        };
    }
};

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API, APIError, API_CONFIG, ResponseHandler, getAuthHeaders };
}
