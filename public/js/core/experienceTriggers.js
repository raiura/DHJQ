/**
 * 经历触发器系统 - 定义自动生成经历的触发条件
 * @module Core/ExperienceTriggers
 * @description 提供多种触发器类型，用于自动生成角色经历
 */

/**
 * 触发条件类型
 * @readonly
 * @enum {string}
 */
const TriggerType = {
    FAVOR_THRESHOLD: 'FAVOR_THRESHOLD',      // 好感度突破阈值
    DIALOGUE_PATTERN: 'DIALOGUE_PATTERN',    // 对话模式匹配
    LOCATION_TIME: 'LOCATION_TIME',          // 特定地点+时间
    PLOT_MILESTONE: 'PLOT_MILESTONE',        // 剧情里程碑
    COMPOUND: 'COMPOUND'                     // 复合条件
};

/**
 * 触发器配置库
 * @constant {Object}
 */
const TriggerConfigs = {
    // 好感度突破触发器
    [TriggerType.FAVOR_THRESHOLD]: {
        // 阈值配置
        thresholds: [
            { level: 30, titlePool: ['初识好感', '渐生好感', '心墙初开'], description: '关系进入友好阶段' },
            { level: 60, titlePool: ['情愫暗生', '心意相通', '渐生情愫'], description: '关系变得亲密' },
            { level: 90, titlePool: ['至死不渝', '情深似海', '生死与共'], description: '达到最深的羁绊' }
        ],
        
        // 检查函数
        check: (context) => {
            const { character, previousFavor } = context;
            if (!previousFavor) return null;
            
            for (const th of TriggerConfigs.FAVOR_THRESHOLD.thresholds) {
                if (previousFavor < th.level && character.favor >= th.level) {
                    return {
                        type: TriggerType.FAVOR_THRESHOLD,
                        data: {
                            threshold: th.level,
                            previousFavor,
                            currentFavor: character.favor,
                            titlePool: th.titlePool,
                            description: th.description
                        }
                    };
                }
            }
            return null;
        }
    },
    
    // 对话模式触发器
    [TriggerType.DIALOGUE_PATTERN]: {
        // 模式定义
        patterns: [
            {
                name: 'confession',
                displayName: '真情流露',
                keywords: ['喜欢', '在意', '心动', '在一起', '陪伴'],
                titlePool: ['意外坦白', '真心流露', '深夜倾诉'],
                description: '一方表达了真挚的情感',
                minConfidence: 1  // 至少匹配1个关键词
            },
            {
                name: 'apology',
                displayName: '和解时刻',
                keywords: ['对不起', '抱歉', '原谅', '误会', '不是故意'],
                titlePool: ['误会冰释', '真诚道歉', '重归于好'],
                description: '双方化解了误会或矛盾',
                minConfidence: 1
            },
            {
                name: 'conflict',
                displayName: '冲突时刻',
                keywords: ['生气', '失望', '欺骗', '背叛', '为什么骗'],
                titlePool: ['信任危机', '愤怒对峙', '心生芥蒂'],
                description: '发生了不愉快或冲突',
                minConfidence: 1
            },
            {
                name: 'comfort',
                displayName: '温情时刻',
                keywords: ['别怕', '有我在', '保护', '守护', '不哭'],
                titlePool: ['温柔守护', '并肩作战', '雪中送炭'],
                description: '在困难时给予支持和安慰',
                minConfidence: 1
            },
            {
                name: 'teasing',
                displayName: '打趣时刻',
                keywords: ['笨蛋', '傻瓜', '有趣', '可爱', '脸红'],
                titlePool: ['调侃打趣', '逗趣时刻', '捉弄一番'],
                description: '轻松愉快的打趣互动',
                minConfidence: 1
            }
        ],
        
        check: (context) => {
            const { playerInput, aiReply } = context;
            const text = (playerInput + ' ' + aiReply).toLowerCase();
            
            for (const pattern of TriggerConfigs.DIALOGUE_PATTERN.patterns) {
                let matchCount = 0;
                const matchedKeywords = [];
                
                for (const keyword of pattern.keywords) {
                    if (text.includes(keyword)) {
                        matchCount++;
                        matchedKeywords.push(keyword);
                    }
                }
                
                if (matchCount >= pattern.minConfidence) {
                    return {
                        type: TriggerType.DIALOGUE_PATTERN,
                        data: {
                            patternName: pattern.name,
                            displayName: pattern.displayName,
                            matchedKeywords,
                            matchCount,
                            titlePool: pattern.titlePool,
                            description: pattern.description,
                            playerInput: playerInput.substring(0, 50),
                            aiReply: aiReply.substring(0, 50)
                        }
                    };
                }
            }
            return null;
        }
    },
    
    // 地点时间触发器
    [TriggerType.LOCATION_TIME]: {
        // 特殊时空组合
        combos: [
            {
                name: 'snow_night',
                displayName: '雪夜',
                locationKeywords: ['阳台', '庭院', '屋顶', '窗外'],
                timeRange: [20, 24], // 20:00 - 24:00
                weather: 'snow',
                titlePool: ['雪夜归人', '月下独酌', '雪中共赏'],
                description: '在飘雪的夜晚共度时光'
            },
            {
                name: 'dawn_meeting',
                displayName: '黎明之约',
                locationKeywords: ['山门', '峰顶', '崖边', '高处'],
                timeRange: [5, 7], // 5:00 - 7:00
                weather: null, // 任意天气
                titlePool: ['晨光微熹', '日出之约', '黎明时分'],
                description: '在黎明时分相遇'
            },
            {
                name: 'rainy_night',
                displayName: '雨夜',
                locationKeywords: ['屋檐', '室内', '书房', '客房'],
                timeRange: [21, 24],
                weather: 'rain',
                titlePool: ['夜雨寄北', '听雨对谈', '雨夜闲谈'],
                description: '在雨夜中相伴'
            }
        ],
        
        check: (context) => {
            const { save } = context;
            const { location, weather, gameTime } = save.world;
            const hour = gameTime.hour;
            
            for (const combo of TriggerConfigs.LOCATION_TIME.combos) {
                // 检查地点
                const locationMatch = combo.locationKeywords.some(kw => 
                    location.includes(kw)
                );
                
                // 检查时间
                const timeMatch = hour >= combo.timeRange[0] && hour <= combo.timeRange[1];
                
                // 检查天气（如果指定）
                const weatherMatch = !combo.weather || weather === combo.weather;
                
                if (locationMatch && timeMatch && weatherMatch) {
                    return {
                        type: TriggerType.LOCATION_TIME,
                        data: {
                            comboName: combo.name,
                            displayName: combo.displayName,
                            location,
                            weather,
                            hour,
                            titlePool: combo.titlePool,
                            description: combo.description
                        }
                    };
                }
            }
            return null;
        }
    },
    
    // 剧情里程碑触发器
    [TriggerType.PLOT_MILESTONE]: {
        // 需要在剧情系统中设置标记
        milestones: [
            { flag: 'first_battle_together', titlePool: ['并肩首战', '初战告捷'], description: '首次并肩作战' },
            { flag: 'secret_revealed', titlePool: ['秘密揭露', '真相大白'], description: '重要秘密被揭示' },
            { flag: 'life_saved', titlePool: ['救命之恩', '生死一线'], description: '救了对方性命' },
            { flag: 'gift_exchanged', titlePool: ['心意相赠', '珍贵礼物'], description: '交换了重要礼物' }
        ],
        
        check: (context) => {
            const { save, newlySetFlags } = context;
            
            if (!newlySetFlags || newlySetFlags.length === 0) return null;
            
            for (const flag of newlySetFlags) {
                const milestone = TriggerConfigs.PLOT_MILESTONE.milestones.find(m => m.flag === flag);
                if (milestone) {
                    return {
                        type: TriggerType.PLOT_MILESTONE,
                        data: {
                            flag,
                            titlePool: milestone.titlePool,
                            description: milestone.description
                        }
                    };
                }
            }
            return null;
        }
    }
};

