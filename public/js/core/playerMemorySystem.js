/**
 * 玩家记忆系统
 * @module Core/PlayerMemorySystem
 * @description 管理玩家的记忆，独立于角色档案，从玩家视角记录重要事件
 */

/**
 * 玩家记忆类型
 * @readonly
 * @enum {string}
 */
const PlayerMemoryType = {
    CHARACTER_FIRST_MEET: 'CHARACTER_FIRST_MEET',   // 首次遇见角色
    IMPORTANT_DIALOGUE: 'IMPORTANT_DIALOGUE',       // 重要对话
    PLOT_EVENT: 'PLOT_EVENT',                       // 剧情事件
    DISCOVERY: 'DISCOVERY',                         // 发现/获取信息
    ACHIEVEMENT: 'ACHIEVEMENT',                     // 成就/里程碑
    PLAYER_FEELING: 'PLAYER_FEELING',               // 玩家感受
    WORLD_STATE: 'WORLD_STATE'                      // 世界状态变化
};

/**
 * 玩家记忆系统
 * @class PlayerMemorySystem
 */
class PlayerMemorySystem {
    constructor() {
        this.memoryTypes = PlayerMemoryType;
        this.autoDetectEnabled = true;
        this.detectionRules = this.initDetectionRules();
    }
    
    /**
     * 初始化检测规则
     * @private
     */
    initDetectionRules() {
        return {
            [PlayerMemoryType.CHARACTER_FIRST_MEET]: {
                detect: (context) => {
                    const { save, characterId } = context;
                    const memories = save.player.memories;
                    
                    // 检查是否已有首次相遇记忆
                    const existing = memories.find(m => 
                        m.type === PlayerMemoryType.CHARACTER_FIRST_MEET &&
                        m.relatedCharacters.includes(characterId)
                    );
                    
                    if (!existing && characterId) {
                        const character = save.characters[characterId];
                        if (character) {
                            return {
                                type: PlayerMemoryType.CHARACTER_FIRST_MEET,
                                title: `初见${character.name}`,
                                description: `在${save.world.location}初次遇见了${character.name}。`,
                                relatedCharacters: [characterId],
                                relatedLocation: save.world.location,
                                importance: 7,
                                isCore: true
                            };
                        }
                    }
                    return null;
                }
            },
            
            [PlayerMemoryType.IMPORTANT_DIALOGUE]: {
                detect: (context) => {
                    const { playerInput, aiReply, characterId, save } = context;
                    
                    // 关键词检测
                    const importantKeywords = [
                        { keywords: ['秘密', '真相', '身份'], title: '得知秘密', importance: 8 },
                        { keywords: ['喜欢', '在意', '心动'], title: '情感表白', importance: 9 },
                        { keywords: ['家族', '过去', '往事'], title: '了解过往', importance: 7 },
                        { keywords: ['修仙', '功法', '境界'], title: '修仙知识', importance: 5 }
                    ];
                    
                    const text = (playerInput + ' ' + aiReply).toLowerCase();
                    
                    for (const rule of importantKeywords) {
                        if (rule.keywords.some(kw => text.includes(kw))) {
                            return {
                                type: PlayerMemoryType.IMPORTANT_DIALOGUE,
                                title: rule.title,
                                description: `从对话中${rule.title}。`,
                                relatedCharacters: characterId ? [characterId] : [],
                                importance: rule.importance,
                                isCore: rule.importance >= 8
                            };
                        }
                    }
                    return null;
                }
            },
            
            [PlayerMemoryType.PLOT_EVENT]: {
                detect: (context) => {
                    const { newlySetFlags } = context;
                    
                    if (!newlySetFlags || newlySetFlags.length === 0) return null;
                    
                    const plotKeywords = {
                        'battle': { title: '经历战斗', importance: 6 },
                        'victory': { title: '获得胜利', importance: 7 },
                        'escape': { title: '惊险脱险', importance: 7 },
                        'betrayal': { title: '遭遇背叛', importance: 9, isCore: true },
                        'reunion': { title: '久别重逢', importance: 8 }
                    };
                    
                    for (const flag of newlySetFlags) {
                        for (const [keyword, config] of Object.entries(plotKeywords)) {
                            if (flag.includes(keyword)) {
                                return {
                                    type: PlayerMemoryType.PLOT_EVENT,
                                    title: config.title,
                                    description: `发生了${config.title}。`,
                                    relatedPlotFlag: flag,
                                    importance: config.importance,
                                    isCore: config.isCore || false
                                };
                            }
                        }
                    }
                    return null;
                }
            },
            
            [PlayerMemoryType.DISCOVERY]: {
                detect: (context) => {
                    const { playerInput, save } = context;
                    const text = playerInput.toLowerCase();
                    
                    const discoveryPatterns = [
                        { pattern: /发现|找到|看到|注意到/, title: '发现', importance: 5 },
                        { pattern: /获得|拿到|得到/, title: '获得物品', importance: 5 },
                        { pattern: /学会|掌握|领悟/, title: '学会技能', importance: 6 }
                    ];
                    
                    for (const rule of discoveryPatterns) {
                        if (rule.pattern.test(text)) {
                            return {
                                type: PlayerMemoryType.DISCOVERY,
                                title: rule.title,
                                description: `${rule.title}了重要的事物。`,
                                relatedLocation: save.world.location,
                                importance: rule.importance,
                                isCore: false
                            };
                        }
                    }
                    return null;
                }
            },
            
            [PlayerMemoryType.PLAYER_FEELING]: {
                detect: (context) => {
                    const { playerInput } = context;
                    const text = playerInput.toLowerCase();
                    
                    const feelingPatterns = [
                        { pattern: /我.*(心动|喜欢|爱上|在意)/, title: '心生情愫', importance: 8, isCore: true },
                        { pattern: /我.*(担心|害怕|恐惧|不安)/, title: '感到担忧', importance: 6 },
                        { pattern: /我.*(开心|高兴|欣慰)/, title: '感到开心', importance: 4 },
                        { pattern: /我.*(生气|愤怒|失望)/, title: '感到愤怒', importance: 6 }
                    ];
                    
                    for (const rule of feelingPatterns) {
                        if (rule.pattern.test(text)) {
                            return {
                                type: PlayerMemoryType.PLAYER_FEELING,
                                title: rule.title,
                                description: `我内心${rule.title}。`,
                                importance: rule.importance,
                                isCore: rule.isCore || false
                            };
                        }
                    }
                    return null;
                }
            }
        };
    }
    
