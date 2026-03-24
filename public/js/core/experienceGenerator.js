/**
 * 经历自动生成器
 * @module Core/ExperienceGenerator
 * @description 根据触发器自动生成角色经历（支持AI生成和模板生成）
 */

/**
 * 经历模板库
 * @constant {Object}
 */
const ExperienceTemplates = {
    // 好感度突破模板
    favorThreshold: {
        30: {
            titles: ['初识好感', '渐生好感', '心墙初开', '微笑相对', '初露温柔'],
            descriptions: [
                '{character}看你的眼神不再那么冷淡了。',
                '你注意到{character}对你的态度有所软化。',
                '{character}开始愿意与你分享更多话语。'
            ],
            emotionalImpacts: [4, 5, 6],
            favorDeltas: [0, 1, 2]
        },
        60: {
            titles: ['情愫暗生', '心意相通', '渐生情愫', '暗许芳心', '情愫暗涌'],
            descriptions: [
                '你们之间的气氛变得微妙起来。',
                '{character}看你的眼神带着不一样的光彩。',
                '你感觉到{character}对你越来越在意。'
            ],
            emotionalImpacts: [6, 7, 8],
            favorDeltas: [0, 2, 3]
        },
        90: {
            titles: ['至死不渝', '情深似海', '生死与共', '命中注定', '灵魂相依'],
            descriptions: [
                '{character}对你的感情已经超越了一切。',
                '你们之间的羁绊已经牢不可破。',
                '{character}愿意为你付出一切。'
            ],
            emotionalImpacts: [8, 9, 10],
            favorDeltas: [0, 3, 5]
        }
    },
    
    // 对话模式模板
    dialoguePattern: {
        confession: {
            titles: ['真情流露', '意外坦白', '真心倾诉', '深夜告白', '情难自抑'],
            descriptions: [
                '{character}在不经意间吐露了真情。',
                '那一刻，{character}说出了藏在心底的话。',
                '你们之间的气氛突然变得暧昧起来。'
            ],
            emotionalImpacts: [6, 7, 8],
            favorDeltas: [2, 3, 5]
        },
        apology: {
            titles: ['误会冰释', '真诚道歉', '重归于好', '一笑泯恩仇', '冰释前嫌'],
            descriptions: [
                '经过坦诚的交流，你们解开了误会。',
                '{character}真诚地向你道歉。',
                '你们的关系因为这次坦白而更加坚固。'
            ],
            emotionalImpacts: [5, 6, 7],
            favorDeltas: [1, 2, 3]
        },
        conflict: {
            titles: ['信任危机', '愤怒对峙', '心生芥蒂', '剑拔弩张', '误会加深'],
            descriptions: [
                '一场激烈的争吵让你们的关系陷入危机。',
                '{character}对你的态度变得异常冷淡。',
                '你感觉到你们之间出现了裂痕。'
            ],
            emotionalImpacts: [6, 7, 8],
            favorDeltas: [-5, -3, -2]
        },
        comfort: {
            titles: ['温柔守护', '雪中送炭', '并肩作战', '患难与共', '风雨同舟'],
            descriptions: [
                '在困难时刻，{character}给予了你最温暖的陪伴。',
                '那一刻的守护，让你对{character}有了新的认识。',
                '{character}用行动证明了对你的在意。'
            ],
            emotionalImpacts: [5, 6, 7],
            favorDeltas: [1, 2, 3]
        },
        teasing: {
            titles: ['调侃打趣', '逗趣时刻', '捉弄一番', '笑闹之间', '轻松时光'],
            descriptions: [
                '轻松愉快的打趣让你们的关系更加亲密。',
                '{character}难得展现出了俏皮的一面。',
                '在欢笑声中，你们的距离不知不觉拉近了。'
            ],
            emotionalImpacts: [3, 4, 5],
            favorDeltas: [0, 1, 2]
        }
    },
    
    // 地点时间模板
    locationTime: {
        snow_night: {
            titles: ['雪夜归人', '月下独酌', '雪中共赏', '风雪夜归', '雪中漫步'],
            descriptions: [
                '那个飘雪的夜晚，{character}的身影格外动人。',
                '雪花纷飞的夜晚，你们度过了一段难忘的时光。',
                '雪夜的灯光下，{character}的眼神格外温柔。'
            ],
            emotionalImpacts: [5, 6, 7],
            favorDeltas: [1, 2, 3]
        },
        dawn_meeting: {
            titles: ['晨光微熹', '日出之约', '黎明时分', '破晓相见', '朝阳初升'],
            descriptions: [
                '在黎明的微光中，{character}如约而至。',
                '日出时分，你们在高处并肩而立。',
                '晨光中，{character}的侧颜格外美好。'
            ],
            emotionalImpacts: [4, 5, 6],
            favorDeltas: [0, 1, 2]
        },
        rainy_night: {
            titles: ['夜雨寄北', '听雨对谈', '雨夜闲谈', '雨声淅沥', '檐下听雨'],
            descriptions: [
                '雨夜的宁静中，你们聊了许久。',
                '雨声淅沥，{character}的声音格外温柔。',
                '在雨夜的庇护下，你们分享了各自的心事。'
            ],
            emotionalImpacts: [4, 5, 6],
            favorDeltas: [0, 1, 2]
        }
    },
    
    // 剧情里程碑模板
    plotMilestone: {
        first_battle_together: {
            titles: ['并肩首战', '初战告捷', '首战捷报', '并肩御敌', '首战告捷'],
            descriptions: [
                '你们的第一次并肩作战取得了胜利。',
                '在战斗中，你们建立了最初的默契。',
                '那一战，让{character}对你刮目相看。'
            ],
            emotionalImpacts: [5, 6, 7],
            favorDeltas: [2, 3, 5]
        },
        secret_revealed: {
            titles: ['秘密揭露', '真相大白', '真相大白', '隐秘揭晓', '秘密揭晓'],
            descriptions: [
                '一个重要秘密被揭示，改变了你们的关系。',
                '真相大白的那一刻，一切都变得不同。',
                '{character}向你透露了深藏的秘密。'
            ],
            emotionalImpacts: [6, 7, 8],
            favorDeltas: [2, 3, 4]
        },
        life_saved: {
            titles: ['救命之恩', '生死一线', '绝处逢生', '舍命相救', '救命之恩'],
            descriptions: [
                '千钧一发之际，{character}救了你一命。',
                '生死关头，你们彼此守护。',
                '那次经历让你们的关系有了质的飞跃。'
            ],
            emotionalImpacts: [8, 9, 10],
            favorDeltas: [3, 5, 7]
        },
        gift_exchanged: {
            titles: ['心意相赠', '珍贵礼物', '礼物交换', '心意相通', '互赠礼物'],
            descriptions: [
                '一份精心准备的礼物拉近了你们的距离。',
                '{character}收到礼物时的表情让你难以忘怀。',
                '通过这份礼物，你们交换了彼此的心意。'
            ],
            emotionalImpacts: [5, 6, 7],
            favorDeltas: [2, 3, 4]
        }
    }
};

