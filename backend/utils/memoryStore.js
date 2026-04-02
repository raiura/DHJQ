/**
 * 内存存储 - 当 MongoDB 不可用时使用
 * 支持文件持久化，重启后自动恢复数据
 */

const Logger = require('./logger');
const filePersistence = require('./filePersistence');

class MemoryStore {
  constructor() {
    this.collections = {
      users: new Map(),
      characters: new Map(),
      dialogues: new Map(),
      settings: new Map(),
      worldbooks: new Map(),
      worldbook_entries: new Map(),
      games: new Map(),
      gallery: new Map(),
      user_characters: new Map(),
      memories: new Map(),
      experiences: new Map()
    };
    this.idCounter = 1;
    this.filePersistence = filePersistence;
    this.saveTimeout = null;
    
    // 尝试加载历史数据（异步）
    this.loadFromFile().catch(err => {
      Logger.error('加载历史数据失败:', err.message);
    });
  }
  
  // 防抖保存 - 500ms内多次操作只保存一次
  debouncedSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.filePersistence.save(this);
      this.saveTimeout = null;
    }, 500);
  }
  
  // 从l文件加载数据
  async loadFromFile() {
    const loaded = await this.filePersistence.load(this);
    if (!loaded) {
      Logger.info('内存存储已初始化（无历史数据）');
    }
    // 启动自动保存
    this.filePersistence.startAutoSave(this, 5); // 每5分钟自动保存
  }

  // 生成唯一 ID
  generateId() {
    return `mem_${Date.now()}_${this.idCounter++}`;
  }

  // 获取集合
  getCollection(name) {
    if (!this.collections[name]) {
      this.collections[name] = new Map();
    }
    return this.collections[name];
  }

  // 创建文档
  create(collectionName, data) {
    const collection = this.getCollection(collectionName);
    // 如果data中已经有_id，使用传入的_id，否则生成新的
    const id = data._id || this.generateId();
    const doc = {
      _id: id,
      ...data,
      createdAt: data.createdAt || new Date(),
      updatedAt: new Date()
    };
    collection.set(id, doc);
    Logger.debug(`[MemoryStore] 创建 ${collectionName}: ${id}`);
    // 异步保存到文件（防抖动）
    this.debouncedSave();
    return doc;
  }

  // 查找所有
  findAll(collectionName, options = {}) {
    const collection = this.getCollection(collectionName);
    let results = Array.from(collection.values());
    
    // 排序
    if (options.sort) {
      const [field, order] = Object.entries(options.sort)[0];
      results.sort((a, b) => {
        if (order === -1) return b[field] - a[field];
        return a[field] - b[field];
      });
    }
    
    // 限制数量
    if (options.limit) {
      results = results.slice(0, options.limit);
    }
    
    return results;
  }

  // 查找一个
  findOne(collectionName, query) {
    const collection = this.getCollection(collectionName);
    const docs = Array.from(collection.values());
    
    for (const doc of docs) {
      let match = true;
      for (const [key, value] of Object.entries(query)) {
        // 支持大小写不敏感的用户名查询
        if (key === 'username' && typeof doc[key] === 'string' && typeof value === 'string') {
          if (doc[key].toLowerCase() !== value.toLowerCase()) {
            match = false;
            break;
          }
        } else if (doc[key] !== value) {
          match = false;
          break;
        }
      }
      if (match) return doc;
    }
    return null;
  }

  // 根据 ID 查找
  findById(collectionName, id) {
    const collection = this.getCollection(collectionName);
    return collection.get(id) || null;
  }

  // 更新
  update(collectionName, id, data) {
    const collection = this.getCollection(collectionName);
    const doc = collection.get(id);
    if (!doc) return null;
    
    const updated = {
      ...doc,
      ...data,
      _id: doc._id,
      createdAt: doc.createdAt,
      updatedAt: new Date()
    };
    collection.set(id, updated);
    Logger.debug(`[MemoryStore] 更新 ${collectionName}: ${id}`);
    // 异步保存到文件（防抖动）
    this.debouncedSave();
    return updated;
  }

  // 删除
  delete(collectionName, id) {
    const collection = this.getCollection(collectionName);
    const doc = collection.get(id);
    if (!doc) return null;
    
    collection.delete(id);
    Logger.debug(`[MemoryStore] 删除 ${collectionName}: ${id}`);
    // 异步保存到文件（防抖动）
    this.debouncedSave();
    return doc;
  }

  // 删除所有
  deleteAll(collectionName) {
    const collection = this.getCollection(collectionName);
    const count = collection.size;
    collection.clear();
    Logger.debug(`[MemoryStore] 清空 ${collectionName}: ${count} 条记录`);
    // 异步保存到文件（防抖动）
    this.debouncedSave();
    return count;
  }

  // 统计
  count(collectionName) {
    return this.getCollection(collectionName).size;
  }
}

// 单例模式
const memoryStore = new MemoryStore();
module.exports = memoryStore;
