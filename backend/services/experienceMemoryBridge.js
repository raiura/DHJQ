/**
 * 经历-记忆双向联动桥
 * 连接记忆库和经历系统，实现数据双向同步
 */

const MemoryService = require('./memoryService');
const ExperienceService = require('./experienceService');
const TriggerEngine = require('./triggerEngine');
const Logger = require('../utils/logger');

class ExperienceMemoryBridge {
  constructor() {
    // 事件监听器
    this.listeners = new Map();
  }

  /**
   * 初始化桥接器
   * 订阅记忆库事件
   */
  init() {
    // 订阅记忆标记事件
    this.on('memory:flag', this.handleMemoryFlag.bind(this));
    
    Logger.info('[ExperienceMemoryBridge] 桥接器已初始化');
  }

  /**
   * 处理记忆标记事件（记忆→经历正向流程）
   * @param {object} event - 记忆标记事件
   */
  async handleMemoryFlag(event) {
    try {
      const { 
        memoryId, 
        flag, 
        characterId, 
        gameId,
        content,
        type: memoryType,
        turn,
        currentAffinity,
        currentMood,
        recentDialogues
      } = event;

      // 1. 检查该记忆是否已关联经历（避免重复生成）
      const hasLinked = await ExperienceService.hasLinkedExperience(memoryId);
      if (hasLinked) {
        Logger.debug(`[Bridge] 记忆 ${memoryId} 已有关联经历，跳过`);
        return;
      }

      // 2. 组装判定上下文
      const context = {
        characterId,
        gameId,
        flag,
        sourceMemory: { id: memoryId, type: memoryType },
        memoryContent: content,
        currentAffinity: currentAffinity || 0,
        currentMood: currentMood || 'normal',
        recentDialogues: recentDialogues || [],
        turn: turn || 0
      };

      // 3. 触发引擎判定
      const trigger = TriggerEngine.check(context);

      if (!trigger.shouldFire) {
        Logger.debug(`[Bridge] 记忆 ${memoryId} 未触发经历创建`);
        return;
      }

      // 4. 生成经历
      const expResult = await ExperienceService.createExperience({
        characterId,
        gameId,
        type: trigger.rule.type,
        sourceMemoryIds: [memoryId],
        quoteSnapshot: content.substring(0, 200), // 前200字
        affinityAtCreation: currentAffinity,
        triggerData: trigger.triggerData,
        tags: this.generateTags(trigger, content)
      });

      if (!expResult.success) {
        Logger.error('[Bridge] 经历创建失败:', expResult.error);
        return;
      }

      const experience = expResult.data;

      // 5. 反向标记记忆库
      await this.tagMemoryWithExperience(memoryId, experience);

      // 6. 发出事件通知UI
      this.emit('experience:created', {
        characterId,
        experience: {
          id: experience.id,
          title: experience.title,
          type: experience.type,
          isNew: true
        }
      });

      Logger.info(`[Bridge] 记忆→经历 联动完成: ${memoryId} → ${experience.id}`);

    } catch (error) {
      Logger.error('[Bridge] 处理记忆标记失败:', error);
    }
  }

  /**
   * 处理经历被提及事件（经历→记忆反向流程）
   * @param {string} experienceId - 经历ID
   * @param {string} dialogueId - 对话轮ID
   */
  async handleExperienceMentioned(experienceId, dialogueId) {
    try {
      // 1. 更新经历状态
      const result = await ExperienceService.markRevealed(experienceId, dialogueId);
      if (!result.success) {
        Logger.error('[Bridge] 标记经历揭示失败:', result.error);
        return;
      }

      const experience = result.data;

      // 2. 强化关联记忆的权重
      for (const memoryId of experience.derivedFrom) {
        await this.reinforceMemory(memoryId, {
          reason: 'experience_mentioned',
          boost: 0.3,
          experienceId: experience.id
        });
      }

      // 3. 通知UI
      this.emit('experience:revealed', {
        characterId: experience.characterId,
        experienceId: experience.id,
        dialogueId
      });

      Logger.info(`[Bridge] 经历→记忆 联动完成: ${experienceId} 已揭示`);

    } catch (error) {
      Logger.error('[Bridge] 处理经历提及失败:', error);
    }
  }