/**
 * 经历生成器
 * @class ExperienceGenerator
 */
class ExperienceGenerator {
    constructor(options = {}) {
        this.useAI = options.useAI !== false; // 默认启用AI
        this.aiConfig = {
            model: options.model || 'deepseek-chat',
            temperature: options.temperature || 0.7,
            maxTokens: options.maxTokens || 200,
            ...options.aiConfig
        };
        this.templates = ExperienceTemplates;
        this.generationHistory = []; // 生成历史记录
    }
    
    /**
     * 生成经历（主要入口）
     * @param {TriggerResult} trigger - 触发结果
     * @param {GenerationContext} context - 生成上下文
     * @returns {Promise<GeneratedExperience>}
     */
    async generate(trigger, context) {
        try {
            // 根据配置选择生成方式
            if (this.useAI && window.aiClient) {
                return await this.generateWithAI(trigger, context);
            } else {
                return this.generateFromTemplate(trigger, context);
            }
        } catch (error) {
            console.error('[ExperienceGenerator] Generation failed:', error);
            // 失败时使用模板
            return this.generateFromTemplate(trigger, context);
        }
    }
    
    /**
     * 使用AI生成经历
     * @private
     */
    async generateWithAI(trigger, context) {
        const prompt = this.buildAIPrompt(trigger, context);
        
        const response = await window.aiClient.generate({
            model: this.aiConfig.model,
            messages: [
                { role: 'system', content: '你是一个游戏文案生成助手，负责根据游戏事件生成简洁优雅的经历描述。' },
                { role: 'user', content: prompt }
            ],
            temperature: this.aiConfig.temperature,
            max_tokens: this.aiConfig.maxTokens
        });
        
        const generated = this.parseAIResponse(response.content, trigger);
        
        // 记录历史
        this.generationHistory.push({
            trigger,
            context,
            result: generated,
            timestamp: Date.now()
        });
        
        return generated;
    }
    
