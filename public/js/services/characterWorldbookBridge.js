/**
 * 角色-世界书联动桥接器
 * Character-Worldbook Bridge
 * 
 * 功能：
 * - 支持自动和手动两种关联模式
 * - 管理角色专属世界书
 * - 智能触发策略
 * 
 * @version 1.1.0
 * @author 大荒九丘
 */

class CharacterWorldbookBridge {
  constructor(options = {}) {
    this.gameId = options.gameId || null;
    this.worldbookEngine = options.worldbookEngine || null;
    this.cache = new Map();
    this.cacheExpiry = 30000; // 30秒缓存
    
    // 联动配置 - 支持手动/自动切换
    this.config = {
      // 关联模式: 'auto' | 'manual'
      linkMode: options.linkMode || 'manual', 
      
      // 自动关联设置（仅auto模式有效）
      autoLink: {
        enabled: true,
        linkThreshold: 0.6,      // 相似度阈值
        maxLinkedEntries: 10,    // 最大关联条目数
        linkOnCreate: true,      // 创建时自动关联
        linkOnUpdate: false,     // 更新时自动重新关联
        keywordsMatch: true,     // 关键词匹配
        locationMatch: true,     // 地点匹配
        factionMatch: true       // 势力匹配
      },
      
      // 触发设置
      triggerOnCharacterMention: true, // 提到角色名时触发
      triggerOnLocationMatch: true,    // 地点匹配时触发
      triggerOnFactionMatch: true,     // 势力匹配时触发
      
      // 优先级调整
      characterLorePriority: 150,      // 角色专属条目默认优先级
      linkedEntryPriorityBoost: 20,    // 关联条目优先级加成
      
      // 调试模式
      debug: options.debug || false
    };
    
    this.log('CharacterWorldbookBridge 初始化完成，模式:', this.config.linkMode);
  }
  
  /**
   * 日志输出
   * @private
   */
  log(...args) {
    if (this.config.debug) {
      console.log('[CharacterWorldbookBridge]', ...args);
    }
  }
  
  /**
   * 设置关联模式
   * @param {string} mode - 'auto' 或 'manual'
   */
  setLinkMode(mode) {
    if (mode !== 'auto' && mode !== 'manual') {
      console.error('[CharacterWorldbookBridge] 无效的关联模式:', mode);
      return false;
    }
    
    this.config.linkMode = mode;
    this.log('关联模式已切换为:', mode);
    return true;
  }
  
  /**
   * 获取当前关联模式
   */
  getLinkMode() {
    return this.config.linkMode;
  }
  
  /**
   * 初始化角色世界书
   * @param {CharacterCardV2} characterData - 角色数据
   * @param {Object} options - 初始化选项
   * @returns {Promise<CharacterCardV2>} - 初始化后的角色数据
   */
  async initializeCharacterLorebook(characterData, options = {}) {
    this.log('初始化角色世界书:', characterData.name);
    
    // 1. 自动创建基础条目（始终执行）
    this.createBaseEntries(characterData);
    
    // 2. 根据模式处理全局世界书关联
    if (this.config.linkMode === 'auto' && this.config.autoLink.enabled) {
      // 自动模式：自动关联
      if (options.forceReLink || this.config.autoLink.linkOnCreate) {
        await this.autoLinkGlobalEntries(characterData);
      }
    } else {
      // 手动模式：保持现有手动关联
      this.log('手动模式：跳过自动关联');
    }
    
    // 3. 设置触发条件
    this.setupActivationConditions(characterData);
    
    return characterData;
  }
  
