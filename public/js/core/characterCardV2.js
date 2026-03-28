/**
 * 角色卡 2.0 核心模块
 * Character Card V2 - Core Module
 * 
 * 设计目标：
 * - 兼容V1数据格式
 * - 支持SillyTavern风格角色卡
 * - 提供完整的角色设定结构
 * 
 * @version 2.0.0
 * @author 大荒九丘
 */

// ==================== 类型定义（JSDoc） ====================

/**
 * @typedef {Object} CharacterCardV2
 * @property {string} id - 角色唯一标识
 * @property {string} name - 角色名称
 * @property {string} version - 角色卡版本
 * @property {VisualConfig} visual - 视觉配置
 * @property {CoreConfig} core - 核心设定
 * @property {ExamplesConfig} examples - 示例对话
 * @property {InjectionConfig} injection - 深度注入配置
 * @property {LorebookConfig} lorebook - 角色专属世界书
 * @property {ActivationConfig} activation - 触发配置
 * @property {RelationshipConfig} relationship - 关系配置
 * @property {MetaConfig} meta - 元数据
 */

/**
 * @typedef {Object} VisualConfig
 * @property {string} avatar - 头像URL
 * @property {string} cover - 封面图URL
 * @property {Object.<string, string>} emotionCGs - 情感立绘映射
 * @property {string} color - 主题色
 */

/**
 * @typedef {Object} CoreConfig
 * @property {string} description - 角色主描述
 * @property {string} personality - 性格特点
 * @property {string} scenario - 场景/处境
 * @property {string} firstMessage - 开场白
 * @property {WorldConnection} worldConnection - 与世界的关联
 */

/**
 * @typedef {Object} WorldConnection
 * @property {string} faction - 所属势力
 * @property {string} location - 常驻地点
 * @property {Array.<RelationShip>} relationships - 与其他角色关系
 */

/**
 * @typedef {Object} RelationShip
 * @property {string} targetCharId - 目标角色ID
 * @property {string} relationType - 关系类型
 * @property {string} description - 关系描述
 */

/**
 * @typedef {Object} ExamplesConfig
 * @property {Array.<ExampleDialogue>} dialogues - 示例对话列表
 * @property {string} style - 语气风格说明
 */

/**
 * @typedef {Object} ExampleDialogue
 * @property {string} user - 玩家说的话
 * @property {string} character - 角色的回应
 * @property {string} [annotation] - 标注说明
 */

/**
 * @typedef {Object} InjectionConfig
 * @property {CharacterNote} characterNote - Character's Note等价物
 * @property {string} postHistory - Post-History Instructions
 * @property {string} mainPromptOverride - 主提示词覆盖
 */

/**
 * @typedef {Object} CharacterNote
 * @property {string} content - 注入内容
 * @property {number} depth - 注入深度
 * @property {number} frequency - 注入频率
 * @property {string} role - 消息角色
 */

/**
 * @typedef {Object} LorebookConfig
 * @property {Array.<LorebookEntry>} entries - 角色专属条目
 * @property {Array.<string>} linkedGlobalEntries - 关联的全局条目ID
 */

/**
 * @typedef {Object} LorebookEntry
 * @property {string} id - 条目ID
 * @property {string} name - 条目名称
 * @property {Array.<string>} keys - 触发关键词
 * @property {string} content - 条目内容
 * @property {number} priority - 优先级
 * @property {string} insertPosition - 插入位置
 */

/**
 * @typedef {Object} ActivationConfig
 * @property {Array.<string>} keys - 触发关键词
 * @property {number} priority - 优先级
 * @property {boolean} enabled - 是否启用
 * @property {Array.<ActivationCondition>} conditions - 激活条件
 * @property {EntranceConfig} entrance - 登场控制
 */

/**
 * @typedef {Object} ActivationCondition
 * @property {string} type - 条件类型
 * @property {string} value - 条件值
 */

/**
 * @typedef {Object} EntranceConfig
 * @property {boolean} autoTrigger - 是否自动登场
 * @property {string} triggerMessage - 登场开场白
 * @property {Array.<string>} requiredContext - 前置条件
 */

/**
 * @typedef {Object} RelationshipConfig
 * @property {number} favor - 好感度
 * @property {number} trust - 信任度
 * @property {string} mood - 当前心情
 * @property {AttitudeConfig} attitude - 动态态度
 * @property {Array.<string>} sharedMemories - 共享记忆ID
 */

/**
 * @typedef {Object} AttitudeConfig
 * @property {string} current - 当前态度
 * @property {Array.<AttitudeHistory>} history - 态度变化历史
 */

/**
 * @typedef {Object} AttitudeHistory
 * @property {Date} timestamp - 时间戳
 * @property {string} event - 事件描述
 * @property {number} change - 变化值
 */

