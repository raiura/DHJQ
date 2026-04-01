/**
 * 设置页面配置模块
 */

// API 基础地址
const API_BASE = 'http://localhost:3000/api';

// 统一的 localStorage Key 命名规范（如果尚未定义）
if (typeof STORAGE_KEYS === 'undefined') {
    var STORAGE_KEYS = {
        // 全局
        TOKEN: 'galgame_token',
        USER: 'galgame_user',
        CURRENT_WORLD: 'galgame_current_world',
        SAVES: 'galgame_saves',
        CURRENT_SAVE: 'galgame_current_save',
        
        // 游戏特定 (使用统一前缀 galgame_${gameId}_${type})
        CHARACTERS: (gameId) => `galgame_${gameId}_characters`,
        WORLDBOOK: (gameId) => `galgame_${gameId}_worldbook`,
        SETTINGS: (gameId) => `galgame_${gameId}_settings`,
        CHAT_UI: (gameId) => `galgame_${gameId}_chatui`,
        MEMORIES: (gameId) => `galgame_${gameId}_memories`,
        GALLERY: (gameId) => `galgame_${gameId}_gallery`,
        
        // 用户设置
        USER_SETTINGS: 'galgame_user_settings',
        AI_CONFIG: 'galgame_ai_config',
        PROMPT_CONFIG: (gameId) => `galgame_${gameId}_prompt_config`
    };
}

// 全局状态
let currentUser = null;
let currentGame = null;
let gameId = null;
let isEditMode = false;
let characters = [];
let editingCharacterId = null;
let gallery = [];

// 世界书相关变量
let editingWorldbookId = null;
let editingWorldbookIsUser = false;
let worldbookManager = null;
let worldbookLibrary = null;
let worldbookManagerUI = null;

// 记忆服务实例
let memoryService = null;

// 记忆管理状态
let memoryFilterState = {
    type: 'all',
    search: '',
    sortBy: 'time-desc'
};
let allMemoriesCache = [];

// 存档管理
const SAVE_KEY = 'galgame_saves';
const CURRENT_SAVE_KEY = 'galgame_current_save';
let currentSaveId = localStorage.getItem(CURRENT_SAVE_KEY) || '';

// 用户个人设置
let userPersonalSettings = {
    worldbook: { background: '', entries: [] },
    prompts: { prePrompt: '', postPrompt: '', exampleDialogue: '', dialogStyle: '', restrictions: '' },
    characters: []
};

// 世界书筛选状态
let worldbookFilterState = {
    search: '',
    group: '',
    sortBy: 'priority-desc',
    userOnly: false
};

// 获取当前世界
function getCurrentWorld() {
    return new URLSearchParams(window.location.search).get('world') || 
           localStorage.getItem('galgame_current_world') || 'dahuang';
}

// 获取所有存档
function getSaves() {
    const world = getCurrentWorld();
    const allSaves = localStorage.getItem(SAVE_KEY);
    const saves = allSaves ? JSON.parse(allSaves) : {};
    return saves[world] || [];
}

// 保存存档列表
function saveSavesList(saves) {
    const world = getCurrentWorld();
    const allSaves = localStorage.getItem(SAVE_KEY);
    const data = allSaves ? JSON.parse(allSaves) : {};
    data[world] = saves;
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

// 导出到全局
if (typeof window !== 'undefined') {
    window.API_BASE = API_BASE;
    window.currentUser = currentUser;
    window.currentGame = currentGame;
    window.gameId = gameId;
    window.isEditMode = isEditMode;
    window.characters = characters;
    window.currentSaveId = currentSaveId;
    window.getCurrentWorld = getCurrentWorld;
    window.getSaves = getSaves;
    window.saveSavesList = saveSavesList;
}
