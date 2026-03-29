/**
 * Gallery V2.0 Model
 * 世界角色CG自由拓展系统
 */

const mongoose = require('mongoose');
const memoryStore = require('../utils/memoryStore');

// 检查 MongoDB 是否连接
let useMemoryStore = false;
try {
  useMemoryStore = mongoose.connection.readyState !== 1;
} catch (error) {
  useMemoryStore = true;
}

// Gallery V2 Schema Definition
const galleryV2SchemaDefinition = {
  // ===== 基础关联 =====
  gameId: {
    type: String,
    required: true,
    index: true
  },
  characterId: {
    type: String,
    default: null,  // null表示通用CG
    index: true
  },
  characterName: {
    type: String,
    default: ''
  },

  // ===== 图片信息 =====
  name: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String,
    default: ''
  },

  // ===== CG分类 =====
  type: {
    type: String,
    enum: [
      'background',           // 背景图
      'character_default',    // 角色默认立绘（8表情）
      'character_extended',   // 角色拓展CG
      'scene_event',          // 场景事件CG（多人互动）
      'special_action'        // 特殊动作CG
    ],
    default: 'character_extended'
  },

  // ===== 提示词驱动系统（核心）=====
  triggerSystem: {
    // 触发模式
    mode: {
      type: String,
      enum: ['tag_match', 'prompt_similarity', 'ai_intent_recognition'],
      default: 'tag_match'
    },

    // 触发条件
    conditions: {
      sceneKeywords: [{ type: String }],      // 场景关键词
      emotions: [{ type: String }],           // 情绪标签
      actions: [{ type: String }],            // 动作标签
      relationshipStates: [{ type: String }], // 关系状态
      specialTags: [{ type: String }]         // 特殊标记（R18/血腥等）
    },

    // 权重和概率
    priority: { type: Number, default: 100 },   // 0-1000
    probability: { type: Number, default: 1.0 } // 0-1
  },

  // ===== 显示控制 =====
  display: {
    mode: {
      type: String,
      enum: [
        'fullscreen',      // 全屏
        'character_left',  // 角色左侧
        'character_right', // 角色右侧
        'character_center',// 角色中央
        'overlay',         // 叠加层
        'split_screen'     // 分屏
      ],
      default: 'character_center'
    },
    animation: {
      enter: { type: String, default: 'fade' },  // fade/slide/zoom
      exit: { type: String, default: 'fade' },
      duration: { type: Number, default: 500 }   // ms
    },
    zIndex: { type: Number, default: 10 }
  },

  // ===== 约束条件 =====
  constraints: {
    prerequisites: {
      minFavor: { type: Number, default: 0 },
      maxFavor: { type: Number, default: 100 },
      requiredTags: [{ type: String }],
      forbiddenTags: [{ type: String }]
    },
    cooldown: {
      enabled: { type: Boolean, default: false },
      duration: { type: Number, default: 30 },  // 秒
      global: { type: Boolean, default: false }
    }
  },

  // ===== 元数据 =====
  meta: {
    description: { type: String, default: '' },
    creator: { type: String, default: '' },
    version: { type: String, default: '2.0.0' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    usageCount: { type: Number, default: 0 }
  }
};

// 实例方法：计算匹配分数
const calculateMatchScore = function(context) {
  const { scene, emotion, action, relationshipState } = context;
  const conditions = this.triggerSystem.conditions;
  let score = 0;
  let matchDetails = [];

  const sceneText = (scene || '').toLowerCase();

  // 1. 场景关键词匹配 (+1分/词)
  if (conditions.sceneKeywords?.length > 0) {
    conditions.sceneKeywords.forEach(keyword => {
      if (sceneText.includes(keyword.toLowerCase())) {
        score += 1;
        matchDetails.push(`场景词: ${keyword}`);
      }
    });
  }

  // 2. 情绪匹配 (+3分)
  if (emotion && conditions.emotions?.includes(emotion)) {
    score += 3;
    matchDetails.push(`情绪: ${emotion}`);
  }

  // 3. 动作匹配 (+3分)
  if (action && conditions.actions?.includes(action)) {
    score += 3;
    matchDetails.push(`动作: ${action}`);
  }

  // 4. 关系状态匹配 (+2分)
  if (relationshipState && conditions.relationshipStates?.length > 0) {
    conditions.relationshipStates.forEach(state => {
      if (sceneText.includes(state.toLowerCase())) {
        score += 2;
        matchDetails.push(`关系: ${state}`);
      }
    });
  }

  // 5. 特殊标记匹配 (+5分，高权重)
  if (conditions.specialTags?.length > 0) {
    conditions.specialTags.forEach(tag => {
      if (sceneText.includes(tag.toLowerCase())) {
        score += 5;
        matchDetails.push(`特殊: ${tag}`);
      }
    });
  }

  // 6. 应用优先级权重
  const priorityWeight = (this.triggerSystem.priority || 100) / 100;
  score *= priorityWeight;

  return {
    score: Math.round(score * 100) / 100,
    details: matchDetails,
    probability: this.triggerSystem.probability
  };
};

