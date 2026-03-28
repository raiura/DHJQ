/**
 * settings.html 角色卡2.0集成补丁
 * 
 * 使用说明：
 * 1. 在settings.html底部添加新模块加载
 * 2. 修改settings-main.js中的相关函数
 */

// ============================================
// PART 1: 在settings.html底部添加（line 1127后）
// ============================================

const PART1_HTML_ADDITION = `
    <!-- 角色卡2.0模块 -->
    <script src="public/js/core/characterCardV2.js"></script>
    <script src="public/js/core/enhancedPromptBuilder.js"></script>
    <script src="public/js/services/characterWorldbookBridge.js"></script>
`;

// ============================================
// PART 2: 修改settings-main.js中的saveCharacter函数
// ============================================

/**
 * 替换原有的saveCharacter函数（line 723-790）
 */
function saveCharacter_Patched() {
    // 判断是否为V2模式（通过检测V2特有字段）
    const isV2Mode = document.getElementById('v2_firstMessage') !== null || 
                     (editingCharacterId && characters.find(c => c._id === editingCharacterId || c.id === editingCharacterId)?.format === 'v2');
    
    if (isV2Mode) {
        return saveCharacterV2();
    } else {
        return saveCharacterV1_Legacy();
    }
}

/**
 * 原有的V1保存逻辑（保持不变，仅包装）
 */
function saveCharacterV1_Legacy() {
    // 复制原有的saveCharacter函数内容
    const name = document.getElementById('charName')?.value.trim() || '';
    const color = document.getElementById('charColor')?.value.trim() || '#8a6d3b';
    const avatar = document.getElementById('charAvatar')?.value.trim() || '';
    const imageFit = document.getElementById('charImageFit')?.value || 'cover';
    const keysText = document.getElementById('charKeys')?.value.trim() || '';
    const priority = parseInt(document.getElementById('charPriority')?.value) || 100;
    const favor = parseInt(document.getElementById('charFavor')?.value) || 50;
    const trust = parseInt(document.getElementById('charTrust')?.value) || 50;
    const mood = document.getElementById('charMood')?.value || '平静';
    const appearance = document.getElementById('charAppearance')?.value.trim() || '';
    const personality = document.getElementById('charPersonality')?.value.trim() || '';
    const background = document.getElementById('charBackground')?.value.trim() || '';
    const physique = document.getElementById('charPhysique')?.value.trim() || '';
    const special = document.getElementById('charSpecial')?.value.trim() || '';
    
    if (!name) { showToast('请输入角色名称', 'error'); return; }
    
    const keys = keysText.split(/[,，]/).map(k => k.trim()).filter(Boolean);
    
    const char = {
        name,
        color,
        image: avatar,
        imageFit,
        avatar,
        keys,
        priority,
        favor,
        trust,
        stats: { mood, encounters: 0, dialogueTurns: 0 },
        appearance,
        personality,
        background,
        physique,
        special,
        prompt: buildCharacterPrompt({ name, appearance, personality, background, physique, special }),
        enabled: true,
        format: 'v1', // 标记为V1格式
        _id: editingCharacterId || 'char_' + Date.now(),
        updatedAt: new Date().toISOString()
    };
    
    if (editingCharacterId) {
        const idx = characters.findIndex(c => c._id === editingCharacterId || c.id === editingCharacterId);
        if (idx >= 0) {
            char.stats.encounters = characters[idx].stats?.encounters || 0;
            char.stats.dialogueTurns = characters[idx].stats?.dialogueTurns || 0;
            characters[idx] = char;
        }
    } else {
        char.createdAt = new Date().toISOString();
        characters.push(char);
    }
    
    if (gameId) {
        localStorage.setItem(`game_${gameId}_characters`, JSON.stringify(characters));
    }
    
    closeCharacterModal();
    renderCharacterList();
    showToast('角色已保存 (V1)', 'success');
}

/**
 * 新的V2保存逻辑
 */
