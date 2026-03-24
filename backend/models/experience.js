/**
 * 角色经历档案模型
 * 记录角色与玩家的重要时刻，与记忆库双向联动
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

// 经历类型枚举
const ExperienceType = {
  MILESTONE: 'milestone',   // 里程碑
  INTIMATE: 'intimate',     // 亲密时刻
  CONFLICT: 'conflict',     // 冲突
  SECRET: 'secret',         // 秘密
  DAILY: 'daily'            // 日常
};

// 经历状态枚举
const ExperienceStatus = {
  LOCKED: 'locked',         // 未解锁（显示???）
  UNLOCKED: 'unlocked',     // 已解锁但未揭示
  REVEALED: 'revealed'      // 已在对话中揭示
};

/**
 * 内存经历模型
 */
class ExperienceModel {
  constructor() {
    this.collectionName = 'experiences';
    this.counters = new Map(); // 用于生成序号
  }

  async create(data) {
    // 生成ID: exp_{characterId}_{序号}
    const key = data.characterId;
    const currentCount = this.counters.get(key) || 0;
    const newCount = currentCount + 1;
    this.counters.set(key, newCount);
    
    const doc = memoryStore.create(this.collectionName, {
      ...data,
      id: `exp_${key}_${String(newCount).padStart(3, '0')}`,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return this._addMethods(doc);
  }

  async find(query = {}) {
    let docs = memoryStore.findAll(this.collectionName);
    
    // 过滤
    if (Object.keys(query).length > 0) {
      docs = docs.filter(doc => {
        for (const [key, value] of Object.entries(query)) {
          if (doc[key] !== value) return false;
        }
        return true;
      });
    }
    
    // 按时间倒序（新的在前）
    docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return docs.map(d => this._addMethods(d));
  }

  async findOne(query) {
    const docs = await this.find(query);
    return docs[0] || null;
  }

  async findById(id) {
    const docs = await this.find({ id });
    return docs[0] || null;
  }

  async update(id, data) {
    const updated = memoryStore.update(this.collectionName, id, {
      ...data,
      updatedAt: new Date()
    });
    return updated ? this._addMethods(updated) : null;
  }

  async delete(id) {
    return memoryStore.delete(this.collectionName, id);
  }

  // 获取角色的所有经历
  async findByCharacter(characterId) {
    return this.find({ characterId });
  }

  // 获取已解锁但未揭示的经历
  async getUnlockedButNotRevealed(characterId) {
    const docs = await this.find({ 
      characterId, 
      isUnlocked: true, 
      isRevealed: false 
    });
    return docs;
  }

  // 检查某条记忆是否已关联经历
  async hasLinkedExperience(memoryId) {
    const docs = await this.find({});
    return docs.some(doc => 
      doc.derivedFrom && doc.derivedFrom.includes(memoryId)
    );
  }

  _addMethods(doc) {
    if (!doc) return null;
    doc.save = async () => {
      return memoryStore.update(this.collectionName, doc._id, doc);
    };
    return doc;
  }
}

// MongoDB Schema
const experienceSchema = new mongoose.Schema({
  // 基础信息
  id: { type: String, required: true, unique: true },
  characterId: { type: String, required: true, index: true },
  gameId: { type: String, required: true, index: true },
  
  // 内容
  title: { type: String, required: true },           // 4-6字标题
  summary: { type: String, required: true },         // 50字内描述
  type: { 
    type: String, 
    enum: Object.values(ExperienceType),
    default: ExperienceType.DAILY 
  },
  
  // 时间
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  gameDate: { type: String, default: '' },           // 游戏内日期
  
  // 来源追踪（与记忆库的双向链接）
  derivedFrom: [{ type: String }],                   // 关联的记忆ID数组
  quoteSnapshot: { type: String, default: '' },      // 当时的原话片段
  
  // 状态
  isUnlocked: { type: Boolean, default: false },
  unlockedAt: { type: Date, default: null },
  isRevealed: { type: Boolean, default: false },
  revealedAt: { type: Date, default: null },
  revealedInDialogue: { type: String, default: '' }, // 提及该经历的对话轮ID
  
  // 叙事属性
  emotionalImpact: { type: Number, default: 5 },     // 1-10
  affinityAtCreation: { type: Number, default: 0 },  // 生成时的好感度
  tags: [{ type: String }],
  
  // 特殊标记
  isImportant: { type: Boolean, default: false },    // 是否永久显示在Prompt中
  isSecret: { type: Boolean, default: false },       // 是否涉及剧透
  isNew: { type: Boolean, default: true }            // 本次会话新解锁
}, { timestamps: true });

// 索引
experienceSchema.index({ characterId: 1, isUnlocked: 1, createdAt: -1 });
experienceSchema.index({ characterId: 1, isRevealed: 1 });
experienceSchema.index({ derivedFrom: 1 });

// 静态方法
experienceSchema.statics.ExperienceType = ExperienceType;
experienceSchema.statics.ExperienceStatus = ExperienceStatus;

// 导出
if (!useMemoryStore) {
  const Experience = mongoose.model('Experience', experienceSchema);
  Experience.ExperienceType = ExperienceType;
  Experience.ExperienceStatus = ExperienceStatus;
  module.exports = Experience;
} else {
  const model = new ExperienceModel();
  model.ExperienceType = ExperienceType;
  model.ExperienceStatus = ExperienceStatus;
  module.exports = model;
}
