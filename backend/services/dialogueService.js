const axios = require('axios');
const config = require('../config');
const Logger = require('../utils/logger');
const MemoryService = require('./memoryService');
const ExperienceService = require('./experienceService');
const ExperienceMemoryBridge = require('./experienceMemoryBridge');

// 使用统一的模型加载
const { Character, Dialogue, Setting, WorldbookEntry, UserCharacter, useMemoryStore } = require('../models');
if (useMemoryStore) {
  Logger.warn('对话服务使用内存存储模式');
}

// 初始化经历-记忆桥接器
ExperienceMemoryBridge.init();

class DialogueService {
  /**
   * 获取AI设置（带缓存和默认值）
   */
  static async getAISettings() {
    try {
      const setting = await Setting.findOne({});
      if (setting) {
        return {
          apiKey: setting.apiKey || config.ai.apiKey,
          apiUrl: setting.apiUrl || config.ai.apiUrl,
          model: setting.model || config.ai.model
        };
      }
    } catch (error) {
      Logger.warn('从数据库获取AI设置失败，使用环境变量配置:', error.message);
    }
    
    // 返回环境变量配置
    return {
      apiKey: config.ai.apiKey,
      apiUrl: config.ai.apiUrl,
      model: config.ai.model
    };
  }

  /**
   * 获取角色信息（带默认值）
   */
  static async getCharacter(characterId) {
    try {
      const character = await Character.findById(characterId);
      if (character) {
        return character;
      }
    } catch (error) {
      Logger.warn('从数据库获取角色失败，使用默认角色:', error.message);
    }
    
    // 返回默认角色（林婉）
    return config.defaults.characters[0];
  }

  /**
   * 获取用户角色设定（玩家自己的角色）
   * 用于在对话中作为玩家身份代入
   */
  static async getUserCharacter(userId) {
    try {
      if (!userId) return null;
      
      // 查找用户当前激活的角色
      let userChar = await UserCharacter.findOne({ 
        userId: userId,
        isActive: true 
      });
      
      // 如果没有激活的角色，返回最近创建的角色
      if (!userChar) {
        const chars = await UserCharacter.find({ userId: userId })
          .sort({ createdAt: -1 }).limit(1);
        userChar = chars[0] || null;
      }
      
      if (userChar) {
        Logger.info(`使用用户角色: ${userChar.name}`);
        return userChar;
      }
    } catch (error) {
      Logger.warn('获取用户角色失败:', error.message);
    }
    
    return null;
  }

  /**
   * 获取匹配的世界书条目（知识库系统）
   * 当用户输入包含特定关键词时，自动插入对应内容
   */
  static async getMatchingWorldbookEntries(userMessage, depth = 0) {
    try {
      // 获取所有启用的条目
      const allEntries = await WorldbookEntry.find({ 
        enabled: true,
        depth: { $lte: depth }  // 深度限制
      }).sort({ priority: -1 });
      
      // 筛选匹配的条目
      const matchedEntries = allEntries.filter(entry => entry.matches(userMessage));
      
      if (matchedEntries.length > 0) {
        Logger.info(`世界书触发: ${matchedEntries.length} 个条目`, 
          matchedEntries.map(e => e.name));
        
        // 更新触发统计
        for (const entry of matchedEntries) {
          entry.usageCount = (entry.usageCount || 0) + 1;
          entry.lastTriggered = new Date();
          await entry.save();
        }
      }
      
      return matchedEntries;
    } catch (error) {
      Logger.error('获取世界书条目失败:', error);
      return [];
    }
  }

  /**
   * 格式化世界书内容为 prompt 文本
   */
  static formatWorldbookContent(entries) {
    if (!entries || entries.length === 0) {
      return '';
    }
    
    const parts = ['【相关知识】'];
    
    for (const entry of entries) {
      parts.push(`[${entry.name}]: ${entry.content}`);
    }
    
    return parts.join('\n');
  }

