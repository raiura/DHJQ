/**
 * 增强提示词构建器
 * Enhanced Prompt Builder
 * 
 * 吸取SillyTavern设计理念：
 * - Character's Note深度注入
 * - Post-History Instructions
 * - Example Dialogues格式化
 * - 多层次提示词架构
 * 
 * @version 2.0.0
 * @author 大荒九丘
 */

/**
 * @typedef {Object} PromptBuildResult
 * @property {string} system - 系统级提示词
 * @property {Array.<Object>} messages - 消息列表（包含示例对话）
 * @property {Array.<Object>} injections - 需要深度注入的内容
 * @property {string} postHistory - 历史后指令
 * @property {Object} stats - 统计信息
 */

class EnhancedPromptBuilder {
  constructor(options = {}) {
    // Token预算配置
    this.tokenBudget = {
      system: options.systemBudget || 800,
      character: options.characterBudget || 1000,
      examples: options.examplesBudget || 600,
      dynamic: options.dynamicBudget || 400,
      postHistory: options.postHistoryBudget || 200,
      total: options.totalBudget || 4000
    };
    
    // 变量上下文
    this.variables = {
      user: options.userName || '玩家',
      char: options.characterName || '角色',
      world: options.worldName || '世界',
      location: options.location || '',
      time: () => new Date().toLocaleString('zh-CN'),
      date: () => new Date().toLocaleDateString('zh-CN'),
      ...options.customVars
    };
    
    // 统计信息
    this.stats = {
      totalTokens: 0,
      layerTokens: {},
      truncated: false,
      injections: 0,
      examples: 0
    };
  }
  
  /**
   * 为角色构建完整提示词
   * @param {CharacterCardV2} characterData - 角色卡V2数据
   * @param {Object} context - 构建上下文
   * @returns {PromptBuildResult}
   */
  buildForCharacter(characterData, context = {}) {
    // 重置统计
    this.resetStats();
    
    // 更新变量上下文
    this.variables.char = characterData.name;
    this.variables.world = context.worldName || this.variables.world;
    this.variables.location = characterData.core.worldConnection?.location || '';
    
    // 构建各层
    const systemLayer = this.buildSystemLayer(characterData, context);
    const characterLayer = this.buildCharacterLayer(characterData, context);
    const examplesLayer = this.buildExamplesLayer(characterData, context);
    const dynamicLayer = this.buildDynamicLayer(characterData, context);
    
    // 组装结果
    const result = {
      system: this.assembleSystemPrompt(systemLayer, characterLayer),
      messages: examplesLayer.messages,
      injections: dynamicLayer.injections,
      postHistory: characterData.injection?.postHistory || '',
      stats: { ...this.stats }
    };
    
    // 应用变量替换
    this.applyVariables(result);
    
    return result;
  }
  
  /**
   * 构建系统层
   * @private
   */
  buildSystemLayer(characterData, context) {
    const parts = [];
    
    // 1. Main Prompt Override（如果角色有设置）
    if (characterData.injection?.mainPromptOverride) {
      parts.push({
        content: characterData.injection.mainPromptOverride,
        type: 'override',
        priority: 1000
      });
    }
    
    // 2. 世界观基础
    if (context.worldSetting) {
      parts.push({
        content: `【世界观】\n${context.worldSetting}`,
        type: 'world',
        priority: 900
      });
    }
    
    // 3. 角色关联的全局世界书条目（system位置）
    if (characterData.lorebook?.linkedGlobalEntries) {
      // 这些会在外部与世界书系统集成时处理
      parts.push({
        content: '', // 占位，由外部填充
        type: 'linked_worldbook',
        priority: 800,
        entryIds: characterData.lorebook.linkedGlobalEntries
      });
    }
    
    return parts;
  }
  
