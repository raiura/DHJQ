/**
 * 模型统一管理 - 支持 MongoDB 和内存存储自动切换
 */

const Logger = require('../utils/logger');
const memoryStore = require('../utils/memoryStore');

// 检查 MongoDB 是否连接
let useMemoryStore = false;

try {
  const mongoose = require('mongoose');
  useMemoryStore = mongoose.connection.readyState !== 1;
  
  if (useMemoryStore) {
    Logger.warn('MongoDB 未连接，使用内存存储模式（数据将在重启后丢失）');
  }
} catch (error) {
  useMemoryStore = true;
  Logger.warn('MongoDB 模块加载失败，使用内存存储模式');
}

// 内存存储查询构建器
class MemoryQuery {
  constructor(collectionName, docs) {
    this.collectionName = collectionName;
    this.docs = docs || [];
    this.sortOption = null;
    this.selectFields = null;
    this.skipCount = 0;
    this.limitCount = null;
  }

  // 排序
  sort(option) {
    this.sortOption = option;
    return this;
  }

  // 字段选择
  select(fields) {
    this.selectFields = fields;
    return this;
  }

  // 跳过
  skip(n) {
    this.skipCount = n;
    return this;
  }

  // 限制数量
  limit(n) {
    this.limitCount = n;
    return this;
  }

  // 执行查询
  async exec() {
    let results = [...this.docs];

    // 排序
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

    // 跳过
    if (this.skipCount > 0) {
      results = results.slice(this.skipCount);
    }

    // 限制
    if (this.limitCount !== null) {
      results = results.slice(0, this.limitCount);
    }

    // 字段选择
    if (this.selectFields) {
      const exclude = this.selectFields.startsWith('-');
      const fields = this.selectFields.replace(/^-/, '').split(' ');
      
      results = results.map(doc => {
        const newDoc = { ...doc };
        if (exclude) {
          // 排除字段
          fields.forEach(f => delete newDoc[f]);
        }
        // 包含模式暂不支持，返回全部
        return newDoc;
      });
    }

    return results;
  }

  // 支持 await（使 Query 成为 thenable）
  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((o, p) => o && o[p], obj);
  }
}

// 内存存储模型包装器
class MemoryModel {
  constructor(collectionName, schema = {}) {
    this.collectionName = collectionName;
    this.schema = schema;
  }

  // 创建新文档
  async create(data) {
    if (this.schema.preSave) {
      await this.schema.preSave(data);
    }
    return memoryStore.create(this.collectionName, data);
  }

  // 查找所有（返回查询构建器）
  find(query = {}) {
    const all = memoryStore.findAll(this.collectionName);
    
    // 过滤
    let filtered = all;
    if (Object.keys(query).length > 0) {
      filtered = all.filter(doc => {
        for (const [key, value] of Object.entries(query)) {
          // 处理嵌套字段（如 stats.plays）
          if (key.includes('.')) {
            const parts = key.split('.');
            let val = doc;
            for (const part of parts) {
              val = val?.[part];
            }
            if (val !== value) return false;
          } else if (key === '$or') {
            // 处理 $or 查询
            const match = value.some(condition => {
              return Object.entries(condition).some(([k, v]) => {
                if (v instanceof RegExp) {
                  return v.test(doc[k]);
                }
                return doc[k] === v;
              });
            });
            if (!match) return false;
          } else if (typeof value === 'object' && value.$gt !== undefined) {
            // 处理 $gt 操作符
            if (!(doc[key] > value.$gt)) return false;
          } else if (typeof value === 'object' && value.$in !== undefined) {
            // 处理 $in 操作符
            if (!value.$in.includes(doc[key])) return false;
          } else {
            if (doc[key] !== value) return false;
          }
        }
        return true;
      });
    }

    return new MemoryQuery(this.collectionName, filtered);
  }

  // 查找一个
  async findOne(query) {
    const results = await this.find(query).limit(1).exec();
    return results[0] || null;
  }

  // 根据 ID 查找
  async findById(id) {
    return memoryStore.findById(this.collectionName, id);
  }

