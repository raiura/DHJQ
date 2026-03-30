/**
 * 设置页面工具函数模块
 */

// 全局错误处理
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('[Settings] Error:', msg, 'at', lineNo + ':' + columnNo);
    return false;
};

// 获取认证头
function getAuthHeaders() {
    const token = localStorage.getItem('galgame_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// 显示 Toast 提示
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // 动画显示
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });
    
    // 3秒后移除
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 确认对话框
function showConfirm(message, onConfirm, onCancel) {
    if (confirm(message)) {
        onConfirm?.();
    } else {
        onCancel?.();
    }
}

// HTML 转义
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 复制到剪贴板
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('已复制到剪贴板', 'success');
    } catch (err) {
        // 降级方案
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('已复制到剪贴板', 'success');
    }
}

// 下载 JSON 文件
function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 读取文件为 JSON
function readFileAsJSON(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                resolve(data);
            } catch (err) {
                reject(new Error('文件格式不正确'));
            }
        };
        reader.onerror = () => reject(new Error('读取文件失败'));
        reader.readAsText(file);
    });
}

// 格式化日期
function formatDate(date, format = 'YYYY-MM-DD HH:mm') {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    
    return format
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hour)
        .replace('mm', minute);
}

// 防抖函数
function debounce(fn, delay = 300) {
    let timer = null;
    return function(...args) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// 节流函数
function throttle(fn, limit = 300) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            fn.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// 导出到全局
if (typeof window !== 'undefined') {
    window.getAuthHeaders = getAuthHeaders;
    window.showToast = showToast;
    window.showConfirm = showConfirm;
    window.escapeHtml = escapeHtml;
    window.copyToClipboard = copyToClipboard;
    window.downloadJSON = downloadJSON;
    window.readFileAsJSON = readFileAsJSON;
    window.formatDate = formatDate;
    window.debounce = debounce;
    window.throttle = throttle;
}
