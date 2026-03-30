/**
 * 游戏模块入口
 * 按正确顺序加载所有游戏模块
 */

// 模块列表（按依赖顺序）
const GAME_MODULES = [
    'game-config.js',           // 配置和常量（最先加载）
    'game-api.js',              // API 调用
    'game-emotion.js',          // 情感系统
    'game-worldbook-integration.js',  // 世界书集成
    'game-dialogue.js'          // 对话系统（最后加载）
];

// 加载单个脚本
function loadScript(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.async = false;  // 保持加载顺序
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// 初始化所有模块
async function initGameModules() {
    console.log('[GameModules] 开始加载游戏模块...');
    
    const basePath = 'public/js/game/modules/';
    
    for (const module of GAME_MODULES) {
        try {
            await loadScript(basePath + module);
            console.log(`[GameModules] 已加载: ${module}`);
        } catch (error) {
            console.error(`[GameModules] 加载失败: ${module}`, error);
        }
    }
    
    console.log('[GameModules] 所有模块加载完成');
}

// 导出
if (typeof window !== 'undefined') {
    window.initGameModules = initGameModules;
    window.GAME_MODULES = GAME_MODULES;
}
