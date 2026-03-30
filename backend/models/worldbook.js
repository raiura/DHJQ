const mongoose = require('mongoose');

/**
 * 世界书条目模型
 * 类似知识库/Lorebook，当用户输入触发关键词时，自动插入对应内容到 prompt
 */
/**
 * 世界书条目类型
 */
const EntryType = {
  NORMAL: 'normal',      // 普通条目
  TIMELINE: 'timeline',  // 存档·当前时间线
  SETTING: 'setting'     // 基础设定
};

const worldbookEntrySchema = new mongoose.Schema({
  // 条目类型
  entryType: {
    type: String,
    enum: Object.values(EntryType),
    default: EntryType.NORMAL
  },
  
  // 条目名称（用于管理）
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  // 关联的游戏ID（用于存档条目）
  gameId: {
    type: String,
    default: null,
    index: true
  },
  
  // 触发关键词（数组，支持多个）
  keys: [{
    type: String,
    trim: true
  }],
  
  // 内容（当触发时插入到 prompt）
  content: {
    type: String,
    required: true
  },
  
  // 是否启用
  enabled: {
    type: Boolean,
    default: true
  },
  
  // 优先级（数字越大越优先）
  priority: {
    type: Number,
    default: 100
  },
  
  // 匹配方式
  matchType: {
    type: String,
    enum: ['exact', 'contains', 'regex', 'prefix', 'suffix'],
    default: 'contains'
  },
  
  // 是否区分大小写
  caseSensitive: {
    type: Boolean,
    default: false
  },
  
  // 插入位置（system/character/user）
  insertPosition: {
    type: String,
    enum: ['system', 'character', 'user', 'after_user'],
    default: 'system'
  },
  
  // 插入深度（第几轮对话后生效）
  depth: {
    type: Number,
    default: 0
  },
  
  // 分组
  group: {
    type: String,
    default: 'default',
    trim: true
  },
  
  // 备注说明
  comment: {
    type: String,
    default: ''
  },
  
  // 使用次数统计
  usageCount: {
    type: Number,
    default: 0
  },
  
  // 最后触发时间
  lastTriggered: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// 索引优化
worldbookEntrySchema.index({ keys: 1 });
worldbookEntrySchema.index({ enabled: 1, priority: -1 });
worldbookEntrySchema.index({ group: 1 });

/**
 * 检查文本是否匹配条目
 * @param {string} text - 要检查的文本
 * @returns {boolean} - 是否匹配
 */
worldbookEntrySchema.methods.matches = function(text) {
  if (!this.enabled || !this.keys || this.keys.length === 0) {
    return false;
  }
  
  const checkText = this.caseSensitive ? text : text.toLowerCase();
  
  for (const key of this.keys) {
    if (!key) continue;
    
    const checkKey = this.caseSensitive ? key : key.toLowerCase();
    
    switch (this.matchType) {
      case 'exact':
        if (checkText === checkKey) return true;
        break;
      case 'contains':
        if (checkText.includes(checkKey)) return true;
        break;
      case 'prefix':
        if (checkText.startsWith(checkKey)) return true;
        break;
      case 'suffix':
        if (checkText.endsWith(checkKey)) return true;
        break;
      case 'regex':
        try {
          const regex = new RegExp(key, this.caseSensitive ? '' : 'i');
          if (regex.test(text)) return true;
        } catch (e) {
          console.error('Invalid regex:', key);
        }
        break;
    }
  }
  
  return false;
};

/**
 * 获取匹配的所有条目（静态方法）
 * @param {string} text - 用户输入
 * @returns {Promise<Array>} - 匹配的条目列表
 */
worldbookEntrySchema.statics.findMatching = async function(text) {
  const entries = await this.find({ enabled: true }).sort({ priority: -1 });
  return entries.filter(entry => entry.matches(text));
};

/**
 * 获取格式化后的内容
 * @returns {string} - 格式化内容
 */
worldbookEntrySchema.methods.getFormattedContent = function() {
  // 根据条目类型返回不同格式
  if (this.entryType === EntryType.TIMELINE) {
    return `【世界书·存档·当前时间线】\n${this.content}`;
  }
  if (this.entryType === EntryType.SETTING) {
    return `【世界书·基础设定】\n${this.content}`;
  }
  return `[${this.name}]: ${this.content}`;
};

/**
 * 获取存档条目（静态方法）
 * @param {string} gameId - 游戏ID
 * @returns {Promise<Object>} - 存档条目
 */
worldbookEntrySchema.statics.getTimelineArchive = async function(gameId) {
  // 使用 find() 代替 findOne() 以支持内存存储的链式调用
  const entries = await this.find({ 
    gameId, 
    entryType: EntryType.TIMELINE 
  }).sort({ updatedAt: -1 }).limit(1);
  return entries[0] || null;
};

/**
 * 更新或创建存档条目（静态方法）
 * @param {string} gameId - 游戏ID
 * @param {string} content - 存档内容
 * @returns {Promise<Object>} - 更新后的条目
 */
worldbookEntrySchema.statics.updateTimelineArchive = async function(gameId, content) {
  let entry = await this.findOne({ 
    gameId, 
    entryType: EntryType.TIMELINE 
  });
  
  if (entry) {
    entry.content = content;
    entry.updatedAt = new Date();
    await entry.save();
  } else {
    entry = await this.create({
      name: '存档·当前时间线',
      entryType: EntryType.TIMELINE,
      gameId,
      content,
      keys: [], // 存档不通过关键词触发
      enabled: true,
      priority: 1000, // 最高优先级
      insertPosition: 'system'
    });
  }
  
  return entry;
};

// 导出类型
worldbookEntrySchema.statics.EntryType = EntryType;

module.exports = mongoose.model('WorldbookEntry', worldbookEntrySchema);
