const mongoose = require('mongoose');

/**
 * 用户角色设定模型
 * 存储玩家自定义的角色信息，用于与AI对话时的身份设定
 */
const userCharacterSchema = new mongoose.Schema({
  // 关联用户
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // 基本信息
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  
  // 称号/别名
  title: {
    type: String,
    trim: true,
    maxlength: 100
  },
  
  // 性别
  gender: {
    type: String,
    enum: ['男', '女', '其他', '保密'],
    default: '保密'
  },
  
  // 年龄/骨龄
  age: {
    type: String,
    trim: true,
    maxlength: 50
  },
  
  // 种族
  race: {
    type: String,
    trim: true,
    maxlength: 50,
    default: '人族'
  },
  
  // 出身地
  origin: {
    type: String,
    trim: true,
    maxlength: 100
  },
  
  // 当前所在地
  location: {
    type: String,
    trim: true,
    maxlength: 100
  },
  
  // 修为/等级
  cultivation: {
    type: String,
    trim: true,
    maxlength: 100
  },
  
  // 灵根
  spiritRoot: {
    type: String,
    trim: true,
    maxlength: 100
  },
  
  // 功法
  cultivationMethod: {
    type: String,
    trim: true,
    maxlength: 200
  },
  
  // 外貌描述
  appearance: {
    type: String,
    maxlength: 1000
  },
  
  // 性格特点
  personality: {
    type: String,
    maxlength: 1000
  },
  
  // 背景故事
  background: {
    type: String,
    maxlength: 2000
  },
  
  // 目标/动机
  goal: {
    type: String,
    maxlength: 1000
  },
  
  // 随身物品
  items: {
    type: String,
    maxlength: 1000
  },
  
  // 特殊能力
  abilities: {
    type: String,
    maxlength: 1000
  },
  
  // 人际关系
  relationships: {
    type: String,
    maxlength: 1000
  },
  
  // 立绘URL
  avatar: {
    type: String,
    default: ''
  },
  
  // 代表色
  color: {
    type: String,
    default: '#4CAF50'
  },
  
  // 角色设定（给AI看的完整设定）
  prompt: {
    type: String,
    maxlength: 3000
  },
  
  // 是否为当前使用的角色
  isActive: {
    type: Boolean,
    default: true
  },
  
  // 使用次数统计
  usageCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// 索引优化
userCharacterSchema.index({ userId: 1, isActive: 1 });
userCharacterSchema.index({ userId: 1, createdAt: -1 });

/**
 * 生成给AI看的角色设定文本
 */
userCharacterSchema.methods.generatePrompt = function() {
  const parts = [];
  
  parts.push(`【玩家角色设定】`);
  parts.push(`姓名：${this.name}`);
  
  if (this.title) parts.push(`称号：${this.title}`);
  if (this.gender && this.gender !== '保密') parts.push(`性别：${this.gender}`);
  if (this.age) parts.push(`年龄：${this.age}`);
  if (this.race) parts.push(`种族：${this.race}`);
  if (this.origin) parts.push(`出身：${this.origin}`);
  if (this.location) parts.push(`当前位置：${this.location}`);
  if (this.cultivation) parts.push(`修为：${this.cultivation}`);
  if (this.spiritRoot) parts.push(`灵根：${this.spiritRoot}`);
  if (this.cultivationMethod) parts.push(`功法：${this.cultivationMethod}`);
  
  if (this.appearance) {
    parts.push(`\n外貌：${this.appearance}`);
  }
  
  if (this.personality) {
    parts.push(`\n性格：${this.personality}`);
  }
  
  if (this.background) {
    parts.push(`\n背景：${this.background}`);
  }
  
  if (this.goal) {
    parts.push(`\n目标：${this.goal}`);
  }
  
  if (this.items) {
    parts.push(`\n随身物品：${this.items}`);
  }
  
  if (this.abilities) {
    parts.push(`\n特殊能力：${this.abilities}`);
  }
  
  if (this.relationships) {
    parts.push(`\n人际关系：${this.relationships}`);
  }
  
  // 如果有自定义prompt，追加在最后
  if (this.prompt) {
    parts.push(`\n补充设定：${this.prompt}`);
  }
  
  return parts.join('\n');
};

/**
 * 获取简短描述
 */
userCharacterSchema.methods.getShortDescription = function() {
  const parts = [this.name];
  if (this.title) parts.push(`「${this.title}」`);
  if (this.cultivation) parts.push(`- ${this.cultivation}`);
  return parts.join('');
};

module.exports = mongoose.model('UserCharacter', userCharacterSchema);
