/**
 * 存档管理器 - 角色级独立存档
 * @module Services/SaveManager
 * @description 管理存档槽位和角色独立档案
 */

/**
 * 存档管理器
 * @class SaveManager
 */
class SaveManager {
    constructor() {
        this.currentSlotId = null;
        this.cache = new Map();
        this.autoSaveTimer = null;
        this.AUTO_SAVE_INTERVAL = 5 * 60 * 1000; // 5分钟
        
        // 存储键名
        this.KEYS = {
            SAVE_PREFIX: 'galgame_save_',
            SAVE_INDEX: 'galgame_save_index',
            CURRENT_SLOT: 'galgame_current_slot',
            PLAYER_PREFS: 'galgame_player_prefs'
        };
        
        this.init();
    }
    
    /**
     * 初始化
     */
    init() {
        // 从localStorage恢复当前存档
        this.currentSlotId = localStorage.getItem(this.KEYS.CURRENT_SLOT);
        
        // 启动自动保存
        this.startAutoSave();
        
        console.log('[SaveManager] Initialized, current slot:', this.currentSlotId);
    }
    
    // ==================== 存档槽位操作 ====================
    
    /**
     * 创建新存档槽位
     * @param {string} name - 存档名称
     * @param {string} worldId - 世界/故事ID
     * @returns {SaveSlot} 新存档
     */
    createSlot(name, worldId) {
        const slot = {
            id: `save_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: name || '新存档',
            worldId: worldId || 'default',
            createdAt: Date.now(),
            lastModified: Date.now(),
            characters: new Map(),
            world: this.initWorldState(),
            player: this.loadPlayerPrefs()
        };
        
        this.cache.set(slot.id, slot);
        this.saveToStorage(slot);
        this.updateSaveIndex(slot);
        
        console.log('[SaveManager] Created slot:', slot.id, slot.name);
        return slot;
    }
    
    /**
     * 加载存档槽位
     * @param {string} slotId - 存档ID
     * @returns {Promise<SaveSlot|null>}
     */
    async loadSlot(slotId) {
        // 从缓存读取
        if (this.cache.has(slotId)) {
            this.currentSlotId = slotId;
            localStorage.setItem(this.KEYS.CURRENT_SLOT, slotId);
            return this.cache.get(slotId);
        }
        
        // 从localStorage读取
        const data = localStorage.getItem(this.KEYS.SAVE_PREFIX + slotId);
        if (!data) {
            console.warn('[SaveManager] Slot not found:', slotId);
            return null;
        }
        
        try {
            const slot = this.deserializeSlot(JSON.parse(data));
            this.cache.set(slotId, slot);
            this.currentSlotId = slotId;
            localStorage.setItem(this.KEYS.CURRENT_SLOT, slotId);
            
            console.log('[SaveManager] Loaded slot:', slotId);
            return slot;
        } catch (e) {
            console.error('[SaveManager] Failed to load slot:', e);
            return null;
        }
    }
    
    /**
     * 获取当前存档
     * @returns {SaveSlot|null}
     */
    getCurrentSlot() {
        if (!this.currentSlotId) return null;
        return this.cache.get(this.currentSlotId) || null;
    }
    
    /**
     * 获取所有存档列表
     * @returns {Array<{id: string, name: string, lastModified: number}>}
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
        // 从localStorage删除
        localStorage.removeItem(this.KEYS.SAVE_PREFIX + slotId);
        
        // 从缓存删除
        this.cache.delete(slotId);
        
        // 更新索引
        const index = this.getAllSlots().filter(s => s.id !== slotId);
        localStorage.setItem(this.KEYS.SAVE_INDEX, JSON.stringify(index));
        
        // 如果删除的是当前存档，清除当前标记
        if (this.currentSlotId === slotId) {
            this.currentSlotId = null;
            localStorage.removeItem(this.KEYS.CURRENT_SLOT);
        }
        
        console.log('[SaveManager] Deleted slot:', slotId);
    }
    
    /**
     * 复制存档
     * @param {string} sourceId - 源存档ID
     * @param {string} newName - 新名称
     * @returns {SaveSlot}
     */
    copySlot(sourceId, newName) {
        const source = this.cache.get(sourceId);
        if (!source) throw new Error('Source slot not found');
        
        // 深拷贝
        const copy = this.deepCloneSlot(source);
        copy.id = `save_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        copy.name = newName || source.name + ' (副本)';
        copy.createdAt = Date.now();
        copy.lastModified = Date.now();
        
        this.cache.set(copy.id, copy);
        this.saveToStorage(copy);
        this.updateSaveIndex(copy);
        
        console.log('[SaveManager] Copied slot:', sourceId, '→', copy.id);
        return copy;
    }
    
    // ==================== 角色档案操作（核心！）====================
    
    /**
     * 获取角色档案
     * @param {string} characterId - 角色ID
     * @returns {CharacterArchive|null}
     */
    getCharacterArchive(characterId) {
        const slot = this.getCurrentSlot();
        if (!slot) return null;
        return slot.characters.get(characterId) || null;
    }
    
    /**
     * 初始化角色档案（首次遇到角色）
     * @param {string} characterId - 角色ID
     * @param {Object} template - 角色模板
     * @returns {CharacterArchive}
     */
    initCharacterArchive(characterId, template) {
        const slot = this.getCurrentSlot();
        if (!slot) throw new Error('No active save slot');
        
        // 检查是否已存在
        if (slot.characters.has(characterId)) {
            return slot.characters.get(characterId);
        }
        
        // 创建新的独立档案
        const archive = {
            characterId,
            templateId: template.id,
            favor: template.initialFavor || 0,
            trust: template.initialTrust || 0,
            intimacy: 0,
            
            status: {
                mood: 'calm',
                location: template.defaultLocation || 'unknown',
                activity: 'idle',
                isPresent: false,
                lastMet: 0
            },
            
            memories: {
                shortTerm: [],
                longTerm: [],
                core: template.coreMemories || [],
                experiences: []
            },
            
            dialogueLog: [],
            
            unlocked: {
                secrets: [],
                scenes: [],
                topics: template.initialTopics || [],
                endings: []
            },
            
            config: {
                aiTemperature: template.aiTemperature,
                responseStyle: template.responseStyle
            }
        };
        
        slot.characters.set(characterId, archive);
        this.markModified();
        
        console.log('[SaveManager] Init character archive:', characterId);
        return archive;
    }
    
    /**
     * 更新角色好感度
     * @param {string} characterId - 角色ID
     * @param {number} delta - 变化值
     */
    updateCharacterFavor(characterId, delta) {
        const char = this.getCharacterArchive(characterId);
        if (!char) return;
        
        const oldFavor = char.favor;
        char.favor = Math.max(-100, Math.min(100, char.favor + delta));
        
        // 检测阈值跨越
        this.checkFavorThresholds(characterId, oldFavor, char.favor);
        
        this.markModified();
    }
    
    /**
     * 更新角色信任度
     * @param {string} characterId - 角色ID
     * @param {number} delta - 变化值
     */
    updateCharacterTrust(characterId, delta) {
        const char = this.getCharacterArchive(characterId);
        if (!char) return;
        
        char.trust = Math.max(0, Math.min(100, char.trust + delta));
        this.markModified();
    }
    
    /**
     * 添加角色对话记录
     * @param {string} characterId - 角色ID
     * @param {DialogueMessage} message - 消息
     */
    addCharacterDialogue(characterId, message) {
        const char = this.getCharacterArchive(characterId);
        if (!char) return;
        
        char.dialogueLog.push(message);
        char.status.lastMet = Date.now();
        
        // 更新短期记忆
        this.updateShortTermMemory(characterId, message);
        
        // 检查是否需要归档到长期记忆
        this.archiveMemoriesIfNeeded(characterId);
        
        this.markModified();
    }
    
    /**
     * 更新角色状态
     * @param {string} characterId - 角色ID
     * @param {Partial<CharacterStatus>} status - 状态更新
     */
    updateCharacterStatus(characterId, status) {
        const char = this.getCharacterArchive(characterId);
        if (!char) return;
        
        Object.assign(char.status, status);
        this.markModified();
    }
    
    /**
     * 解锁角色经历
     * @param {string} characterId - 角色ID
     * @param {Experience} experience - 经历数据
     */
    unlockCharacterExperience(characterId, experience) {
        const char = this.getCharacterArchive(characterId);
        if (!char) return;
        
        // 检查是否已解锁
        if (char.memories.experiences.some(e => e.id === experience.id)) {
            return;
        }
        
        char.memories.experiences.push({
            ...experience,
            unlockedAt: Date.now(),
            isRevealed: false
        });
        
        this.markModified();
        
        // 触发事件
        this.onExperienceUnlocked?.(characterId, experience);
    }
    
    /**
     * 标记经历为已展示（UI用过）
     * @param {string} characterId - 角色ID
     * @param {string} expId - 经历ID
     */
    revealExperience(characterId, expId) {
        const char = this.getCharacterArchive(characterId);
        if (!char) return;
        
        const exp = char.memories.experiences.find(e => e.id === expId);
        if (exp) {
            exp.isRevealed = true;
            this.markModified();
        }
    }
    
    // ==================== 记忆系统 ====================
    
    /**
     * 更新短期记忆
     * @private
     */
    updateShortTermMemory(characterId, message) {
        const char = this.getCharacterArchive(characterId);
        if (!char) return;
        
        const slot = this.getCurrentSlot();
        const maxShortTerm = slot.player.ai.memoryDepth || 10;
        
        char.memories.shortTerm.push({
            id: message.id,
            content: message.content,
            role: message.role,
            timestamp: message.timestamp,
            emotion: message.emotion,
            location: message.location
        });
        
        // 限制长度
        if (char.memories.shortTerm.length > maxShortTerm) {
            const removed = char.memories.shortTerm.shift();
            // 触发自动总结到长期记忆
            if (slot.player.ai.autoSummarize) {
                this.summarizeToLongTerm(characterId, [removed]);
            }
        }
    }
    
    /**
     * 归档到长期记忆
     * @private
     */
    archiveMemoriesIfNeeded(characterId) {
        const char = this.getCharacterArchive(characterId);
        if (!char) return;
        
        // 每12条短期记忆归档一次
        if (char.memories.shortTerm.length >= 12) {
            const toArchive = char.memories.shortTerm.splice(0, 6);
            this.summarizeToLongTerm(characterId, toArchive);
        }
    }
    
    /**
     * 总结到长期记忆
     * @private
     */
    summarizeToLongTerm(characterId, memories) {
        const char = this.getCharacterArchive(characterId);
        if (!char) return;
        
        // 简单的摘要（实际应该用AI生成）
        const summary = {
            id: `long_${Date.now()}`,
            summary: `对话摘要 (${memories.length}条消息)`,
            sourceIds: memories.map(m => m.id),
            timestamp: Date.now(),
            importance: 3
        };
        
        char.memories.longTerm.push(summary);
        
        // 长期记忆过多时，提升到核心记忆
        if (char.memories.longTerm.length > 10) {
            const coreCand = char.memories.longTerm.shift();
            this.promoteToCore(characterId, coreCand);
        }
    }
    
    /**
     * 提升到核心记忆
     * @private
     */
    promoteToCore(characterId, memory) {
        const char = this.getCharacterArchive(characterId);
        if (!char) return;
        
        const slot = this.getCurrentSlot();
        const maxCore = slot.player.ai.coreMemorySlots || 5;
        
        if (char.memories.core.length >= maxCore) {
            // 移除最旧的核心记忆
            char.memories.core.shift();
        }
        
        char.memories.core.push({
            ...memory,
            promotedAt: Date.now()
        });
    }
    
    /**
     * 获取角色所有记忆（用于组装Prompt）
     * @param {string} characterId - 角色ID
     * @returns {CharacterMemories}
     */
    getCharacterMemories(characterId) {
        const char = this.getCharacterArchive(characterId);
        if (!char) return { shortTerm: [], longTerm: [], core: [], experiences: [] };
        return char.memories;
    }
    
    // ==================== 世界状态 ====================
    
    /**
     * 更新世界时间
     * @param {number} minutes - 推进的分钟数
     */
    advanceWorldTime(minutes) {
        const slot = this.getCurrentSlot();
        if (!slot) return;
        
        const time = slot.world.gameTime;
        time.minute += minutes;
        
        while (time.minute >= 60) {
            time.minute -= 60;
            time.hour++;
        }
        while (time.hour >= 24) {
            time.hour -= 24;
            time.day++;
        }
        // 简化：不考虑月份天数
        
        this.markModified();
    }
    
    /**
     * 设置剧情标记
     * @param {string} flag - 标记名
     * @param {boolean} value - 值
     */
    setPlotFlag(flag, value = true) {
        const slot = this.getCurrentSlot();
        if (!slot) return;
        
        slot.world.plot.flags[flag] = value;
        this.markModified();
    }
    
    /**
     * 检查剧情标记
     * @param {string} flag - 标记名
     * @returns {boolean}
     */
    checkPlotFlag(flag) {
        const slot = this.getCurrentSlot();
        if (!slot) return false;
        return slot.world.plot.flags[flag] || false;
    }
    
    // ==================== 持久化 ====================
    
    /**
     * 标记为已修改（触发自动保存）
     * @private
     */
    markModified() {
        const slot = this.getCurrentSlot();
        if (slot) {
            slot.lastModified = Date.now();
        }
    }
    
    /**
     * 立即保存
     */
    saveNow() {
        const slot = this.getCurrentSlot();
        if (!slot) return;
        
        this.saveToStorage(slot);
        console.log('[SaveManager] Saved:', slot.id);
    }
    
    /**
     * 保存到localStorage
     * @private
     */
    saveToStorage(slot) {
        const serialized = this.serializeSlot(slot);
        localStorage.setItem(this.KEYS.SAVE_PREFIX + slot.id, JSON.stringify(serialized));
        this.updateSaveIndex(slot);
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
    
    // ==================== 导入导出 ====================
    
    /**
     * 导出存档为JSON
     * @param {string} slotId - 存档ID
     * @returns {string} JSON字符串
     */
    exportSlot(slotId) {
        const slot = this.cache.get(slotId);
        if (!slot) throw new Error('Slot not found');
        
        return JSON.stringify(this.serializeSlot(slot), null, 2);
    }
    
    /**
     * 从JSON导入存档
     * @param {string} json - JSON字符串
     * @returns {SaveSlot}
     */
    importSlot(json) {
        const data = JSON.parse(json);
        const slot = this.deserializeSlot(data);
        
        // 生成新ID避免冲突
        slot.id = `save_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        slot.name = slot.name + ' (导入)';
        
        this.cache.set(slot.id, slot);
        this.saveToStorage(slot);
        
        return slot;
    }
    
    // ==================== 辅助方法 ====================
    
    /**
     * 初始化世界状态
     * @private
     */
    initWorldState() {
        return {
            gameTime: { year: 1, month: 1, day: 1, hour: 8, minute: 0 },
            timeSpeed: 1,
            weather: 'sunny',
            season: 'spring',
            locations: {},
            plot: {
                currentChapter: '',
                currentScene: '',
                flags: {},
                branches: []
            },
            inventory: [],
            resources: {}
        };
    }
    
    /**
     * 加载玩家偏好
     * @private
     */
    loadPlayerPrefs() {
        const saved = localStorage.getItem(this.KEYS.PLAYER_PREFS);
        const defaults = {
            ai: { temperature: 0.7, maxTokens: 2000, memoryDepth: 10, model: 'deepseek-chat' },
            ui: { theme: 'dark', fontSize: 16, cgAnimation: true, textSpeed: 1 },
            game: { autoSave: true, autoSaveInterval: 5, skipRead: false }
        };
        
        return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    }
    
    /**
     * 序列化存档（Map转Object）
     * @private
     */
    serializeSlot(slot) {
        return {
            ...slot,
            characters: Object.fromEntries(slot.characters)
        };
    }
    
    /**
     * 反序列化存档（Object转Map）
     * @private
     */
    deserializeSlot(data) {
        return {
            ...data,
            characters: new Map(Object.entries(data.characters || {}))
        };
    }
    
    /**
     * 深拷贝存档
     * @private
     */
    deepCloneSlot(slot) {
        const serialized = JSON.stringify(this.serializeSlot(slot));
        return this.deserializeSlot(JSON.parse(serialized));
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
            worldId: slot.worldId,
            lastModified: slot.lastModified
        };
        
        if (existing >= 0) {
            index[existing] = entry;
        } else {
            index.push(entry);
        }
        
        // 按时间倒序
        index.sort((a, b) => b.lastModified - a.lastModified);
        
        localStorage.setItem(this.KEYS.SAVE_INDEX, JSON.stringify(index));
    }
    
    /**
     * 检测好感度阈值跨越
     * @private
     */
    checkFavorThresholds(characterId, oldFavor, newFavor) {
        const thresholds = [-20, 0, 40, 70];
        
        for (const threshold of thresholds) {
            if ((oldFavor < threshold && newFavor >= threshold) ||
                (oldFavor >= threshold && newFavor < threshold)) {
                // 触发阈值事件
                this.onFavorThresholdCrossed?.(characterId, threshold, newFavor);
            }
        }
    }
}

// 创建全局实例
const saveManager = new SaveManager();

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SaveManager, saveManager };
}
