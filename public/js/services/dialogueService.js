/**
 * 对话服务 - 处理AI对话业务逻辑
 * @module Services/DialogueService
 * @description AI对话生成、情感解析、记忆更新
 */

/**
 * 对话服务
 * @class DialogueService
 */
class DialogueService {
    /**
     * 发送对话请求
     * @param {Object} params - 对话参数
     * @param {string} params.characterId - 角色ID
     * @param {string} params.message - 用户消息
     * @param {Array} [params.history] - 历史对话
     * @param {Object} [params.config] - AI配置
     * @returns {Promise<Object>} {content, emotion, usage}
     */
    static async sendMessage(params) {
        const { characterId, message, history = [], config = {} } = params;
        
        try {
            // 构建完整请求
            const requestBody = {
                characterId,
                message,
                history: history.slice(-10), // 限制历史长度
                stream: false,
                ...config
            };
            
            const response = await API.post('/dialogue/generate', requestBody);
            const result = response.data || response;
            
            // 解析情感标签
            const parsed = this.parseEmotion(result.content || result.text || result);
            
            // 保存对话记忆
            this.saveDialogueMemory(characterId, message, parsed.cleanText, parsed.emotion);
            
            return {
                content: parsed.cleanText,
                rawContent: result.content || result.text || result,
                emotion: parsed.emotion,
                usage: result.usage,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('对话请求失败:', error);
            throw error;
        }
    }
    
    /**
     * 流式对话（使用SSE）
     * @param {Object} params - 对话参数
     * @param {Object} callbacks - 回调函数 {onChunk, onEmotion, onComplete, onError}
     */
    static async streamMessage(params, callbacks) {
        const { characterId, message, history = [], config = {} } = params;
        const { onChunk, onEmotion, onComplete, onError } = callbacks;
        
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/dialogue/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({
                    characterId,
                    message,
                    history: history.slice(-10),
                    stream: true,
                    ...config
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let fullText = '';
            let currentEmotion = { type: 'calm', level: 1 };
            
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                
                // 处理SSE格式数据
                const lines = buffer.split('\n');
                buffer = lines.pop(); // 保留不完整行
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        
                        if (data === '[DONE]') {
                            // 流结束
                            const finalParsed = this.parseEmotion(fullText);
                            if (onComplete) {
                                onComplete({
                                    content: finalParsed.cleanText,
                                    emotion: finalParsed.emotion
                                });
                            }
                            return;
                        }
                        
                        try {
                            const parsed = JSON.parse(data);
                            const chunk = parsed.choices?.[0]?.delta?.content || '';
                            
                            fullText += chunk;
                            
                            // 检查情感标签
                            const emotionCheck = this.extractEmotionFromBuffer(fullText);
                            if (emotionCheck && emotionCheck.type !== currentEmotion.type) {
                                currentEmotion = emotionCheck;
                                if (onEmotion) onEmotion(currentEmotion);
                            }
                            
                            if (onChunk) onChunk(chunk, fullText);
                        } catch (e) {
                            // 忽略解析错误
                        }
                    }
                }
            }
            
        } catch (error) {
            console.error('流式对话失败:', error);
            if (onError) onError(error);
        }
    }
    
    /**
     * 解析情感标签
     * @param {string} text - 原始文本
     * @returns {Object} {cleanText, emotion}
     */
    static parseEmotion(text) {
        if (!text) return { cleanText: '', emotion: { type: 'calm', level: 1 } };
        
        // 匹配 [emotion:type:level] 格式
        const emotionRegex = /\[emotion:(\w+)(?::(\d))?\]/gi;
        const matches = [...text.matchAll(emotionRegex)];
        
        if (matches.length > 0) {
            // 使用最后一个情感标签
            const lastMatch = matches[matches.length - 1];
            const [, type, level = '2'] = lastMatch;
            
            // 移除所有情感标签
            const cleanText = text.replace(emotionRegex, '').trim();
            
            return {
                cleanText,
                emotion: {
                    type: type.toLowerCase(),
                    level: parseInt(level)
                }
            };
        }
        
        // 启发式检测
        const heuristicEmotion = this.detectEmotionHeuristic(text);
        
        return {
            cleanText: text,
            emotion: heuristicEmotion
        };
    }
    
    /**
     * 从缓冲区提取情感
     * @private
     */
    static extractEmotionFromBuffer(text) {
        const match = text.match(/\[emotion:(\w+)(?::(\d))?\]/i);
        if (match) {
            return {
                type: match[1].toLowerCase(),
                level: parseInt(match[2] || '2')
            };
        }
        return null;
    }
    
    /**
     * 启发式情感检测
     * @private
     * @param {string} text - 文本
     * @returns {Object}
     */
    static detectEmotionHeuristic(text) {
        const emotions = {
            happy: ['开心', '高兴', '喜欢', '哈哈', '笑', '棒', '好耶'],
            angry: ['生气', '愤怒', '讨厌', '可恶', '哼', '滚', '混蛋'],
            sad: ['难过', '伤心', '哭', '呜呜', '悲伤', '痛苦'],
            shy: ['害羞', '脸红', '唔', '那个', '人家'],
            surprise: ['惊讶', '震惊', '什么', '真的吗', '不会吧'],
            serious: ['严肃', '认真', '必须', '一定', '重要'],
            hurt: ['疼', '痛', '受伤', '好痛', '啊']
        };
        
        const textLower = text.toLowerCase();
        
        for (const [emotion, keywords] of Object.entries(emotions)) {
            if (keywords.some(kw => textLower.includes(kw))) {
                return { type: emotion, level: 2 };
            }
        }
        
        return { type: 'calm', level: 1 };
    }
    
    /**
     * 保存对话记忆
     * @private
     */
    static async saveDialogueMemory(characterId, userMessage, aiResponse, emotion) {
        try {
            // 保存用户消息
            await MemoryService.create({
                characterId,
                content: userMessage,
                type: 'SHORT',
                source: 'user',
                importance: 2
            });
            
            // 保存AI回复
            await MemoryService.create({
                characterId,
                content: aiResponse,
                type: 'SHORT',
                source: 'ai',
                importance: emotion.level >= 3 ? 4 : 2,
                emotion: emotion.type,
                metadata: { emotion }
            });
            
        } catch (error) {
            // 本地备份
            MemoryService.addLocalMemory(characterId, {
                content: userMessage,
                type: 'SHORT',
                source: 'user'
            });
            MemoryService.addLocalMemory(characterId, {
                content: aiResponse,
                type: 'SHORT',
                source: 'ai',
                emotion: emotion.type
            });
        }
    }
    
    /**
     * 获取对话历史
     * @param {string} characterId - 角色ID
     * @param {number} [limit=20] - 限制数量
     * @returns {Promise<Array>}
     */
    static async getHistory(characterId, limit = 20) {
        try {
            const response = await API.get(`/dialogue/history/${characterId}`, { limit });
            return response.data || response || [];
        } catch (error) {
            // 从本地获取
            const memories = MemoryService.getLocalMemories(characterId);
            return memories
                .filter(m => m.source === 'user' || m.source === 'ai')
                .slice(0, limit)
                .reverse();
        }
    }
    
    /**
     * 清空对话历史
     * @param {string} characterId - 角色ID
     * @returns {Promise<void>}
     */
    static async clearHistory(characterId) {
        try {
            await API.delete(`/dialogue/history/${characterId}`);
        } catch (error) {
            console.warn('清空历史失败:', error);
        }
        
        // 清除本地相关记忆
        MemoryService.clearLocalMemories(characterId);
    }
    
    /**
     * 分析对话情感趋势
     * @param {string} characterId - 角色ID
     * @returns {Promise<Object>}
     */
    static async analyzeSentimentTrend(characterId) {
        const history = await this.getHistory(characterId, 50);
        
        const emotions = history.reduce((acc, h) => {
            const emotion = h.emotion || 'calm';
            acc[emotion] = (acc[emotion] || 0) + 1;
            return acc;
        }, {});
        
        const total = Object.values(emotions).reduce((a, b) => a + b, 0);
        
        return {
            distribution: emotions,
            percentages: Object.entries(emotions).reduce((acc, [k, v]) => {
                acc[k] = Math.round((v / total) * 100);
                return acc;
            }, {}),
            dominant: Object.entries(emotions).sort((a, b) => b[1] - a[1])[0]?.[0] || 'calm'
        };
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DialogueService };
}