// 实例方法：检查约束条件
const checkConstraints = function(relationshipState) {
  // 如果没有约束条件，直接通过
  if (!this.constraints || !this.constraints.prerequisites) {
    return { allowed: true };
  }
  
  const prereq = this.constraints.prerequisites;

  // 检查好感度范围
  if (relationshipState?.favor !== undefined) {
    if (prereq.minFavor !== undefined && relationshipState.favor < prereq.minFavor) {
      return { allowed: false, reason: `好感度不足 (${relationshipState.favor}/${prereq.minFavor})` };
    }
    if (prereq.maxFavor !== undefined && relationshipState.favor > prereq.maxFavor) {
      return { allowed: false, reason: `好感度过高 (${relationshipState.favor}/${prereq.maxFavor})` };
    }
  }

  return { allowed: true };
};

// MongoDB 模型
if (!useMemoryStore) {
  const galleryV2Schema = new mongoose.Schema(galleryV2SchemaDefinition);

  // 索引
  galleryV2Schema.index({ gameId: 1, characterId: 1 });
  galleryV2Schema.index({ 'triggerSystem.conditions.sceneKeywords': 1 });
  galleryV2Schema.index({ 'triggerSystem.conditions.emotions': 1 });

  // 实例方法
  galleryV2Schema.methods.calculateMatchScore = calculateMatchScore;
  galleryV2Schema.methods.checkConstraints = checkConstraints;

  // 预保存钩子
  galleryV2Schema.pre('save', function(next) {
    this.meta.updatedAt = new Date();
    next();
  });

  module.exports = mongoose.model('GalleryV2', galleryV2Schema);
} else {
  // 内存存储模型
  class MemoryGalleryV2Model {
    constructor() {
      this.collectionName = 'gallery_v2';
    }

    async find(query = {}, options = {}) {
      let all = memoryStore.findAll(this.collectionName);

      if (Object.keys(query).length > 0) {
        all = all.filter(doc => this._matchQuery(doc, query));
      }

      if (options.sort) {
        const [field, order] = Object.entries(options.sort)[0];
        all.sort((a, b) => {
          const aVal = this._getField(a, field);
          const bVal = this._getField(b, field);
          return order === -1 ? (bVal > aVal ? 1 : -1) : (aVal > bVal ? 1 : -1);
        });
      }

      // 为每个文档绑定实例方法
      return all.map(doc => this._bindMethods(doc));
    }
    
    _bindMethods(doc) {
      if (!doc) return doc;
      // 直接为文档对象添加方法，不使用bind
      doc.calculateMatchScore = function(context) {
        return calculateMatchScore.call(this, context);
      };
      doc.checkConstraints = function(relationshipState) {
        return checkConstraints.call(this, relationshipState);
      };
      return doc;
    }

    async findOne(query) {
      const all = await this.find(query);
      return all[0] || null;
    }

    async findById(id) {
      const doc = memoryStore.findById(this.collectionName, id);
      return this._bindMethods(doc);
    }

    async create(data) {
      const doc = {
        ...data,
        _id: 'galv2_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        meta: {
          ...data.meta,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      };
      const created = memoryStore.create(this.collectionName, doc);
      return this._bindMethods(created);
    }

    async insertMany(docs) {
      return Promise.all(docs.map(doc => this.create(doc)));
    }

    async findByIdAndUpdate(id, data) {
      const updated = memoryStore.update(this.collectionName, id, {
        ...data,
        'meta.updatedAt': new Date()
      });
      return this._bindMethods(updated);
    }

    async findByIdAndDelete(id) {
      return memoryStore.delete(this.collectionName, id);
    }

    async countDocuments(query = {}) {
      const all = await this.find(query);
      return all.length;
    }

    // 辅助方法
    _matchQuery(doc, query) {
      for (const [key, value] of Object.entries(query)) {
        if (key === 'gameId' && doc.gameId !== value) return false;
        if (key === 'characterId') {
          if (value === null && doc.characterId !== null) return false;
          if (value !== null && doc.characterId !== value) return false;
        }
        if (key === 'type' && doc.type !== value) return false;
      }
      return true;
    }

    _getField(obj, path) {
      return path.split('.').reduce((o, p) => o?.[p], obj);
    }
  }

  // 给内存模型的实例添加方法
  MemoryGalleryV2Model.prototype.calculateMatchScore = calculateMatchScore;
  MemoryGalleryV2Model.prototype.checkConstraints = checkConstraints;

  module.exports = new MemoryGalleryV2Model();
}