  // 根据 ID 更新
  async findByIdAndUpdate(id, data, options = {}) {
    const existing = memoryStore.findById(this.collectionName, id);
    if (!existing) return null;
    
    if (this.schema.preSave) {
      await this.schema.preSave(data);
    }
    
    return memoryStore.update(this.collectionName, id, data);
  }

  // 查找一个并更新
  async findOneAndUpdate(query, update, options = {}) {
    const existing = await this.findOne(query);
    if (!existing) return null;
    
    const updateData = update.$set || update;
    const updated = await memoryStore.update(this.collectionName, existing._id, { ...existing, ...updateData });
    return options.new ? updated : existing;
  }

  // 查找一个并删除
  async findOneAndDelete(query) {
    const existing = await this.findOne(query);
    if (!existing) return null;
    
    return memoryStore.delete(this.collectionName, existing._id);
  }

  // 根据 ID 删除
  async findByIdAndDelete(id) {
    return memoryStore.delete(this.collectionName, id);
  }

  // 插入多个
  async insertMany(docs) {
    const results = [];
    for (const doc of docs) {
      results.push(memoryStore.create(this.collectionName, doc));
    }
    return results;
  }

  // 更新多个
  async updateMany(query, update) {
    const all = memoryStore.findAll(this.collectionName);
    let count = 0;
    for (const doc of all) {
      let match = true;
      for (const [key, value] of Object.entries(query)) {
        if (doc[key] !== value) {
          match = false;
          break;
        }
      }
      if (match) {
        const updateData = update.$set || update;
        memoryStore.update(this.collectionName, doc._id, { ...doc, ...updateData });
        count++;
      }
    }
    return { modifiedCount: count };
  }

  // 删除所有
  async deleteMany() {
    memoryStore.deleteAll(this.collectionName);
    return { deletedCount: 1 };
  }

  // 统计
  async countDocuments() {
    return memoryStore.count(this.collectionName);
  }

  // 去重查询
  async distinct(field, query = {}) {
    const all = memoryStore.findAll(this.collectionName);
    const values = new Set();
    
    for (const doc of all) {
      // 检查查询条件
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

// 加载真实模型或内存模型
function loadModel(name, collectionName, schema) {
  // User 模型自己处理存储模式切换
  if (name === 'user') {
    const User = require('./user');
    Logger.info(`加载 User 模型（自动检测存储模式）`);
    return User;
  }
  
  // Game 模型自己处理存储模式切换
  if (name === 'game') {
    const Game = require('./game');
    Logger.info(`加载 Game 模型（自动检测存储模式）`);
    return Game;
  }
  
  // Character 模型自己处理存储模式切换
  if (name === 'character') {
    const Character = require('./character');
    Logger.info(`加载 Character 模型（自动检测存储模式）`);
    return Character;
  }
  
  if (!useMemoryStore) {
    try {
      const model = require(`./${name}`);
      Logger.info(`加载 MongoDB 模型: ${name}`);
      return model;
    } catch (error) {
      Logger.warn(`加载 MongoDB 模型失败: ${name}，切换到内存存储`);
    }
  }
  
  Logger.info(`加载内存模型: ${name}`);
  return new MemoryModel(collectionName, schema);
}

// 用户模型特殊处理（需要密码加密）
const userSchema = {
  async preSave(data) {
    if (data.password && !data.password.startsWith('$2')) {
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      data.password = await bcrypt.hash(data.password, salt);
    }
  }
};

// 导出模型
module.exports = {
  User: loadModel('user', 'users', userSchema),
  Character: loadModel('character', 'characters'),
  Dialogue: loadModel('dialogue', 'dialogues'),
  Setting: loadModel('setting', 'settings'),
  Worldbook: loadModel('worldbook', 'worldbooks'),
  WorldbookEntry: loadModel('worldbookEntry', 'worldbook_entries'),
  UserCharacter: loadModel('userCharacter', 'user_characters'),
  Game: loadModel('game', 'games'),
  Gallery: loadModel('gallery', 'gallery'),
  Memory: loadModel('memory', 'memories'),
  Experience: loadModel('experience', 'experiences'),
  useMemoryStore
};