    /**
     * 构建AI提示词
     * @private
     */
    buildAIPrompt(trigger, context) {
        const { character, save, playerInput, aiReply } = context;
        const location = save.world.location;
        const weather = save.world.weather;
        const hour = save.world.gameTime.hour;
        
        let prompt = `请根据以下游戏事件生成一段经历描述：

角色：${character.name}
当前地点：${location}
时间：${hour}:00
天气：${weather}
好感度：${character.favor}

事件类型：${trigger.type}
`;
        
        // 根据触发类型添加详细信息
        switch (trigger.type) {
            case 'FAVOR_THRESHOLD':
                prompt += `好感度突破：${trigger.data.threshold}点\n`;
                prompt += `之前的描述：${trigger.data.description}\n`;
                break;
            case 'DIALOGUE_PATTERN':
                prompt += `对话模式：${trigger.data.displayName}\n`;
                prompt += `匹配关键词：${trigger.data.matchedKeywords.join('、')}\n`;
                prompt += `玩家输入：${playerInput?.substring(0, 100) || ''}\n`;
                prompt += `AI回复：${aiReply?.substring(0, 100) || ''}\n`;
                break;
            case 'LOCATION_TIME':
                prompt += `特殊时刻：${trigger.data.displayName}\n`;
                prompt += `描述：${trigger.data.description}\n`;
                break;
            case 'PLOT_MILESTONE':
                prompt += `剧情事件：${trigger.data.flag}\n`;
                prompt += `描述：${trigger.data.description}\n`;
                break;
        }
        
        prompt += `
请生成：
1. 经历标题（4-6字，富有诗意）
2. 简短描述（30-50字，第三人称）
3. 情感冲击值（1-10）
4. 好感度变化（-10到+10）

请以JSON格式返回：{"title": "...", "description": "...", "emotionalImpact": X, "favorDelta": X}`;
        
        return prompt;
    }
    
    /**
     * 解析AI响应
     * @private
     */
    parseAIResponse(content, trigger) {
        try {
            // 尝试直接解析JSON
            const parsed = JSON.parse(content);
            return {
                title: parsed.title || this.getRandomTitle(trigger),
                description: parsed.description || '',
                fullContext: parsed.fullContext || parsed.description || '',
                emotionalImpact: parsed.emotionalImpact || 5,
                favorDelta: parsed.favorDelta || 0,
                triggerType: trigger.type,
                triggerData: trigger.data,
                generatedBy: 'AI'
            };
        } catch (e) {
            // 解析失败时使用模板
            console.warn('[ExperienceGenerator] Failed to parse AI response, using template');
            return null;
        }
    }
    
    /**
     * 从模板生成经历
     * @private
     */
    generateFromTemplate(trigger, context) {
        const { character } = context;
        let template;
        
        switch (trigger.type) {
            case 'FAVOR_THRESHOLD':
                const threshold = trigger.data.threshold;
                template = this.templates.favorThreshold[threshold];
                break;
            case 'DIALOGUE_PATTERN':
                const pattern = trigger.data.patternName;
                template = this.templates.dialoguePattern[pattern];
                break;
            case 'LOCATION_TIME':
                const combo = trigger.data.comboName;
                template = this.templates.locationTime[combo];
                break;
            case 'PLOT_MILESTONE':
                const flag = trigger.data.flag;
                template = this.templates.plotMilestone[flag];
                break;
        }
        
        if (!template) {
            console.warn('[ExperienceGenerator] No template found for trigger:', trigger);
            return null;
        }
        
        // 随机选择模板内容
        const title = this.randomPick(template.titles);
        const descriptionTemplate = this.randomPick(template.descriptions);
        const emotionalImpact = this.randomPick(template.emotionalImpacts);
        const favorDelta = this.randomPick(template.favorDeltas);
        
        // 替换角色名
        const description = descriptionTemplate.replace(/\{character\}/g, character.name);
        
        return {
            title,
            description,
            fullContext: description,
            emotionalImpact,
            favorDelta,
            triggerType: trigger.type,
            triggerData: trigger.data,
            generatedBy: 'TEMPLATE'
        };
    }
    
    /**
     * 随机选择数组元素
     * @private
     */
    randomPick(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
    
    /**
     * 从触发数据获取随机标题
     * @private
     */
    getRandomTitle(trigger) {
        if (trigger.data?.titlePool) {
            return this.randomPick(trigger.data.titlePool);
        }
        return '未命名经历';
    }
    
    /**
     * 设置AI配置
     * @param {Object} config
     */
    setAIConfig(config) {
        this.aiConfig = { ...this.aiConfig, ...config };
    }
    
    /**
     * 启用/禁用AI生成
     * @param {boolean} enabled
     */
    setUseAI(enabled) {
        this.useAI = enabled;
    }
    
    /**
     * 获取生成历史
     * @returns {Array}
     */
    getGenerationHistory() {
        return this.generationHistory;
    }
}

/**
 * 生成上下文
 * @typedef {Object} GenerationContext
 * @property {Object} character - 角色数据（含name, favor等）
 * @property {Object} save - 存档数据
 * @property {string} playerInput - 玩家输入（可选）
 * @property {string} aiReply - AI回复（可选）
 */

/**
 * 生成的经历
 * @typedef {Object} GeneratedExperience
 * @property {string} title - 标题
 * @property {string} description - 简短描述
 * @property {string} fullContext - 完整上下文
 * @property {number} emotionalImpact - 情感冲击值
 * @property {number} favorDelta - 好感度变化
 * @property {string} triggerType - 触发类型
 * @property {Object} triggerData - 触发数据
 * @property {string} generatedBy - 生成方式（AI/TEMPLATE）
 */

// 创建全局实例
const experienceGenerator = new ExperienceGenerator();

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        ExperienceGenerator, 
        ExperienceTemplates, 
        experienceGenerator 
    };
}