  /**
   * 手动关联全局世界书条目
   * @param {CharacterCardV2} characterData - 角色数据
   * @param {Array<string>} entryIds - 要关联的条目ID列表
   */
  manualLinkGlobalEntries(characterData, entryIds) {
    this.log('手动关联条目:', entryIds);
    
    if (!characterData.lorebook) {
      characterData.lorebook = { entries: [], linkedGlobalEntries: [] };
    }
    
    // 添加到关联列表（去重）
    const existingIds = new Set(characterData.lorebook.linkedGlobalEntries);
    entryIds.forEach(id => existingIds.add(id));
    characterData.lorebook.linkedGlobalEntries = Array.from(existingIds);
    
    // 记录手动关联标记
    characterData.lorebook._manualLinked = characterData.lorebook._manualLinked || [];
    characterData.lorebook._manualLinked.push({
      entryIds: entryIds,
      timestamp: new Date().toISOString()
    });
    
    this.log('手动关联完成，当前关联条目数:', characterData.lorebook.linkedGlobalEntries.length);
  }
  
  /**
   * 手动取消关联全局世界书条目
   * @param {CharacterCardV2} characterData - 角色数据
   * @param {Array<string>} entryIds - 要取消关联的条目ID列表
   */
  manualUnlinkGlobalEntries(characterData, entryIds) {
    this.log('手动取消关联条目:', entryIds);
    
    if (!characterData.lorebook?.linkedGlobalEntries) {
      return;
    }
    
    const idSet = new Set(entryIds);
    characterData.lorebook.linkedGlobalEntries = 
      characterData.lorebook.linkedGlobalEntries.filter(id => !idSet.has(id));
    
    this.log('取消关联完成，当前关联条目数:', characterData.lorebook.linkedGlobalEntries.length);
  }
  
  /**
   * 获取推荐关联的全局世界书条目
   * @param {CharacterCardV2} characterData - 角色数据
   * @returns {Promise<Array>} - 推荐的条目列表
   */
  async getRecommendedGlobalEntries(characterData) {
    if (!this.worldbookEngine) {
      this.log('未提供WorldbookEngine，无法获取推荐');
      return [];
    }
    
    const globalEntries = this.worldbookEngine.getAllEntries?.() || [];
    const recommendations = [];
    
    // 提取角色关键词
    const charKeywords = this.extractCharacterKeywords(characterData);
    this.log('角色关键词:', charKeywords);
    
    for (const entry of globalEntries) {
      // 跳过已关联的
      if (characterData.lorebook?.linkedGlobalEntries?.includes(entry.id)) {
        continue;
      }
      
      // 计算匹配分数
      const score = this.calculateRelevanceScore(entry, charKeywords, characterData);
      
      if (score >= this.config.autoLink.linkThreshold) {
        recommendations.push({
          entry: entry,
          score: score,
          matchedKeywords: this.getMatchedKeywords(entry, charKeywords),
          reason: this.getMatchReason(entry, charKeywords, characterData)
        });
      }
    }
    
    // 按分数排序
    recommendations.sort((a, b) => b.score - a.score);
    
    this.log('推荐条目数:', recommendations.length);
    return recommendations.slice(0, this.config.autoLink.maxLinkedEntries);
  }
  
  /**
   * 获取匹配原因说明
   * @private
   */
  getMatchReason(entry, charKeywords, characterData) {
    const reasons = [];
    const entryText = [
      entry.name,
      ...(entry.keys || []),
      entry.content
    ].join(' ').toLowerCase();
    
    // 关键词匹配
    const matchedKeywords = charKeywords.filter(k => 
      entryText.includes(k.toLowerCase())
    );
    if (matchedKeywords.length > 0) {
      reasons.push(`关键词匹配: ${matchedKeywords.slice(0, 3).join(', ')}`);
    }
    
    // 势力匹配
    const faction = characterData.core?.worldConnection?.faction;
    if (faction && entryText.includes(faction.toLowerCase())) {
      reasons.push(`势力关联: ${faction}`);
    }
    
    // 地点匹配
    const location = characterData.core?.worldConnection?.location;
    if (location && entryText.includes(location.toLowerCase())) {
      reasons.push(`地点关联: ${location}`);
    }
    
    return reasons.join('；') || '综合匹配';
  }
  
  /**
   * 切换自动关联开关
   * @param {boolean} enabled 
   */
  setAutoLinkEnabled(enabled) {
    this.config.autoLink.enabled = enabled;
    this.log('自动关联已', enabled ? '启用' : '禁用');
  }
  
