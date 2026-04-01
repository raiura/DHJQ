/**
 * 文件持久化 - 为内存存储提供数据持久化
 * 自动保存数据到 JSON 文件，启动时加载
 */

const fs = require('fs').promises;
const path = require('path');
const Logger = require('./logger');

// 检查是否为测试环境
const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID;

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'memory_store.json');

class FilePersistence {
  constructor() {
    this.autoSaveInterval = null;
    this.isLoading = false;
  }

  // 确保数据目录存在
  async ensureDataDir() {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (error) {
      Logger.error('创建数据目录失败:', error.message);
    }
  }

  // 保存内存数据到文件
  async save(memoryStore) {
    if (isTestEnvironment || this.isLoading) return;
    
    try {
      await this.ensureDataDir();
      
      const data = {
        timestamp: new Date().toISOString(),
        collections: {}
      };
      
      // 导出所有集合数据
      for (const [name, collection] of Object.entries(memoryStore.collections)) {
        data.collections[name] = Array.from(collection.values());
      }
      
      await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
      Logger.debug(`[FilePersistence] 数据已保存到 ${DATA_FILE}`);
    } catch (error) {
      Logger.error('[FilePersistence] 保存数据失败:', error.message);
    }
  }

  // 从文件加载数据到内存
  async load(memoryStore) {
    if (isTestEnvironment) {
      return false;
    }
    
    try {
      await this.ensureDataDir();
      
      try {
        await fs.access(DATA_FILE);
      } catch {
        Logger.info('[FilePersistence] 没有历史数据文件，将创建新数据');
        return false;
      }
      
      this.isLoading = true;
      const content = await fs.readFile(DATA_FILE, 'utf8');
      const data = JSON.parse(content);
      
      // 清空现有数据
      for (const collection of Object.values(memoryStore.collections)) {
        collection.clear();
      }
      
      // 加载数据到内存
      let totalCount = 0;
      for (const [name, docs] of Object.entries(data.collections)) {
        if (!memoryStore.collections[name]) {
          memoryStore.collections[name] = new Map();
        }
        const collection = memoryStore.collections[name];
        for (const doc of docs) {
          if (doc._id) {
            collection.set(doc._id, doc);
            totalCount++;
          }
        }
      }
      
      Logger.info(`[FilePersistence] 已加载 ${totalCount} 条数据，上次保存: ${new Date(data.timestamp).toLocaleString()}`);
      this.isLoading = false;
      return true;
    } catch (error) {
      this.isLoading = false;
      Logger.error('[FilePersistence] 加载数据失败:', error.message);
      return false;
    }
  }

  // 启动自动保存
  startAutoSave(memoryStore, intervalMinutes = 5) {
    if (isTestEnvironment) return;
    
    // 先保存一次
    this.save(memoryStore);
    
    // 定期保存
    this.autoSaveInterval = setInterval(() => {
      this.save(memoryStore);
    }, intervalMinutes * 60 * 1000);
    
    Logger.info(`[FilePersistence] 自动保存已启动，每 ${intervalMinutes} 分钟保存一次`);
    
    // 进程退出时保存
    process.on('SIGINT', async () => {
      Logger.info('[FilePersistence] 正在保存数据...');
      await this.save(memoryStore);
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      Logger.info('[FilePersistence] 正在保存数据...');
      await this.save(memoryStore);
      process.exit(0);
    });
  }

  // 停止自动保存
  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }
}

// 单例
const filePersistence = new FilePersistence();
module.exports = filePersistence;
