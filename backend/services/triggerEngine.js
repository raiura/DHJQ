/**
 * 经历判定引擎
 * 监听记忆库事件，判定是否触发新的经历
 */

const Logger = require('../utils/logger');

class TriggerEngine {
  constructor() {
    // 触发规则注册表
    this.rules = [];
    
    // 冷却记录 { ruleId: lastTriggerTime }
    this.cooldowns = new Map();
    
    // 初始化默认规则
    this.initDefaultRules();
  }

  /**
   * 注册触发规则
   * @param {string} characterId - 角色ID
   * @param {object} rule - 规则配置
   */
  registerRule(characterId, rule) {
    this.rules.push({
      id: `${characterId}_${rule.type}_${Date.now()}`,
      characterId,
      ...rule
    });
    Logger.debug(`[TriggerEngine] 注册规则: ${rule.type} for ${characterId}`);
  }

  /**
   * 检查上下文是否满足触发条件
   * @param {object} context - 判定上下文
   * @returns {object} 触发结果
   */
  check(context) {
    const { characterId, flag, memoryContent, currentAffinity, currentMood, recentDialogues } = context;
    
    for (const rule of this.rules) {
      // 只检查匹配角色的规则
      if (rule.characterId && rule.characterId !== characterId) continue;
      
      // 检查冷却
      if (this.isInCooldown(rule.id, rule.cooldown)) continue;
      
      // 根据规则类型判定
      const result = this.evaluateRule(rule, context);
      
      if (result.shouldFire) {
        // 记录冷却
        this.cooldowns.set(rule.id, Date.now());
        
        return {
          shouldFire: true,
          rule: rule,
          triggerData: result.data
        };
      }
    }
    
    return { shouldFire: false };
  }

  /**
   * 评估单个规则
   */
  evaluateRule(rule, context) {
    switch (rule.type) {
      case 'THRESHOLD_CROSS':
        return this.evaluateThreshold(rule, context);
      case 'DIALOGUE_PATTERN':
        return this.evaluatePattern(rule, context);
      case 'COMPOUND_CONDITION':
        return this.evaluateCompound(rule, context);
      case 'MEMORY_FLAG':
        return this.evaluateMemoryFlag(rule, context);
      default:
        return { shouldFire: false };
    }
  }

  /**
   * 数值突破阈值判定
   */
  evaluateThreshold(rule, context) {
    const { currentAffinity, prevAffinity = 0 } = context;
    const { stat, thresholds, direction = 'up' } = rule;
    
    // 只处理好感度
    if (stat !== 'affinity') return { shouldFire: false };
    
    // 检查是否突破任一阈值
    for (const threshold of thresholds) {
      const crossedUp = prevAffinity < threshold && currentAffinity >= threshold;
      const crossedDown = prevAffinity > threshold && currentAffinity <= threshold;
      
      if ((direction === 'up' && crossedUp) || 
          (direction === 'down' && crossedDown) ||
          (direction === 'both' && (crossedUp || crossedDown))) {
        return {
          shouldFire: true,
          data: {
            threshold,
            direction: crossedUp ? 'up' : 'down',
            affinity: currentAffinity
          }
        };
      }
    }
    
    return { shouldFire: false };
  }

  /**
   * 对话模式匹配判定
   */
  evaluatePattern(rule, context) {
    const { memoryContent, recentDialogues = [] } = context;
    const { pattern, confidence = 0.8, contextWindow = 3 } = rule;
    
    // 检查最近的对话
    const recentTexts = recentDialogues.slice(-contextWindow).map(d => d.content || d).join(' ');
    const checkText = memoryContent + ' ' + recentTexts;
    
    // 简单关键词匹配（可扩展为语义匹配）
    const patterns = {
      'confession': /(喜欢|爱|告白|表白|在一起)/i,
      'comfort': /(安慰|没事的|别难过|抱抱)/i,
      'conflict': /(生气|讨厌|恨|绝交|分手)/i,
      'vulnerable': /(孤独|害怕|童年|创伤|秘密)/i,
      'trust': /(信任|相信|托付|秘密)/i
    };
    
    const regex = patterns[pattern] || new RegExp(pattern, 'i');
    const match = regex.test(checkText);
    
    if (match) {
      return {
        shouldFire: true,
        data: { pattern, matchedText: checkText.substring(0, 100) }
      };
    }
    
    return { shouldFire: false };
  }