/**
 * @typedef {Object} MetaConfig
 * @property {string} author - 作者
 * @property {Date} createdAt - 创建时间
 * @property {Date} updatedAt - 更新时间
 * @property {Array.<string>} tags - 标签
 * @property {string} description - 创作者备注
 * @property {string} exportFormat - 导出格式
 */

// ==================== 默认模板 ====================

const DEFAULT_CHARACTER_CARD_V2 = {
  id: '',
  name: '新角色',
  version: '2.0.0',
  
  visual: {
    avatar: '',
    cover: '',
    emotionCGs: {
      calm: '',
      happy: '',
      angry: '',
      sad: '',
      shy: '',
      surprise: '',
      serious: '',
      hurt: ''
    },
    color: '#8a6d3b'
  },
  
  core: {
    description: '',
    personality: '',
    scenario: '',
    firstMessage: '',
    worldConnection: {
      faction: '',
      location: '',
      relationships: []
    }
  },
  
  examples: {
    dialogues: [],
    style: ''
  },
  
  injection: {
    characterNote: {
      content: '',
      depth: 0,
      frequency: 1,
      role: 'system'
    },
    postHistory: '',
    mainPromptOverride: ''
  },
  
  lorebook: {
    entries: [],
    linkedGlobalEntries: []
  },
  
  activation: {
    keys: [],
    priority: 100,
    enabled: true,
    conditions: [],
    entrance: {
      autoTrigger: false,
      triggerMessage: '',
      requiredContext: []
    }
  },
  
  relationship: {
    favor: 50,
    trust: 50,
    mood: '平静',
    attitude: {
      current: '中立',
      history: []
    },
    sharedMemories: []
  },
  
  meta: {
    author: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: [],
    description: '',
    exportFormat: 'dahuang-v2'
  }
};

// ==================== V1到V2迁移工具 ====================

class CharacterMigrationTool {
  /**
   * 检测数据版本
   * @param {Object} data - 角色数据
   * @returns {string} - 'v1' | 'v2' | 'unknown'
   */
  static detectVersion(data) {
    if (data.version && data.version.startsWith('2.')) {
      return 'v2';
    }
    if (data.appearance !== undefined || data.prompt !== undefined) {
      return 'v1';
    }
    return 'unknown';
  }
  
  /**
   * 将V1数据迁移到V2
   * @param {Object} v1Data - V1格式的角色数据
   * @returns {CharacterCardV2} - V2格式的角色数据
   */
  static migrateV1ToV2(v1Data) {
    const v2Data = JSON.parse(JSON.stringify(DEFAULT_CHARACTER_CARD_V2));
    
    // 基础信息
    v2Data.id = v1Data._id || v1Data.id || this.generateId();
    v2Data.name = v1Data.name || '未命名角色';
    v2Data._migrated = true;
    v2Data._migrationVersion = '2.0.0';
    v2Data._migrationDate = new Date().toISOString();
    
    // 视觉配置
    v2Data.visual.avatar = v1Data.image || '';
    v2Data.visual.color = v1Data.color || '#8a6d3b';
    
    // 核心设定映射
    v2Data.core.description = this.buildDescription(v1Data);
    v2Data.core.personality = v1Data.personality || '';
    v2Data.core.scenario = v1Data.background || '';
    // firstMessage 需要手动设置，V1中没有
    
    // 触发配置
    v2Data.activation.keys = v1Data.keys || [];
    v2Data.activation.priority = v1Data.priority || 100;
    v2Data.activation.enabled = v1Data.enabled !== false;
    
    // 关系配置
    v2Data.relationship.favor = v1Data.favor || 50;
    v2Data.relationship.trust = v1Data.trust || 50;
    v2Data.relationship.mood = v1Data.mood || '平静';
    
    // 元数据
    v2Data.meta.createdAt = v1Data.createdAt || new Date();
    v2Data.meta.updatedAt = new Date();
    
    return v2Data;
  }
  
  /**
   * 构建描述文本
   * @private
   */
  static buildDescription(v1Data) {
    const parts = [];
    if (v1Data.appearance) parts.push(`【外貌】${v1Data.appearance}`);
    if (v1Data.physique) parts.push(`【体质】${v1Data.physique}`);
    if (v1Data.special) parts.push(`【特殊】${v1Data.special}`);
    if (v1Data.background) parts.push(`【背景】${v1Data.background}`);
    return parts.join('\n');
  }
  