  /**
   * 构建AI提示词（新版 - 集成记忆系统、时间线存档和角色经历）
   * 拼接格式：存档时间线 > 基础设定 > 角色经历 > 核心记忆 > 长期记忆 > 短期记忆 > 用户输入
   */
  static async buildPrompt(message, character, worldbookContent, userCharacter = null, gameId = null, characterId = null) {
    const parts = [];
    
    // 1. 系统定位
    parts.push('你是一个修仙世界的故事讲述者，需要根据用户提供的信息生成故事内容。');
    parts.push('');
    
    // 2. 世界书·存档·当前时间线（最高优先级）
    let timelineContent = '';
    let memoryContent = { core: '', long: '', short: '' };
    let experienceContent = { important: [], recent: [], pending: [] };
    
    if (gameId) {
      try {
        // 获取存档时间线
        const timelineArchive = await WorldbookEntry.getTimelineArchive(gameId);
        if (timelineArchive) {
          timelineContent = timelineArchive.getFormattedContent();
        }
        
        // 获取格式化的记忆
        memoryContent = await MemoryService.getFormattedMemories(gameId, timelineArchive);
      } catch (error) {
        Logger.warn('获取记忆或存档失败:', error.message);
      }
    }
    
    // 3. 获取角色经历（如果有characterId）
    if (characterId) {
      try {
        experienceContent = await ExperienceService.getExperiencesForPrompt(characterId);
      } catch (error) {
        Logger.warn('获取角色经历失败:', error.message);
      }
    }
    
    if (timelineContent) {
      parts.push(timelineContent);
      parts.push('');
    }
    
    // 4. 世界书·基础设定（原worldbookContent）
    if (worldbookContent) {
      parts.push('【世界书·基础设定】');
      parts.push(worldbookContent);
      parts.push('');
    }
    
    // 5. 角色经历（新增）
    if (experienceContent.important.length > 0 || experienceContent.recent.length > 0) {
      parts.push('【与玩家的重要时刻】');
      
      // 重要经历（已揭示）
      for (const exp of experienceContent.important) {
        parts.push(`• [${exp.gameDate}] ${exp.title}：${exp.summary}`);
      }
      
      // 近期经历（已揭示）
      for (const exp of experienceContent.recent) {
        parts.push(`• ${exp.title}（${exp.summary.substring(0, 20)}...）`);
      }
      
      parts.push('');
    }
    
    // 6. 待回应的心事（未揭示但已解锁的经历）
    if (experienceContent.pending.length > 0) {
      parts.push('【待回应的心事】');
      for (const exp of experienceContent.pending) {
        parts.push(`• ${exp.title}：角色内心在意但尚未提及`);
      }
      parts.push('（注意：如果合适，可自然地带入对话，如"说起来，那天..."）');
      parts.push('');
    }
    
    // 7. 核心记忆
    if (memoryContent.core) {
      parts.push('【核心记忆】');
      parts.push(memoryContent.core);
      parts.push('');
    }
    
    // 8. 长期记忆
    if (memoryContent.long) {
      parts.push('【长期记忆】');
      parts.push(memoryContent.long);
      parts.push('');
    }
    
    // 9. 短期记忆
    if (memoryContent.short) {
      parts.push('【短期记忆】');
      parts.push(memoryContent.short);
      parts.push('');
    }
    
    // 10. 用户角色设定（玩家自己的角色）
    if (userCharacter) {
      const userPrompt = userCharacter.generatePrompt ? 
        userCharacter.generatePrompt() : 
        userCharacter.prompt || `[${userCharacter.name}]: ${userCharacter.background || '一位修仙者'}`;
      parts.push('【玩家角色】');
      parts.push(userPrompt);
      parts.push('');
    }
    
    // 11. NPC角色设定
    parts.push('【当前角色】');
    parts.push(character.prompt || character.description || '');
    parts.push('');
    
    // 12. 用户输入
    parts.push('【用户输入】');
    parts.push(message);
    parts.push('');
    
    // 13. 角色当前状态
    parts.push('【角色当前状态】');
    parts.push(`好感度: ${character.favor !== undefined ? character.favor : 50}/100`);
    parts.push(`信任度: ${character.trust !== undefined ? character.trust : 50}/100`);
    parts.push(`心情: ${character.stats?.mood || character.mood || '平静'}`);
    parts.push('');
    
    // 14. 输出要求
    parts.push('【输出要求】');
    parts.push('请生成一段故事内容，包括环境描写、旁白和角色对话。对话内容请明确标注角色名称，例如：');
    parts.push('林婉：你好，欢迎来到这个世界。');
    parts.push('陆苍雪：这里的风景真美。');
    parts.push('轩辕霓裳：哈哈，我们一起去冒险吧！');
    parts.push('');
    
    // 15. 好感度控制指令（AI可以通过这些指令来改变角色状态）
    parts.push('【好感度控制指令】（可选）');
    parts.push('根据对话情节，你可以在文末添加以下指令来改变角色状态：');
    parts.push('- [FAVOR:+5] 增加好感度5点（例如：玩家说了让角色开心的话）');
    parts.push('- [FAVOR:-3] 减少好感度3点（例如：玩家说了不当的话）');
    parts.push('- [TRUST:+5] 增加信任度5点（例如：玩家分享了秘密）');
    parts.push('- [MOOD:开心] 改变心情为"开心"（支持：平静、开心、低落、生气、紧张、好奇）');

    return parts.join('\n');
  }