  /**
   * 构建角色层
   * @private
   */
  buildCharacterLayer(characterData, context) {
    const parts = [];
    
    // 1. 角色主描述
    if (characterData.core?.description) {
      parts.push({
        content: `【角色】${characterData.name}\n${characterData.core.description}`,
        type: 'description',
        priority: 700
      });
    }
    
    // 2. 性格特点
    if (characterData.core?.personality) {
      parts.push({
        content: `【性格】\n${characterData.core.personality}`,
        type: 'personality',
        priority: 650
      });
    }
    
    // 3. 场景/处境
    if (characterData.core?.scenario) {
      parts.push({
        content: `【处境】\n${characterData.core.scenario}`,
        type: 'scenario',
        priority: 600
      });
    }
    
    // 4. 与世界的关联
    const worldConn = characterData.core?.worldConnection;
    if (worldConn) {
      const connParts = [];
      if (worldConn.faction) connParts.push(`所属势力：${worldConn.faction}`);
      if (worldConn.location) connParts.push(`常驻地点：${worldConn.location}`);
      
      if (connParts.length > 0) {
        parts.push({
          content: `【世界关联】\n${connParts.join('，')}`,
          type: 'world_connection',
          priority: 550
        });
      }
    }
    
    // 5. 角色专属世界书条目（character位置）
    if (characterData.lorebook?.entries) {
      const charEntries = characterData.lorebook.entries
        .filter(e => e.insertPosition === 'character' || !e.insertPosition)
        .sort((a, b) => (b.priority || 100) - (a.priority || 100));
      
      if (charEntries.length > 0) {
        const entriesContent = charEntries
          .map(e => `[${e.name}]: ${e.content}`)
          .join('\n');
        
        parts.push({
          content: `【角色相关知识】\n${entriesContent}`,
          type: 'character_lorebook',
          priority: 500
        });
        
        this.stats.injections += charEntries.length;
      }
    }
    
    return parts;
  }
  
  /**
   * 构建示例对话层
   * @private
   */
  buildExamplesLayer(characterData, context) {
    const messages = [];
    const examples = characterData.examples?.dialogues || [];
    
    if (examples.length === 0) {
      return { messages };
    }
    
    // 添加风格说明
    if (characterData.examples?.style) {
      messages.push({
        role: 'system',
        content: `【语气风格】\n${characterData.examples.style}`
      });
    }
    
    // 格式化示例对话
    const formattedExamples = examples.map((ex, index) => {
      const annotation = ex.annotation ? `\n// 注：${ex.annotation}` : '';
      return {
        role: 'system',
        content: `【示例对话${index + 1}】${annotation}\n玩家：${ex.user}\n${characterData.name}：${ex.character}`
      };
    });
    
    // Token预算检查
    let currentTokens = 0;
    const budget = this.tokenBudget.examples;
    
    for (const msg of formattedExamples) {
      const tokens = this.estimateTokens(msg.content);
      if (currentTokens + tokens > budget) {
        this.stats.truncated = true;
        break;
      }
      messages.push(msg);
      currentTokens += tokens;
    }
    
    this.stats.layerTokens.examples = currentTokens;
    this.stats.totalTokens += currentTokens;
    this.stats.examples = messages.length - (characterData.examples?.style ? 1 : 0);
    
    return { messages };
  }
  
