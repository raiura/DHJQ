/**
 * 版本管理器
 * 统一管理各个子系统的版本，自动处理版本迁移和兼容性
 */

class VersionManager {
    constructor() {
        this.versions = {
            character: { current: '2.0', minSupported: '1.0' },
            worldbook: { current: '2.0', minSupported: '1.0' },
            gallery: { current: '2.0', minSupported: '2.0' },
            memory: { current: '1.0', minSupported: '1.0' },
            save: { current: '2.0', minSupported: '1.0' }
        };
        
        this.migrations = {
            'character': {
                '1.0_to_2.0': this.migrateCharacterV1ToV2.bind(this)
            },
            'worldbook': {
                '1.0_to_2.0': this.migrateWorldbookV1ToV2.bind(this)
            },
            'save': {
                '1.0_to_2.0': this.migrateSaveV1ToV2.bind(this)
            }
        };
    }

    /**
     * 检查数据版本并进行必要的迁移
     */
    async checkAndMigrate(dataType, data) {
        const versionInfo = this.versions[dataType];
        if (!versionInfo) {
            console.warn(`[VersionManager] 未知的类型: ${dataType}`);
            return data;
        }

        const dataVersion = data._version || '1.0';
        
        // 检查是否需要迁移
        if (this.compareVersions(dataVersion, versionInfo.current) >= 0) {
            return data; // 已是最新版本
        }

        // 检查是否支持该版本
        if (this.compareVersions(dataVersion, versionInfo.minSupported) < 0) {
            console.error(`[VersionManager] 不支持的版本: ${dataVersion}, 最低支持: ${versionInfo.minSupported}`);
            return null;
        }

        console.log(`[VersionManager] 需要迁移 ${dataType}: ${dataVersion} -> ${versionInfo.current}`);
        
        // 执行迁移
        const migrationKey = `${dataVersion}_to_${versionInfo.current}`;
        const migration = this.migrations[dataType]?.[migrationKey];
        
        if (migration) {
            try {
                const migrated = await migration(data);
                migrated._version = versionInfo.current;
                migrated._migratedAt = new Date().toISOString();
                console.log(`[VersionManager] 迁移成功: ${dataType}`);
                return migrated;
            } catch (error) {
                console.error(`[VersionManager] 迁移失败: ${dataType}`, error);
                return data; // 返回原始数据
            }
        }
        
        return data;
    }

    /**
     * 标记数据版本
     */
    markVersion(data, dataType) {
        const versionInfo = this.versions[dataType];
        if (versionInfo) {
            data._version = versionInfo.current;
            data._updatedAt = new Date().toISOString();
        }
        return data;
    }

    /**
     * 比较版本号
     * @returns {number} -1: v1 < v2, 0: v1 == v2, 1: v1 > v2
     */
    compareVersions(v1, v2) {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);
        
        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const p1 = parts1[i] || 0;
            const p2 = parts2[i] || 0;
            
            if (p1 < p2) return -1;
            if (p1 > p2) return 1;
        }
        
        return 0;
    }

    // ==================== 具体迁移逻辑 ====================

    /**
     * 迁移角色 V1 -> V2
     */
    async migrateCharacterV1ToV2(char) {
        console.log(`[VersionManager] 迁移角色: ${char.name}`);
        
        return {
            ...char,
            // V2 新增字段
            appearance: char.appearance || char.prompt || '',
            personality: char.personality || '',
            background: char.background || '',
            physique: char.physique || '',
            special: char.special || '',
            favor: char.favor || 0,
            trust: char.trust || 0,
            mood: char.mood || 'calm',
            stats: char.stats || { encounters: 0, dialogueTurns: 0 }
        };
    }

    /**
     * 迁移世界书 V1 -> V2
     */
    async migrateWorldbookV1ToV2(worldbook) {
        console.log('[VersionManager] 迁移世界书');
        
        // V1 是单本结构，V2 是多本结构
        if (!worldbook.books && worldbook.entries) {
            // 这是 V1 格式
            return {
                version: '2.0',
                books: [{
                    id: 'wb_default',
                    name: '默认世界书',
                    description: '从V1迁移的世界书',
                    entries: worldbook.entries || [],
                    groups: worldbook.groups || {},
                    enabled: true,
                    isGlobal: true,
                    createdAt: new Date().toISOString()
                }],
                activeBookIds: ['wb_default'],
                selectedBookId: 'wb_default'
            };
        }
        
        return worldbook;
    }

    /**
     * 迁移存档 V1 -> V2
     */
    async migrateSaveV1ToV2(save) {
        console.log(`[VersionManager] 迁移存档: ${save.name || save.id}`);
        
        return {
            ...save,
            version: '2.0',
            // 标准化字段
            messages: save.messages || save.dialogueHistory || [],
            memories: save.memories || { short: [], long: [], core: [] },
            userCharacter: save.userCharacter || save.userCharacters?.[0] || null
        };
    }

    /**
     * 批量迁移角色数组
     */
    async migrateCharacters(characters) {
        if (!Array.isArray(characters)) return [];
        
        const migrated = [];
        for (const char of characters) {
            const result = await this.checkAndMigrate('character', char);
            if (result) migrated.push(result);
        }
        return migrated;
    }

    /**
     * 获取版本信息
     */
    getVersionInfo(dataType) {
        return this.versions[dataType];
    }

    /**
     * 获取所有版本信息
     */
    getAllVersions() {
        return { ...this.versions };
    }
}

// 单例实例
let versionManagerInstance = null;

function getVersionManager() {
    if (!versionManagerInstance) {
        versionManagerInstance = new VersionManager();
    }
    return versionManagerInstance;
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VersionManager, getVersionManager };
}

if (typeof window !== 'undefined') {
    window.VersionManager = VersionManager;
    window.getVersionManager = getVersionManager;
}