  /**
   * 生成唯一ID
   * @private
   */
  static generateId() {
    return 'char_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  /**
   * 将V2数据降级为V1（用于兼容旧系统）
   * @param {CharacterCardV2} v2Data - V2数据
   * @returns {Object} - V1兼容格式
   */
  static downgradeV2ToV1(v2Data) {
    return {
      id: v2Data.id,
      name: v2Data.name,
      color: v2Data.visual.color,
      image: v2Data.visual.avatar,
      prompt: this.buildV1Prompt(v2Data),
      appearance: v2Data.core.description,
      personality: v2Data.core.personality,
      background: v2Data.core.scenario,
      keys: v2Data.activation.keys,
      priority: v2Data.activation.priority,
      enabled: v2Data.activation.enabled,
      favor: v2Data.relationship.favor,
      trust: v2Data.relationship.trust,
      mood: v2Data.relationship.mood,
      createdAt: v2Data.meta.createdAt
    };
  }
  
  /**
   * 构建V1格式的prompt
   * @private
   */
  static buildV1Prompt(v2Data) {
    const parts = [
      v2Data.core.description,
      v2Data.core.personality,
      v2Data.injection.characterNote.content,
      v2Data.injection.postHistory
    ].filter(Boolean);
    return parts.join('\n\n');
  }
}

// ==================== 角色卡适配器 ====================

class CharacterCardAdapter {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 60000; // 1分钟缓存
  }
  
  /**
   * 获取角色（自动处理版本）
   * @param {string} characterId - 角色ID
   * @param {Object} options - 选项
   * @returns {Promise<CharacterCardV2>}
   */
  async getCharacter(characterId, options = {}) {
    const cacheKey = `char_${characterId}`;
    
    // 检查缓存
    if (!options.skipCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }
    }
    
