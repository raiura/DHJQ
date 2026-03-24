const mongoose = require('mongoose');
const memoryStore = require('../utils/memoryStore');

// 检查 MongoDB 是否连接
let useMemoryStore = false;
try {
  useMemoryStore = mongoose.connection.readyState !== 1;
} catch (error) {
  useMemoryStore = true;
}

const gallerySchemaDefinition = {
  gameId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['background', 'character', 'expression', 'action', 'cg', 'item'],
    default: 'background'
  },
  // 角色绑定（用于角色立绘CG）
  characterId: {
    type: String,
    default: null
  },
  characterName: {
    type: String,
    default: ''
  },
  // 表情/动作类型标签
  variantTags: [{
    type: String
  }],
  tags: [{
    type: String
  }],
  description: {
    type: String,
    default: ''
  },
  // AI 生成的场景关联
  sceneTriggers: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
};

// 如果 MongoDB 已连接，使用 Mongoose 模型
if (!useMemoryStore) {
  const gallerySchema = new mongoose.Schema(gallerySchemaDefinition);
  gallerySchema.index({ gameId: 1, type: 1 });
  gallerySchema.index({ tags: 1 });
  module.exports = mongoose.model('Gallery', gallerySchema);
} else {
  // 内存存储模型
  class MemoryGalleryModel {
    constructor() {
      this.collectionName = 'gallery';
    }

    async find(query = {}, options = {}) {
      let all = memoryStore.findAll(this.collectionName);
      
      if (Object.keys(query).length > 0) {
        all = all.filter(doc => {
          for (const [key, value] of Object.entries(query)) {
            if (Array.isArray(value)) {
              // 处理数组查询（如 tags: ['室内', '夜晚']）
              if (!value.some(v => doc[key]?.includes(v))) return false;
            } else if (doc[key] !== value) {
              return false;
            }
          }
          return true;
        });
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

    async findByIdAndUpdate(id, data) {
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

  module.exports = new MemoryGalleryModel();
}
