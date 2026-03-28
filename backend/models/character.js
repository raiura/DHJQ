const mongoose = require('mongoose');
const memoryStore = require('../utils/memoryStore');

// 检查 MongoDB 是否连接
let useMemoryStore = false;
try {
  useMemoryStore = mongoose.connection.readyState !== 1;
} catch (error) {
  useMemoryStore = true;
}

const characterSchemaDefinition = {
  name: {
    type: String,
    required: true
  },
  color: {
    type: String,
    default: '#999999'
  },
  image: {
    type: String
  },
  imageFit: {
    type: String,
    default: 'cover'  // cover 或 contain
  },
  prompt: {
    type: String,
    required: true
  },
  // 详细设定字段
  appearance: {
    type: String,
    default: ''
  },
  personality: {
    type: String,
    default: ''
  },
  physique: {
    type: String,
    default: ''
  },
  background: {
    type: String,
    default: ''
  },
  special: {
    type: String,
    default: ''
  },
  // 触发关键词和状态管理（类似世界书）
  keys: {
    type: [String],
    default: []  // 触发该角色的关键词列表
  },
  enabled: {
    type: Boolean,
    default: true  // 是否启用该角色
  },
  priority: {
    type: Number,
    default: 100  // 优先级，数值越高越优先
  },
  gameId: {
    type: String,
    default: null  // null 表示全局角色，可用于所有游戏
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  // ========== 角色卡 V2.0 字段 ==========
  format: {
    type: String,
    default: 'v1',
    enum: ['v1', 'v2']  // 标记角色卡版本格式
  },
  version: {
    type: String,
    default: '1.0'
  },
  // V2嵌套数据结构（存储完整的V2角色卡数据）
  v2Data: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  // 世界书关联字段（V2使用）
  linkedWorldbookEntries: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worldbook'
  }],
  worldbookLinkMode: {
    type: String,
    default: 'manual',
    enum: ['manual', 'auto', 'disabled']
  },
  // 角色专属提示词配置（V2使用）
  characterNote: {
    type: String,
    default: ''
  },
  characterNoteDepth: {
    type: Number,
    default: 0
  },
  postHistoryInstructions: {
    type: String,
    default: ''
  },
  // ========== V2字段结束 ==========
};

// 如果 MongoDB 已连接，使用 Mongoose 模型
if (!useMemoryStore) {
  const characterSchema = new mongoose.Schema(characterSchemaDefinition);
  module.exports = mongoose.model('Character', characterSchema);
} else {
  // 内存存储模型
  class MemoryCharacterModel {
    constructor() {
      this.collectionName = 'characters';
    }

    async find(query = {}, options = {}) {
      let all = memoryStore.findAll(this.collectionName);
      
      // 过滤查询
      if (Object.keys(query).length > 0) {
        all = all.filter(doc => {
          for (const [key, value] of Object.entries(query)) {
            // 处理 $or 查询
            if (key === '$or') {
              const match = value.some(condition => {
                return Object.entries(condition).every(([k, v]) => {
                  return doc[k] === v;
                });
              });
              if (!match) return false;
            } else if (doc[key] !== value) {
              return false;
            }
          }
          return true;
        });
      }

      // 排序
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
      return memoryStore.create(this.collectionName, {
        ...data,
        createdAt: data.createdAt || new Date()
      });
    }

    async insertMany(docs) {
      return docs.map(doc => memoryStore.create(this.collectionName, {
        ...doc,
        createdAt: doc.createdAt || new Date()
      }));
    }

    async findByIdAndUpdate(id, data, options = {}) {
      return memoryStore.update(this.collectionName, id, {
        ...data,
        updatedAt: new Date()
      });
    }

    async findByIdAndDelete(id) {
      return memoryStore.delete(this.collectionName, id);
    }

    async countDocuments(query = {}) {
      const all = await this.find(query);
      return all.length;
    }
  }

  module.exports = new MemoryCharacterModel();
}