  // ==================== 以下方法与之前版本保持不变 ====================
  
  /**
   * 创建角色基础世界书条目
   * @private
   */
  createBaseEntries(characterData) {
    const entries = characterData.lorebook?.entries || [];
    const charName = characterData.name;
    
    // 检查是否已有基础条目
    const hasEntry = (name) => entries.some(e => e.name === name);
    
    // 1. 外貌条目
    if (characterData.core?.description && !hasEntry(`${charName}的外貌`)) {
      entries.push({
        id: `char_${characterData.id}_appearance`,
        name: `${charName}的外貌`,
        keys: [charName, `${charName}的样子`, `${charName}外貌`],
        content: characterData.core.description,
        priority: this.config.characterLorePriority,
        insertPosition: 'character',
        type: 'base'
      });
    }
    
    // 2. 性格条目
    if (characterData.core?.personality && !hasEntry(`${charName}的性格`)) {
      entries.push({
        id: `char_${characterData.id}_personality`,
        name: `${charName}的性格`,
        keys: [charName, `${charName}性格`, `${charName}脾气`],
        content: characterData.core.personality,
        priority: this.config.characterLorePriority,
        insertPosition: 'character',
        type: 'base'
      });
    }
    
    // 3. 所属势力条目
    if (characterData.core?.worldConnection?.faction && !hasEntry(`${charName}的势力`)) {
      const faction = characterData.core.worldConnection.faction;
      entries.push({
        id: `char_${characterData.id}_faction`,
        name: `${charName}的势力`,
        keys: [charName, faction, `${charName}所属`],
        content: `${charName}是${faction}的成员。`,
        priority: this.config.characterLorePriority - 10,
        insertPosition: 'character',
        type: 'connection'
      });
    }
    
    // 4. 常驻地点条目
    if (characterData.core?.worldConnection?.location && !hasEntry(`${charName}的位置`)) {
      const location = characterData.core.worldConnection.location;
      entries.push({
        id: `char_${characterData.id}_location`,
        name: `${charName}的位置`,
        keys: [charName, location, `${charName}在哪`],
        content: `${charName}通常在${location}活动。`,
        priority: this.config.characterLorePriority - 20,
        insertPosition: 'character',
        type: 'connection'
      });
    }
    
    // 确保lorebook结构完整
    if (!characterData.lorebook) {
      characterData.lorebook = { entries: [], linkedGlobalEntries: [] };
    }
    characterData.lorebook.entries = entries;
  }
  
  /**
   * 自动关联全局世界书条目（仅在auto模式下调用）
   * @private
   */
  async autoLinkGlobalEntries(characterData) {
    if (!this.worldbookEngine) {
      this.log('未提供WorldbookEngine，跳过自动关联');
      return;
    }
    
    this.log('开始自动关联全局条目...');
    
    const globalEntries = this.worldbookEngine.getAllEntries?.() || [];
    const linkedIds = [];
    
    // 提取角色关键词
    const charKeywords = this.extractCharacterKeywords(characterData);
    
    for (const entry of globalEntries) {
      // 计算匹配分数
      const score = this.calculateRelevanceScore(entry, charKeywords, characterData);
      
      if (score >= this.config.autoLink.linkThreshold) {
        linkedIds.push({
          id: entry.id,
          score: score,
          matchedKeywords: this.getMatchedKeywords(entry, charKeywords)
        });
      }
    }
    
    // 按分数排序并限制数量
    linkedIds.sort((a, b) => b.score - a.score);
    const topLinks = linkedIds.slice(0, this.config.autoLink.maxLinkedEntries);
    
    // 更新角色数据
    if (!characterData.lorebook) {
      characterData.lorebook = { entries: [], linkedGlobalEntries: [] };
    }
    
    // 合并已有手动关联和新自动关联
    const existingManualIds = new Set(characterData.lorebook.linkedGlobalEntries || []);
    const newAutoIds = topLinks.map(l => l.id).filter(id => !existingManualIds.has(id));
    
    characterData.lorebook.linkedGlobalEntries = [
      ...Array.from(existingManualIds),
      ...newAutoIds
    ];
    
    // 记录自动关联信息
    characterData.lorebook._autoLinked = {
      entryIds: newAutoIds,
      timestamp: new Date().toISOString(),
      mode: 'auto'
    };
    
    this.log(`自动关联完成：原有手动关联 ${existingManualIds.size} 条，新增自动关联 ${newAutoIds.length} 条`);
  }
  
