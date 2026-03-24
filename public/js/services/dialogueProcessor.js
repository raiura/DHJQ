/**
 * 对话处理器 - 整合经历生成和玩家记忆系统
 * @module Services/DialogueProcessor
 * @description 处理对话流程，自动触发经历生成和记忆记录
 */

/**
 * 对话处理器
 * @class DialogueProcessor
 */
class DialogueProcessor {
    constructor() {
        this.processingQueue = [];
        this.isProcessing = false;
        this.lastFavorValues = new Map(); // 记录上次的好感度
        this.enableExperienceGeneration = true;
        this.enablePlayerMemory = true;
    }
    
    /**
     * 初始化处理器
     * @param {Object} options - 配置选项
     */
    init(options = {}) {
        this.enableExperienceGeneration = options.enableExperience !== false;
        this.enablePlayerMemory = options.enableMemory !== false;
        
        console.log('[DialogueProcessor] Initialized:', {
            experienceGeneration: this.enableExperienceGeneration,
            playerMemory: this.enablePlayerMemory
        });
    }
    
    /**
     * 处理对话提交前（准备阶段）
     * @param {string} characterId - 角色ID
     * @returns {Object} 处理前状态快照
     */
    beforeDialogue(characterId) {
        const save = chapterSaveManager.getCurrentSlot();
        if (!save) return null;
        
        const character = chapterSaveManager.getCharacterState(characterId);
        if (!character) return null;
        
        // 记录当前状态
        const snapshot = {
            characterId,
            characterName: character.name,
            previousFavor: character.favor,
            location: save.world.location,
            weather: save.world.weather,
            gameTime: { ...save.world.gameTime },
            timestamp: Date.now()
        };
        
        // 保存到历史
        this.lastFavorValues.set(characterId, character.favor);
        
        return snapshot;
    }
    
    /**
     * 处理对话回复后（生成阶段）
     * @param {Object} snapshot - 之前的状态快照
     * @param {string} playerInput - 玩家输入
     * @param {string} aiReply - AI回复
     * @param {Object} options - 额外选项
     * @returns {Promise<ProcessResult>}
     */
    async afterDialogue(snapshot, playerInput, aiReply, options = {}) {
        if (!snapshot) return { experiences: [], memories: [] };
        
        const results = {
            experiences: [],
            memories: [],
            favorChanged: false
        };
        
        const save = chapterSaveManager.getCurrentSlot();
        if (!save) return results;
        
        // 1. 检测好感度变化（从AI回复中解析或从选项中获取）
        const favorDelta = options.favorDelta || 0;
        if (favorDelta !== 0) {
            const currentFavor = snapshot.previousFavor + favorDelta;
            chapterSaveManager.setFavorOverride(snapshot.characterId, currentFavor);
            results.favorChanged = true;
            results.newFavor = currentFavor;
        }
        
        // 2. 获取新设置的剧情标记
        const newlySetFlags = options.newlySetFlags || [];
        
        // 3. 构建触发器上下文
        const triggerContext = {
            characterId: snapshot.characterId,
            character: chapterSaveManager.getCharacterState(snapshot.characterId),
            previousFavor: snapshot.previousFavor,
            playerInput,
            aiReply,
            save,
            newlySetFlags
        };
        
        // 4. 生成经历
        if (this.enableExperienceGeneration && typeof experienceTriggerEngine !== 'undefined') {
            const triggers = experienceTriggerEngine.checkAll(triggerContext);
            
            for (const trigger of triggers) {
                try {
                    const experience = await experienceGenerator.generate(trigger, triggerContext);
                    if (experience) {
                        const expId = chapterSaveManager.addGeneratedExperience(
                            snapshot.characterId,
                            experience
                        );
                        results.experiences.push({
                            id: expId,
                            title: experience.title,
                            type: trigger.type
                        });
                    }
                } catch (e) {
                    console.error('[DialogueProcessor] Experience generation failed:', e);
                }
            }
        }
        
        // 5. 检测玩家记忆
        if (this.enablePlayerMemory && typeof playerMemorySystem !== 'undefined') {
            const newMemories = playerMemorySystem.autoDetect(triggerContext);
            
            for (const memory of newMemories) {
                const pmId = playerMemorySystem.addMemory(save, memory);
                results.memories.push({
                    id: pmId,
                    title: memory.title,
                    type: memory.type
                });
            }
        }
        
        // 6. 如果有任何更改，触发保存
        if (results.experiences.length > 0 || results.memories.length > 0 || results.favorChanged) {
            chapterSaveManager.markModified();
        }
        
        // 7. 记录日志
        console.log('[DialogueProcessor] Processed:', {
            character: snapshot.characterName,
            favorDelta: options.favorDelta || 0,
            experiencesGenerated: results.experiences.length,
            memoriesAdded: results.memories.length
        });
        
        return results;
    }
    
