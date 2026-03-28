/**
 * settings.html 角色卡2.0集成文件
 * 
 * 使用方法：
 * 1. 将此文件复制到 public/js/settings/ 目录
 * 2. 在settings.html底部添加：
 *    <script src="public/js/settings/SETTINGS_INTEGRATION_V2.js"></script>
 * 
 * 这个文件会自动补丁现有的settings-main.js
 */

(function() {
    'use strict';
    
    console.log('[CharacterV2 Integration] 开始加载...');
    
    // 等待原脚本加载完成
    function waitForOriginalScript() {
        return new Promise((resolve) => {
            if (typeof saveCharacter === 'function') {
                resolve();
            } else {
                setTimeout(waitForOriginalScript, 100);
            }
        });
    }
    
    waitForOriginalScript().then(() => {
        console.log('[CharacterV2 Integration] 检测到原脚本，开始集成');
        integrateCharacterV2();
    });
    
    function integrateCharacterV2() {
        // 保存原函数
        const originalSaveCharacter = window.saveCharacter;
        const originalBuildCharacterPrompt = window.buildCharacterPrompt;
        const originalRenderCharacterList = window.renderCharacterList;
        
        // ========== 1. 替换saveCharacter函数 ==========
        window.saveCharacter = function() {
            // 检测是否为V2模式
            const isV2Mode = detectV2Mode();
            
            if (isV2Mode) {
                console.log('[CharacterV2] 使用V2保存逻辑');
                return saveCharacterV2();
            } else {
                console.log('[CharacterV2] 使用V1保存逻辑');
                return originalSaveCharacter();
            }
        };
        
        // ========== 2. 替换buildCharacterPrompt函数 ==========
        window.buildCharacterPrompt = function(data) {
            // 检测V2数据
            if (data && data.version && data.version.startsWith('2.')) {
                return buildCharacterPromptV2(data);
            }
            return originalBuildCharacterPrompt(data);
        };
        
        // ========== 3. 增强renderCharacterList函数 ==========
        if (originalRenderCharacterList) {
            window.renderCharacterList = function() {
                // 先调用原函数
                originalRenderCharacterList();
                
                // 然后添加V2标记
                enhanceCharacterCardsWithV2Badge();
            };
        }
        
        // ========== 4. 添加V2编辑器入口 ==========
        addV2EditorButton();
        
        console.log('[CharacterV2 Integration] 集成完成');
    }
    
    // ========== 辅助函数 ==========
    
    /**
     * 检测是否为V2模式
     */
    function detectV2Mode() {
        // 检测V2特有字段
        const hasV2Fields = document.getElementById('v2_firstMessage') !== null ||
                           document.getElementById('v2_examplesList') !== null;
        
        // 检测编辑中的角色是否为V2
        if (window.editingCharacterId && window.characters) {
            const char = window.characters.find(c => 
                c._id === window.editingCharacterId || c.id === window.editingCharacterId
            );
            if (char && (char.format === 'v2' || (char.version && char.version.startsWith('2.')))) {
                return true;
            }
        }
        
        return hasV2Fields;
    }
    
    /**
     * V2保存逻辑
     */
    async function saveCharacterV2() {
        try {
            // 收集V2数据
            const v2Data = collectV2FormData();
            
            if (!v2Data.name) {
                showToast('请输入角色名称', 'error');
                return;
            }
            
            // 使用适配器保存
            const { CharacterCardAdapter } = window.CharacterCardV2 || {};
            
            if (!CharacterCardAdapter) {
                console.warn('[CharacterV2] 适配器未加载，回退到V1保存');
                return window.saveCharacterV1_Legacy && window.saveCharacterV1_Legacy();
            }
            
            const adapter = new CharacterCardAdapter();
            
            // 初始化世界书桥接（如果可用）
            if (window.CharacterWorldbookBridge) {
                const bridge = new CharacterWorldbookBridge({
                    linkMode: v2Data.lorebook?._linkMode || 'manual'
                });
                await bridge.initializeCharacterLorebook(v2Data);
            }
            
            // 保存
            const result = await adapter.saveCharacter(v2Data, { targetVersion: 'v2' });
            
            if (result.success) {
                showToast('角色已保存 (V2格式)', 'success');
                closeCharacterModal();
                
                // 刷新列表
                if (window.loadCharacters) {
                    await window.loadCharacters();
                }
            } else {
                throw new Error(result.message || '保存失败');
            }
            
        } catch (error) {
            console.error('[CharacterV2] 保存失败:', error);
            showToast('保存失败: ' + error.message, 'error');
            
            // 回退到V1
            if (window.saveCharacterV1_Legacy) {
                showToast('尝试使用V1格式保存...', 'warning');
                return window.saveCharacterV1_Legacy();
            }
        }
    }
    
    /**
     * 收集V2表单数据
     */
    function collectV2FormData() {
        const { createCharacterCardV2 } = window.CharacterCardV2 || {};
        
        if (!createCharacterCardV2) {
            throw new Error('CharacterCardV2模块未加载');
        }
        
        // 基础信息
        const char = createCharacterCardV2({
            id: window.editingCharacterId,
            name: document.getElementById('charName')?.value?.trim(),
            visual: {
                avatar: document.getElementById('charAvatar')?.value?.trim() || '',
                color: document.getElementById('charColor')?.value?.trim() || '#8a6d3b'
            },
            core: {
                description: buildV2Description(),
                personality: document.getElementById('charPersonality')?.value?.trim() || '',
                scenario: document.getElementById('charBackground')?.value?.trim() || ''
            },
            activation: {
                keys: parseKeys(document.getElementById('charKeys')?.value),
                priority: parseInt(document.getElementById('charPriority')?.value) || 100
            },
            relationship: {
                favor: parseInt(document.getElementById('charFavor')?.value) || 50,
                trust: parseInt(document.getElementById('charTrust')?.value) || 50,
                mood: document.getElementById('charMood')?.value || '平静'
            }
        });
        
        return char;
    }
    
    /**
     * 构建V2描述
     */
    function buildV2Description() {
        const parts = [];
        const appearance = document.getElementById('charAppearance')?.value?.trim();
        const physique = document.getElementById('charPhysique')?.value?.trim();
        const special = document.getElementById('charSpecial')?.value?.trim();
        
        if (appearance) parts.push(`【外貌】${appearance}`);
        if (physique) parts.push(`【体质】${physique}`);
        if (special) parts.push(`【特殊】${special}`);
        
        return parts.join('\n');
    }
    
    /**
     * 解析关键词
     */
    function parseKeys(value) {
        if (!value) return [];
        return value.split(/[,，]/).map(k => k.trim()).filter(Boolean);
    }
    
    /**
     * V2提示词构建
     */
    function buildCharacterPromptV2(v2Data) {
        try {
            const { EnhancedPromptBuilder } = window.EnhancedPromptBuilder || {};
            
            if (!EnhancedPromptBuilder) {
                // 降级到简单构建
                return buildSimpleV2Prompt(v2Data);
            }
            
            const builder = new EnhancedPromptBuilder();
            const result = builder.buildForCharacter(v2Data);
            
            return result.system;
        } catch (error) {
            console.error('[CharacterV2] 提示词构建失败:', error);
            return buildSimpleV2Prompt(v2Data);
        }
    }
    
    /**
     * 简单V2提示词构建（降级方案）
     */
    function buildSimpleV2Prompt(v2Data) {
        const parts = [];
        parts.push(`【角色名称】${v2Data.name}`);
        
        if (v2Data.core?.description) {
            parts.push(`\n【角色描述】\n${v2Data.core.description}`);
        }
        if (v2Data.core?.personality) {
            parts.push(`\n【性格特点】\n${v2Data.core.personality}`);
        }
        if (v2Data.core?.scenario) {
            parts.push(`\n【当前处境】\n${v2Data.core.scenario}`);
        }
        
        return parts.join('\n');
    }
    
    /**
     * 为角色卡片添加V2标记
     */
    function enhanceCharacterCardsWithV2Badge() {
        const cards = document.querySelectorAll('.character-card');
        
        cards.forEach(card => {
            const charId = card.dataset.id;
            if (!charId || !window.characters) return;
            
            const char = window.characters.find(c => 
                c._id === charId || c.id === charId
            );
            
            if (char && (char.format === 'v2' || (char.version && char.version.startsWith('2.')))) {
                // 添加V2徽章
                const nameEl = card.querySelector('.character-name');
                if (nameEl && !nameEl.querySelector('.v2-badge')) {
                    const badge = document.createElement('span');
                    badge.className = 'v2-badge';
                    badge.style.cssText = `
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 2px 8px;
                        border-radius: 4px;
                        font-size: 11px;
                        margin-left: 8px;
                        font-weight: normal;
                    `;
                    badge.textContent = 'V2';
                    nameEl.appendChild(badge);
                }
                
                // 添加V2编辑器按钮
                const actionsEl = card.querySelector('.character-actions');
                if (actionsEl && !actionsEl.querySelector('.v2-edit-btn')) {
                    const v2Btn = document.createElement('button');
                    v2Btn.className = 'btn btn-sm btn-primary v2-edit-btn';
                    v2Btn.textContent = '🆕 V2';
                    v2Btn.onclick = () => openV2Editor(charId);
                    actionsEl.appendChild(v2Btn);
                }
            }
        });
    }
    
    /**
     * 添加V2编辑器入口按钮
     */
    function addV2EditorButton() {
        // 在世界角色页面添加全局V2编辑器按钮
        const header = document.querySelector('#page-characters .page-actions');
        if (header && !header.querySelector('.v2-global-btn')) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-secondary v2-global-btn';
            btn.innerHTML = '🆕 V2编辑器';
            btn.onclick = () => openV2Editor();
            btn.title = '使用增强版V2编辑器创建角色';
            header.insertBefore(btn, header.firstChild);
        }
    }
    
    /**
     * 打开V2编辑器
     */
    function openV2Editor(characterId) {
        const url = characterId 
            ? `character-editor-v2.html?id=${characterId}&gameId=${window.gameId}`
            : `character-editor-v2.html?gameId=${window.gameId}`;
        
        window.open(url, '_blank');
    }
    
    // 暴露到全局
    window.openV2Editor = openV2Editor;
    window.saveCharacterV2 = saveCharacterV2;
    
})();
