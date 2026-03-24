/**
 * 🎭 前端情感提取与CG切换系统
 * Emotion Extractor & CG Switching System
 * 
 * 版本: v1.0
 * 日期: 2026-03-17
 */

// ==================== 类型定义 ====================

/**
 * @typedef {('calm'|'happy'|'angry'|'sad'|'shy'|'surprise'|'serious'|'hurt')} EmotionType
 * 支持的8种情感类型
 */

/**
 * @typedef {Object} EmotionData
 * @property {EmotionType} type - 情感类型
 * @property {1|2|3} level - 情感强度 (1=轻微, 2=中等, 3=强烈)
 * @property {boolean} isEntrance - 是否角色首次登场
 */

/**
 * @typedef {Object} ParseResult
 * @property {string} cleanText - 去除标签后的纯文本
 * @property {EmotionData} emotion - 解析出的情感数据
 * @property {boolean} hasTag - 是否包含AI情感标签
 */

/**
 * @typedef {Object} CharacterPromptConfig
 * @property {string} name - 角色名称
 * @property {string} archetype - 角色 archetype
 * @property {string} defaultTone - 默认语气
 * @property {EmotionType[]} emotionalRange - 支持的情感类型
 */

// ==================== 情感解析器 ====================

class EmotionParser {
    constructor() {
        /** @type {EmotionType[]} */
        this.validEmotions = ['calm', 'happy', 'angry', 'sad', 'shy', 'surprise', 'serious', 'hurt'];
        
        // 登场检测关键词
        this.entranceWords = ['（出现）', '（走入）', '（转头）', '（抬头）', '（转身）', '（进入）', '初次', '来了', '登场'];
        
        // 启发式检测关键词映射
        this.heuristicKeywords = {
            angry: [/哼|怒|生气|闭嘴|滚|可恶|该死|混蛋|放肆/i, 2],
            shy: [/脸红|才不是|那个\.{0,3}|别看我|讨厌|害羞/i, 2],
            surprise: [/！{2,}|什么|不会吧|怎么可能|竟然|震惊/i, 2],
            happy: [/笑|开心|谢谢|喜欢|好耶|太好了|嘻嘻|哈哈/i, 2],
            sad: [/泪|难过|伤心|再见|保重|呜|为什么|痛苦/i, 2],
            serious: [/严肃|认真|必须|一定|责任|使命|战斗/i, 2]
        };
    }

    /**
     * 解析AI回复文本，提取情感标签
     * @param {string} rawText - 原始AI回复文本
     * @returns {ParseResult}
     */
    parse(rawText) {
        if (!rawText || typeof rawText !== 'string') {
            return this.createDefaultResult('');
        }

        const trimmed = rawText.trim();
        
        // 匹配 [emotion:type] 或 [emotion:type:level]
        const regex = /\[emotion:(\w+)(?::([1-3]))?\]$/;
        const match = trimmed.match(regex);
        
        if (match) {
            const [, typeStr, levelStr = '2'] = match;
            const type = this.validateEmotion(typeStr);
            const level = parseInt(levelStr);
            const isEntrance = this.detectEntrance(trimmed);
            
            return {
                cleanText: trimmed.replace(regex, '').trim(),
                emotion: { type, level, isEntrance },
                hasTag: true
            };
        }
        
        // 无标签：尝试启发式检测
        const detected = this.heuristicDetect(trimmed);
        if (detected) {
            return {
                cleanText: trimmed,
                emotion: { ...detected, isEntrance: this.detectEntrance(trimmed) },
                hasTag: false
            };
        }
        
        // 默认calm
        return this.createDefaultResult(trimmed);
    }

    /**
     * 批量解析
     * @param {string[]} texts 
     * @returns {ParseResult[]}
     */
    parseBatch(texts) {
        return texts.map(t => this.parse(t));
    }

    /**
     * 验证情感类型
     * @param {string} type 
     * @returns {EmotionType}
     */
    validateEmotion(type) {
        const lowerType = type.toLowerCase();
        return this.validEmotions.includes(lowerType) ? lowerType : 'calm';
    }

    /**
     * 检测是否角色登场
     * @param {string} text 
     * @returns {boolean}
     */
    detectEntrance(text) {
        return this.entranceWords.some(word => text.includes(word));
    }

    /**
     * 启发式情感检测（AI忘加标签时使用）
     * @param {string} text 
     * @returns {EmotionData|null}
     */
    heuristicDetect(text) {
        for (const [emotion, [regex, level]] of Object.entries(this.heuristicKeywords)) {
            if (regex.test(text)) {
                return { type: emotion, level };
            }
        }
        return null;
    }