  /**
   * 调用AI API
   */
  static async callAIAPI(prompt, settings) {
    // 验证API URL
    if (!settings.apiUrl || !settings.apiUrl.startsWith('http')) {
      throw new Error('无效的API URL配置');
    }

    // 验证API Key
    if (!settings.apiKey) {
      throw new Error('未配置API密钥');
    }

    Logger.debug('调用AI API:', {
      url: settings.apiUrl,
      model: settings.model,
      keyPrefix: settings.apiKey.substring(0, 5) + '...',
      promptLength: prompt.length
    });

    const response = await axios.post(
      settings.apiUrl,
      {
        model: settings.model,
        messages: [
          {
            role: 'system',
            content: '你是一个修仙世界的故事讲述者，需要根据用户提供的信息生成故事内容。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: config.ai.maxTokens,
        temperature: config.ai.temperature
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`
        },
        timeout: 60000 // 60秒超时
      }
    );

    // 验证响应
    if (!response.data?.choices?.[0]?.message?.content) {
      throw new Error('AI API 返回数据格式错误');
    }

    return response.data.choices[0].message.content;
  }

  /**
   * 解析AI响应
   */
  static parseResponse(response) {
    if (!response || !response.trim()) {
      return this.getDefaultResponse();
    }

    const parts = [];
    const characterNames = config.defaults.characters.map(c => c.name);
    const paragraphs = response.split(/\n{2,}/).filter(p => p.trim());

    for (const paragraph of paragraphs) {
      const lines = paragraph.split(/\n+/).filter(line => line.trim());
      if (lines.length === 0) continue;

      const firstLine = lines[0].trim();
      let matched = false;

      // 尝试匹配 **角色名** 格式
      for (const name of characterNames) {
        const tag = `**${name}**`;
        if (firstLine.includes(tag)) {
          let content = lines.join(' ');
          content = content.replace(tag, '').trim();
          content = content.replace(/\*\*$/, '').trim();
          
          parts.push({
            type: name,
            content: content
          });
          matched = true;
          break;
        }
      }

      if (!matched) {
        // 尝试匹配 角色名： 格式
        for (const name of characterNames) {
          const regex = new RegExp(`^\\s*${name}[：:]`);
          if (regex.test(firstLine)) {
            const content = firstLine.replace(regex, '').trim();
            parts.push({
              type: name,
              content: content
            });
            matched = true;
            break;
          }
        }
      }

      if (!matched) {
        // 作为默认描述
        let content = paragraph.trim();
        content = content.replace(/^\s*\*\*[\u4e00-\u9fa5]*\*\*\s*/, '').trim();
        
        if (content) {
          parts.push({
            type: '默认描述者',
            content: content
          });
        }
      }
    }

    return parts.length > 0 ? parts : this.getDefaultResponse();
  }

  /**
   * 获取默认响应（用于错误降级）
   */
  static getDefaultResponse() {
    return config.defaults.characters.map(char => ({
      type: char.name,
      content: `${char.name}静静地看着你，等待你的下文...`
    }));
  }

  /**
   * 生成AI响应（主方法）- 集成记忆系统
   * 现在包含世界书知识库、用户角色设定、三层记忆系统
   */
  static async generateResponse(message, characterId, userId = null, gameId = null) {
    Logger.info('开始生成AI响应:', { message: message.substring(0, 50), characterId, userId, gameId });

    try {
      // 并行获取所需数据
      const [settings, character, userCharacter] = await Promise.all([
        this.getAISettings(),
        this.getCharacter(characterId),
        userId ? this.getUserCharacter(userId) : null
      ]);

      // 获取匹配的世界书条目（知识库系统）
      const matchingEntries = await this.getMatchingWorldbookEntries(message);
      const worldbookContent = this.formatWorldbookContent(matchingEntries);

      // 构建提示词（包含记忆系统和角色经历）
      const prompt = await this.buildPrompt(message, character, worldbookContent, userCharacter, gameId, characterId);
      Logger.debug('构建的提示词长度:', prompt.length);
      
      if (userCharacter) {
        Logger.info('已加载用户角色:', userCharacter.name);
      }

      // 调用AI API
      const aiResponse = await this.callAIAPI(prompt, settings);
      Logger.debug('AI API响应长度:', aiResponse.length);

      // 解析响应
      const parsedResponse = this.parseResponse(aiResponse);
      Logger.info('成功解析响应，段落数:', parsedResponse.length);

      // 检测AI响应中是否提及经历
      const dialogueId = `dlg_${Date.now()}`;
      const aiText = parsedResponse.map(p => p.content).join(' ');
      
      if (characterId) {
        ExperienceMemoryBridge.detectAndProcessMentions(aiText, characterId, dialogueId)
          .catch(err => Logger.error('检测经历提及失败:', err));
      }

      // 异步保存对话和记忆（不阻塞返回）
      Promise.all([
        this.saveDialogue(message, parsedResponse, characterId),
        gameId ? this.saveMemory(gameId, message, parsedResponse, userId, characterId, aiText) : Promise.resolve(),
        // 更新角色好感度/信任度
        characterId ? this.updateCharacterStats(characterId, aiText) : Promise.resolve()
      ]).catch(err => {
        Logger.error('保存对话或记忆失败:', err);
      });

      return parsedResponse;

    } catch (error) {
      Logger.error('生成AI响应失败:', error);
      
      // 返回默认响应作为降级
      return [{
        type: '林婉',
        content: `抱歉，我遇到了一些问题（${error.message}）。请稍后再试，或者检查AI设置是否正确。`
      }];
    }
  }

  /**
   * 保存记忆（短期记忆）
   */
  static async saveMemory(gameId, userMessage, aiResponse, userId = null, characterId = null, aiText = '') {
    try {
      if (!gameId) return;
      
      // 将AI响应转换为记忆内容
      const memoryContent = aiResponse.map(part => {
        if (part.type === '默认描述者') {
          return part.content;
        }
        return `${part.type}：${part.content}`;
      }).join('\n');
      
      // 获取当前轮次
      const memories = await MemoryService.getMemories(gameId);
      const maxTurn = memories.reduce((max, m) => Math.max(max, m.turn || 0), 0);
      
      // 判断是否高情感冲击
      const isHighEmotional = this.detectHighEmotionalImpact(userMessage, aiText);
      
      // 添加短期记忆
      const memory = await MemoryService.addShortMemory(gameId, memoryContent, {
        userId,
        turn: maxTurn + 1,
        tags: ['对话', isHighEmotional ? 'high_emotional_impact' : ''],
        importance: isHighEmotional ? 80 : 50
      });
      
      // 如果有characterId且是高情感内容，触发经历判定
      if (characterId && isHighEmotional && memory) {
        const ExperienceMemoryBridge = require('./experienceMemoryBridge');
        
        // 发送记忆标记事件
        ExperienceMemoryBridge.emit('memory:flag', {
          memoryId: memory._id || memory.id,
          flag: 'high_emotional_impact',
          characterId,
          gameId,
          content: memoryContent,
          type: 'short',
          turn: maxTurn + 1,
          currentAffinity: 50, // 实际应从状态系统获取
          currentMood: 'normal',
          recentDialogues: [userMessage, aiText]
        });
      }
      
      Logger.debug(`[记忆] 已保存对话内容到短期记忆${isHighEmotional ? ' (高情感冲击)' : ''}`);
    } catch (error) {
      Logger.error('保存记忆失败:', error);
    }
  }

  /**
   * 检测高情感冲击内容
   */
  static detectHighEmotionalImpact(userMessage, aiText) {
    const emotionalKeywords = [
      '喜欢', '爱', '告白', '表白', '在一起',
      '孤独', '害怕', '童年', '创伤', '秘密',
      '信任', '失望', '心疼', '感动', '泪',
      '抱抱', '陪伴', '永远', '约定', '承诺'
    ];
    
    const fullText = (userMessage + ' ' + aiText).toLowerCase();
    const matchCount = emotionalKeywords.filter(kw => fullText.includes(kw)).length;
    
    // 匹配超过3个关键词或包含特定模式
    return matchCount >= 3 || 
           /(告白|喜欢你|爱你|抱抱)/.test(fullText);
  }

  /**
   * 保存对话历史
   */
  static async saveDialogue(userMessage, aiResponse, characterId) {
    try {
      await Dialogue.create({
        userMessage,
        aiResponse,
        characterId: characterId || null,
        createdAt: new Date()
      });
      Logger.debug('对话已保存');
    } catch (error) {
      Logger.error('保存对话失败:', error);
      // 不抛出错误，避免影响主流程
    }
  }

  /**
   * 分析对话情感并更新角色好感度/信任度
   * AI在对话中可以通过特定格式指令来调整角色状态
   * 格式：[FAVOR:+5] 或 [TRUST:-3] 或 [MOOD:开心]
   */
  static async updateCharacterStats(characterId, aiText) {
    try {
      if (!characterId || !aiText) return;
      
      const Character = require('../models/character');
      const character = await Character.findById(characterId);
      if (!character) return;
      
      let updated = false;
      
      // 匹配 [FAVOR:+5] 格式
      const favorMatch = aiText.match(/\[FAVOR:([+-]\d+)\]/i);
      if (favorMatch) {
        const delta = parseInt(favorMatch[1]);
        const oldFavor = character.favor || 50;
        character.favor = Math.max(0, Math.min(100, oldFavor + delta));
        Logger.info(`角色 ${character.name} 好感度变化: ${oldFavor} -> ${character.favor} (${delta > 0 ? '+' : ''}${delta})`);
        updated = true;
      }
      
      // 匹配 [TRUST:+5] 格式
      const trustMatch = aiText.match(/\[TRUST:([+-]\d+)\]/i);
      if (trustMatch) {
        const delta = parseInt(trustMatch[1]);
        const oldTrust = character.trust || 50;
        character.trust = Math.max(0, Math.min(100, oldTrust + delta));
        Logger.info(`角色 ${character.name} 信任度变化: ${oldTrust} -> ${character.trust} (${delta > 0 ? '+' : ''}${delta})`);
        updated = true;
      }
      
      // 匹配 [MOOD:心情] 格式
      const moodMatch = aiText.match(/\[MOOD:([^\]]+)\]/i);
      if (moodMatch) {
        const newMood = moodMatch[1].trim();
        const oldMood = character.stats?.mood || '平静';
        if (!character.stats) character.stats = {};
        character.stats.mood = newMood;
        Logger.info(`角色 ${character.name} 心情变化: ${oldMood} -> ${newMood}`);
        updated = true;
      }
      
      // 增加对话轮数
      if (!character.stats) character.stats = {};
      character.stats.dialogueTurns = (character.stats.dialogueTurns || 0) + 1;
      
      if (updated) {
        await character.save();
      }
      
    } catch (error) {
      Logger.error('更新角色状态失败:', error);
    }
  }

  /**
   * 获取对话历史
   */
  static async getHistory(limit = 50) {
    try {
      let history;
      if (useMemoryStore) {
        history = await Dialogue.find({}, { sort: { createdAt: -1 }, limit });
      } else {
        history = await Dialogue.find()
          .populate('characterId', 'name')
          .sort({ createdAt: -1 })
          .limit(limit);
      }
      return history;
    } catch (error) {
      Logger.error('获取对话历史失败:', error);
      return [];
    }
  }
}

module.exports = DialogueService;