  /**
   * 提取角色关键词
   * @private
   */
  extractCharacterKeywords(characterData) {
    const keywords = new Set();
    
    // 基础信息
    keywords.add(characterData.name);
    characterData.activation?.keys?.forEach(k => keywords.add(k));
    
    // 世界关联
    const wc = characterData.core?.worldConnection;
    if (wc?.faction) keywords.add(wc.faction);
    if (wc?.location) keywords.add(wc.location);
    
    // 从描述中提取关键词（简单分词）
    const text = [
      characterData.core?.description,
      characterData.core?.personality,
      characterData.core?.scenario
    ].join(' ');
    
    // 提取2-4字的词组作为关键词
    const segments = text.match(/[\u4e00-\u9fa5]{2,4}/g) || [];
    segments.forEach(s => {
      if (s.length >= 2 && s.length <= 4) {
        keywords.add(s);
      }
    });
    
    return Array.from(keywords);
  }
  
  /**
   * 计算关联度分数
   * @private
   */
  calculateRelevanceScore(entry, charKeywords, characterData) {
    let score = 0;
    const entryText = [
      entry.name,
      ...(entry.keys || []),
      entry.content
    ].join(' ').toLowerCase();
    
    // 关键词匹配
    let matchedCount = 0;
    for (const keyword of charKeywords) {
      if (entryText.includes(keyword.toLowerCase())) {
        matchedCount++;
        // 关键词在keys中的权重更高
        if (entry.keys?.some(k => k.toLowerCase() === keyword.toLowerCase())) {
          score += 0.3;
        } else {
          score += 0.1;
        }
      }
    }
    
    // 归一化
    if (charKeywords.length > 0) {
      score += (matchedCount / charKeywords.length) * 0.5;
    }
    
    // 特殊加成
    const wc = characterData.core?.worldConnection;
    
    // 势力匹配
    if (this.config.autoLink.factionMatch && wc?.faction && 
        entryText.includes(wc.faction.toLowerCase())) {
      score += 0.2;
    }
    
    // 地点匹配
    if (this.config.autoLink.locationMatch && wc?.location && 
        entryText.includes(wc.location.toLowerCase())) {
      score += 0.2;
    }
    
    return Math.min(1, score);
  }
  
  /**
   * 获取匹配的关键词
   * @private
   */
  getMatchedKeywords(entry, charKeywords) {
    const entryText = [
      entry.name,
      ...(entry.keys || []),
      entry.content
    ].join(' ').toLowerCase();
    
    return charKeywords.filter(k => 
      entryText.includes(k.toLowerCase())
    );
  }
  
  /**
   * 设置触发条件
   * @private
   */
  setupActivationConditions(characterData) {
    const conditions = [];
    
    // 地点条件
    if (characterData.core?.worldConnection?.location) {
      conditions.push({
        type: 'location',
        value: characterData.core.worldConnection.location,
        description: `当玩家到达${characterData.core.worldConnection.location}时`
      });
    }
    
    // 势力条件
    if (characterData.core?.worldConnection?.faction) {
      conditions.push({
        type: 'faction',
        value: characterData.core.worldConnection.faction,
        description: `当涉及${characterData.core.worldConnection.faction}时`
      });
    }
    
    if (!characterData.activation) {
      characterData.activation = {};
    }
    characterData.activation.conditions = conditions;
  }
  
