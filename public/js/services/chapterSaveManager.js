/**
 * 章节存档管理器 - 双系统架构（NPC经历 + 玩家记忆）
 * @module Services/ChapterSaveManager
 * @description 管理章节存档，支持自动生成经历的双系统架构
 */

/**
 * 章节存档管理器
 * @class ChapterSaveManager
 */
class ChapterSaveManager {
    constructor() {
        this.currentSlot = null;
        this.cache = new Map();
        
        // 存储键名
        this.KEYS = {
            SAVE_PREFIX: 'chapter_save_v2_',  // v2版本前缀，区分旧存档
            SAVE_INDEX: 'chapter_save_index_v2',
            CURRENT_SLOT: 'chapter_current_save_v2'
        };
        
        // 自动保存定时器
        this.autoSaveTimer = null;
        this.AUTO_SAVE_INTERVAL = 5 * 60 * 1000; // 5分钟
        
        // 经历ID计数器
        this.expCounter = 0;
        
        this.init();
    }
    
    /**
     * 初始化
     */
    init() {
        const savedId = localStorage.getItem(this.KEYS.CURRENT_SLOT);
        if (savedId) {
            this.loadSlot(savedId);
        }
        this.startAutoSave();
        console.log('[ChapterSaveManager] Initialized');
    }
    
    // ==================== 存档生命周期 ====================
    
