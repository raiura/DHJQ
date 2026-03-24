const mongoose = require('mongoose');
const memoryStore = require('../utils/memoryStore');

// 检查 MongoDB 是否连接
let useMemoryStore = false;
try {
  useMemoryStore = mongoose.connection.readyState !== 1;
} catch (error) {
  useMemoryStore = true;
}

/**
 * 内存存储查询构建器
 */
class MemoryQuery {
  constructor(docs) {
    this.docs = docs || [];
    this.sortOption = null;
    this.selectFields = null;
    this.limitCount = null;
  }

  sort(option) {
    this.sortOption = option;
    return this;
  }

  select(fields) {
    this.selectFields = fields;
    return this;
  }

  skip(n) {
    this.skipCount = n;
    return this;
  }

  limit(n) {
    this.limitCount = n;
    return this;
  }

  // 支持 await 调用
  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  async exec() {
    let results = [...this.docs];

    if (this.sortOption) {
      results.sort((a, b) => {
        for (const [field, order] of Object.entries(this.sortOption)) {
          const aVal = this.getNestedValue(a, field);
          const bVal = this.getNestedValue(b, field);
          if (aVal < bVal) return order === -1 ? 1 : -1;
          if (aVal > bVal) return order === -1 ? -1 : 1;
        }
        return 0;
      });
    }

    if (this.skipCount > 0) {
      results = results.slice(this.skipCount);
    }

    if (this.limitCount !== null) {
      results = results.slice(0, this.limitCount);
    }

    if (this.selectFields) {
      const exclude = this.selectFields.startsWith('-');
      const fields = this.selectFields.replace(/^-/, '').split(' ');
      results = results.map(doc => {
        const newDoc = { ...doc };
        if (exclude) {
          fields.forEach(f => {
            if (f.includes('.')) {
              const parts = f.split('.');
              if (parts.length === 2) {
                if (newDoc[parts[0]]) delete newDoc[parts[0]][parts[1]];
              } else {
                delete newDoc[f];
              }
            } else {
              delete newDoc[f];
            }
          });
        }
        return newDoc;
      });
    }

    return results;
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((o, p) => o && o[p], obj);
  }
}

/**
 * 内存游戏模型
 */
class MemoryGameModel {
  constructor() {
    this.collectionName = 'games';
  }

  find(query = {}) {
    const all = memoryStore.findAll(this.collectionName);
    let filtered = all;
    
    if (Object.keys(query).length > 0) {
      filtered = all.filter(doc => {
        for (const [key, value] of Object.entries(query)) {
          // 处理嵌套字段（如 stats.plays）
          let docValue;
          if (key.includes('.')) {
            const parts = key.split('.');
            docValue = doc;
            for (const part of parts) {
              docValue = docValue?.[part];
            }
          } else {
            docValue = doc[key];
          }
          
          // 处理操作符
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            // $gt 操作符
            if (value.$gt !== undefined && !(docValue > value.$gt)) return false;
            // $gte 操作符
            if (value.$gte !== undefined && !(docValue >= value.$gte)) return false;
            // $lt 操作符
            if (value.$lt !== undefined && !(docValue < value.$lt)) return false;
            // $lte 操作符
            if (value.$lte !== undefined && !(docValue <= value.$lte)) return false;
            // $ne 操作符
            if (value.$ne !== undefined && docValue === value.$ne) return false;
            // $in 操作符
            if (value.$in !== undefined && !value.$in.includes(docValue)) return false;
            // $nin 操作符
            if (value.$nin !== undefined && value.$nin.includes(docValue)) return false;
          } else {
            // 简单相等比较
            if (docValue !== value) return false;
          }
        }
        return true;
      });
    }