  /**
   * 复合条件判定
   */
  evaluateCompound(rule, context) {
    const { currentMood, time, location, playerAction, recentExperiences = [] } = context;
    const { conditions, matchCount = 2 } = rule;
    
    let matched = 0;
    const matchedConditions = [];
    
    // 检查时间
    if (conditions.time) {
      const currentHour = new Date().getHours();
      const timeMap = {
        'morning': currentHour >= 6 && currentHour < 12,
        'noon': currentHour >= 12 && currentHour < 14,
        'afternoon': currentHour >= 14 && currentHour < 18,
        'night': currentHour >= 18 && currentHour < 24,
        'midnight': currentHour >= 0 && currentHour < 6
      };
      if (timeMap[conditions.time]) {
        matched++;
        matchedConditions.push('time');
      }
    }
    
    // 检查地点
    if (conditions.location && location && location.includes(conditions.location)) {
      matched++;
      matchedConditions.push('location');
    }
    
    // 检查玩家行为
    if (conditions.playerAction && playerAction) {
      const actionRegex = new RegExp(conditions.playerAction, 'i');
      if (actionRegex.test(playerAction)) {
        matched++;
        matchedConditions.push('playerAction');
      }
    }
    
    // 检查角色心情
    if (conditions.characterMood && currentMood) {
      if (currentMood === conditions.characterMood || 
          currentMood.includes(conditions.characterMood)) {
        matched++;
        matchedConditions.push('characterMood');
      }
    }
    
    // 检查是否已有某经历
    if (conditions.recentExperiences && conditions.recentExperiences.length > 0) {
      const hasRequiredExp = conditions.recentExperiences.some(expId => 
        recentExperiences.includes(expId)
      );
      if (hasRequiredExp) {
        matched++;
        matchedConditions.push('recentExperiences');
      }
    }
    
    if (matched >= matchCount) {
      return {
        shouldFire: true,
        data: { matchedConditions, totalMatched: matched }
      };
    }
    
    return { shouldFire: false };
  }

  /**
   * 记忆标记判定
   */
  evaluateMemoryFlag(rule, context) {
    const { flag, sourceMemory } = context;
    const { flag: requiredFlag, source } = rule;
    
    // 检查标记是否匹配
    if (flag !== requiredFlag) return { shouldFire: false };
    
    // 检查记忆来源层级（如果指定）
    if (source && sourceMemory) {
      if (source === 'core' && sourceMemory.type !== 'core') return { shouldFire: false };
      if (source === 'long' && !['long', 'core'].includes(sourceMemory.type)) return { shouldFire: false };
    }
    
    return {
      shouldFire: true,
      data: { flag, source: sourceMemory?.type || 'unknown' }
    };
  }

  /**
   * 检查是否在冷却期
   */
  isInCooldown(ruleId, cooldownRounds = 0) {
    if (cooldownRounds <= 0) return false;
    
    const lastTrigger = this.cooldowns.get(ruleId);
    if (!lastTrigger) return false;
    
    // 简单实现：按轮数冷却（实际应用中可能需要更精确的计数）
    const elapsed = Date.now() - lastTrigger;
    const minInterval = cooldownRounds * 60 * 1000; // 假设每轮平均1分钟
    
    return elapsed < minInterval;
  }

  /**
   * 初始化默认触发规则
   */
  initDefaultRules() {
    // 好感度突破阈值规则
    const defaultThresholds = [30, 60, 90];
    
    // 这些规则会在角色创建时动态注册
    Logger.info('[TriggerEngine] 触发引擎已初始化，等待规则注册');
  }

  /**
   * 为角色创建默认规则
   */
  createDefaultRulesForCharacter(characterId) {
    // 好感度突破规则
    this.registerRule(characterId, {
      type: 'THRESHOLD_CROSS',
      stat: 'affinity',
      thresholds: [30, 60, 90],
      direction: 'up',
      cooldown: 5  // 5轮冷却
    });
    
    // 倾诉时刻规则
    this.registerRule(characterId, {
      type: 'DIALOGUE_PATTERN',
      pattern: 'vulnerable',
      confidence: 0.8,
      contextWindow: 3,
      cooldown: 10
    });
    
    // 深夜倾诉复合规则
    this.registerRule(characterId, {
      type: 'COMPOUND_CONDITION',
      conditions: {
        time: 'night',
        playerAction: 'share_vulnerable'
      },
      matchCount: 2,
      cooldown: 15
    });
    
    Logger.info(`[TriggerEngine] 为角色 ${characterId} 创建默认规则`);
  }
}

// 单例
const triggerEngine = new TriggerEngine();
module.exports = triggerEngine;