async function saveCharacterV2() {
    try {
        const { createCharacterCardV2, CharacterCardAdapter } = window.CharacterCardV2 || {};
        
        if (!createCharacterCardV2) {
            console.error('CharacterCardV2模块未加载');
            return saveCharacterV1_Legacy();
        }
        
        // 构建V2角色
        const charV2 = createCharacterCardV2({
            id: editingCharacterId,
            name: document.getElementById('charName')?.value.trim(),
            visual: {
                avatar: document.getElementById('charAvatar')?.value.trim() || '',
                color: document.getElementById('charColor')?.value.trim() || '#8a6d3b'
            },
            core: {
                description: buildV2Description(),
                personality: document.getElementById('charPersonality')?.value.trim() || '',
                scenario: document.getElementById('charBackground')?.value.trim() || '',
                firstMessage: document.getElementById('v2_firstMessage')?.value.trim() || ''
            },
            activation: {
                keys: (document.getElementById('charKeys')?.value.trim() || '').split(/[,，]/).map(k => k.trim()).filter(Boolean),
                priority: parseInt(document.getElementById('charPriority')?.value) || 100,
                enabled: true
            },
            relationship: {
                favor: parseInt(document.getElementById('charFavor')?.value) || 50,
                trust: parseInt(document.getElementById('charTrust')?.value) || 50,
                mood: document.getElementById('charMood')?.value || '平静'
            },
            meta: {
                author: currentUser?.username || '',
                tags: [],
                description: ''
            }
        });
        
        // 保存（通过适配器）
        const adapter = new CharacterCardAdapter();
        const result = await adapter.saveCharacter(charV2, { targetVersion: 'v2' });
        
        if (result.success) {
            showToast('角色已保存 (V2格式)', 'success');
            closeCharacterModal();
            renderCharacterList();
        } else {
            throw new Error(result.message || '保存失败');
        }
    } catch (error) {
        console.error('保存V2角色失败:', error);
        showToast('保存失败，回退到V1: ' + error.message, 'warning');
        // 回退到V1保存
        return saveCharacterV1_Legacy();
    }
}

/**
 * 构建V2格式的描述
 */
function buildV2Description() {
    const parts = [];
    const appearance = document.getElementById('charAppearance')?.value.trim();
    const physique = document.getElementById('charPhysique')?.value.trim();
    const special = document.getElementById('charSpecial')?.value.trim();
    
    if (appearance) parts.push(`【外貌】${appearance}`);
    if (physique) parts.push(`【体质】${physique}`);
    if (special) parts.push(`【特殊】${special}`);
    
    return parts.join('\n');
}

// ============================================
// PART 3: 修改buildCharacterPrompt函数支持V2
// ============================================

/**
 * 增强的提示词构建函数（替换line 795-816）
 */
function buildCharacterPrompt_Patched(data) {
    // 如果传入的是V2格式数据
    if (data.version && data.version.startsWith('2.')) {
        return buildCharacterPromptV2(data);
    }
    
    // 原有V1逻辑
    return buildCharacterPromptV1_Legacy(data);
}

function buildCharacterPromptV1_Legacy(data) {
    const parts = [];
    parts.push(`【角色名称】${data.name}`);
    
    if (data.appearance) {
        parts.push(`\n【外貌特征】${data.appearance}`);
    }
    if (data.personality) {
        parts.push(`\n【性格特点】${data.personality}`);
    }
    if (data.background) {
        parts.push(`\n【身世背景】${data.background}`);
    }
    if (data.physique) {
        parts.push(`\n【体质/修为】${data.physique}`);
    }
    if (data.special) {
        parts.push(`\n【特殊能力/秘密】${data.special}`);
    }
    
    return parts.join('\n');
}