    /**
     * 自动检测并添加记忆
     * @param {MemoryContext} context - 上下文
     * @returns {PlayerMemoryEntry[]} 添加的记忆列表
     */
    autoDetect(context) {
        if (!this.autoDetectEnabled) return [];
        
        const addedMemories = [];
        
        for (const [type, rule] of Object.entries(this.detectionRules)) {
            try {
                const memory = rule.detect(context);
                if (memory) {
                    // 避免重复添加相同类型的记忆（同一角色/地点/标记）
                    if (!this.isDuplicate(memory, context.save.player.memories)) {
                        addedMemories.push(memory);
                    }
                }
            } catch (e) {
                console.error(`[PlayerMemorySystem] Detection failed for ${type}:`, e);
            }
        }
        
        return addedMemories;
    }
    
    /**
     * 检查是否重复
     * @private
     */
    isDuplicate(newMemory, existingMemories) {
        const recentMemories = existingMemories.filter(m => {
            // 10分钟内的记忆
            return (Date.now() - m.createdAt) < 10 * 60 * 1000;
        });
        
        return recentMemories.some(m => {
            // 同一类型
            if (m.type !== newMemory.type) return false;
            
            // 同一角色
            if (newMemory.relatedCharacters && m.relatedCharacters) {
                const commonChars = newMemory.relatedCharacters.filter(c => 
                    m.relatedCharacters.includes(c)
                );
                if (commonChars.length > 0) return true;
            }
            
            // 同一地点
            if (newMemory.relatedLocation && m.relatedLocation === newMemory.relatedLocation) {
                return true;
            }
            
            // 同一剧情标记
            if (newMemory.relatedPlotFlag && m.relatedPlotFlag === newMemory.relatedPlotFlag) {
                return true;
            }
            
            return false;
        });
    }
    