    /**
     * 创建新存档（从指定章节开始）- 双系统架构
     * @param {string} name - 存档名称
     * @param {string} startChapterId - 起始章节ID
     * @returns {SaveSlot}
     */
    createSlot(name, startChapterId) {
        const chapter = ChapterDB.get(startChapterId);
        if (!chapter) {
            throw new Error(`Chapter not found: ${startChapterId}`);
        }
        
        const slot = {
            id: `save_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            version: '2.0',  // 存档版本标记
            name: name || `${chapter.name} 新存档`,
            createdAt: Date.now(),
            lastPlayed: Date.now(),
            
            // 时间线定位
            startChapter: startChapterId,
            currentChapter: startChapterId,
            
            // 世界状态（继承章节默认值）
            world: {
                gameTime: {...chapter.unlockTime},
                location: chapter.defaultWorld.location,
                weather: chapter.defaultWorld.weather,
                flags: {...chapter.defaultWorld.flags}
            },
            
            // ========== 双系统架构 ==========
            
            // 1. NPC角色经历系统（自动生成+可编辑）
            characters: {},
            
            // 2. 玩家独立记忆系统（新！）
            player: {
                memories: [],           // 玩家记忆条目
                shortTerm: [],          // 短期记忆ID列表（最近7条）
                longTerm: [],           // 长期记忆ID列表（重要度>5）
                core: [],               // 核心记忆ID列表（永不忘）
                bookmarks: [],          // 收藏的记忆ID
                tags: []                // 自定义标签
            },
            
            // 玩家修改记录（NPC经历的玩家覆盖）
            playerOverrides: {
                characters: {}
            },
            
            // 对话历史（完整记录）
            dialogueHistory: [],
            
            // 统计
            stats: {
                totalDialogues: 0,
                totalExperiencesGenerated: 0,
                totalPlayerMemories: 0
            }
        };
        
        // 初始化角色（应用章节默认值）
        this.initializeCharactersFromChapter(slot, startChapterId);
        
        // 缓存并保存
        this.cache.set(slot.id, slot);
        this.saveToStorage(slot);
        this.updateSaveIndex(slot);
        
        console.log('[ChapterSaveManager] Created slot:', slot.id, 'from chapter:', startChapterId);
        return slot;
    }
    
    /**
     * 加载存档
     * @param {string} slotId - 存档ID
     * @returns {SaveSlot|null}
     */
    loadSlot(slotId) {
        // 从缓存读取
        if (this.cache.has(slotId)) {
            this.currentSlot = this.cache.get(slotId);
            this.currentSlot.lastPlayed = Date.now();
            console.log('[ChapterSaveManager] Loaded from cache:', slotId);
            return this.currentSlot;
        }
        
        // 从localStorage读取
        const data = localStorage.getItem(this.KEYS.SAVE_PREFIX + slotId);
        if (!data) {
            console.warn('[ChapterSaveManager] Slot not found:', slotId);
            return null;
        }
        
        try {
            const slot = JSON.parse(data);
            
            // 重新计算角色状态（应用玩家覆盖）
            this.recalculateState(slot);
            
            this.cache.set(slotId, slot);
            this.currentSlot = slot;
            slot.lastPlayed = Date.now();
            
            localStorage.setItem(this.KEYS.CURRENT_SLOT, slotId);
            console.log('[ChapterSaveManager] Loaded:', slotId);
            return slot;
        } catch (e) {
            console.error('[ChapterSaveManager] Failed to load slot:', e);
            return null;
        }
    }
    
    /**
     * 获取当前存档
     * @returns {SaveSlot|null}
     */
    getCurrentSlot() {
        return this.currentSlot;
    }
    
    /**
     * 获取所有存档列表
     * @returns {Array<{id: string, name: string, startChapter: string, lastPlayed: number}>}
     */
    getAllSlots() {
        const index = localStorage.getItem(this.KEYS.SAVE_INDEX);
        return index ? JSON.parse(index) : [];
    }
    
    /**
     * 删除存档
     * @param {string} slotId - 存档ID
     */
    deleteSlot(slotId) {
        localStorage.removeItem(this.KEYS.SAVE_PREFIX + slotId);
        this.cache.delete(slotId);
        
        const index = this.getAllSlots().filter(s => s.id !== slotId);
        localStorage.setItem(this.KEYS.SAVE_INDEX, JSON.stringify(index));
        
        if (this.currentSlot?.id === slotId) {
            this.currentSlot = null;
            localStorage.removeItem(this.KEYS.CURRENT_SLOT);
        }
    }
    
    /**
     * 复制存档
     * @param {string} sourceId - 源存档ID
     * @param {string} newName - 新名称
     * @returns {SaveSlot}
     */
    copySlot(sourceId, newName) {
        const source = this.cache.get(sourceId) || 
                      JSON.parse(localStorage.getItem(this.KEYS.SAVE_PREFIX + sourceId));
        if (!source) throw new Error('Source slot not found');
        
        const copy = JSON.parse(JSON.stringify(source));
        copy.id = `save_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        copy.name = newName || source.name + ' (副本)';
        copy.createdAt = Date.now();
        copy.lastPlayed = Date.now();
        
        this.cache.set(copy.id, copy);
        this.saveToStorage(copy);
        
        return copy;
    }
    
    // ==================== 角色状态管理 ====================
    
    /**
     * 从章节模板初始化角色
     * @private
     */
    initializeCharactersFromChapter(slot, chapterId) {
        const chapter = ChapterDB.get(chapterId);
        if (!chapter) return;
        
        for (const [charId, defaultState] of Object.entries(chapter.defaultCharacters)) {
            slot.characters[charId] = {
                characterId: charId,
                // 基础数值（会被覆盖）
                favor: defaultState.favor,
                trust: defaultState.trust,
                intimacy: defaultState.intimacy,
                location: defaultState.location,
                mood: defaultState.mood,
                // 经历（会被覆盖）
                experiences: defaultState.experiences.map(expId => ({
                    templateId: expId,
                    unlockedAt: {...chapter.unlockTime},
                    isRevealed: true,
                    playerNote: '',
                    customDescription: ''
                })),
                secrets: [...defaultState.secrets],
                // 记忆系统
                memories: {
                    shortTerm: [],
                    longTerm: [],
                    core: []
                },
                dialogueLog: []
            };
        }
    }
    
    /**
     * 重新计算角色状态（应用玩家覆盖）
     * @private
     */
    recalculateState(slot) {
        const chapter = ChapterDB.get(slot.startChapter);
        if (!chapter) return;
        
        for (const [charId, charState] of Object.entries(slot.characters)) {
            const defaultState = chapter.defaultCharacters[charId];
            const override = slot.playerOverrides.characters[charId];
            
            if (!defaultState) continue;
            
            // 应用好感度覆盖
            if (override?.favorDelta !== undefined) {
                charState.favor = defaultState.favor + override.favorDelta;
            }
            if (override?.trustDelta !== undefined) {
                charState.trust = defaultState.trust + override.trustDelta;
            }
            
            // 应用心情覆盖
            if (override?.moodOverride) {
                charState.mood = override.moodOverride;
            }
            
            // 应用位置覆盖
            if (override?.locationOverride) {
                charState.location = override.locationOverride;
            }
            
            // 应用经历修改
            if (override?.experienceModifications) {
                const { added, removed, edited } = override.experienceModifications;
                
                // 基础经历
                let experiences = [...defaultState.experiences];
                
                // 移除
                if (removed) {
                    experiences = experiences.filter(id => !removed.includes(id));
                }
                
                // 添加
                if (added) {
                    experiences.push(...added);
                }
                
                // 重建经历列表
                charState.experiences = experiences.map(expId => {
                    const template = ExperienceDB.get(expId);
                    const edit = edited?.[expId];
                    
                    return {
                        templateId: expId,
                        title: template?.title || expId,
                        description: edit?.customDescription || template?.description || '',
                        unlockedAt: {...chapter.unlockTime},
                        isRevealed: true,
                        playerNote: edit?.playerNote || '',
                        isModified: !!edit,
                        isAdded: added?.includes(expId),
                        isRemoved: false
                    };
                });
            }
        }
    }
    
    /**
     * 获取角色状态
     * @param {string} characterId - 角色ID
     * @returns {SaveCharacterState|null}
     */
    getCharacterState(characterId) {
        if (!this.currentSlot) return null;
        return this.currentSlot.characters[characterId] || null;
    }
    
    /**
     * 更新角色好感度（游戏内变化）
     * @param {string} characterId - 角色ID
     * @param {number} delta - 变化值
     */
    updateFavor(characterId, delta) {
        const char = this.getCharacterState(characterId);
        if (!char) return;
        
        char.favor = Math.max(-100, Math.min(100, char.favor + delta));
        this.markModified();
    }
    
    /**
     * 更新角色信任度
     * @param {string} characterId - 角色ID
     * @param {number} delta - 变化值
     */
    updateTrust(characterId, delta) {
        const char = this.getCharacterState(characterId);
        if (!char) return;
        
        char.trust = Math.max(0, Math.min(100, char.trust + delta));
        this.markModified();
    }
    
    /**
     * 更新角色状态
     * @param {string} characterId - 角色ID
     * @param {Object} updates - 更新字段
     */
    updateCharacterStatus(characterId, updates) {
        const char = this.getCharacterState(characterId);
        if (!char) return;
        
        Object.assign(char, updates);
        this.markModified();
    }
    
    /**
     * 添加对话记录
     * @param {string} characterId - 角色ID
     * @param {Object} message - 消息
     */
    addDialogue(characterId, message) {
        const char = this.getCharacterState(characterId);
        if (!char) return;
        
        char.dialogueLog.push(message);
        
        // 添加到存档全局历史
        this.currentSlot.dialogueHistory.push({
            ...message,
            characterId
        });
        
        // 更新短期记忆
        this.updateShortTermMemory(characterId, message);
        
        this.markModified();
    }
    
    // ==================== 经历编辑器接口（核心！）====================
    
    /**
     * 获取可编辑的经历列表（用于经历编辑器UI）
     * @param {string} characterId - 角色ID
     * @returns {EditableExperience[]}
     */
    getEditableExperiences(characterId) {
        if (!this.currentSlot) return [];
        
        const char = this.currentSlot.characters[characterId];
        if (!char) return [];
        
        const chapter = ChapterDB.get(this.currentSlot.startChapter);
        const override = this.currentSlot.playerOverrides.characters[characterId];
        const defaultExpIds = chapter?.defaultCharacters[characterId]?.experiences || [];
        
        return char.experiences.map(exp => {
            const template = ExperienceDB.get(exp.templateId);
            const isDefault = defaultExpIds.includes(exp.templateId);
            const isAdded = override?.experienceModifications?.added?.includes(exp.templateId);
            const isRemoved = override?.experienceModifications?.removed?.includes(exp.templateId);
            
            return {
                ...exp,
                templateTitle: template?.title || exp.templateId,
                templateDescription: template?.description || '',
                category: template?.category || '其他',
                icon: template?.icon || '📝',
                isDefault,
                isAdded: isAdded || false,
                isRemoved: isRemoved || false,
                editable: true
            };
        });
    }
    
    /**
     * 添加经历（从模板库）
     * @param {string} characterId - 角色ID
     * @param {string} templateId - 经历模板ID
     */
    addExperience(characterId, templateId) {
        if (!this.currentSlot) return;
        
        const template = ExperienceDB.get(templateId);
        if (!template) {
            console.warn('Experience template not found:', templateId);
            return;
        }
        
        // 获取或创建覆盖记录
        const override = this.getOrCreateOverride(characterId);
        
        // 添加到added列表
        if (!override.experienceModifications.added) {
            override.experienceModifications.added = [];
        }
        if (!override.experienceModifications.added.includes(templateId)) {
            override.experienceModifications.added.push(templateId);
        }
        
        // 重新计算状态
        this.recalculateState(this.currentSlot);
        this.markModified();
        
        console.log('[ChapterSaveManager] Added experience:', templateId, 'to', characterId);
    }
    
    /**
     * 移除经历
     * @param {string} characterId - 角色ID
     * @param {string} templateId - 经历模板ID
     */
    removeExperience(characterId, templateId) {
        if (!this.currentSlot) return;
        
        const override = this.getOrCreateOverride(characterId);
        
        // 添加到removed列表
        if (!override.experienceModifications.removed) {
            override.experienceModifications.removed = [];
        }
        if (!override.experienceModifications.removed.includes(templateId)) {
            override.experienceModifications.removed.push(templateId);
        }
        
        // 如果从added中移除的，直接从added删除
        if (override.experienceModifications.added) {
            override.experienceModifications.added = 
                override.experienceModifications.added.filter(id => id !== templateId);
        }
        
        this.recalculateState(this.currentSlot);
        this.markModified();
    }
    
    /**
     * 编辑经历
     * @param {string} characterId - 角色ID
     * @param {string} templateId - 经历模板ID
     * @param {Object} updates - 更新内容
     * @param {string} [updates.customDescription] - 自定义描述
     * @param {string} [updates.playerNote] - 玩家备注
     */
    editExperience(characterId, templateId, updates) {
        if (!this.currentSlot) return;
        
        const override = this.getOrCreateOverride(characterId);
        
        if (!override.experienceModifications.edited) {
            override.experienceModifications.edited = {};
        }
        if (!override.experienceModifications.edited[templateId]) {
            override.experienceModifications.edited[templateId] = {};
        }
        
        if (updates.customDescription !== undefined) {
            override.experienceModifications.edited[templateId].customDescription = updates.customDescription;
        }
        if (updates.playerNote !== undefined) {
            override.experienceModifications.edited[templateId].playerNote = updates.playerNote;
        }
        
        this.recalculateState(this.currentSlot);
        this.markModified();
    }
    
    /**
     * 设置好感度覆盖（相对默认值）
     * @param {string} characterId - 角色ID
     * @param {number} targetFavor - 目标好感度
     */
    setFavorOverride(characterId, targetFavor) {
        if (!this.currentSlot) return;
        
        const chapter = ChapterDB.get(this.currentSlot.startChapter);
        const defaultFavor = chapter?.defaultCharacters[characterId]?.favor || 0;
        
        const override = this.getOrCreateOverride(characterId);
        override.favorDelta = targetFavor - defaultFavor;
        
        this.recalculateState(this.currentSlot);
        this.markModified();
    }
    
    /**
     * 重置角色为章节默认
     * @param {string} characterId - 角色ID
     */
    resetToDefault(characterId) {
        if (!this.currentSlot) return;
        
        // 删除该角色的所有覆盖
        delete this.currentSlot.playerOverrides.characters[characterId];
        
        // 重新初始化
        const chapter = ChapterDB.get(this.currentSlot.startChapter);
        const defaultState = chapter?.defaultCharacters[characterId];
        if (defaultState) {
            this.currentSlot.characters[characterId] = {
                characterId,
                favor: defaultState.favor,
                trust: defaultState.trust,
                intimacy: defaultState.intimacy,
                location: defaultState.location,
                mood: defaultState.mood,
                experiences: defaultState.experiences.map(expId => ({
                    templateId: expId,
                    unlockedAt: {...chapter.unlockTime},
                    isRevealed: true,
                    playerNote: '',
                    customDescription: ''
                })),
                secrets: [...defaultState.secrets],
                memories: { shortTerm: [], longTerm: [], core: [] },
                dialogueLog: []
            };
        }
        
        this.markModified();
    }
    
    /**
     * 获取或创建覆盖记录
     * @private
     */
    getOrCreateOverride(characterId) {
        if (!this.currentSlot.playerOverrides.characters[characterId]) {
            this.currentSlot.playerOverrides.characters[characterId] = {
                experienceModifications: {
                    added: [],
                    removed: [],
                    edited: {}
                }
            };
        }
        return this.currentSlot.playerOverrides.characters[characterId];
    }
    
    // ==================== 记忆系统（每个角色独立）====================
    
    /**
     * 更新短期记忆
     * @private
     */
    updateShortTermMemory(characterId, message) {
        const char = this.getCharacterState(characterId);
        if (!char) return;
        
        char.memories.shortTerm.push({
            id: message.id,
            content: message.content,
            role: message.role,
            timestamp: message.timestamp,
            emotion: message.emotion
        });
        
        // 限制长度
        if (char.memories.shortTerm.length > 10) {
            char.memories.shortTerm.shift();
        }
    }
    
    // ==================== 持久化 ====================
    
    /**
     * 标记为已修改
     * @private
     */
    markModified() {
        if (this.currentSlot) {
            this.currentSlot.lastPlayed = Date.now();
        }
    }
    
    /**
     * 立即保存
     */
    saveNow() {
        if (!this.currentSlot) return;
        
        localStorage.setItem(
            this.KEYS.SAVE_PREFIX + this.currentSlot.id,
            JSON.stringify(this.currentSlot)
        );
        this.updateSaveIndex(this.currentSlot);
        
        console.log('[ChapterSaveManager] Saved:', this.currentSlot.id);
    }
    
    /**
     * 保存到存储
     * @private
     */
    saveToStorage(slot) {
        localStorage.setItem(this.KEYS.SAVE_PREFIX + slot.id, JSON.stringify(slot));
        this.updateSaveIndex(slot);
    }
    
    /**
     * 更新存档索引
     * @private
     */
    updateSaveIndex(slot) {
        const index = this.getAllSlots();
        const existing = index.findIndex(s => s.id === slot.id);
        
        const entry = {
            id: slot.id,
            name: slot.name,
            startChapter: slot.startChapter,
            currentChapter: slot.currentChapter,
            lastPlayed: slot.lastPlayed
        };
        
        if (existing >= 0) {
            index[existing] = entry;
        } else {
            index.push(entry);
        }
        
        index.sort((a, b) => b.lastPlayed - a.lastPlayed);
        localStorage.setItem(this.KEYS.SAVE_INDEX, JSON.stringify(index));
    }
    
    /**
     * 启动自动保存
     * @private
     */
    startAutoSave() {
        this.autoSaveTimer = setInterval(() => {
            this.saveNow();
        }, this.AUTO_SAVE_INTERVAL);
    }
    
    /**
     * 停止自动保存
     */
    stopAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
    }
    