  /**
   * 构建动态层（CharacterNote等）
   * @private
   */
  buildDynamicLayer(characterData, context) {
    const injections = [];
    
    // 1. Character's Note
    const charNote = characterData.injection?.characterNote;
    if (charNote?.content) {
      injections.push({
        type: 'character_note',
        content: charNote.content,
        depth: charNote.depth || 0,
        frequency: charNote.frequency || 1,
        role: charNote.role || 'system',
        priority: 400
      });
    }
    
    // 2. 关系状态动态注入
    const rel = characterData.relationship;
    if (rel) {
      const relParts = [];
      
      // 好感度描述
      const favorDesc = this.getFavorDescription(rel.favor);
      relParts.push(`对玩家的好感度：${rel.favor}/100（${favorDesc}）`);
      
      // 信任度描述
      const trustDesc = this.getTrustDescription(rel.trust);
      relParts.push(`对玩家的信任度：${rel.trust}/100（${trustDesc}）`);
      
      // 当前心情
      if (rel.mood) {
        relParts.push(`当前心情：${rel.mood}`);
      }
      
      // 当前态度
      if (rel.attitude?.current) {
        relParts.push(`当前态度：${rel.attitude.current}`);
      }
      
      injections.push({
        type: 'relationship_status',
        content: `【关系状态】\n${relParts.join('，')}`,
        depth: 0,
        frequency: 1,
        role: 'system',
        priority: 300
      });
    }
    
    // 3. 开场白（如果是新对话）
    if (context.isNewChat && characterData.core?.firstMessage) {
      injections.push({
        type: 'first_message',
        content: characterData.core.firstMessage,
        depth: 0,
        frequency: 1,
        role: 'assistant',
        priority: 1000,
        isFirstMessage: true
      });
    }
    
    this.stats.injections += injections.length;
    
    return { injections };
  }
  
  /**
   * 组装系统提示词
   * @private
   */
  assembleSystemPrompt(systemLayer, characterLayer) {
    const allParts = [...systemLayer, ...characterLayer];
    
    // 按优先级排序
    allParts.sort((a, b) => b.priority - a.priority);
    
    // 合并内容
    const contentParts = allParts
      .filter(p => p.content && p.type !== 'linked_worldbook')
      .map(p => p.content);
    
    let systemPrompt = contentParts.join('\n\n');
    
    // Token预算检查
    const tokens = this.estimateTokens(systemPrompt);
    const budget = this.tokenBudget.system + this.tokenBudget.character;
    
    if (tokens > budget) {
      // 简化截断策略：保留高优先级内容
      systemPrompt = this.truncateToBudget(contentParts, budget);
      this.stats.truncated = true;
      this.stats.layerTokens.system = budget;
    } else {
      this.stats.layerTokens.system = tokens;
    }
    
    this.stats.totalTokens += this.stats.layerTokens.system;
    
    return systemPrompt;
  }
  
  /**
   * 应用变量替换
   * @private
   */
  applyVariables(result) {
    const varRegex = /\{\{(\w+)\}\}/g;
    
    const replaceVars = (text) => {
      return text.replace(varRegex, (match, varName) => {
        const value = this.variables[varName];
        if (typeof value === 'function') {
          return value();
        }
        return value !== undefined ? value : match;
      });
    };
    
    // 替换system
    result.system = replaceVars(result.system);
    
    // 替换messages
    result.messages.forEach(msg => {
      msg.content = replaceVars(msg.content);
    });
    
    // 替换injections
    result.injections.forEach(inj => {
      inj.content = replaceVars(inj.content);
    });
    
    // 替换postHistory
    result.postHistory = replaceVars(result.postHistory);
  }
  
  /**
   * 获取好感度描述
   * @private
   */
  getFavorDescription(favor) {
    if (favor >= 90) return '深爱';
    if (favor >= 80) return '爱慕';
    if (favor >= 60) return '喜欢';
    if (favor >= 40) return '友好';
    if (favor >= 20) return '一般';
    if (favor >= 10) return '冷淡';
    return '厌恶';
  }
  
  /**
   * 获取信任度描述
   * @private
   */
  getTrustDescription(trust) {
    if (trust >= 90) return '绝对信任';
    if (trust >= 70) return '信任';
    if (trust >= 50) return '认可';
    if (trust >= 30) return '观察中';
    if (trust >= 10) return '怀疑';
    return '不信任';
  }
  
  /**
   * 估算token数
   * @private
   */
  estimateTokens(text) {
    // 简化估算：中文1字≈1token，英文单词≈0.75token
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    const others = text.length - chineseChars;
    return Math.ceil(chineseChars + englishWords * 0.75 + others * 0.5);
  }
  