    try {
      // 从API获取
      const response = await fetch(`${API_BASE}/characters/${characterId}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`获取角色失败: ${response.status}`);
      }
      
      const data = await response.json();
      let characterData = data.data || data;
      
      // 版本检测和迁移
      const version = CharacterMigrationTool.detectVersion(characterData);
      
      if (version === 'v1') {
        characterData = CharacterMigrationTool.migrateV1ToV2(characterData);
      } else if (version === 'unknown') {
        throw new Error('无法识别的角色数据格式');
      }
      
      // 缓存结果
      this.cache.set(cacheKey, {
        data: characterData,
        timestamp: Date.now()
      });
      
      return characterData;
    } catch (error) {
      console.error('[CharacterCardAdapter] 获取角色失败:', error);
      throw error;
    }
  }
  
  /**
   * 保存角色（自动处理版本）
   * @param {CharacterCardV2} characterData - 角色数据
   * @param {Object} options - 选项
   * @returns {Promise<Object>}
   */
  async saveCharacter(characterData, options = {}) {
    try {
      // 更新元数据
      characterData.meta.updatedAt = new Date();
      
      // 如果是新角色
      if (!characterData.id) {
        characterData.id = this.generateId();
        characterData.meta.createdAt = new Date();
      }
      
      // 根据目标版本决定保存格式
      const saveData = options.targetVersion === 'v1' 
        ? CharacterMigrationTool.downgradeV2ToV1(characterData)
        : characterData;
      
      const method = characterData.id ? 'PUT' : 'POST';
      const url = characterData.id 
        ? `${API_BASE}/characters/${characterData.id}`
        : `${API_BASE}/characters`;
      
      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(saveData)
      });
      
      if (!response.ok) {
        throw new Error(`保存角色失败: ${response.status}`);
      }
      
      // 清除缓存
      this.cache.delete(`char_${characterData.id}`);
      
      return await response.json();
    } catch (error) {
      console.error('[CharacterCardAdapter] 保存角色失败:', error);
      throw error;
    }
  }
  
  /**
   * 构建提示词（自动选择构建器）
   * @param {CharacterCardV2} characterData - 角色数据
   * @param {Object} context - 上下文
   * @returns {Promise<Object>} - 构建后的提示词
   */
  async buildPrompt(characterData, context = {}) {
    // 动态导入增强提示词构建器
    try {
      const { EnhancedPromptBuilder } = await import('./enhancedPromptBuilder.js');
      const builder = new EnhancedPromptBuilder();
      return builder.buildForCharacter(characterData, context);
    } catch (error) {
      console.warn('[CharacterCardAdapter] 增强构建器不可用，使用降级方案:', error);
      // 降级到简单构建
      return this.buildSimplePrompt(characterData, context);
    }
  }
  
  /**
   * 简单提示词构建（降级方案）
   * @private
   */
  buildSimplePrompt(characterData, context) {
    const parts = [];
    
    if (characterData.core.description) {
      parts.push(`【角色描述】\n${characterData.core.description}`);
    }
    
    if (characterData.core.personality) {
      parts.push(`【性格特点】\n${characterData.core.personality}`);
    }
    
    if (characterData.core.scenario) {
      parts.push(`【当前处境】\n${characterData.core.scenario}`);
    }
    
    if (characterData.injection.characterNote?.content) {
      parts.push(`【状态备注】\n${characterData.injection.characterNote.content}`);
    }
    
    return {
      system: parts.join('\n\n'),
      examples: characterData.examples?.dialogues || [],
      postHistory: characterData.injection?.postHistory || ''
    };
  }
  
  /**
   * 创建角色专属世界书条目
   * @param {CharacterCardV2} characterData - 角色数据
   * @param {Object} entryData - 条目数据
   * @returns {LorebookEntry}
   */
  createLorebookEntry(characterData, entryData) {
    const entry = {
      id: `char_${characterData.id}_lore_${Date.now()}`,
      name: entryData.name,
      keys: entryData.keys || [],
      content: entryData.content,
      priority: entryData.priority || 100,
      insertPosition: entryData.insertPosition || 'character',
      characterId: characterData.id, // 标记归属
      createdAt: new Date().toISOString()
    };
    
    characterData.lorebook.entries.push(entry);
    return entry;
  }
  
  /**
   * 添加示例对话
   * @param {CharacterCardV2} characterData - 角色数据
   * @param {string} userText - 玩家输入
   * @param {string} charText - 角色回应
   * @param {string} [annotation] - 标注
   */
  addExampleDialogue(characterData, userText, charText, annotation = '') {
    characterData.examples.dialogues.push({
      user: userText,
      character: charText,
      annotation,
      createdAt: new Date().toISOString()
    });
  }
  
  /**
   * 更新关系状态
   * @param {CharacterCardV2} characterData - 角色数据
   * @param {string} type - 变化类型
   * @param {number} delta - 变化值
   * @param {string} reason - 原因
   */
  updateRelationship(characterData, type, delta, reason) {
    if (type === 'favor') {
      const oldValue = characterData.relationship.favor;
      characterData.relationship.favor = Math.max(0, Math.min(100, oldValue + delta));
      
      // 记录历史
      characterData.relationship.attitude.history.push({
        timestamp: new Date(),
        event: reason,
        change: delta
      });
      
      // 更新当前态度
      characterData.relationship.attitude.current = this.calculateAttitude(
        characterData.relationship.favor,
        characterData.relationship.trust
      );
    } else if (type === 'trust') {
      const oldValue = characterData.relationship.trust;
      characterData.relationship.trust = Math.max(0, Math.min(100, oldValue + delta));
    }
  }
  
  /**
   * 计算态度标签
   * @private
   */
  calculateAttitude(favor, trust) {
    if (favor >= 80 && trust >= 70) return '亲密';
    if (favor >= 60 && trust >= 50) return '友好';
    if (favor >= 40 && trust >= 30) return '中立';
    if (favor >= 20) return '冷淡';
    return '敌意';
  }
  
  /**
   * 导出为SillyTavern PNG格式（预留接口）
   * @param {CharacterCardV2} characterData - 角色数据
   * @returns {Promise<Blob>}
   */
  async exportToSillyTavernPNG(characterData) {
    // TODO: 实现PNG元数据嵌入
    console.warn('导出SillyTavern PNG功能尚未实现');
    return null;
  }
  
  /**
   * 从SillyTavern PNG导入（预留接口）
   * @param {File} pngFile - PNG文件
   * @returns {Promise<CharacterCardV2>}
   */
  async importFromSillyTavernPNG(pngFile) {
    // TODO: 实现PNG元数据解析
    console.warn('导入SillyTavern PNG功能尚未实现');
    return null;
  }
  
  generateId() {
    return 'char_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
  }
}

// ==================== 便捷创建函数 ====================

/**
 * 快速创建角色卡V2
 * @param {Object} overrides - 覆盖默认值
 * @returns {CharacterCardV2}
 */
function createCharacterCardV2(overrides = {}) {
  const card = JSON.parse(JSON.stringify(DEFAULT_CHARACTER_CARD_V2));
  card.id = 'char_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  card.meta.createdAt = new Date();
  card.meta.updatedAt = new Date();
  
  // 深度合并
  return deepMerge(card, overrides);
}

/**
 * 深度合并对象
 * @private
 */
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

// ==================== 导出 ====================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CharacterMigrationTool,
    CharacterCardAdapter,
    createCharacterCardV2,
    DEFAULT_CHARACTER_CARD_V2
  };
}

if (typeof window !== 'undefined') {
  window.CharacterCardV2 = {
    CharacterMigrationTool,
    CharacterCardAdapter,
    createCharacterCardV2,
    DEFAULT_CHARACTER_CARD_V2
  };
}
