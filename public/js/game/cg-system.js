/**
 * CG System V2.0
 * 世界角色CG自动切换系统
 */

// ===== CG状态管理 =====
const CGSystem = {
    // 当前状态
    state: {
        worldGallery: [],           // 图库V2的CG列表
        characterCGs: new Map(),    // 角色CG缓存 Map<characterId, CG[]>
        currentCGs: new Map(),      // 当前显示的CG Map<characterId, cgId>
        lastSwitchTime: new Map(),  // 上次切换时间
        cooldowns: new Map()        // 冷却记录
    },

    // 配置
    config: {
        matchThreshold: 0.5,        // 匹配阈值（置信度>0.5才切换）
        minSwitchInterval: 2000,    // 最小切换间隔（2秒）
        enableAutoSwitch: true      // 启用自动切换
    },

    /**
     * 初始化CG系统
     */
    async init(gameId) {
        console.log('[CG System] 初始化...');
        if (!gameId) return;

        try {
            await this.loadWorldGallery(gameId);
            console.log('[CG System] 初始化完成，加载CG:', this.state.worldGallery.length);
        } catch (error) {
            console.error('[CG System] 初始化失败:', error);
        }
    },

    /**
     * 加载世界图库
     */
    async loadWorldGallery(gameId) {
        try {
            const response = await fetch(`${API_BASE}/gallery/v2?gameId=${gameId}`, {
                headers: getAuthHeaders()
            });
            const data = await response.json();

            if (data.success) {
                this.state.worldGallery = data.data.images || [];
                
                // 按角色分组缓存
                this.state.characterCGs.clear();
                this.state.worldGallery.forEach(cg => {
                    const charId = cg.characterId || 'generic';
                    if (!this.state.characterCGs.has(charId)) {
                        this.state.characterCGs.set(charId, []);
                    }
                    this.state.characterCGs.get(charId).push(cg);
                });
            }
        } catch (error) {
            console.error('[CG System] 加载图库失败:', error);
        }
    },

    /**
     * 根据场景自动匹配并切换CG
     * @param {Object} context - 场景上下文
     * @param {string} context.scene - 场景描述
     * @param {string} context.emotion - 当前情绪
     * @param {string} context.action - 当前动作
     * @param {string} characterId - 角色ID
     * @param {Object} relationshipState - 关系状态 {favor, trust, mood}
     * @returns {Promise<Object>} 匹配结果
     */
    async autoMatchAndSwitch(context, characterId, relationshipState = {}) {
        if (!this.config.enableAutoSwitch) return null;
        
        const { scene = '', emotion = '', action = '' } = context;
        
        // 检查冷却
        if (this.isInCooldown(characterId)) {
            console.log('[CG System] 冷却中，跳过切换');
            return null;
        }

        // 检查切换间隔
        const lastSwitch = this.state.lastSwitchTime.get(characterId) || 0;
        if (Date.now() - lastSwitch < this.config.minSwitchInterval) {
            return null;
        }

        try {
            // 调用后端匹配API
            const response = await fetch(`${API_BASE}/gallery/v2/match`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({
                    gameId: currentWorld?._id,
                    characterId,
                    context: {
                        scene,
                        emotion,
                        action,
                        relationshipState,
                        currentCG: this.state.currentCGs.get(characterId)
                    },
                    options: {
                        maxResults: 3,
                        includeBaseEmotion: true
                    }
                })
            });

            const data = await response.json();

            if (!data.success || !data.topMatch) {
                return null;
            }

            const { topMatch, suggestedSwitch, confidence } = data;

            // 判断是否切换
            if (suggestedSwitch && confidence >= this.config.matchThreshold) {
                console.log(`[CG System] 匹配成功: ${topMatch.name} (置信度: ${confidence})`);
                
                // 执行切换
                await this.switchCG(characterId, topMatch);
                
                return {
                    switched: true,
                    cg: topMatch,
                    confidence,
                    reasons: topMatch.matchDetails || []
                };
            } else {
                console.log(`[CG System] 匹配但不切换: ${topMatch.name} (置信度: ${confidence}, 阈值: ${this.config.matchThreshold})`);
            }

            return {
                switched: false,
                cg: topMatch,
                confidence,
                reasons: ['置信度不足或建议不切换']
            };

        } catch (error) {
            console.error('[CG System] 匹配失败:', error);
            return null;
        }
    },

    /**
     * 切换到指定CG
     */
    async switchCG(characterId, cg) {
        // 检查约束
        if (cg.constraints?.cooldown?.enabled) {
            this.setCooldown(characterId, cg.constraints.cooldown.duration);
        }

        // 记录当前CG
        this.state.currentCGs.set(characterId, cg._id);
        this.state.lastSwitchTime.set(characterId, Date.now());

        // 更新显示
        await this.renderCG(characterId, cg);

        // 增加使用统计
        this.incrementUsage(cg._id).catch(() => {});

        return true;
    },

    /**
     * 渲染CG到界面
     */
    async renderCG(characterId, cg) {
        const displayConfig = cg.display || {};
        const animation = displayConfig.animation || { enter: 'fade', duration: 500 };
        
        // 获取角色立绘元素
        const charElement = document.querySelector(`[data-character-id="${characterId}"]`);
        if (!charElement) {
            console.warn('[CG System] 未找到角色元素:', characterId);
            return;
        }

        // 创建CG层
        let cgLayer = charElement.querySelector('.cg-layer');
        if (!cgLayer) {
            cgLayer = document.createElement('div');
            cgLayer.className = 'cg-layer';
            cgLayer.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: ${displayConfig.zIndex || 10};
            `;
            charElement.appendChild(cgLayer);
        }

        // 应用动画
        const img = document.createElement('img');
        img.src = cg.url;
        img.style.cssText = `
            width: 100%;
            height: 100%;
            object-fit: cover;
            opacity: 0;
            transition: opacity ${animation.duration}ms ease;
        `;

        // 清空旧CG并添加新CG
        cgLayer.innerHTML = '';
        cgLayer.appendChild(img);

        // 触发动画
        requestAnimationFrame(() => {
            img.style.opacity = '1';
        });

        console.log(`[CG System] 渲染CG: ${cg.name}`);
    },

    /**
     * 本地快速匹配（无需API调用）
     */
    localMatch(context, characterId) {
        const cgs = this.state.characterCGs.get(characterId) || 
                    this.state.characterCGs.get('generic') || [];
        
        if (cgs.length === 0) return null;

        const { scene = '', emotion = '', action = '' } = context;
        const sceneText = `${scene} ${emotion} ${action}`.toLowerCase();

        // 本地计算匹配分数
        const scored = cgs.map(cg => {
            const conditions = cg.triggerSystem?.conditions || {};
            let score = 0;

            // 场景关键词匹配
            (conditions.sceneKeywords || []).forEach(keyword => {
                if (sceneText.includes(keyword.toLowerCase())) score += 1;
            });

            // 情绪匹配
            if (emotion && (conditions.emotions || []).includes(emotion)) {
                score += 3;
            }

            // 动作匹配
            if (action && (conditions.actions || []).includes(action)) {
                score += 3;
            }

            // 应用优先级权重
            const priority = cg.triggerSystem?.priority || 100;
            score *= (priority / 100);

            return { cg, score };
        });

        // 排序返回最佳匹配
        scored.sort((a, b) => b.score - a.score);
        return scored[0]?.cg || null;
    },

    /**
     * 检查是否在冷却中
     */
    isInCooldown(characterId) {
        const cooldownEnd = this.state.cooldowns.get(characterId);
        if (!cooldownEnd) return false;
        return Date.now() < cooldownEnd;
    },

    /**
     * 设置冷却
     */
    setCooldown(characterId, durationSeconds) {
        this.state.cooldowns.set(characterId, Date.now() + durationSeconds * 1000);
    },

    /**
     * 增加CG使用统计
     */
    async incrementUsage(cgId) {
        try {
            await fetch(`${API_BASE}/gallery/v2/${cgId}/increment-usage`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
        } catch (error) {
            // 忽略错误
        }
    },

    /**
     * 解析AI响应中的CG触发指令
     */
    parseCGTrigger(aiResponse) {
        const triggers = [];
        
        // 匹配 [cg_trigger:xxx] 格式
        const triggerRegex = /\[cg_trigger:(\w+)\]/g;
        let match;
        while ((match = triggerRegex.exec(aiResponse)) !== null) {
            triggers.push({
                type: 'explicit',
                cgName: match[1]
            });
        }

        // 匹配 [emotion:xxx] 格式（基础表情）
        const emotionRegex = /\[emotion:(\w+)\]/g;
        while ((match = emotionRegex.exec(aiResponse)) !== null) {
            triggers.push({
                type: 'emotion',
                emotion: match[1]
            });
        }

        return triggers;
    },

    /**
     * 根据AI响应自动处理CG切换
     */
    async handleAIResponse(aiResponse, characterId, context) {
        // 1. 检查显式CG触发指令
        const triggers = this.parseCGTrigger(aiResponse);
        
        for (const trigger of triggers) {
            if (trigger.type === 'explicit') {
                // 查找指定名称的CG
                const cg = this.findCGByName(trigger.cgName);
                if (cg) {
                    await this.switchCG(characterId, cg);
                    return { switched: true, source: 'explicit', cg };
                }
            } else if (trigger.type === 'emotion') {
                // 情绪切换，用于基础8表情
                return { switched: false, source: 'emotion', emotion: trigger.emotion };
            }
        }

        // 2. 没有显式指令，进行智能匹配
        return await this.autoMatchAndSwitch(context, characterId);
    },

    /**
     * 根据名称查找CG
     */
    findCGByName(name) {
        for (const cgs of this.state.characterCGs.values()) {
            const cg = cgs.find(c => c.name === name || c._id === name);
            if (cg) return cg;
        }
        return null;
    },

    /**
     * 重置状态
     */
    reset() {
        this.state.worldGallery = [];
        this.state.characterCGs.clear();
        this.state.currentCGs.clear();
        this.state.lastSwitchTime.clear();
        this.state.cooldowns.clear();
    }
};

// 暴露到全局
window.CGSystem = CGSystem;
console.log('[CG System] 模块已加载');