    return new MemoryQuery(filtered);
  }

  async findOne(query) {
    const results = await this.find(query).limit(1).exec();
    return results[0] || null;
  }

  async findById(id) {
    const doc = memoryStore.findById(this.collectionName, id);
    if (!doc) return null;
    // 添加 save 方法以兼容 Mongoose 的文档行为
    doc.save = async () => {
      return memoryStore.update(this.collectionName, doc._id, doc);
    };
    return doc;
  }

  async create(data) {
    return memoryStore.create(this.collectionName, data);
  }

  async findByIdAndUpdate(id, data, options = {}) {
    return memoryStore.update(this.collectionName, id, data);
  }

  async findByIdAndDelete(id) {
    return memoryStore.delete(this.collectionName, id);
  }

  async countDocuments(query = {}) {
    if (Object.keys(query).length === 0) {
      return memoryStore.count(this.collectionName);
    }
    const results = await this.find(query).exec();
    return results.length;
  }

  async distinct(field, query = {}) {
    const all = memoryStore.findAll(this.collectionName);
    const values = new Set();
    
    for (const doc of all) {
      let match = true;
      for (const [key, value] of Object.entries(query)) {
        if (doc[key] !== value) {
          match = false;
          break;
        }
      }
      
      if (match && doc[field] !== undefined) {
        if (Array.isArray(doc[field])) {
          doc[field].forEach(v => values.add(v));
        } else {
          values.add(doc[field]);
        }
      }
    }
    
    return Array.from(values);
  }
}

/**
 * 如果 MongoDB 已连接，导出 Mongoose 模型
 * 否则导出内存模型
 */
if (!useMemoryStore) {
  /**
   * 游戏/世界模型
   * 每个游戏代表一个独立的AI互动世界
   */
  const gameSchema = new mongoose.Schema({
    // 基础信息
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    
    subtitle: {
      type: String,
      trim: true,
      maxlength: 200
    },
    
    // 游戏标识
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    
    // 封面图
    cover: {
      type: String,
      default: ''
    },
    
    // 背景图
    background: {
      type: String,
      default: ''
    },
    
    // 简介
    description: {
      type: String,
      maxlength: 2000
    },
    
    // 详细世界观
    worldSetting: {
      type: String,
      maxlength: 10000
    },
    
    // 创作者
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    
    // 创作者名称（冗余存储，方便展示）
    creatorName: {
      type: String,
      trim: true
    },
    
    // 游戏分类/标签
    tags: [{
      type: String,
      trim: true
    }],
    
    // 游戏类型
    genre: {
      type: String,
      enum: ['修仙', '奇幻', '科幻', '历史', '现代', '悬疑', '恋爱', '其他'],
      default: '其他'
    },
    
    // 状态
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft'
    },
    
    // 可见性
    visibility: {
      type: String,
      enum: ['public', 'private', 'unlisted'],
      default: 'public'
    },
    
    // 统计数据
    stats: {
      plays: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
      favorites: { type: Number, default: 0 },
      rating: { type: Number, default: 0 },
      ratingCount: { type: Number, default: 0 }
    },
    
    // 配置
    config: {
      aiModel: { type: String, default: '' },
      allowCustomCharacter: { type: Boolean, default: true },
      enableWorldbook: { type: Boolean, default: true },
      openingMessage: { type: String, default: '欢迎来到这个世界！' },
      themeColor: { type: String, default: '#8a6d3b' },
      bgm: { type: String, default: '' }
    },
    
    // 聊天界面配置
    chatUIConfig: {
      html: { type: String, default: '' },
      css: { type: String, default: '' },
      js: { type: String, default: '' },
      updatedAt: { type: Date }
    },
    
    // 版本控制
    version: { type: Number, default: 1 },
    
    // 父游戏（如果是 fork 的）
    parentGame: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Game',
      default: null
    }
  }, { timestamps: true });

  gameSchema.index({ status: 1, visibility: 1 });
  gameSchema.index({ creator: 1 });
  gameSchema.index({ tags: 1 });
  gameSchema.index({ genre: 1 });
  gameSchema.index({ 'stats.plays': -1 });
  gameSchema.index({ createdAt: -1 });

  gameSchema.methods.incrementPlays = async function() {
    this.stats.plays += 1;
    await this.save();
  };

  gameSchema.methods.getSummary = function() {
    return {
      id: this._id,
      title: this.title,
      subtitle: this.subtitle,
      slug: this.slug,
      cover: this.cover,
      genre: this.genre,
      creatorName: this.creatorName,
      stats: this.stats,
      tags: this.tags,
      status: this.status,
      createdAt: this.createdAt
    };
  };

  module.exports = mongoose.model('Game', gameSchema);
} else {
  module.exports = new MemoryGameModel();
}
