/**
 * 游戏配置模块
 * 包含常量、配置项和全局状态
 */

// API 基础地址
const API_BASE = 'http://localhost:3000/api';

// 当前游戏世界配置
let currentWorld = null;

// 图库数据
let worldGallery = [];
let currentBackground = null;

// 认证相关
let authToken = localStorage.getItem('galgame_token');
let currentUser = null;

// 游戏状态
let gameState = {
    isPlaying: false,
    currentScene: null,
    dialogueHistory: [],
    currentSaveId: null
};

// 获取认证头
function getAuthHeaders() {
    const token = localStorage.getItem('galgame_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// 从URL获取世界slug
function getWorldSlugFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('world') || localStorage.getItem('galgame_current_world');
}

// 切换到指定游戏
function switchToGame(slug) {
    localStorage.setItem('galgame_current_world', slug);
    window.location.href = `galgame_framework.html?world=${slug}`;
}

// 导出到全局（保持兼容）
if (typeof window !== 'undefined') {
    window.API_BASE = API_BASE;
    window.getAuthHeaders = getAuthHeaders;
    window.getWorldSlugFromUrl = getWorldSlugFromUrl;
    window.switchToGame = switchToGame;
}