    // ==================== 世界状态 ====================
    
    /**
     * 推进游戏时间
     * @param {number} minutes - 分钟数
     */
    advanceTime(minutes) {
        if (!this.currentSlot) return;
        
        const time = this.currentSlot.world.gameTime;
        time.minute += minutes;
        
        while (time.minute >= 60) {
            time.minute -= 60;
            time.hour++;
        }
        while (time.hour >= 24) {
            time.hour -= 24;
            time.day++;
        }
        
        this.markModified();
    }
    
    /**
     * 设置剧情标记
     * @param {string} flag - 标记名
     * @param {boolean} value - 值
     */
    setFlag(flag, value = true) {
        if (!this.currentSlot) return;
        this.currentSlot.world.flags[flag] = value;
        this.markModified();
    }
    
    /**
     * 检查剧情标记
     * @param {string} flag - 标记名
     * @returns {boolean}
     */
    checkFlag(flag) {
        if (!this.currentSlot) return false;
        return this.currentSlot.world.flags[flag] || false;
    }
    
    // ==================== 经历自动生成系统（新）====================
    
    /**
     * 添加自动生成的经历到角色档案
     * @param {string} characterId - 角色ID
     * @param {Object} experience - 经历数据
     * @returns {string} 经历ID
     */
    addGeneratedExperience(characterId, experience) {
        const char = this.getCharacterState(characterId);
        if (!char) return null;
        
        this.expCounter++;
        const expId = `exp_${characterId}_${Date.now()}_${this.expCounter}`;
        
        const expEntry = {
            id: expId,
            generatedAt: Date.now(),
            gameTime: {...this.currentSlot.world.gameTime},
            
            // 触发信息
            triggerType: experience.triggerType || 'MANUAL',
            triggerData: experience.triggerData || {},
            
            // 内容
            title: experience.title || '未命名经历',
            description: experience.description || '',
            fullContext: experience.fullContext || '',
            
            // 情感数据
            emotionalImpact: experience.emotionalImpact || 5,
            favorDelta: experience.favorDelta || 0,
            
            // 状态
            isRevealed: false,
            
            // 玩家可编辑
            playerEdits: {
                customTitle: '',
                customDescription: '',
                playerNote: '',
                isHidden: false
            }
        };
        
        char.experiences.push(expEntry);
        
        // 按游戏时间排序
        char.experiences.sort((a, b) => this.compareGameTime(a.gameTime, b.gameTime));
        
        // 更新统计
        this.currentSlot.stats.totalExperiencesGenerated++;
        
        this.markModified();
        
        console.log('[ChapterSaveManager] Experience generated:', expId, expEntry.title);
        return expId;
    }
    