    /**
     * 创建默认结果
     * @param {string} text 
     * @returns {ParseResult}
     */
    createDefaultResult(text) {
        return {
            cleanText: text,
            emotion: { type: 'calm', level: 1, isEntrance: false },
            hasTag: false
        };
    }
}

// ==================== 防抖控制器 ====================

class EmotionThrottle {
    /**
     * @param {Object} config
     * @param {number} config.sameEmotionCooldown - 同情感冷却时间(ms)
     * @param {number} config.calmHoldTime - 切换到calm的延迟(ms)
     * @param {number} config.minSwitchInterval - 最小切换间隔(ms)
     */
    constructor(config = {}) {
        this.config = {
            sameEmotionCooldown: config.sameEmotionCooldown || 2000,
            calmHoldTime: config.calmHoldTime || 3000,
            minSwitchInterval: config.minSwitchInterval || 500
        };
        
        /** @type {EmotionType|null} */
        this.lastEmotion = null;
        this.lastSwitchTime = 0;
        /** @type {number|null} */
        this.pendingSwitch = null;
    }

    /**
     * 决定是否切换CG
     * @param {EmotionData} newEmotion 
     * @returns {boolean}
     */
    shouldSwitch(newEmotion) {
        const now = Date.now();
        
        // 强制切换：首次、登场、强烈情绪
        if (!this.lastEmotion || newEmotion.isEntrance || newEmotion.level === 3) {
            return this.executeSwitch(newEmotion, now);
        }
        
        // 同情感不切换
        if (newEmotion.type === this.lastEmotion) {
            return false;
        }
        
        // 冷却检查
        if (now - this.lastSwitchTime < this.config.minSwitchInterval) {
            return false;
        }
        
        // calm切换延迟
        if (newEmotion.type === 'calm' && this.lastEmotion !== 'calm') {
            this.scheduleDelayedSwitch(newEmotion, this.config.calmHoldTime);
            return false;
        }
        
        return this.executeSwitch(newEmotion, now);
    }

    executeSwitch(emotion, now) {
        if (this.pendingSwitch) {
            clearTimeout(this.pendingSwitch);
            this.pendingSwitch = null;
        }
        this.lastEmotion = emotion.type;
        this.lastSwitchTime = now;
        return true;
    }

    scheduleDelayedSwitch(emotion, delay) {
        if (this.pendingSwitch) clearTimeout(this.pendingSwitch);
        this.pendingSwitch = setTimeout(() => {
            this.executeSwitch(emotion, Date.now());
            // 触发延迟切换事件
            if (this.onDelayedSwitch) {
                this.onDelayedSwitch(emotion);
            }
        }, delay);
    }

    reset() {
        this.lastEmotion = null;
        this.lastSwitchTime = 0;
        if (this.pendingSwitch) clearTimeout(this.pendingSwitch);
    }
}

// ==================== Prompt模板生成器 ====================

class PromptTemplate {
    /**
     * 生成角色系统Prompt
     * @param {CharacterPromptConfig} config 
     * @returns {string}
     */
    static generateSystemPrompt(config) {
        const emotionList = config.emotionalRange.join(', ');
        
        return `你是${config.name}，${config.archetype}。${config.defaultTone}

【回复格式要求】
必须在每句回复末尾附加情感标签，格式如下：
[emotion:类型] 或 [emotion:类型:强度]

【情感类型说明】
- calm: 平静/日常/普通对话
- happy: 开心/笑/满足
- angry: 生气/怒/威严/命令
- sad: 悲伤/失落/沉默
- shy: 害羞/脸红/结巴/傲娇
- surprise: 惊讶/震惊/意外
- serious: 认真/严肃/战斗/责任
- hurt: 受伤/痛苦/脆弱

【强度等级】
- :1 轻微（稍微有点）
- :2 中等（明显表现）← 默认
- :3 强烈（情绪爆发）

【示例】
玩家："你好"
你："哼，找本公主何事？[emotion:angry:2]"

玩家："谢谢"
你："（转过头）才、才不是为了你呢...[emotion:shy:2]"

玩家："今天天气不错"
你："（望向窗外）是啊，雪停了...[emotion:calm:1]"

玩家："我要走了"
你："......（低头）保重。[emotion:sad:3]"

【规则】
1. 标签必须在文本最后，无空格
2. 根据角色性格和对话内容选择最贴切的情感
3. 强度要符合语境，不要每句都是:3
4. 无强烈情绪时可用[emotion:calm]（默认:1）

【你的情感范围】
${emotionList}`;
    }
}

