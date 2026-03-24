/**
 * 记忆模型 - 三层记忆结构
 * 短期记忆 / 长期记忆 / 核心记忆
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

// 记忆类型枚举
const MemoryType = {
  SHORT: 'short',    // 短期记忆
  LONG: 'long',      // 长期记忆
  CORE: 'core'       // 核心记忆
};

// 记忆状态枚举
const MemoryStatus = {
  ACTIVE: 'active',     // 活跃
  MERGED: 'merged',     // 已合并
  ARCHIVED: 'archived'  // 已归档
};

/**
 * 内存记忆模型
 */
class MemoryModel {
  constructor() {
    this.collectionName = 'memories';
  }

  async create(data) {
    const doc = memoryStore.create(this.collectionName, {
      ...data,
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
    
    // 按时间正序排序
    docs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    return docs.map(d => this._addMethods(d));
  }

  async findOne(query) {
    const docs = await this.find(query);
    return docs[0] || null;
  }

  async findById(id) {
    const doc = memoryStore.findById(this.collectionName, id);
    return doc ? this._addMethods(doc) : null;
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

  async deleteMany(query) {
    const docs = await this.find(query);
    for (const doc of docs) {
      await this.delete(doc._id);
    }
    return { deletedCount: docs.length };
  }

  // 给文档添加方法
  _addMethods(doc) {
    if (!doc) return null;
    doc.save = async () => {
      return memoryStore.update(this.collectionName, doc._id, doc);
    };
    return doc;
  }
}

// MongoDB Schema
const memorySchema = new mongoose.Schema({
  // 关联信息
  gameId: { type: String, required: true, index: true },
  userId: { type: String, default: null },
  sessionId: { type: String, default: null },
  
  // 记忆类型
  type: { 
    type: String, 
    enum: Object.values(MemoryType),
    required: true 
  },
  
  // 记忆内容
  content: { type: String, required: true },
  
  // 时间戳（游戏内时间）
  timestamp: { type: Date, required: true },
  
  // 轮次号（用于合并逻辑）
  turn: { type: Number, default: 0 },
  
  // 状态
  status: {
    type: String,
    enum: Object.values(MemoryStatus),
    default: MemoryStatus.ACTIVE
  },
  
  // 来源（哪些短期记忆合并而来）
  sourceIds: [{ type: String }],
  
  // 标签（用于分类和检索）
  tags: [{ type: String }],
  
  // 重要性（0-100）
  importance: { type: Number, default: 50 },
  
  // 是否已固化到世界书
  isSolidified: { type: Boolean, default: false }
}, { timestamps: true });

// 索引
memorySchema.index({ gameId: 1, type: 1, timestamp: 1 });
memorySchema.index({ gameId: 1, status: 1 });
memorySchema.index({ turn: 1 });

// 静态方法
memorySchema.statics.MemoryType = MemoryType;
memorySchema.statics.MemoryStatus = MemoryStatus;

// 导出
if (!useMemoryStore) {
  module.exports = mongoose.model('Memory', memorySchema);
} else {
  const model = new MemoryModel();
  model.MemoryType = MemoryType;
  model.MemoryStatus = MemoryStatus;
  module.exports = model;
}
