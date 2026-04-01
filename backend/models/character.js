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
    description: { type: String, default: '' },
    personality: { type: String, default: '' },
    scenario: { type: String, default: '' },
    firstMessage: { type: String, default: '' },
    worldConnection: {
      faction: { type: String, default: '' },
      location: { type: String, default: '' }
    }
  },
  
  // ===== 激活机制 =====
  activation: {
    keys: { type: [String], default: [] },
    priority: { type: Number, default: 100 },
    enabled: { type: Boolean, default: true }
  },
  
  // ===== 示例对话 =====
  examples: {
    style: { type: String, default: '' },
    dialogues: [{
      user: { type: String, default: '' },
      character: { type: String, default: '' },
      annotation: { type: String, default: '' }
    }]
  },
  
  // ===== 专属世界书 =====
  lorebook: {
    entries: [{
      name: { type: String, required: true },
      keys: { type: [String], default: [] },
      content: { type: String, required: true },
      priority: { type: Number, default: 100 },
      enabled: { type: Boolean, default: true }
    }],
    linkMode: { type: String, default: 'MANUAL', enum: ['MANUAL', 'SUGGESTED', 'AUTO', 'DISABLED'] },
    linkedEntryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Worldbook' }]
  },
  
  // ===== 深度注入配置 =====
  injection: {
    characterNote: {
      content: { type: String, default: '' },
      depth: { type: Number, default: 0 },
      frequency: { type: Number, default: 1 },
      role: { type: String, default: 'system', enum: ['system', 'user', 'assistant'] }
    },
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
    default: null
  },
  
  // ===== 向后兼容字段（只读） =====
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

// ========== 实例方法定义 ==========
const instanceMethods = {
  buildPrompt(userSettings = {}) {
    const parts = [];
    parts.push(`【角色】${this.name}`);
    
    if (this.core?.description) {
      parts.push(`\n【描述】\n${this.core.description}`);
    }
    if (this.core?.personality) {
      parts.push(`\n【性格】\n${this.core.personality}`);
    }
    if (this.core?.scenario) {
      parts.push(`\n【处境】\n${this.core.scenario}`);
    }
    if (this.core?.worldConnection?.faction || this.core?.worldConnection?.location) {
      parts.push(`\n【所属】${this.core.worldConnection.faction || '无'} | ${this.core.worldConnection.location || '未知地点'}`);
    }
    if (this.relationship) {
      parts.push(`\n【关系】好感度:${this.relationship.favor}/100 | 信任度:${this.relationship.trust}/100 | 心情:${this.relationship.mood}`);
    }
    if (this.examples?.style) {
      parts.push(`\n【说话风格】\n${this.examples.style}`);
    }
    
    return parts.join('\n');
  },

  getActiveLorebook(context = {}) {
    const { text, location } = context;
    const entries = [];
    const checkText = (text || '') + ' ' + (location || '');
    
    this.lorebook?.entries?.forEach(entry => {
      if (!entry.enabled) return;
      const isMatch = entry.keys.some(key => key && checkText.toLowerCase().includes(key.toLowerCase()));
      if (isMatch) entries.push(entry);
    });
    
    return entries.sort((a, b) => (b.priority || 100) - (a.priority || 100));
  },

  toSillyTavern() {
    return {
      name: this.name,
      description: this.core?.description,
      personality: this.core?.personality,
      scenario: this.core?.scenario,
      first_mes: this.core?.firstMessage,
      mes_example: this.examples?.dialogues?.map(d => `<START>\n{{user}}: ${d.user}\n{{char}}: ${d.character}`).join('\n'),
      creatorcomment: this.injection?.characterNote?.content,
      tags: this.meta?.tags,
      creator: this.meta?.creator,
      character_version: this.meta?.version
    };
  }
};

// ========== 静态方法定义 ==========
const staticMethods = {
  migrateFromV1(v1Data) {
    const now = new Date();
    return {
      name: v1Data.name || '未命名角色',
      visual: {
        avatar: v1Data.image || v1Data.avatar || '',
        cover: '',
        color: v1Data.color || '#8a6d3b',
        emotionCGs: {}
      },
      core: {
        description: [v1Data.appearance, v1Data.physique, v1Data.special].filter(Boolean).join('\n\n'),
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
      examples: { style: '', dialogues: [] },
      lorebook: { entries: [], linkMode: 'MANUAL', linkedEntryIds: [] },
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
  }
};

// ========== MongoDB模型创建 ==========

if (!useMemoryStore) {
  const characterSchema = new mongoose.Schema(characterSchemaDefinition);
  
  // 添加实例方法
  Object.assign(characterSchema.methods, instanceMethods);
  
  // 添加静态方法
  Object.assign(characterSchema.statics, staticMethods);
  
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
      const adaptedQuery = this._adaptQuery(query);
      
      if (Object.keys(adaptedQuery).length > 0) {
        all = all.filter(doc => this._matchQuery(doc, adaptedQuery));
      }

      if (options.sort) {
        const [field, order] = Object.entries(options.sort)[0];
        all.sort((a, b) => {
          const aValue = this._getField(a, field);
          const bValue = this._getField(b, field);
          return order === -1 
            ? new Date(bValue) - new Date(aValue)
            : new Date(aValue) - new Date(bValue);
        });
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
    
    // 静态方法
    static migrateFromV1(v1Data) {
      return staticMethods.migrateFromV1(v1Data);
    }
    
    // 辅助方法
    _adaptQuery(query) {
      const adapted = {};
      for (const [key, value] of Object.entries(query)) {
        if (key === 'name') adapted[key] = value;
        else if (key === 'gameId') adapted[key] = value;
        else if (key === 'enabled') adapted['activation.enabled'] = value;
        else if (key === 'keys') adapted['activation.keys'] = value;
        else adapted[key] = value;
      }
      return adapted;
    }
    
    _matchQuery(doc, query) {
      for (const [key, value] of Object.entries(query)) {
        if (key === '$or') {
          const match = value.some(condition => {
            return Object.entries(condition).every(([k, v]) => {
              if (v && v.$regex) {
                // 处理正则表达式查询
                const fieldValue = this._getField(doc, k);
                if (typeof fieldValue === 'string') {
                  const regex = new RegExp(v.$regex, v.$options || '');
                  return regex.test(fieldValue);
                }
                return false;
              } else if (v && v.$in) {
                // 处理 $in 查询
                const fieldValue = this._getField(doc, k);
                return v.$in.some(item => {
                  if (item instanceof RegExp) {
                    return typeof fieldValue === 'string' && item.test(fieldValue);
                  }
                  return fieldValue === item;
                });
              } else {
                return this._getField(doc, k) === v;
              }
            });
          });
          if (!match) return false;
        } else if (value && value.$regex) {
          // 处理正则表达式查询
          const fieldValue = this._getField(doc, key);
          if (typeof fieldValue === 'string') {
            const regex = new RegExp(value.$regex, value.$options || '');
            if (!regex.test(fieldValue)) {
              return false;
            }
          } else {
            return false;
          }
        } else if (value && value.$in) {
          // 处理 $in 查询
          const fieldValue = this._getField(doc, key);
          if (!value.$in.includes(fieldValue)) {
            return false;
          }
        } else if (this._getField(doc, key) !== value) {
          return false;
        }
      }
      return true;
    }
    
    _getField(obj, path) {
      return path.split('.').reduce((o, p) => o && o[p], obj);
    }
    
    _ensureV2Structure(data) {
      if (data.core || data.visual) {
        return data;
      }
      return MemoryCharacterModel.migrateFromV1(data);
    }
  }

  module.exports = new MemoryCharacterModel();
}