    /**
     * 标记经历为已揭示（AI在对话中提及）
     * @param {string} characterId - 角色ID
     * @param {string} expId - 经历ID
     * @param {string} dialogueId - 提及该经历的对话ID
     */
    revealExperience(characterId, expId, dialogueId) {
        const char = this.getCharacterState(characterId);
        if (!char) return;
        
        const exp = char.experiences.find(e => e.id === expId);
        if (exp && !exp.isRevealed) {
            exp.isRevealed = true;
            exp.revealedAt = {...this.currentSlot.world.gameTime};
            exp.revealedDialogueId = dialogueId;
            this.markModified();
            
            console.log('[ChapterSaveManager] Experience revealed:', expId);
        }
    }
    
    /**
     * 获取角色的未揭示但高冲击的经历（用于AI暗示）
     * @param {string} characterId - 角色ID
     * @param {number} minImpact - 最小情感冲击值
     * @returns {ExperienceEntry[]}
     */
    getUnrevealedHighImpactExperiences(characterId, minImpact = 7) {
        const char = this.getCharacterState(characterId);
        if (!char) return [];
        
        return char.experiences
            .filter(e => !e.isRevealed && e.emotionalImpact >= minImpact)
            .sort((a, b) => b.emotionalImpact - a.emotionalImpact)
            .slice(0, 3);
    }
    
