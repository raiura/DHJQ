/**
 * 游戏世界书集成模块
 * 整合世界书系统到游戏对话流程
 */

// 世界书管理器实例
let worldbookManager = null;
let worldbookLibrary = null;

// 初始化世界书系统
async function initWorldbookSystem() {
    console.log('[Worldbook] 初始化世界书系统...');
    
    try {
        const gameId = currentWorld?._id || currentWorld?.id;
        if (!gameId) {
            console.warn('[Worldbook] 未找到游戏ID，跳过世界书初始化');
            return;
        }
        
        // 创建世界书管理器（旧系统，向后兼容）
        if (typeof WorldbookManager !== 'undefined') {
            worldbookManager = new WorldbookManager({ gameId });
            await worldbookManager.loadGlobalWorldbook();
            
            // 如果有当前存档，设置存档
            const currentSaveId = localStorage.getItem(`galgame_current_save_${gameId}`);
            if (currentSaveId) {
                worldbookManager.setCurrentSave(currentSaveId);
            }
            
            const stats = worldbookManager.getStats();
            console.log('[Worldbook] 旧系统初始化完成:', stats);
        }
        
        // 初始化新世界书图书馆 2.0
        if (typeof WorldbookLibrary !== 'undefined') {
            worldbookLibrary = new WorldbookLibrary({ gameId });
            console.log('[WorldbookLibrary] 已初始化，激活书本数:', worldbookLibrary.getActiveBooks().length);
        }
        
    } catch (error) {
        console.error('[Worldbook] 初始化失败:', error);
    }
}

// 检测世界书触发
function detectWorldbookTriggers(userMessage, context) {
    let worldbookEntries = [];
    
    // 优先使用新的世界书库系统
    if (worldbookLibrary) {
        try {
            worldbookEntries = worldbookLibrary.detectTriggers(userMessage, context);
            console.log('[WorldbookLibrary] 触发的条目:', worldbookEntries.length);
        } catch (e) {
            console.error('[WorldbookLibrary] 检测失败:', e);
        }
    } 
    // 向后兼容：使用旧系统
    else if (worldbookManager) {
        try {
            worldbookEntries = worldbookManager.detectTriggers(userMessage, context);
            console.log('[Worldbook] 触发的条目:', worldbookEntries.length);
        } catch (e) {
            console.error('[Worldbook] 检测失败:', e);
        }
    }
    
    return worldbookEntries;
}

// 收集用户个人设置的世界书条目
function collectUserWorldbookEntries(userMessage) {
    const userSettings = getUserSettings ? getUserSettings() : {};
    
    if (userSettings.worldbook?.entries) {
        return userSettings.worldbook.entries
            .filter(e => userMessage.includes(e.keyword))
            .map(e => `[${e.keyword}] ${e.content}`)
            .join('\n');
    }
    return '';
}

// 导出到全局
if (typeof window !== 'undefined') {
    window.initWorldbookSystem = initWorldbookSystem;
    window.detectWorldbookTriggers = detectWorldbookTriggers;
    window.collectUserWorldbookEntries = collectUserWorldbookEntries;
}