    /**
     * 手动添加记忆
     * @param {Object} save - 存档对象
     * @param {Partial<PlayerMemoryEntry>} memoryData - 记忆数据
     * @returns {string} 记忆ID
     */
    addMemory(save, memoryData) {
        if (!save.player) {
            save.player = {
                memories: [],
                shortTerm: [],
                longTerm: [],
                core: [],
                bookmarks: [],
                tags: []
            };
        }
        
        const pmId = `pm_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        
        const entry = {
            id: pmId,
            type: memoryData.type || 'GENERAL',
            createdAt: Date.now(),
            gameTime: { ...save.world.gameTime },
            title: memoryData.title || '未命名记忆',
            description: memoryData.description || '',
            relatedCharacters: memoryData.relatedCharacters || [],
            relatedLocation: memoryData.relatedLocation || '',
            relatedPlotFlag: memoryData.relatedPlotFlag || '',
            importance: memoryData.importance || 5,
            isCore: memoryData.isCore || false,
            referencedCount: 0,
            lastReferenced: null,
            playerNote: memoryData.playerNote || '',
            isHidden: false
        };
        
        save.player.memories.push(entry);
        
        // 更新分层
        this.organizeLayers(save.player);
        
        console.log('[PlayerMemorySystem] Memory added:', pmId, entry.title);
        return pmId;
    }
    
    /**
     * 更新记忆分层
     * @private
     */
    organizeLayers(player) {
        const memories = player.memories.filter(m => !m.isHidden);
        
        // 短期：最近7条
        player.shortTerm = memories
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 7)
            .map(m => m.id);
        
        // 长期：重要度>5且非核心
        player.longTerm = memories
            .filter(m => m.importance > 5 && !m.isCore)
            .sort((a, b) => b.importance - a.importance)
            .map(m => m.id);
        
        // 核心：isCore
        player.core = memories
            .filter(m => m.isCore)
            .map(m => m.id);
    }
    
    /**
     * 获取记忆用于Prompt
     * @param {Object} save - 存档
     * @param {number} limit - 数量限制
     * @param {Object} options - 选项
     * @returns {PlayerMemoryEntry[]}
     */
    getMemoriesForPrompt(save, limit = 5, options = {}) {
        if (!save.player) return [];
        
        const player = save.player;
        let memoryIds = [...player.core, ...player.shortTerm, ...player.longTerm];
        
        // 去重
        memoryIds = [...new Set(memoryIds)];
        
        // 按角色过滤
        if (options.characterId) {
            memoryIds = memoryIds.filter(id => {
                const m = player.memories.find(mm => mm.id === id);
                return m && m.relatedCharacters.includes(options.characterId);
            });
        }
        
        // 限制数量
        memoryIds = memoryIds.slice(0, limit);
        
        return memoryIds
            .map(id => player.memories.find(m => m.id === id))
            .filter(Boolean);
    }
    
    /**
     * 引用记忆（增加引用计数）
     * @param {Object} save - 存档
     * @param {string} pmId - 记忆ID
     */
    referenceMemory(save, pmId) {
        if (!save.player) return;
        
        const memory = save.player.memories.find(m => m.id === pmId);
        if (memory) {
            memory.referencedCount++;
            memory.lastReferenced = Date.now();
        }
    }
    
    /**
     * 收藏/取消收藏
     * @param {Object} save - 存档
     * @param {string} pmId - 记忆ID
     * @returns {boolean} 新的收藏状态
     */
    toggleBookmark(save, pmId) {
        if (!save.player) return false;
        
        const bookmarks = save.player.bookmarks;
        const index = bookmarks.indexOf(pmId);
        
        if (index > -1) {
            bookmarks.splice(index, 1);
            return false;
        } else {
            bookmarks.push(pmId);
            return true;
        }
    }
    
    /**
     * 搜索记忆
     * @param {Object} save - 存档
     * @param {string} query - 搜索词
     * @returns {PlayerMemoryEntry[]}
     */
    search(save, query) {
        if (!save.player) return [];
        
        const lowerQuery = query.toLowerCase();
        
        return save.player.memories.filter(m => {
            if (m.isHidden) return false;
            
            return m.title.toLowerCase().includes(lowerQuery) ||
                   m.description.toLowerCase().includes(lowerQuery) ||
                   m.playerNote.toLowerCase().includes(lowerQuery);
        });
    }
    
    /**
     * 设置自动检测
     * @param {boolean} enabled
     */
    setAutoDetect(enabled) {
        this.autoDetectEnabled = enabled;
    }
}

/**
 * 记忆上下文
 * @typedef {Object} MemoryContext
 * @property {Object} save - 存档数据
 * @property {string} characterId - 当前对话角色ID
 * @property {string} playerInput - 玩家输入
 * @property {string} aiReply - AI回复
 * @property {string[]} newlySetFlags - 新设置的剧情标记
 */

/**
 * 玩家记忆条目
 * @typedef {Object} PlayerMemoryEntry
 * @property {string} id - 记忆ID
 * @property {PlayerMemoryType} type - 记忆类型
 * @property {number} createdAt - 创建时间戳
 * @property {GameTime} gameTime - 游戏内时间
 * @property {string} title - 标题
 * @property {string} description - 描述
 * @property {string[]} relatedCharacters - 相关角色
 * @property {string} relatedLocation - 相关地点
 * @property {string} relatedPlotFlag - 相关剧情标记
 * @property {number} importance - 重要度（1-10）
 * @property {boolean} isCore - 是否核心记忆
 * @property {number} referencedCount - 引用次数
 * @property {number} lastReferenced - 最后引用时间
 * @property {string} playerNote - 玩家备注
 * @property {boolean} isHidden - 是否隐藏
 */

// 创建全局实例
const playerMemorySystem = new PlayerMemorySystem();

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        PlayerMemoryType, 
        PlayerMemorySystem, 
        playerMemorySystem 
    };
}