    /**
     * 完整的对话处理流程
     * @param {string} characterId - 角色ID
     * @param {string} playerInput - 玩家输入
     * @param {Function} generateAIResponse - AI生成函数
     * @returns {Promise<Object>}
     */
    async processDialogue(characterId, playerInput, generateAIResponse) {
        // 准备阶段
        const snapshot = this.beforeDialogue(characterId);
        
        // 调用AI生成回复
        const aiReply = await generateAIResponse(playerInput);
        
        // 处理阶段
        // 注意：favorDelta 需要从AI回复中解析，暂时设为0
        const results = await this.afterDialogue(snapshot, playerInput, aiReply, {
            favorDelta: 0  // TODO: 从AI回复中解析好感度变化
        });
        
        return {
            aiReply,
            ...results
        };
    }
    
    /**
     * 标记经历为已揭示
     * @param {string} characterId - 角色ID
     * @param {string} expId - 经历ID
     * @param {string} dialogueId - 提及的对话ID
     */
    revealExperience(characterId, expId, dialogueId) {
        chapterSaveManager.revealExperience(characterId, expId, dialogueId);
    }
    
    /**
     * 获取用于构建Prompt的数据
     * @param {string} characterId - 角色ID
     * @returns {PromptData}
     */
    getPromptData(characterId) {
        const save = chapterSaveManager.getCurrentSlot();
        if (!save) return null;
        
        const char = chapterSaveManager.getCharacterState(characterId);
        if (!char) return null;
        
        // 已揭示的经历
        const revealedExps = char.experiences.filter(e => e.isRevealed);
        
        // 未揭示但高冲击的经历（用于AI暗示）
        const hintExps = chapterSaveManager.getUnrevealedHighImpactExperiences(characterId, 7);
        
        // 玩家相关记忆
        let memories = [];
        if (typeof playerMemorySystem !== 'undefined') {
            memories = playerMemorySystem.getMemoriesForPrompt(save, 5, { characterId });
        }
        
        return {
            character: char,
            revealedExperiences: revealedExps,
            hintExperiences: hintExps,
            playerMemories: memories
        };
    }
    
    /**
     * 构建系统提示词
     * @param {string} characterId - 角色ID
     * @param {string} basePrompt - 基础提示词
     * @returns {string}
     */
    buildSystemPrompt(characterId, basePrompt = '') {
        const data = this.getPromptData(characterId);
        if (!data) return basePrompt;
        
        let prompt = basePrompt || '';
        
        // 添加已揭示的经历
        if (data.revealedExperiences.length > 0) {
            prompt += '\n\n【角色已知的共同经历】（角色会在对话中自然提及这些）：\n';
            prompt += data.revealedExperiences
                .map(e => `- ${e.title}：${e.description}`)
                .join('\n');
        }
        
        // 添加暗示性经历（未揭示但高冲击）
        if (data.hintExperiences.length > 0) {
            prompt += '\n\n【未完全透露但影响角色行为的经历】（通过暗示体现，不要直接提及标题）：\n';
            prompt += data.hintExperiences
                .map(e => `- ${e.description}`)
                .join('\n');
        }
        
        // 添加玩家记忆
        if (data.playerMemories.length > 0) {
            prompt += '\n\n【玩家记忆中的相关事件】：\n';
            prompt += data.playerMemories
                .map(m => `- ${m.title}：${m.description}`)
                .join('\n');
        }
        
        return prompt;
    }
    
    /**
     * 启用/禁用经历生成
     * @param {boolean} enabled
     */
    setExperienceGeneration(enabled) {
        this.enableExperienceGeneration = enabled;
    }
    
    /**
     * 启用/禁用玩家记忆
     * @param {boolean} enabled
     */
    setPlayerMemory(enabled) {
        this.enablePlayerMemory = enabled;
    }
}

/**
 * 处理结果
 * @typedef {Object} ProcessResult
 * @property {Array} experiences - 生成的经历列表
 * @property {Array} memories - 添加的记忆列表
 * @property {boolean} favorChanged - 好感度是否变化
 * @property {number} [newFavor] - 新的好感度值
 */

/**
 * Prompt数据
 * @typedef {Object} PromptData
 * @property {Object} character - 角色数据
 * @property {ExperienceEntry[]} revealedExperiences - 已揭示的经历
 * @property {ExperienceEntry[]} hintExperiences - 暗示性经历
 * @property {PlayerMemoryEntry[]} playerMemories - 玩家记忆
 */

// 创建全局实例
const dialogueProcessor = new DialogueProcessor();

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DialogueProcessor, dialogueProcessor };
}