/**
 * 触发器引擎
 * @class ExperienceTriggerEngine
 */
class ExperienceTriggerEngine {
    constructor() {
        this.triggerConfigs = TriggerConfigs;
        this.cooldowns = new Map(); // 冷却时间记录
        this.COOLDOWN_MS = 60 * 1000; // 1分钟冷却
    }
    
    /**
     * 检查所有触发条件
     * @param {TriggerContext} context - 触发上下文
     * @returns {TriggerResult[]} 触发的结果列表
     */
    checkAll(context) {
        const results = [];
        
        for (const [type, config] of Object.entries(this.triggerConfigs)) {
            // 检查冷却
            if (this.isOnCooldown(context.characterId, type)) {
                continue;
            }
            
            // 执行检查
            const result = config.check(context);
            if (result) {
                results.push(result);
                this.setCooldown(context.characterId, type);
            }
        }
        
        return results;
    }
    
    /**
     * 检查特定触发器
     * @param {string} type - 触发器类型
     * @param {TriggerContext} context - 上下文
     * @returns {TriggerResult|null}
     */
    check(type, context) {
        const config = this.triggerConfigs[type];
        if (!config) return null;
        
        if (this.isOnCooldown(context.characterId, type)) {
            return null;
        }
        
        const result = config.check(context);
        if (result) {
            this.setCooldown(context.characterId, type);
        }
        
        return result;
    }
    
    /**
     * 检查是否在冷却中
     * @private
     */
    isOnCooldown(characterId, triggerType) {
        const key = `${characterId}_${triggerType}`;
        const lastTrigger = this.cooldowns.get(key);
        if (!lastTrigger) return false;
        
        return Date.now() - lastTrigger < this.COOLDOWN_MS;
    }
    
    /**
     * 设置冷却
     * @private
     */
    setCooldown(characterId, triggerType) {
        const key = `${characterId}_${triggerType}`;
        this.cooldowns.set(key, Date.now());
    }
    
    /**
     * 重置冷却
     * @param {string} characterId - 角色ID
     */
    resetCooldowns(characterId) {
        for (const key of this.cooldowns.keys()) {
            if (key.startsWith(`${characterId}_`)) {
                this.cooldowns.delete(key);
            }
        }
    }
    
    /**
     * 获取触发器配置
     * @param {string} type - 触发器类型
     * @returns {Object}
     */
    getConfig(type) {
        return this.triggerConfigs[type];
    }
}

/**
 * 触发上下文
 * @typedef {Object} TriggerContext
 * @property {string} characterId - 角色ID
 * @property {Object} character - 角色数据
 * @property {number} previousFavor - 之前的好感度
 * @property {string} playerInput - 玩家输入
 * @property {string} aiReply - AI回复
 * @property {Object} save - 存档数据
 * @property {string[]} newlySetFlags - 新设置的剧情标记
 */

/**
 * 触发结果
 * @typedef {Object} TriggerResult
 * @property {TriggerType} type - 触发类型
 * @property {Object} data - 触发数据
 */

// 创建全局实例
const experienceTriggerEngine = new ExperienceTriggerEngine();

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        TriggerType, 
        TriggerConfigs, 
        ExperienceTriggerEngine, 
        experienceTriggerEngine 
    };
}