  /**
   * 获取角色激活的完整世界书内容
   */
  getActivatedWorldbookContent(characterData, context = {}) {
    const result = {
      character: [],    // 角色专属条目
      linked: [],       // 关联的全局条目
      system: []        // 系统级条目
    };
    
    // 1. 角色专属条目
    if (characterData.lorebook?.entries) {
      const activeEntries = characterData.lorebook.entries
        .filter(e => e.enabled !== false)
        .sort((a, b) => (b.priority || 100) - (a.priority || 100));
      
      for (const entry of activeEntries) {
        const pos = entry.insertPosition || 'character';
        if (result[pos]) {
          result[pos].push(entry);
        }
      }
    }
    
    // 2. 关联的全局条目
    if (this.worldbookEngine && characterData.lorebook?.linkedGlobalEntries?.length > 0) {
      const allEntries = this.worldbookEngine.getAllEntries?.() || [];
      
      for (const linkedId of characterData.lorebook.linkedGlobalEntries) {
        const globalEntry = allEntries.find(e => e.id === linkedId);
        if (globalEntry && globalEntry.enabled !== false) {
          // 提升优先级
          const boostedEntry = {
            ...globalEntry,
            priority: (globalEntry.priority || 100) + this.config.linkedEntryPriorityBoost,
            isLinked: true,
            linkedBy: characterData.name
          };
          
          const pos = globalEntry.insertPosition || 'character';
          if (result[pos]) {
            result[pos].push(boostedEntry);
          }
        }
      }
    }
    
    // 去重（按ID）
    for (const pos of Object.keys(result)) {
      const seen = new Set();
      result[pos] = result[pos].filter(e => {
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      });
    }
    
    return result;
  }
  
  /**
   * 检测角色是否应该激活
   */
  checkActivation(characterData, context = {}) {
    const result = {
      activated: false,
      reasons: [],
      confidence: 0
    };
    
    // 1. 关键词匹配
    if (context.text && characterData.activation?.keys) {
      const text = context.text.toLowerCase();
      for (const key of characterData.activation.keys) {
        if (text.includes(key.toLowerCase())) {
          result.activated = true;
          result.reasons.push(`关键词匹配: "${key}"`);
          result.confidence += 0.4;
        }
      }
    }
    
    // 2. 地点匹配
    if (this.config.triggerOnLocationMatch && context.location) {
      const charLocation = characterData.core?.worldConnection?.location;
      if (charLocation && context.location.includes(charLocation)) {
        result.activated = true;
        result.reasons.push(`地点匹配: "${charLocation}"`);
        result.confidence += 0.3;
      }
    }
    
    // 3. 势力匹配
    if (this.config.triggerOnFactionMatch && context.faction) {
      const charFaction = characterData.core?.worldConnection?.faction;
      if (charFaction && context.faction.includes(charFaction)) {
        result.activated = true;
        result.reasons.push(`势力匹配: "${charFaction}"`);
        result.confidence += 0.2;
      }
    }
    
    // 4. 手动触发
    if (context.manualTrigger) {
      result.activated = true;
      result.reasons.push('手动触发');
      result.confidence = 1;
    }
    
    // 限制置信度
    result.confidence = Math.min(1, result.confidence);
    
    return result;
  }
  
  /**
   * 处理角色登场
   */
  handleEntrance(characterData, context = {}) {
    const entrance = characterData.activation?.entrance;
    
    if (!entrance?.autoTrigger) {
      return { shouldEntrance: false };
    }
    
    // 检查前置条件
    if (entrance.requiredContext?.length > 0) {
      const missing = entrance.requiredContext.filter(req => !context[req]);
      if (missing.length > 0) {
        return { 
          shouldEntrance: false, 
          reason: `缺少前置条件: ${missing.join(', ')}` 
        };
      }
    }
    
    return {
      shouldEntrance: true,
      message: entrance.triggerMessage || characterData.core?.firstMessage || '',
      emotion: 'calm'
    };
  }
  
  /**
   * 同步角色数据到世界书
   */
  async syncToWorldbook(characterData) {
    try {
      // 1. 更新基础条目
      this.updateBaseEntries(characterData);
      
      // 2. 根据模式决定是否重新关联
      if (this.config.linkMode === 'auto' && this.config.autoLink.linkOnUpdate) {
        await this.autoLinkGlobalEntries(characterData);
      }
      
      this.log(`角色"${characterData.name}"已同步到世界书`);
      return true;
    } catch (error) {
      console.error('[CharacterWorldbookBridge] 同步失败:', error);
      return false;
    }
  }
  