    // ==================== 玩家记忆系统（新）====================
    
    /**
     * 添加玩家记忆
     * @param {Object} memory - 记忆数据
     * @returns {string} 记忆ID
     */
    addPlayerMemory(memory) {
        if (!this.currentSlot) return null;
        
        const pmId = `pm_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        
        const entry = {
            id: pmId,
            type: memory.type || 'GENERAL',
            createdAt: Date.now(),
            gameTime: {...this.currentSlot.world.gameTime},
            
            // 内容
            title: memory.title || '未命名记忆',
            description: memory.description || '',
            
            // 关联
            relatedCharacters: memory.relatedCharacters || [],
            relatedLocation: memory.relatedLocation || '',
            relatedPlotFlag: memory.relatedPlotFlag || '',
            
            // 重要性
            importance: memory.importance || 5,
            isCore: memory.isCore || false,
            
            // 引用统计
            referencedCount: 0,
            lastReferenced: null,
            
            // 玩家编辑
            playerNote: memory.playerNote || '',
            isHidden: false
        };
        
        this.currentSlot.player.memories.push(entry);
        
        // 重新组织记忆分层
        this.organizePlayerMemoryLayers();
        
        // 更新统计
        this.currentSlot.stats.totalPlayerMemories++;
        
        this.markModified();
        
        console.log('[ChapterSaveManager] Player memory added:', pmId, entry.title);
        return pmId;
    }
    
    /**
     * 组织玩家记忆分层（短期/长期/核心）
     * @private
     */
    organizePlayerMemoryLayers() {
        const player = this.currentSlot.player;
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
     * 获取玩家记忆（用于Prompt）
     * @param {number} limit - 数量限制
     * @param {Object} options - 过滤选项
     * @returns {PlayerMemoryEntry[]}
     */
    getPlayerMemoriesForPrompt(limit = 5, options = {}) {
        if (!this.currentSlot) return [];
        
        const player = this.currentSlot.player;
        let memoryIds = [...player.core, ...player.shortTerm, ...player.longTerm];
        
        // 去重
        memoryIds = [...new Set(memoryIds)];
        
        // 根据角色过滤
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
     * 增加玩家记忆引用计数
     * @param {string} pmId - 记忆ID
     */
    referencePlayerMemory(pmId) {
        const memory = this.currentSlot.player.memories.find(m => m.id === pmId);
        if (memory) {
            memory.referencedCount++;
            memory.lastReferenced = Date.now();
            this.markModified();
        }
    }
    
    /**
     * 收藏/取消收藏玩家记忆
     * @param {string} pmId - 记忆ID
     */
    toggleBookmarkPlayerMemory(pmId) {
        const bookmarks = this.currentSlot.player.bookmarks;
        const index = bookmarks.indexOf(pmId);
        
        if (index > -1) {
            bookmarks.splice(index, 1);
        } else {
            bookmarks.push(pmId);
        }
        
        this.markModified();
    }
    
    // ==================== 辅助方法 ====================
    
    /**
     * 比较游戏时间
     * @private
     */
    compareGameTime(timeA, timeB) {
        const a = timeA.year * 10000 + timeA.month * 100 + timeA.day;
        const b = timeB.year * 10000 + timeB.month * 100 + timeB.day;
        return a - b;
    }
}

// 创建全局实例
const chapterSaveManager = new ChapterSaveManager();

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ChapterSaveManager, chapterSaveManager };
}