function buildCharacterPromptV2(v2Data) {
    try {
        const { EnhancedPromptBuilder } = window.EnhancedPromptBuilder || {};
        
        if (!EnhancedPromptBuilder) {
            console.warn('EnhancedPromptBuilder未加载，回退到简单构建');
            return buildCharacterPromptV1_Legacy({
                name: v2Data.name,
                appearance: v2Data.core?.description,
                personality: v2Data.core?.personality,
                background: v2Data.core?.scenario
            });
        }
        
        const builder = new EnhancedPromptBuilder();
        const result = builder.buildForCharacter(v2Data);
        
        return result.system;
    } catch (error) {
        console.error('V2提示词构建失败:', error);
        return buildCharacterPromptV1_Legacy({
            name: v2Data.name,
            appearance: v2Data.core?.description,
            personality: v2Data.core?.personality
        });
    }
}

// ============================================
// PART 4: 添加V2编辑器入口
// ============================================

/**
 * 修改renderCharacterList函数中的角色卡片渲染
 * 在原有编辑按钮旁添加V2编辑器入口
 */
function renderCharacterCardV2_Enhanced(character) {
    const isV2 = character.format === 'v2' || (character.version && character.version.startsWith('2.'));
    const v2Badge = isV2 ? '<span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 8px;">V2</span>' : '';
    
    return `
        <div class="character-card" data-id="${character._id || character.id}">
            <div class="character-header">
                <img src="${character.image || character.avatar || ''}" class="character-avatar" 
                     style="border-color: ${character.color || '#8a6d3b'}">
                <div class="character-info">
                    <div class="character-name">
                        ${character.name}
                        ${v2Badge}
                    </div>
                    <div class="character-stats">
                        好感: ${character.favor || 50} | 
                        信任: ${character.trust || 50} | 
                        心情: ${character.stats?.mood || character.mood || '平静'}
                    </div>
                </div>
            </div>
            <div class="character-actions">
                <button class="btn btn-sm btn-secondary" onclick="editCharacter('${character._id || character.id}')">
                    编辑
                </button>
                <button class="btn btn-sm btn-primary" onclick="openCharacterV2Editor('${character._id || character.id}')">
                    🆕 V2编辑器
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteCharacter('${character._id || character.id}')">
                    删除
                </button>
            </div>
        </div>
    `;
}

/**
 * 打开V2编辑器
 */
function openCharacterV2Editor(characterId) {
    // 在新窗口打开V2编辑器
    window.open(`character-editor-v2.html?id=${characterId}&gameId=${gameId}`, '_blank');
}

// ============================================
// PART 5: 导出补丁安装函数
// ============================================

/**
 * 安装补丁
 * 在settings-main.js加载完成后调用
 */
function installCharacterV2Patch() {
    console.log('[CharacterV2 Patch] 正在安装补丁...');
    
    // 保存原始函数
    window._originalSaveCharacter = window.saveCharacter;
    window._originalBuildCharacterPrompt = window.buildCharacterPrompt;
    
    // 替换为补丁版本
    window.saveCharacter = saveCharacter_Patched;
    window.buildCharacterPrompt = buildCharacterPrompt_Patched;
    
    // 添加新函数到全局
    window.saveCharacterV2 = saveCharacterV2;
    window.saveCharacterV1_Legacy = saveCharacterV1_Legacy;
    window.openCharacterV2Editor = openCharacterV2Editor;
    
    console.log('[CharacterV2 Patch] 补丁安装完成');
    console.log('[CharacterV2 Patch] 使用说明：');
    console.log('  - 原有角色继续以V1格式工作');
    console.log('  - 点击"V2编辑器"按钮使用增强编辑器');
    console.log('  - V2角色会自动降级兼容V1');
}

// 自动安装（如果文档已加载）
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(installCharacterV2Patch, 1000);
} else {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(installCharacterV2Patch, 1000);
    });
}

// 导出
window.CharacterV2Patch = {
    install: installCharacterV2Patch,
    saveV2: saveCharacterV2,
    saveV1: saveCharacterV1_Legacy
};