  /**
   * 更新基础条目
   * @private
   */
  updateBaseEntries(characterData) {
    const entries = characterData.lorebook?.entries || [];
    
    // 更新外貌条目
    const appearanceEntry = entries.find(e => e.id === `char_${characterData.id}_appearance`);
    if (appearanceEntry && characterData.core?.description) {
      appearanceEntry.content = characterData.core.description;
    }
    
    // 更新性格条目
    const personalityEntry = entries.find(e => e.id === `char_${characterData.id}_personality`);
    if (personalityEntry && characterData.core?.personality) {
      personalityEntry.content = characterData.core.personality;
    }
  }
  
  /**
   * 批量处理多角色联动
   */
  processMultiCharacterInteraction(characters, context) {
    const activated = [];
    const relationships = [];
    
    // 检测激活的角色
    for (const char of characters) {
      const activation = this.checkActivation(char, context);
      if (activation.activated) {
        activated.push({
          character: char,
          confidence: activation.confidence,
          reasons: activation.reasons
        });
      }
    }
    
    // 分析角色间关系
    for (let i = 0; i < activated.length; i++) {
      for (let j = i + 1; j < activated.length; j++) {
        const char1 = activated[i].character;
        const char2 = activated[j].character;
        
        const relation = this.findRelationship(char1, char2);
        if (relation) {
          relationships.push({
            char1: char1.name,
            char2: char2.name,
            type: relation.relationType,
            description: relation.description
          });
        }
      }
    }
    
    return {
      activatedCharacters: activated,
      characterRelationships: relationships,
      combinedPrompt: this.buildCombinedPrompt(activated, relationships)
    };
  }
  
  /**
   * 查找两个角色间的关系
   * @private
   */
  findRelationship(char1, char2) {
    const rels1 = char1.core?.worldConnection?.relationships || [];
    const rels2 = char2.core?.worldConnection?.relationships || [];
    
    // 检查char1的关系列表中是否有char2
    const rel1 = rels1.find(r => r.targetCharId === char2.id);
    if (rel1) return rel1;
    
    // 检查char2的关系列表中是否有char1
    const rel2 = rels2.find(r => r.targetCharId === char1.id);
    if (rel2) return { ...rel2, relationType: this.invertRelationType(rel2.relationType) };
    
    return null;
  }
  
  /**
   * 反转关系类型
   * @private
   */
  invertRelationType(type) {
    const inversions = {
      '师徒': '师徒',
      '主仆': '主仆',
      '恋人': '恋人',
      '仇敌': '仇敌',
      '朋友': '朋友',
      '兄弟': '兄弟',
      '姐妹': '姐妹'
    };
    return inversions[type] || type;
  }
  
  /**
   * 构建多角色联动提示词
   * @private
   */
  buildCombinedPrompt(activated, relationships) {
    const parts = [];
    
    // 角色列表
    parts.push(`【当前在场角色】\n${activated.map(a => 
      `- ${a.character.name} (${a.reasons.join(', ')})`
    ).join('\n')}`);
    
    // 角色间关系
    if (relationships.length > 0) {
      parts.push(`【角色关系】\n${relationships.map(r => 
        `- ${r.char1} 与 ${r.char2}: ${r.type}${r.description ? '（' + r.description + '）' : ''}`
      ).join('\n')}`);
    }
    
    return parts.join('\n\n');
  }
}

// ==================== 便捷函数 ====================

/**
 * 快速创建联动桥接器
 */
function createCharacterWorldbookBridge(options = {}) {
  return new CharacterWorldbookBridge(options);
}

// ==================== 导出 ====================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CharacterWorldbookBridge,
    createCharacterWorldbookBridge
  };
}

if (typeof window !== 'undefined') {
  window.CharacterWorldbookBridge = CharacterWorldbookBridge;
  window.createCharacterWorldbookBridge = createCharacterWorldbookBridge;
}
