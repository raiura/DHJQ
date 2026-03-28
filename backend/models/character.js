const mongoose = require('mongoose');
const memoryStore = require('../utils/memoryStore');

// 检查 MongoDB 是否连接
let useMemoryStore = false;
try {
  useMemoryStore = mongoose.connection.readyState !== 1;
} catch (error) {
  useMemoryStore = true;
}

// ========== Character Card V2.0 Schema ==========
// 统一使用V2格式，完全替代V1
const characterSchemaDefinition = {
  // ===== 基础信息 =====
  name: {
    type: String,
    required: true
  },
  
  // ===== 视觉配置 =====
  visual: {
    avatar: { type: String, default: '' },
    cover: { type: String, default: '' },
    color: { type: String, default: '#8a6d3b' },
    emotionCGs: {
      calm: { type: String, default: '' },
      happy: { type: String, default: '' },
      angry: { type: String, default: '' },
      sad: { type: String, default: '' },
      shy: { type: String, default: '' },
      surprise: { type: String, default: '' },
      serious: { type: String, default: '' },
      hurt: { type: String, default: '' }
    }
  },
  
  // ===== 核心设定 =====
  core: {
    // 角色综合描述（原appearance + physique + special的整合）
    description: { type: String, default: '' },
    // 性格特点
    personality: { type: String, default: '' },
    // 当前处境/背景
    scenario: { type: String, default: '' },
    // 开场白
    firstMessage: { type: String, default: '' },
    // 与世界观的连接
    worldConnection: {
      faction: { type: String, default: '' },
      location: { type: String, default: '' }
    }
  },
  
  // ===== 激活机制 =====
  activation: {
    // 触发关键词
    keys: { type: [String], default: [] },
    // 优先级
    priority: { type: Number, default: 100 },
    // 是否启用
    enabled: { type: Boolean, default: true }
  },
  
  // ===== 示例对话 =====
  examples: {
    // 对话风格描述
    style: { type: String, default: '' },
    // 示例对话数组
    dialogues: [{
      user: { type: String, default: '' },
      character: { type: String, default: '' },
      annotation: { type: String, default: '' }
    }]
  },
  
  // ===== 专属世界书 =====
  lorebook: {
    // 角色专属世界书条目
    entries: [{
      name: { type: String, required: true },
      keys: { type: [String], default: [] },
      content: { type: String, required: true },
      priority: { type: Number, default: 100 },
      enabled: { type: Boolean, default: true }
    }],
    // 关联模式: MANUAL(手动) / SUGGESTED(建议) / AUTO(自动) / DISABLED(禁用)
    linkMode: { type: String, default: 'MANUAL', enum: ['MANUAL', 'SUGGESTED', 'AUTO', 'DISABLED'] },
    // 关联的世界书条目ID（全局世界书）
    linkedEntryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Worldbook' }]
  },
  
  // ===== 深度注入配置 =====
  injection: {
    // Character Note (角色笔记)
    characterNote: {
      content: { type: String, default: '' },
      depth: { type: Number, default: 0 },      // 注入深度（消息位置）
      frequency: { type: Number, default: 1 },  // 触发频率（每N轮）
      role: { type: String, default: 'system', enum: ['system', 'user', 'assistant'] }
    },
    // Post-History Instructions
    postHistory: {
      content: { type: String, default: '' },
      enabled: { type: Boolean, default: false }
    }
  },
  
  // ===== 关系与情感 =====
  relationship: {
    favor: { type: Number, default: 50, min: 0, max: 100 },
    trust: { type: Number, default: 50, min: 0, max: 100 },
    mood: { type: String, default: '平静' }
  },
  
  // ===== 元数据 =====
  meta: {
    description: { type: String, default: '' },
    tags: { type: [String], default: [] },
    creator: { type: String, default: '' },
    version: { type: String, default: '2.0.0' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  
  // ===== 游戏关联 =====
  gameId: {
    type: String,
    default: null  // null 表示全局角色
  },
  
  // ===== 向后兼容字段（只读，用于数据迁移） =====
  // 这些字段不再使用，保留是为了数据迁移
  _legacy: {
    appearance: { type: String, default: '' },
    personality: { type: String, default: '' },
    physique: { type: String, default: '' },
    background: { type: String, default: '' },
    special: { type: String, default: '' },
    prompt: { type: String, default: '' },
    image: { type: String, default: '' },
    imageFit: { type: String, default: 'cover' },
    color: { type: String, default: '#999999' },
    keys: { type: [String], default: [] },
    priority: { type: Number, default: 100 },
    enabled: { type: Boolean, default: true }
  }
};

// ========== 实例方法 ==========

/**
 * 构建用于AI的提示词
 */
characterSchemaDefinition.methods.buildPrompt = function(userSettings = {}) {
  const parts = [];
  
  // 系统层
  parts.push(`【角色】${this.name}`);
  
  // 核心设定
  if (this.core.description) {
    parts.push(`\n【描述】\n${this.core.description}`);
  }
  if (this.core.personality) {
    parts.push(`\n【性格】\n${this.core.personality}`);
  }
  if (this.core.scenario) {
    parts.push(`\n【处境】\n${this.core.scenario}`);
  }
  
  // 世界观连接
  if (this.core.worldConnection.faction || this.core.worldConnection.location) {
    parts.push(`\n【所属】${this.core.worldConnection.faction || '无'} | ${this.core.worldConnection.location || '未知地点'}`);
  }
  
  // 关系状态
  if (this.relationship) {
    parts.push(`\n【关系】好感度:${this.relationship.favor}/100 | 信任度:${this.relationship.trust}/100 | 心情:${this.relationship.mood}`);
  }
  
  // 示例对话风格
  if (this.examples.style) {
    parts.push(`\n【说话风格】\n${this.examples.style}`);
  }
  
  return parts.join('\n');
};

/**
 * 获取激活的世界书内容
 */
characterSchemaDefinition.methods.getActiveLorebook = function(context = {}) {
  const { text, location } = context;
  const activeEntries = [];
  
  // 检查角色专属世界书条目
  this.lorebook.entries.forEach(entry => {
    if (!entry.enabled) return;
    
    // 检查关键词匹配
    const isActivated = entry.keys.some(key => {
      if (!key) return false;
      return text?.includes(key) || location?.includes(key);
    });
    
    if (isActivated) {
      activeEntries.push(entry);
    }
  });
  
  // 按优先级排序
  activeEntries.sort((a, b) => b.priority - a.priority);
  
  return activeEntries;
};

/**
 * 导出为SillyTavern格式
 */
characterSchemaDefinition.methods.toSillyTavern = function() {
  return {
    name: this.name,
    description: this.core.description,
    personality: this.core.personality,
    scenario: this.core.scenario,
    first_mes: this.core.firstMessage,
    mes_example: this.examples.dialogues.map(d => 
      `<START>\n{{user}}: ${d.user}\n{{char}}: ${d.character}`
    ).join('\n'),
    creatorcomment: this.injection.characterNote.content,
    tags: this.meta.tags,
    creator: this.meta.creator,
    character_version: this.meta.version
  };
};

// ========== 静态方法 ==========

/**
 * 从V1数据迁移
 */
characterSchemaDefinition.statics.migrateFromV1 = function(v1Data) {
  const now = new Date();
  
  return {
    name: v1Data.name || '未命名角色',
    
    visual: {
      avatar: v1Data.image || v1Data.avatar || '',
      color: v1Data.color || '#8a6d3b',
      emotionCGs: {}
    },
    
    core: {
      description: [v1Data.appearance, v1Data.physique, v1Data.special]
        .filter(Boolean).join('\n\n'),
      personality: v1Data.personality || '',
      scenario: v1Data.background || '',
      firstMessage: v1Data.firstMessage || '',
      worldConnection: { faction: '', location: '' }
    },
    
    activation: {
      keys: v1Data.keys || [],
      priority: v1Data.priority || 100,
      enabled: v1Data.enabled !== false
    },
    
    examples: {
      style: '',
      dialogues: []
    },
    
    lorebook: {
      entries: [],
      linkMode: 'MANUAL',
      linkedEntryIds: []
    },
    
    injection: {
      characterNote: { content: '', depth: 0, frequency: 1, role: 'system' },
      postHistory: { content: '', enabled: false }
    },
    
    relationship: {
      favor: v1Data.favor || 50,
      trust: v1Data.trust || 50,
      mood: v1Data.mood || '平静'
    },
    
    meta: {
      description: '',
      tags: [],
      creator: '',
      version: '2.0.0',
      createdAt: v1Data.createdAt || now,
      updatedAt: now
    },
    
    gameId: v1Data.gameId || null,
    
    // 保留旧数据用于参考
    _legacy: {
      appearance: v1Data.appearance || '',
      personality: v1Data.personality || '',
      physique: v1Data.physique || '',
      background: v1Data.background || '',
      special: v1Data.special || '',
      prompt: v1Data.prompt || '',
      image: v1Data.image || '',
      imageFit: v1Data.imageFit || 'cover',
      color: v1Data.color || '#999999',
      keys: v1Data.keys || [],
      priority: v1Data.priority || 100,
      enabled: v1Data.enabled !== false
    }
  };
};

// ========== MongoDB模型创建 ==========

if (!useMemoryStore) {
  const characterSchema = new mongoose.Schema(characterSchemaDefinition);
  
  // 预保存钩子 - 更新updatedAt
  characterSchema.pre('save', function(next) {
    this.meta.updatedAt = new Date();
    next();
  });
  
  module.exports = mongoose.model('Character', characterSchema);
} else {
  // 内存存储模型 - 完全兼容V2结构
  class MemoryCharacterModel {
    constructor() {
      this.collectionName = 'characters';
    }

    async find(query = {}, options = {}) {
      let all = memoryStore.findAll(this.collectionName);
      
      // 转换查询条件以适应新结构
      const adaptedQuery = this._adaptQuery(query);
      
      if (Object.keys(adaptedQuery).length > 0) {
        all = all.filter(doc => this._matchQuery(doc, adaptedQuery));
      }

      if (options.sort) {
        const [field, order] = Object.entries(options.sort)[0];
        all.sort((a, b) => order === -1 
          ? new Date(b[field]) - new Date(a[field])
          : new Date(a[field]) - new Date(b[field])
        );
      }

      return all;
    }

    async findOne(query) {
      const all = await this.find(query);
      return all[0] || null;
    }

    async findById(id) {
      return memoryStore.findById(this.collectionName, id);
    }

    async create(data) {
      // 确保数据符合V2结构
      const v2Data = this._ensureV2Structure(data);
      return memoryStore.create(this.collectionName, {
        ...v2Data,
        'meta.createdAt': new Date(),
        'meta.updatedAt': new Date()
      });
    }

    async insertMany(docs) {
      return docs.map(doc => this.create(doc));
    }

    async findByIdAndUpdate(id, data, options = {}) {
      const v2Data = this._ensureV2Structure(data);
      return memoryStore.update(this.collectionName, id, {
        ...v2Data,
        'meta.updatedAt': new Date()
      });
    }

    async findByIdAndDelete(id) {
      return memoryStore.delete(this.collectionName, id);
    }

    async countDocuments(query = {}) {
      const all = await this.find(query);
      return all.length;
    }
    
    // 辅助方法：转换查询条件
    _adaptQuery(query) {
      const adapted = {};
      for (const [key, value] of Object.entries(query)) {
        // 处理旧字段名映射到新结构
        if (key === 'name') adapted[key] = value;
        else if (key === 'gameId') adapted[key] = value;
        else if (key === 'enabled') adapted['activation.enabled'] = value;
        else if (key === 'keys') adapted['activation.keys'] = value;
        else adapted[key] = value;
      }
      return adapted;
    }
    
    // 辅助方法：匹配查询
    _matchQuery(doc, query) {
      for (const [key, value] of Object.entries(query)) {
        if (key === '$or') {
          const match = value.some(condition => {
            return Object.entries(condition).every(([k, v]) => {
              return this._getField(doc, k) === v;
            });
          });
          if (!match) return false;
        } else if (this._getField(doc, key) !== value) {
          return false;
        }
      }
      return true;
    }
    
    // 辅助方法：获取嵌套字段
    _getField(obj, path) {
      return path.split('.').reduce((o, p) => o && o[p], obj);
    }
    
    // 辅助方法：确保V2结构
    _ensureV2Structure(data) {
      if (data.core || data.visual) {
        // 已经是V2结构
        return data;
      }
      // 需要迁移
      return this.constructor.migrateFromV1(data);
    }
  }

  module.exports = new MemoryCharacterModel();
}
