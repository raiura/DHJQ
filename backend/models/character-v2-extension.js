/**
 * 角色卡V2后端扩展模块
 * 
 * 使用方法：
 * 1. 将以下内容添加到 backend/models/character.js 的schema定义中：
 *    v2Data: {
 *      type: mongoose.Schema.Types.Mixed,
 *      default: null
 *    }
 * 
 * 2. 在路由中添加V2处理（详见 backend/routes/character-v2-routes.js）
 */

const mongoose = require('mongoose');

/**
 * V2数据结构定义（用于验证和文档）
 */
const CharacterV2SchemaDefinition = {
    // 版本标识
    version: { type: String, default: '2.0' },
    format: { type: String, default: 'v2' },
    
    // 核心设定
    core: {
        description: String,
        personality: String,
        scenario: String,
        firstMessage: String,
        exampleDialogues: [{
            text: String,
            type: { type: String, enum: ['example', 'greeting', 'farewell'] }
        }]
    },
    
    // 视觉配置
    visual: {
        avatar: String,
        color: String,
        customCSS: String,
        portrait: String,
        expressions: Map
    },
    
    // 激活机制
    activation: {
        keys: [String],
        priority: { type: Number, default: 100 },
        triggerConditions: [String]
    },
    
    // 关系与情感
    relationship: {
        favor: { type: Number, default: 50 },
        trust: { type: Number, default: 50 },
        mood: { type: String, default: '平静' },
        emotionalState: mongoose.Schema.Types.Mixed
    },
    
    // 世界书配置
    lorebook: {
        entries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Worldbook' }],
        _linkMode: { type: String, enum: ['manual', 'auto', 'disabled'], default: 'manual' },
        autoLinkSettings: mongoose.Schema.Types.Mixed
    },
    
    // 深度注入配置
    injection: {
        characterNote: {
            content: String,
            depth: { type: Number, default: 0 },
            frequency: { type: Number, default: 1 },
            role: { type: String, default: 'system' }
        },
        postHistory: {
            content: String,
            enabled: { type: Boolean, default: false }
        }
    },
    
    // 扩展字段
    extensions: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
};

/**
 * V2数据验证函数
 */
function validateV2Data(v2Data) {
    const errors = [];
    
    if (!v2Data) {
        return { valid: true };
    }
    
    // 验证必填字段
    if (!v2Data.name && !v2Data.core?.description) {
        errors.push('角色名称或描述至少需要一个');
    }
    
    // 验证版本
    if (v2Data.version && !v2Data.version.startsWith('2.')) {
        errors.push('版本号必须以2.开头');
    }
    
    // 验证注入深度
    if (v2Data.injection?.characterNote?.depth < 0) {
        errors.push('注入深度不能为负数');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * V1到V2迁移函数
 */
function migrateV1ToV2(v1Character) {
    return {
        version: '2.0',
        format: 'v2',
        name: v1Character.name,
        core: {
            description: v1Character.appearance || '',
            personality: v1Character.personality || '',
            scenario: v1Character.background || '',
            firstMessage: v1Character.firstMessage || '',
            exampleDialogues: []
        },
        visual: {
            avatar: v1Character.avatar || '',
            color: v1Character.color || '#8a6d3b'
        },
        activation: {
            keys: v1Character.keys || [],
            priority: v1Character.priority || 100
        },
        relationship: {
            favor: v1Character.favor || 50,
            trust: v1Character.trust || 50,
            mood: v1Character.mood || '平静'
        },
        lorebook: {
            entries: [],
            _linkMode: 'manual'
        },
        injection: {
            characterNote: { content: '', depth: 0, frequency: 1 },
            postHistory: { content: '', enabled: false }
        },
        _migratedFrom: 'v1',
        _migratedAt: new Date()
    };
}

/**
 * V2到V1降级函数（向后兼容）
 */
function downgradeV2ToV1(v2Character) {
    return {
        name: v2Character.name,
        appearance: v2Character.core?.description || '',
        personality: v2Character.core?.personality || '',
        background: v2Character.core?.scenario || '',
        firstMessage: v2Character.core?.firstMessage || '',
        avatar: v2Character.visual?.avatar || '',
        color: v2Character.visual?.color || '#8a6d3b',
        keys: v2Character.activation?.keys || [],
        priority: v2Character.activation?.priority || 100,
        favor: v2Character.relationship?.favor || 50,
        trust: v2Character.relationship?.trust || 50,
        mood: v2Character.relationship?.mood || '平静',
        _isDowngradedV2: true,
        _originalVersion: v2Character.version
    };
}

module.exports = {
    CharacterV2SchemaDefinition,
    validateV2Data,
    migrateV1ToV2,
    downgradeV2ToV1
};