  /**
   * 截断到预算
   * @private
   */
  truncateToBudget(parts, budget) {
    let result = [];
    let currentTokens = 0;
    
    for (const part of parts) {
      const tokens = this.estimateTokens(part);
      if (currentTokens + tokens > budget) {
        break;
      }
      result.push(part);
      currentTokens += tokens;
    }
    
    return result.join('\n\n') + '\n\n...(部分内容因长度限制已省略)';
  }
  
  /**
   * 重置统计
   * @private
   */
  resetStats() {
    this.stats = {
      totalTokens: 0,
      layerTokens: {},
      truncated: false,
      injections: 0,
      examples: 0
    };
  }
  
  /**
   * 设置变量
   * @param {string} name - 变量名
   * @param {string|Function} value - 变量值
   */
  setVariable(name, value) {
    this.variables[name] = value;
  }
  
  /**
   * 批量设置变量
   * @param {Object} vars - 变量对象
   */
  setVariables(vars) {
    this.variables = { ...this.variables, ...vars };
  }
  
  /**
   * 设置Token预算
   * @param {Object} budget - 预算配置
   */
  setTokenBudget(budget) {
    this.tokenBudget = { ...this.tokenBudget, ...budget };
  }
  
  /**
   * 从游戏配置创建构建器
   * @static
   */
  static fromGameConfig(config) {
    return new EnhancedPromptBuilder({
      userName: config.userName,
      characterName: config.characterName,
      worldName: config.worldName,
      systemBudget: config.systemBudget,
      characterBudget: config.characterBudget,
      examplesBudget: config.examplesBudget,
      totalBudget: config.totalBudget,
      customVars: config.customVars
    });
  }
}

// ==================== CharacterNote注入器 ====================

class CharacterNoteInjector {
  constructor() {
    this.messageCount = 0;
    this.injectionHistory = [];
  }
  
  /**
   * 检查是否应该注入
   * @param {Object} charNote - CharacterNote配置
   * @returns {boolean}
   */
  shouldInject(charNote) {
    if (!charNote?.content) return false;
    
    this.messageCount++;
    const frequency = charNote.frequency || 1;
    
    return this.messageCount % frequency === 0;
  }
  
  /**
   * 注入到消息列表
   * @param {Array} messages - 消息列表
   * @param {Object} charNote - CharacterNote配置
   * @param {string} charName - 角色名
   * @returns {Array} - 注入后的消息列表
   */
  inject(messages, charNote, charName) {
    if (!this.shouldInject(charNote)) {
      return messages;
    }
    
    const depth = charNote.depth || 0;
    const role = charNote.role || 'system';
    
    // 构建注入消息
    const injectionMsg = {
      role: role,
      content: `[${charName}状态] ${charNote.content}`,
      isInjection: true,
      injectionType: 'character_note',
      timestamp: new Date().toISOString()
    };
    
    // 根据depth插入
    const insertIndex = Math.max(0, messages.length - depth);
    const newMessages = [...messages];
    newMessages.splice(insertIndex, 0, injectionMsg);
    
    // 记录历史
    this.injectionHistory.push({
      messageIndex: insertIndex,
      content: charNote.content,
      timestamp: new Date()
    });
    
    return newMessages;
  }
  
  /**
   * 获取注入历史
   * @returns {Array}
   */
  getHistory() {
    return [...this.injectionHistory];
  }
  
  /**
   * 重置计数器
   */
  reset() {
    this.messageCount = 0;
    this.injectionHistory = [];
  }
}

// ==================== 导出 ====================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    EnhancedPromptBuilder,
    CharacterNoteInjector
  };
}

if (typeof window !== 'undefined') {
  window.EnhancedPromptBuilder = EnhancedPromptBuilder;
  window.CharacterNoteInjector = CharacterNoteInjector;
}