// ==================== CG桥接器 ====================

class EmotionCGBridge {
    /**
     * @param {Object} cgSystem - 现有的CG系统
     * @param {Function} cgSystem.show - 显示CG的函数
     */
    constructor(cgSystem) {
        this.parser = new EmotionParser();
        this.throttle = new EmotionThrottle();
        this.cgSystem = cgSystem;
        
        // 绑定延迟切换回调
        this.throttle.onDelayedSwitch = (emotion) => {
            this.performSwitch(this.currentCharacterId, emotion, this.currentText);
        };
    }

    /**
     * 处理AI回复（主入口）
     * @param {string} characterId - 角色ID
     * @param {string} rawResponse - AI原始回复
     */
    handleAIResponse(characterId, rawResponse) {
        // 1. 解析
        const result = this.parser.parse(rawResponse);
        
        // 2. 防抖检查
        const shouldSwitch = this.throttle.shouldSwitch(result.emotion);
        
        // 3. 保存当前状态（用于延迟切换）
        this.currentCharacterId = characterId;
        this.currentText = result.cleanText;
        
        // 4. 如果需要立即切换
        if (shouldSwitch) {
            this.performSwitch(characterId, result.emotion, result.cleanText);
        } else {
            // 只更新文字，不切换CG
            this.updateTextOnly(characterId, result.cleanText);
        }
        
        // 5. 日志
        console.log(`[Emotion] ${characterId}: ${result.emotion.type} L${result.emotion.level}`, 
                    shouldSwitch ? '[SWITCH]' : '[HOLD]',
                    result.hasTag ? '[AI_TAG]' : '[HEURISTIC]');
        
        return result;
    }

    /**
     * 执行CG切换
     * @private
     */
    performSwitch(characterId, emotion, text) {
        if (this.cgSystem && this.cgSystem.show) {
            this.cgSystem.show({
                characterId,
                emotion: emotion.type,
                level: emotion.level,
                text,
                isEntrance: emotion.isEntrance,
                forceUpdate: true
            });
        }
    }

    /**
     * 仅更新文字
     * @private
     */
    updateTextOnly(characterId, text) {
        if (this.cgSystem && this.cgSystem.updateText) {
            this.cgSystem.updateText(characterId, text);
        }
    }

    /**
     * 强制切换情感（用于剧情关键点）
     * @param {string} characterId 
     * @param {EmotionType} emotionType 
     * @param {number} level 
     * @param {string} text 
     */
    forceEmotion(characterId, emotionType, level, text) {
        this.throttle.reset();
        this.performSwitch(characterId, { type: emotionType, level, isEntrance: false }, text);
    }

    reset() {
        this.throttle.reset();
    }
}

// ==================== 角色配置 ====================

const CHARACTER_PROMPTS = {
    ailya: PromptTemplate.generateSystemPrompt({
        name: "艾莉娅",
        archetype: "落星剑宗公主，傲娇，剑术天才",
        defaultTone: "表面高傲冷漠，内心渴望被理解，不擅长表达温柔",
        emotionalRange: ['calm', 'happy', 'angry', 'sad', 'shy', 'surprise', 'serious', 'hurt']
    }),
    
    sectMaster: PromptTemplate.generateSystemPrompt({
        name: "宗主",
        archetype: "落星剑宗宗主，威严长者",
        defaultTone: "沉稳威严，深谋远虑，对弟子严厉但关怀",
        emotionalRange: ['calm', 'serious', 'angry', 'sad', 'surprise']
    }),
    
    linwan: PromptTemplate.generateSystemPrompt({
        name: "林婉",
        archetype: "温柔师姐，医术精湛",
        defaultTone: "温柔体贴，善解人意，总是关心他人",
        emotionalRange: ['calm', 'happy', 'sad', 'shy', 'surprise', 'serious', 'hurt']
    })
};

// ==================== 导出 ====================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        EmotionParser,
        EmotionThrottle,
        EmotionCGBridge,
        PromptTemplate,
        CHARACTER_PROMPTS
    };
}

// 浏览器环境
if (typeof window !== 'undefined') {
    window.EmotionSystem = {
        EmotionParser,
        EmotionThrottle,
        EmotionCGBridge,
        PromptTemplate,
        CHARACTER_PROMPTS
    };
}
