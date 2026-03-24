const axios = require('axios');
const Character = require('../models/character');
const Dialogue = require('../models/dialogue');
const Setting = require('../models/setting');
const Worldbook = require('../models/worldbook');

class DialogueService {
  static async generateResponse(message, characterId) {
    try {
      // 获取 AI 设置
      let setting = null;
      try {
        setting = await Setting.findOne();
      } catch (error) {
        console.error('Error getting AI settings:', error.message);
        // 使用默认设置
        setting = {
          apiUrl: 'https://api.siliconflow.cn/v1/chat/completions',
          model: 'doubao-1-5-pro-256k-20240821',
          apiKey: process.env.SILICONFLOW_API_KEY || 'your-api-key-here'
        };
      }

      // 获取角色信息
      let character = null;
      try {
        character = await Character.findById(characterId);
      } catch (error) {
        console.error('Error getting character:', error.message);
        // 使用默认角色
        character = {
          id: characterId,
          name: '默认角色',
          prompt: '你是一个修仙世界的角色，性格温和，喜欢帮助他人。'
        };
      }

      // 获取世界书设定
      let worldbook = null;
      try {
        worldbook = await Worldbook.findOne();
      } catch (error) {
        console.error('Error getting worldbook:', error.message);
      }
      if (!worldbook) {
        worldbook = { content: '这是一个修仙世界，充满了神秘和奇迹。' };
      }

      // 构建提示词
      const prompt = this.buildPrompt(message, character, worldbook);

      // 调用 SiliconFlow API
      const aiResponse = await this.callAIAPI(prompt, setting);

      // 解析 AI 响应
      const parsedResponse = this.parseResponse(aiResponse);

      // 保存对话历史
      try {
        await this.saveDialogue(message, parsedResponse, characterId);
      } catch (error) {
        console.error('Error saving dialogue:', error.message);
        // 保存失败不影响响应
      }

      return parsedResponse;
    } catch (error) {
      console.error('Error generating response:', error.message);
      // 返回默认响应
      return [{
        type: '默认描述者',
        content: '抱歉，我暂时无法生成响应。请稍后再试。'
      }];
    }
  }

  static buildPrompt(message, character, worldbook) {
    // 构建提示词，包括角色设定、世界书设定等
    let prompt = `你是一个修仙世界的故事讲述者，需要根据用户提供的信息生成故事内容。\n\n`;
    
    // 添加世界书设定
    prompt += `【世界设定】\n${worldbook.content}\n\n`;
    
    // 添加角色设定
    prompt += `【角色设定】\n${character.prompt}\n\n`;
    
    // 添加用户消息
    prompt += `【用户消息】\n${message}\n\n`;
    
    // 添加输出要求
    prompt += `【输出要求】\n请生成一段故事内容，包括环境描写、旁白和角色对话。对话内容请明确标注角色名称，例如：\n林婉：你好，欢迎来到这个世界。\n陆苍雪：这里的风景真美。\n轩辕霓裳：哈哈，我们一起去冒险吧！`;
    
    return prompt;
  }

  static async callAIAPI(prompt, setting) {
    try {
      const response = await axios.post(setting.apiUrl, {
        model: setting.model,
        messages: [
          {
            role: "system",
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${setting.apiKey}`
        }
      });

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('AI API error:', error.response?.data || error.message);
      throw new Error('Failed to call AI API');
    }
  }

  static parseResponse(response) {
    // 解析 AI 响应，提取角色对话
    const parts = [];
    const lines = response.split(/\n+/).filter(line => line.trim());
    
    // 角色名称列表
    const characterNames = ['林婉', '陆苍雪', '轩辕霓裳'];
    
    lines.forEach(line => {
      const content = line.trim();
      
      // 检查是否是角色对话
      let matched = false;
      for (const name of characterNames) {
        if (content.startsWith(`${name}：`) || content.startsWith(`${name}:`)) {
          parts.push({
            type: name,
            content: content.substring(name.length + 1).trim()
          });
          matched = true;
          break;
        }
      }
      
      // 如果不是角色对话，作为旁白
      if (!matched) {
        parts.push({
          type: '默认描述者',
          content: content
        });
      }
    });
    
    return parts;
  }

  static async saveDialogue(userMessage, aiResponse, characterId) {
    try {
      // 保存对话历史到数据库
      const dialogue = new Dialogue({
        userMessage,
        aiResponse,
        characterId
      });
      
      await dialogue.save();
    } catch (error) {
      console.error('Error saving dialogue:', error.message);
      throw error;
    }
  }

  static async getHistory() {
    try {
      // 获取对话历史
      return await Dialogue.find()
        .populate('characterId', 'name')
        .sort({ createdAt: -1 })
        .limit(50);
    } catch (error) {
      console.error('Error getting dialogue history:', error.message);
      // 返回空数组
      return [];
    }
  }
}

module.exports = DialogueService;