  /**
   * 检测对话中的经历提及
   * @param {string} dialogueText - 对话文本
   * @param {string} characterId - 角色ID
   * @param {string} dialogueId - 对话轮ID
   */
  async detectAndProcessMentions(dialogueText, characterId, dialogueId) {
    try {
      const mentioned = await ExperienceService.detectMentionedExperiences(
        dialogueText, 
        characterId
      );

      for (const exp of mentioned) {
        await this.handleExperienceMentioned(exp.id, dialogueId);
      }

      if (mentioned.length > 0) {
        Logger.info(`[Bridge] 检测到 ${mentioned.length} 条经历被提及`);
      }

      return mentioned;
    } catch (error) {
      Logger.error('[Bridge] 检测经历提及失败:', error);
      return [];
    }
  }

  /**
   * 反向标记记忆库
   * @param {string} memoryId - 记忆ID
   * @param {object} experience - 经历对象
   */
  async tagMemoryWithExperience(memoryId, experience) {
    try {
      // 这里假设 MemoryService 有 tag 方法
      // 实际实现可能需要修改 MemoryService
      if (MemoryService.tagMemory) {
        await MemoryService.tagMemory(memoryId, {
          experienceRef: experience.id,
          narrativeWeight: experience.emotionalImpact,
          experienceType: experience.type
        });
      }

      Logger.debug(`[Bridge] 记忆 ${memoryId} 已标记关联经历 ${experience.id}`);
    } catch (error) {
      Logger.error('[Bridge] 标记记忆失败:', error);
    }
  }

  /**
   * 强化记忆权重
   * @param {string} memoryId - 记忆ID
   * @param {object} options - 强化选项
   */
  async reinforceMemory(memoryId, options) {
    try {
      if (MemoryService.reinforceMemory) {
        await MemoryService.reinforceMemory(memoryId, options);
      }
    } catch (error) {
      Logger.error('[Bridge] 强化记忆失败:', error);
    }
  }

  /**
   * 生成经历标签
   * @param {object} trigger - 触发结果
   * @param {string} content - 记忆内容
   */
  generateTags(trigger, content) {
    const tags = [];
    
    // 根据触发类型添加标签
    if (trigger.triggerData.pattern) {
      tags.push(trigger.triggerData.pattern);
    }
    
    if (trigger.triggerData.threshold) {
      tags.push(`threshold_${trigger.triggerData.threshold}`);
    }
    
    // 关键词提取（简化版）
    const keywords = ['雨天', '夜晚', '童年', '信任', '告白', '冲突', '秘密'];
    for (const kw of keywords) {
      if (content.includes(kw)) {
        tags.push(kw);
      }
    }
    
    return [...new Set(tags)]; // 去重
  }

  /**
   * 事件订阅
   * @param {string} event - 事件名
   * @param {function} callback - 回调函数
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * 触发事件
   * @param {string} event - 事件名
   * @param {object} data - 事件数据
   */
  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb(data);
        } catch (error) {
          Logger.error(`[Bridge] 事件处理失败: ${event}`, error);
        }
      });
    }
  }

  /**
   * 获取角色完整档案（记忆+经历）
   * @param {string} characterId - 角色ID
   * @param {string} gameId - 游戏ID
   */
  async getFullCharacterArchive(characterId, gameId) {
    try {
      // 获取记忆
      const memories = await MemoryService.getMemories(gameId, {
        types: ['core', 'long'],
        limit: 20
      });

      // 获取经历
      const archive = await ExperienceService.getCharacterArchive(characterId, {
        includeLocked: false,
        limit: 20
      });

      return {
        characterId,
        gameId,
        memories: memories.map(m => ({
          id: m._id,
          type: m.type,
          content: m.content,
          timestamp: m.timestamp,
          experienceRef: m.experienceRef
        })),
        experiences: archive.data.experiences,
        stats: {
          ...archive.data.stats,
          memoryCount: memories.length
        }
      };
    } catch (error) {
      Logger.error('[Bridge] 获取完整档案失败:', error);
      return null;
    }
  }
}

// 单例
const bridge = new ExperienceMemoryBridge();
module.exports = bridge;
