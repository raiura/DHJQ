/**
 * 存储键名迁移工具
 * 将旧的 localStorage key 迁移到新的统一命名规范
 */

// 旧 key → 新 key 映射
const KEY_MAPPING = {
    // 角色
    'game_${gameId}_characters': (gameId) => `galgame_${gameId}_characters`,
    
    // 世界书
    'wb_global_${gameId}': (gameId) => `galgame_${gameId}_worldbook`,
    
    // 设置
    'user_settings_${gameId}': (gameId) => `galgame_${gameId}_settings`,
    
    // 聊天UI
    'chatui_${gameId}': (gameId) => `galgame_${gameId}_chatui`,
    
    // 记忆
    'game_${gameId}_memories': (gameId) => `galgame_${gameId}_memories`,
    
    // 图库
    'game_${gameId}_gallery_v2': (gameId) => `galgame_${gameId}_gallery`,
    
    // 提示词配置
    'game_${gameId}_prompt_config': (gameId) => `galgame_${gameId}_prompt_config`
};

/**
 * 执行数据迁移
 * @param {string} gameId - 游戏ID
 */
function migrateStorageKeys(gameId) {
    console.log('[StorageMigration] Starting migration for game:', gameId);
    
    let migratedCount = 0;
    let errorCount = 0;
    
    // 1. 迁移角色数据
    try {
        const oldKey = `game_${gameId}_characters`;
        const newKey = `galgame_${gameId}_characters`;
        const data = localStorage.getItem(oldKey);
        if (data) {
            localStorage.setItem(newKey, data);
            console.log('[StorageMigration] Migrated characters:', oldKey, '->', newKey);
            migratedCount++;
        }
    } catch (e) {
        console.error('[StorageMigration] Failed to migrate characters:', e);
        errorCount++;
    }
    
    // 2. 迁移世界书数据
    try {
        const oldKey = `wb_global_${gameId}`;
        const newKey = `galgame_${gameId}_worldbook`;
        const data = localStorage.getItem(oldKey);
        if (data) {
            localStorage.setItem(newKey, data);
            console.log('[StorageMigration] Migrated worldbook:', oldKey, '->', newKey);
            migratedCount++;
        }
    } catch (e) {
        console.error('[StorageMigration] Failed to migrate worldbook:', e);
        errorCount++;
    }
    
    // 3. 迁移设置数据
    try {
        const oldKey = `user_settings_${gameId}`;
        const newKey = `galgame_${gameId}_settings`;
        const data = localStorage.getItem(oldKey);
        if (data) {
            localStorage.setItem(newKey, data);
            console.log('[StorageMigration] Migrated settings:', oldKey, '->', newKey);
            migratedCount++;
        }
    } catch (e) {
        console.error('[StorageMigration] Failed to migrate settings:', e);
        errorCount++;
    }
    
    // 4. 迁移聊天UI数据
    try {
        const oldKey = `chatui_${gameId}`;
        const newKey = `galgame_${gameId}_chatui`;
        const data = localStorage.getItem(oldKey);
        if (data) {
            localStorage.setItem(newKey, data);
            console.log('[StorageMigration] Migrated chatui:', oldKey, '->', newKey);
            migratedCount++;
        }
    } catch (e) {
        console.error('[StorageMigration] Failed to migrate chatui:', e);
        errorCount++;
    }
    
    // 5. 迁移记忆数据
    try {
        const oldKey = `game_${gameId}_memories`;
        const newKey = `galgame_${gameId}_memories`;
        const data = localStorage.getItem(oldKey);
        if (data) {
            localStorage.setItem(newKey, data);
            console.log('[StorageMigration] Migrated memories:', oldKey, '->', newKey);
            migratedCount++;
        }
    } catch (e) {
        console.error('[StorageMigration] Failed to migrate memories:', e);
        errorCount++;
    }
    
    // 6. 迁移图库数据
    try {
        const oldKey = `game_${gameId}_gallery_v2`;
        const newKey = `galgame_${gameId}_gallery`;
        const data = localStorage.getItem(oldKey);
        if (data) {
            localStorage.setItem(newKey, data);
            console.log('[StorageMigration] Migrated gallery:', oldKey, '->', newKey);
            migratedCount++;
        }
    } catch (e) {
        console.error('[StorageMigration] Failed to migrate gallery:', e);
        errorCount++;
    }
    
    // 7. 迁移提示词配置
    try {
        const oldKey = `game_${gameId}_prompt_config`;
        const newKey = `galgame_${gameId}_prompt_config`;
        const data = localStorage.getItem(oldKey);
        if (data) {
            localStorage.setItem(newKey, data);
            console.log('[StorageMigration] Migrated prompt config:', oldKey, '->', newKey);
            migratedCount++;
        }
    } catch (e) {
        console.error('[StorageMigration] Failed to migrate prompt config:', e);
        errorCount++;
    }
    
    console.log(`[StorageMigration] Completed. Migrated: ${migratedCount}, Errors: ${errorCount}`);
    
    return { migratedCount, errorCount };
}

/**
 * 清理旧的存储键
 * @param {string} gameId - 游戏ID
 */
function cleanupOldStorageKeys(gameId) {
    const oldKeys = [
        `game_${gameId}_characters`,
        `wb_global_${gameId}`,
        `user_settings_${gameId}`,
        `chatui_${gameId}`,
        `game_${gameId}_memories`,
        `game_${gameId}_gallery_v2`,
        `game_${gameId}_prompt_config`
    ];
    
    oldKeys.forEach(key => {
        if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
            console.log('[StorageMigration] Cleaned up old key:', key);
        }
    });
}

// 导出到全局
window.migrateStorageKeys = migrateStorageKeys;
window.cleanupOldStorageKeys = cleanupOldStorageKeys;
window.STORAGE_KEYS = {
    CHARACTERS: (gameId) => `galgame_${gameId}_characters`,
    WORLDBOOK: (gameId) => `galgame_${gameId}_worldbook`,
    SETTINGS: (gameId) => `galgame_${gameId}_settings`,
    CHAT_UI: (gameId) => `galgame_${gameId}_chatui`,
    MEMORIES: (gameId) => `galgame_${gameId}_memories`,
    GALLERY: (gameId) => `galgame_${gameId}_gallery`,
    PROMPT_CONFIG: (gameId) => `galgame_${gameId}_prompt_config`,
    CURRENT_WORLD: 'galgame_current_world',
    SAVES: 'galgame_saves',
    CURRENT_SAVE: 'galgame_current_save'
};
