/**
 * 经历服务
 * 管理角色经历档案的创建、查询和更新
 * 与记忆库双向联动
 */

const Experience = require('../models/experience');
const TriggerEngine = require('./triggerEngine');
const Logger = require('../utils/logger');

class ExperienceService {
  constructor() {
    this.ExperienceType = Experience.ExperienceType || {
      MILESTONE: 'milestone',
      INTIMATE: 'intimate',
      CONFLICT: 'conflict',
      SECRET: 'secret',
      DAILY: 'daily'
    };
  }

  /**
   * 初始化角色经历档案
   * @param {string} characterId - 角色ID
   * @param {string} gameId - 游戏ID
   */
  async initCharacterArchive(characterId, gameId) {
    try {
      // 注册默认触发规则
      TriggerEngine.createDefaultRulesForCharacter(characterId);
      
      Logger.info(`[Experience] 初始化角色经历档案: ${characterId}`);
      return { success: true };
    } catch (error) {
      Logger.error('[Experience] 初始化角色档案失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 创建新经历（由触发引擎调用）
   * @param {object} config - 经历配置
   */
  async createExperience(config) {
    try {
      const {
        characterId,
        gameId,
        title,
        summary,
        type = 'daily',
        sourceMemoryIds = [],
        quoteSnapshot = '',
        gameDate = this.formatGameDate(),
        affinityAtCreation = 0,
        tags = [],
        isImportant = false,
        isSecret = false,
        triggerData = {}
      } = config;

      // 确定经历类型
      const expType = this.determineExperienceType(type, triggerData);

      // 生成情感冲击值
      const emotionalImpact = this.calculateEmotionalImpact(expType, triggerData);

      const experience = await Experience.create({
        characterId,
        gameId,
        title: title || this.generateTitle(expType, triggerData),
        summary: summary || await this.generateSummary(expType, triggerData, quoteSnapshot),
        type: expType,
        createdAt: new Date(),
        gameDate,
        derivedFrom: sourceMemoryIds,
        quoteSnapshot,
        isUnlocked: true,
        unlockedAt: new Date(),
        isRevealed: false,
        emotionalImpact,
        affinityAtCreation,
        tags,
        isImportant,
        isSecret,
        isNew: true
      });

      Logger.info(`[Experience] 创建经历: ${experience.id} - ${experience.title}`);
      
      return { success: true, data: experience };
    } catch (error) {
      Logger.error('[Experience] 创建经历失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取角色经历档案（供状态栏UI使用）
   * @param {string} characterId - 角色ID
   * @param {object} options - 查询选项
   */
  async getCharacterArchive(characterId, options = {}) {
    try {
      const { includeLocked = false, limit = 50 } = options;
      
      let query = { characterId };
      if (!includeLocked) {
        query.isUnlocked = true;
      }
      
      const experiences = await Experience.find(query);
      const limited = experiences.slice(0, limit);
      
      // 计算统计
      const stats = {
        total: experiences.length,
        unlocked: experiences.filter(e => e.isUnlocked).length,
        revealed: experiences.filter(e => e.isRevealed).length,
        newThisSession: experiences.filter(e => e.isNew).length
      };

      return {
        success: true,
        data: {
          characterId,
          experiences: limited,
          stats
        }
      };
    } catch (error) {
      Logger.error('[Experience] 获取角色档案失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取用于Prompt的经历（分层组装）
   * @param {string} characterId - 角色ID
   */
  async getExperiencesForPrompt(characterId) {
    try {
      const allExps = await Experience.find({ characterId, isUnlocked: true });
      
      // 分层筛选
      const importantExps = allExps
        .filter(e => e.isImportant && e.isRevealed)
        .slice(0, 3);
      
      const recentExps = allExps
        .filter(e => !e.isImportant && e.isRevealed)
        .slice(0, 3);
      
      const pendingExps = allExps
        .filter(e => e.isUnlocked && !e.isRevealed)
        .slice(0, 2);

      return {
        important: importantExps,
        recent: recentExps,
        pending: pendingExps
      };
    } catch (error) {
      Logger.error('[Experience] 获取Prompt经历失败:', error);
      return { important: [], recent: [], pending: [] };
    }
  }

  /**
   * 标记经历为已揭示
   * @param {string} experienceId - 经历ID
   * @param {string} dialogueId - 对话轮ID
   */
  async markRevealed(experienceId, dialogueId) {
    try {
      const exp = await Experience.findById(experienceId);
      if (!exp) {
        return { success: false, error: '经历不存在' };
      }

      exp.isRevealed = true;
      exp.revealedAt = new Date();
      exp.revealedInDialogue = dialogueId;
      await exp.save();

      Logger.info(`[Experience] 经历已揭示: ${exp.id} in ${dialogueId}`);
      
      return { success: true, data: exp };
    } catch (error) {
      Logger.error('[Experience] 标记揭示失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 检查对话是否提及某条经历
   * @param {string} dialogueText - 对话文本
   * @param {string} characterId - 角色ID
   */
  async detectMentionedExperiences(dialogueText, characterId) {
    try {
      const experiences = await Experience.find({ 
        characterId, 
        isUnlocked: true,
        isRevealed: false  // 只检查未揭示的
      });

      const mentioned = [];
      
      for (const exp of experiences) {
        // 检查标题或标签是否在对话中
        const titleMatch = dialogueText.includes(exp.title);
        const tagMatch = exp.tags.some(tag => dialogueText.includes(tag));
        const summaryKeywords = exp.summary.substring(0, 20); // 前20字作为关键词
        const summaryMatch = dialogueText.includes(summaryKeywords);
        
        if (titleMatch || tagMatch || summaryMatch) {
          mentioned.push(exp);
        }
      }

      return mentioned;
    } catch (error) {
      Logger.error('[Experience] 检测提及失败:', error);
      return [];
    }
  }

  /**
   * 清除新标记（会话结束时调用）
   * @param {string} characterId - 角色ID
   */
  async clearNewMarks(characterId) {
    try {
      const exps = await Experience.find({ characterId, isNew: true });
      for (const exp of exps) {
        exp.isNew = false;
        await exp.save();
      }
      Logger.debug(`[Experience] 清除 ${exps.length} 条新标记`);
      return { success: true };
    } catch (error) {
      Logger.error('[Experience] 清除新标记失败:', error);
      return { success: false };
    }
  }

  // ============ 辅助方法 ============

  determineExperienceType(type, triggerData) {
    if (type && type !== 'daily') return type;
    
    // 根据触发数据推断类型
    if (triggerData.pattern === 'confession') return 'intimate';
    if (triggerData.pattern === 'conflict') return 'conflict';
    if (triggerData.threshold >= 90) return 'milestone';
    if (triggerData.flag === 'high_emotional_impact') return 'intimate';
    
    return 'daily';
  }

  calculateEmotionalImpact(type, triggerData) {
    const baseValues = {
      'milestone': 9,
      'intimate': 8,
      'conflict': 7,
      'secret': 8,
      'daily': 5
    };
    
    let impact = baseValues[type] || 5;
    
    // 根据触发数据调整
    if (triggerData.threshold === 90) impact = 10;
    if (triggerData.threshold === 60) impact = Math.max(impact, 7);
    if (triggerData.pattern === 'vulnerable') impact += 1;
    
    return Math.min(10, Math.max(1, impact));
  }

  generateTitle(type, triggerData) {
    const templates = {
      'milestone': ['命运的转折', '重要的约定', '心意的确认'],
      'intimate': ['深夜的倾听', '秘密的分享', '心灵的触碰'],
      'conflict': ['第一次争吵', '误解的瞬间', '冷淡的距离'],
      'secret': ['隐藏的真相', '不为人知的过去', '禁忌的话题'],
      'daily': ['平凡的日常', '偶然的相遇', '普通的对话']
    };
    
    const list = templates[type] || templates['daily'];
    return list[Math.floor(Math.random() * list.length)];
  }

  async generateSummary(type, triggerData, quoteSnapshot) {
    // 简化实现，实际可调用LLM生成
    const snippets = {
      'milestone': '这是一个重要的时刻，关系发生了质的变化。',
      'intimate': '在深夜的对话中，彼此分享了内心的柔软。',
      'conflict': '因为某些原因产生了分歧，气氛变得紧张。',
      'secret': '得知了不为人知的秘密，对TA有了新的认识。',
      'daily': '像平常一样相处，积累了更多回忆。'
    };
    
    let summary = snippets[type] || snippets['daily'];
    
    // 如果有原话片段，加入引用
    if (quoteSnapshot && quoteSnapshot.length > 10) {
      const shortQuote = quoteSnapshot.substring(0, 30);
      summary += `（"${shortQuote}..."）`;
    }
    
    return summary;
  }

  formatGameDate() {
    const now = new Date();
    const hours = now.getHours();
    let timeDesc = '';
    
    if (hours >= 6 && hours < 12) timeDesc = '早晨';
    else if (hours >= 12 && hours < 14) timeDesc = '正午';
    else if (hours >= 14 && hours < 18) timeDesc = '午后';
    else if (hours >= 18 && hours < 22) timeDesc = '夜晚';
    else timeDesc = '深夜';
    
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${timeDesc}`;
  }
}

// 单例
const experienceService = new ExperienceService();
module.exports = experienceService;
