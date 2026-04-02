/**
 * Character Card V2.0 Editor Extension
 * 为settings.html的角色编辑器添加V2功能
 */

// ========== V2编辑器状态 ==========
let currentExampleDialogues = [];
let currentLorebookEntries = [];
let currentCharTab = 'basic';

// ========== 初始化 ==========
// 从URL参数中获取gameId（如果尚未设置）
if (!window.gameId) {
    const urlParams = new URLSearchParams(window.location.search);
    const gameIdFromUrl = urlParams.get('id');
    if (gameIdFromUrl) {
        window.gameId = gameIdFromUrl;
        console.log('[Character V2] Set gameId from URL:', gameIdFromUrl);
    }
}

// ========== 标签页切换 ==========
function switchCharTab(tabName) {
    currentCharTab = tabName;
    
    // 更新按钮状态
    document.querySelectorAll('.char-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });
    
    // 显示对应面板
    document.querySelectorAll('.char-tab-panel').forEach(panel => {
        panel.style.display = 'none';
    });
    const targetPanel = document.getElementById(`charTab-${tabName}`);
    if (targetPanel) targetPanel.style.display = 'block';
}

// ========== 示例对话管理 ==========
function addExampleDialogue(userText = '', charText = '', annotation = '') {
    currentExampleDialogues.push({ user: userText, character: charText, annotation });
    renderExampleDialogues();
}

function removeExampleDialogue(index) {
    currentExampleDialogues.splice(index, 1);
    renderExampleDialogues();
}

function updateExampleDialogue(index, field, value) {
    currentExampleDialogues[index][field] = value;
}

function renderExampleDialogues() {
    const container = document.getElementById('exampleDialoguesList');
    if (!container) return;
    
    if (currentExampleDialogues.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 24px;">
                <div class="empty-icon">💬</div>
                <p>暂无示例对话</p>
                <p style="font-size: 13px; margin-top: 8px;">添加示例帮助AI学习角色说话方式</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = currentExampleDialogues.map((dialogue, index) => `
        <div style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; padding: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 12px; color: var(--primary-light);">示例 #${index + 1}</span>
                <button type="button" class="btn btn-sm btn-danger" onclick="removeExampleDialogue(${index})">删除</button>
            </div>
            <div class="form-group" style="margin-bottom: 8px;">
                <label style="font-size: 12px; color: var(--text-secondary);">用户</label>
                <input type="text" class="form-input" value="${escapeHtml(dialogue.user)}" 
                    onchange="updateExampleDialogue(${index}, 'user', this.value)" placeholder="用户说的话...">
            </div>
            <div class="form-group" style="margin-bottom: 8px;">
                <label style="font-size: 12px; color: var(--text-secondary);">角色</label>
                <input type="text" class="form-input" value="${escapeHtml(dialogue.character)}" 
                    onchange="updateExampleDialogue(${index}, 'character', this.value)" placeholder="角色的回应...">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
                <label style="font-size: 12px; color: var(--text-secondary);">标注（可选）</label>
                <input type="text" class="form-input" value="${escapeHtml(dialogue.annotation)}" 
                    onchange="updateExampleDialogue(${index}, 'annotation', this.value)" placeholder="这段对话的教学要点...">
            </div>
        </div>
    `).join('');
}

// ========== 世界书条目管理 ==========
function addLorebookEntry(name = '', keys = '', content = '') {
    currentLorebookEntries.push({
        name: name || `条目${currentLorebookEntries.length + 1}`,
        keys: keys ? keys.split(',').map(k => k.trim()).filter(Boolean) : [],
        content: content,
        priority: 100,
        enabled: true
    });
    renderLorebookEntries();
}

function removeLorebookEntry(index) {
    currentLorebookEntries.splice(index, 1);
    renderLorebookEntries();
}

function updateLorebookEntry(index, field, value) {
    if (field === 'keys') {
        value = value.split(',').map(k => k.trim()).filter(Boolean);
    }
    currentLorebookEntries[index][field] = value;
}

function renderLorebookEntries() {
    const container = document.getElementById('charLorebookList');
    if (!container) return;
    
    if (currentLorebookEntries.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 24px;">
                <div class="empty-icon">📚</div>
                <p>暂无专属知识</p>
                <p style="font-size: 13px; margin-top: 8px;">添加只有该角色知道的信息</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = currentLorebookEntries.map((entry, index) => `
        <div style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; padding: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <input type="text" class="form-input" value="${escapeHtml(entry.name)}" 
                    onchange="updateLorebookEntry(${index}, 'name', this.value)" 
                    placeholder="条目名称" style="flex: 1; margin-right: 8px;">
                <button type="button" class="btn btn-sm btn-danger" onclick="removeLorebookEntry(${index})">删除</button>
            </div>
            <div class="form-group" style="margin-bottom: 8px;">
                <label style="font-size: 12px; color: var(--text-secondary);">触发关键词（逗号分隔）</label>
                <input type="text" class="form-input" value="${escapeHtml(entry.keys.join(', '))}" 
                    onchange="updateLorebookEntry(${index}, 'keys', this.value)" placeholder="关键词1, 关键词2...">
            </div>
            <div class="form-group" style="margin-bottom: 8px;">
                <textarea class="form-textarea" rows="2" onchange="updateLorebookEntry(${index}, 'content', this.value)" 
                    placeholder="知识内容...">${escapeHtml(entry.content)}</textarea>
            </div>
            <div style="display: flex; gap: 12px; align-items: center;">
                <label style="font-size: 12px; display: flex; align-items: center; gap: 4px;">
                    <input type="checkbox" ${entry.enabled ? 'checked' : ''} onchange="updateLorebookEntry(${index}, 'enabled', this.checked)">
                    启用
                </label>
                <label style="font-size: 12px; display: flex; align-items: center; gap: 4px;">
                    优先级: <input type="number" value="${entry.priority}" min="0" max="1000" 
                    onchange="updateLorebookEntry(${index}, 'priority', parseInt(this.value))" style="width: 60px;">
                </label>
            </div>
        </div>
    `).join('');
}

// ========== 世界书关联模式 ==========
function updateLinkModeDisplay() {
    const mode = document.getElementById('charLinkMode')?.value || 'MANUAL';
    const hints = {
        MANUAL: '手动模式：完全由你控制关联哪些世界书条目',
        SUGGESTED: '建议模式：系统会分析并推荐相关条目，你需要确认后才关联',
        AUTO: '自动模式：系统自动关联匹配度>0.6的条目',
        DISABLED: '禁用模式：不关联任何世界书条目'
    };
    const hintEl = document.getElementById('linkModeHint');
    if (hintEl) hintEl.textContent = hints[mode] || hints.MANUAL;
}

// ========== 辅助函数 ==========
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ========== 集成到原系统 ==========

// 获取当前角色列表（动态获取，解决时序问题）
function getCurrentCharacters() {
    // 优先从window.characters获取
    let chars = window.characters || [];
    if (chars.length > 0) {
        // 过滤掉null值，确保所有角色对象都有效
        const validChars = chars.filter(char => char != null);
        if (validChars.length !== chars.length) {
            console.warn('[Character V2] Filtered out null characters from window.characters:', chars.length - validChars.length);
        }
        return validChars;
    }
    
    // 尝试从localStorage加载
    // 首先尝试从URL获取gameId
    const urlParams = new URLSearchParams(window.location.search);
    const urlGameId = urlParams.get('id');
    
    // 使用多种可能的gameId
    const possibleIds = [
        window.gameId,
        urlGameId,
        window.currentGame?._id,
        window.currentGame?.id
    ].filter(Boolean);
    
    console.log('[Character V2] Trying to load characters with IDs:', possibleIds);
    
    for (const gameId of possibleIds) {
        const saved = localStorage.getItem(STORAGE_KEYS.CHARACTERS(gameId));
        if (saved) {
            try {
                chars = JSON.parse(saved);
                // 过滤掉null值，确保所有角色对象都有效
                const validChars = chars.filter(char => char != null);
                if (validChars.length !== chars.length) {
                    console.warn('[Character V2] Filtered out null characters from localStorage:', chars.length - validChars.length);
                }
                // 同步到全局变量
                window.characters = validChars;
                window.gameId = gameId; // 确保gameId被设置
                console.log('[Character V2] Loaded characters from storage:', validChars.length, 'for game:', gameId);
                return validChars;
            } catch (e) {
                console.error('[Character V2] Failed to load characters for', gameId, e);
            }
        }
    }
    
    // 尝试从localStorage查找所有可能的角色数据
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('_characters')) {
            try {
                const saved = localStorage.getItem(key);
                if (saved) {
                    chars = JSON.parse(saved);
                    // 过滤掉null值，确保所有角色对象都有效
                    const validChars = chars.filter(char => char != null);
                    if (validChars.length !== chars.length) {
                        console.warn('[Character V2] Filtered out null characters from localStorage key:', key, 'count:', chars.length - validChars.length);
                    }
                    console.log('[Character V2] Found characters in key:', key, 'count:', validChars.length);
                    window.characters = validChars;
                    return validChars;
                }
            } catch (e) {
                // 忽略解析错误
            }
        }
    }
    
    return chars;
}

// 重写 openCharacterModal 函数
window.openCharacterModal = function(characterId = null) {
    // 动态获取角色列表（解决加载时序问题）
    const globalCharacters = getCurrentCharacters();
    
    console.log('[Character V2] openCharacterModal called, ID:', characterId, 'characters count:', globalCharacters.length);
    
    // 设置编辑ID（通过setter）
    window.editingCharacterId = characterId;
    
    // 重置V2状态
    currentExampleDialogues = [];
    currentLorebookEntries = [];
    
    // 重置V2字段
    const v2Fields = {
        'charDescription': '',
        'charScenario': '',
        'charFirstMessage': '',
        'charFaction': '',
        'charLocation': '',
        'charExampleStyle': '',
        'charLinkMode': 'MANUAL',
        'charNoteContent': '',
        'charNoteDepth': '0',
        'charNoteFrequency': '1',
        'charNoteRole': 'system',
        'charPostHistoryEnabled': false,
        'charPostHistory': ''
    };
    
    for (const [id, value] of Object.entries(v2Fields)) {
        const el = document.getElementById(id);
        if (el) {
            if (typeof value === 'boolean') {
                el.checked = value;
            } else {
                el.value = value;
            }
        }
    }
    
    // 切换到基础标签
    switchCharTab('basic');
    updateLinkModeDisplay();
    renderExampleDialogues();
    renderLorebookEntries();
    
    // 如果是编辑模式，填充数据
    if (characterId) {
        const char = globalCharacters.find(c => c._id === characterId || c.id === characterId);
        if (char) {
            console.log('[Character V2] Populating form for:', char.name);
            populateCharacterFormV2(char);
        } else {
            console.warn('[Character V2] Character not found:', characterId);
        }
    } else {
        console.log('[Character V2] Creating new character');
    }
    
    // 显示模态框
    const overlay = document.getElementById('characterModalOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
        overlay.classList.add('show');
        
        // 更新标题
        const modalTitle = document.querySelector('#characterModal .modal-title');
        if (modalTitle) {
            modalTitle.textContent = characterId ? '🎭 编辑角色' : '🎭 新建角色';
        }
    }
    
    // 更新好感度/信任度显示
    if (typeof updateFavorLevel === 'function') {
        const favor = document.getElementById('charFavor')?.value || 50;
        updateFavorLevel(favor);
    }
    if (typeof updateTrustLevel === 'function') {
        const trust = document.getElementById('charTrust')?.value || 50;
        updateTrustLevel(trust);
    }
};

// 填充表单数据
function populateCharacterFormV2(char) {
    if (!char) {
        console.warn('[Character V2] populateCharacterFormV2: char is null');
        return;
    }
    
    // 基础信息
    document.getElementById('charName').value = char.name || '';
    document.getElementById('charColor').value = char.visual?.color || char.color || '#8a6d3b';
    document.getElementById('charColorPicker').value = char.visual?.color || char.color || '#8a6d3b';
    document.getElementById('charAvatar').value = char.visual?.avatar || char.avatar || char.image || '';
    document.getElementById('charKeys').value = (char.activation?.keys || char.keys || []).join(', ');
    document.getElementById('charPriority').value = char.activation?.priority || char.priority || 100;
    document.getElementById('charFavor').value = char.relationship?.favor || char.favor || 50;
    document.getElementById('charTrust').value = char.relationship?.trust || char.trust || 50;
    document.getElementById('charMood').value = char.relationship?.mood || char.mood || '平静';
    
    // V2核心设定
    if (char.core) {
        document.getElementById('charDescription').value = char.core.description || '';
        document.getElementById('charPersonality').value = char.core.personality || '';
        document.getElementById('charScenario').value = char.core.scenario || '';
        document.getElementById('charFirstMessage').value = char.core.firstMessage || '';
        document.getElementById('charFaction').value = char.core.worldConnection?.faction || '';
        document.getElementById('charLocation').value = char.core.worldConnection?.location || '';
    } else {
        // 旧数据迁移
        document.getElementById('charDescription').value = [
            char.appearance, char.physique, char.special
        ].filter(Boolean).join('\n\n');
        document.getElementById('charPersonality').value = char.personality || '';
        document.getElementById('charScenario').value = char.background || '';
        document.getElementById('charFirstMessage').value = char.firstMessage || '';
    }
    
    // 示例对话
    if (char.examples?.dialogues) {
        currentExampleDialogues = JSON.parse(JSON.stringify(char.examples.dialogues));
        document.getElementById('charExampleStyle').value = char.examples.style || '';
        renderExampleDialogues();
    }
    
    // 世界书
    if (char.lorebook) {
        currentLorebookEntries = JSON.parse(JSON.stringify(char.lorebook.entries || []));
        document.getElementById('charLinkMode').value = char.lorebook.linkMode || 'MANUAL';
        updateLinkModeDisplay();
        renderLorebookEntries();
    }
    
    // 深度注入
    if (char.injection) {
        const note = char.injection.characterNote || {};
        document.getElementById('charNoteContent').value = note.content || '';
        document.getElementById('charNoteDepth').value = note.depth || 0;
        document.getElementById('charNoteFrequency').value = note.frequency || 1;
        document.getElementById('charNoteRole').value = note.role || 'system';
        
        const post = char.injection.postHistory || {};
        document.getElementById('charPostHistoryEnabled').checked = post.enabled || false;
        document.getElementById('charPostHistory').value = post.content || '';
    }
    
    // 更新显示
    if (typeof updateFavorLevel === 'function') {
        updateFavorLevel(char.relationship?.favor || char.favor || 50);
    }
    if (typeof updateTrustLevel === 'function') {
        updateTrustLevel(char.relationship?.trust || char.trust || 50);
    }
}

// 重写 saveCharacter 函数
window.saveCharacter = async function() {
    console.log('[Character V2] saveCharacter called');
    
    // 基础验证
    const name = document.getElementById('charName')?.value.trim();
    if (!name) {
        if (typeof showToast === 'function') {
            showToast('请输入角色名称', 'error');
        } else {
            alert('请输入角色名称');
        }
        return;
    }
    
    // 获取全局变量
    let globalGameId = window.gameId;
    const charId = window.editingCharacterId;
    
    console.log('[Character V2] Save - gameId:', globalGameId, 'charId:', charId, 'existing characters:', window.characters?.length || 0);
    
    // 如果gameId未设置，尝试从URL获取，或使用 'draft'
    if (!globalGameId) {
        const urlParams = new URLSearchParams(window.location.search);
        globalGameId = urlParams.get('id') || urlParams.get('world') || 'draft';
        console.log('[Character V2] gameId not set, using:', globalGameId);
    }
    
    // 读取当前角色数组
    let globalCharacters = window.characters || [];
    // 确保是数组
    if (!Array.isArray(globalCharacters)) {
        globalCharacters = [];
    }
    
    // 构建V2结构的角色对象
    const char = {
        name: name,
        visual: {
            avatar: document.getElementById('charAvatar')?.value.trim() || '',
            cover: '',
            color: document.getElementById('charColor')?.value.trim() || '#8a6d3b',
            emotionCGs: {}
        },
        core: {
            description: document.getElementById('charDescription')?.value.trim() || '',
            personality: document.getElementById('charPersonality')?.value.trim() || '',
            scenario: document.getElementById('charScenario')?.value.trim() || '',
            firstMessage: document.getElementById('charFirstMessage')?.value.trim() || '',
            worldConnection: {
                faction: document.getElementById('charFaction')?.value.trim() || '',
                location: document.getElementById('charLocation')?.value.trim() || ''
            }
        },
        activation: {
            keys: (document.getElementById('charKeys')?.value || '').split(/[,，]/).map(k => k.trim()).filter(Boolean),
            priority: parseInt(document.getElementById('charPriority')?.value) || 100,
            enabled: true
        },
        examples: {
            style: document.getElementById('charExampleStyle')?.value.trim() || '',
            dialogues: currentExampleDialogues
        },
        lorebook: {
            entries: currentLorebookEntries,
            linkMode: document.getElementById('charLinkMode')?.value || 'MANUAL',
            linkedEntryIds: []
        },
        injection: {
            characterNote: {
                content: document.getElementById('charNoteContent')?.value.trim() || '',
                depth: parseInt(document.getElementById('charNoteDepth')?.value) || 0,
                frequency: parseInt(document.getElementById('charNoteFrequency')?.value) || 1,
                role: document.getElementById('charNoteRole')?.value || 'system'
            },
            postHistory: {
                content: document.getElementById('charPostHistory')?.value.trim() || '',
                enabled: document.getElementById('charPostHistoryEnabled')?.checked || false
            }
        },
        relationship: {
            favor: parseInt(document.getElementById('charFavor')?.value) || 50,
            trust: parseInt(document.getElementById('charTrust')?.value) || 50,
            mood: document.getElementById('charMood')?.value || '平静'
        },
        meta: {
            description: '',
            tags: [],
            creator: '',
            version: '2.0.0',
            updatedAt: new Date().toISOString()
        },
        gameId: globalGameId !== 'draft' ? globalGameId : null,
        // 兼容旧字段
        color: document.getElementById('charColor')?.value.trim() || '#8a6d3b',
        image: document.getElementById('charAvatar')?.value.trim() || '',
        imageFit: 'cover',
        enabled: true,
        _id: charId || 'char_' + Date.now()
    };
    
    if (!charId) {
        char.meta.createdAt = new Date().toISOString();
    }
    
    // 保存到数组
    if (charId) {
        const idx = globalCharacters.findIndex(c => c._id === charId || c.id === charId);
        if (idx >= 0) {
            char.meta.createdAt = globalCharacters[idx].meta?.createdAt || char.meta.createdAt;
            globalCharacters[idx] = char;
        } else {
            globalCharacters.push(char);
        }
    } else {
        globalCharacters.push(char);
    }
    
    // 更新全局变量
    window.characters = globalCharacters;
    
    // 同时更新settings-main.js的局部变量
    if (typeof characters !== 'undefined') {
        characters = globalCharacters;
    }
    
    // 保存到localStorage
    if (globalGameId) {
        const storageKey = typeof STORAGE_KEYS !== 'undefined' && typeof STORAGE_KEYS.CHARACTERS === 'function' 
            ? STORAGE_KEYS.CHARACTERS(globalGameId) 
            : `galgame_${globalGameId}_characters`;
        try {
            localStorage.setItem(storageKey, JSON.stringify(globalCharacters));
            // 验证保存成功
            const saved = localStorage.getItem(storageKey);
            const savedCount = saved ? JSON.parse(saved).length : 0;
            console.log('[Character V2] Saved to localStorage:', storageKey, 'saved count:', savedCount);
        } catch (e) {
            console.error('[Character V2] localStorage save failed:', e);
        }
    } else {
        console.error('[Character V2] gameId is null, cannot save to localStorage');
    }
    
    // 同步到后端
    if (globalGameId && globalGameId !== 'draft') {
        try {
            if (typeof saveCharactersToBackend === 'function') {
                await saveCharactersToBackend(globalGameId, globalCharacters);
                console.log('[Character V2] Characters synced to backend:', globalCharacters.length);
            } else {
                console.warn('[Character V2] saveCharactersToBackend function not available');
            }
        } catch (err) {
            console.error('[Character V2] Failed to sync to backend:', err);
            // 后端同步失败不影响本地保存
        }
    }
    
    // 关闭模态框
    const overlay = document.getElementById('characterModalOverlay');
    if (overlay) {
        overlay.classList.remove('show');
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }
    
    // 刷新列表（立即刷新，确保UI更新）
    if (typeof renderCharacterList === 'function') {
        renderCharacterList();
        console.log('[Character V2] Character list refreshed');
    }
    
    // 显示提示
    if (typeof showToast === 'function') {
        showToast(charId ? '角色已更新' : '角色已创建', 'success');
    } else {
        alert(charId ? '角色已更新' : '角色已创建');
    }
    
    console.log('[Character V2] Save completed:', char.name, 'ID:', char._id);
};

// 绑定原函数的关闭事件
window.closeCharacterModal = function() {
    const overlay = document.getElementById('characterModalOverlay');
    if (overlay) {
        overlay.classList.remove('show');
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }
};

// 覆盖预览生成函数
window.generateCharacterPromptPreview = function() {
    const name = document.getElementById('charName')?.value.trim() || '未命名';
    const description = document.getElementById('charDescription')?.value.trim() || '';
    const personality = document.getElementById('charPersonality')?.value.trim() || '';
    const scenario = document.getElementById('charScenario')?.value.trim() || '';
    const faction = document.getElementById('charFaction')?.value.trim() || '';
    const location = document.getElementById('charLocation')?.value.trim() || '';
    const favor = document.getElementById('charFavor')?.value || 50;
    const trust = document.getElementById('charTrust')?.value || 50;
    const mood = document.getElementById('charMood')?.value || '平静';
    
    const parts = [];
    parts.push(`【角色】${name}`);
    
    if (description) parts.push(`\n【描述】${description}`);
    if (personality) parts.push(`\n【性格】${personality}`);
    if (scenario) parts.push(`\n【处境】${scenario}`);
    if (faction || location) parts.push(`\n【所属】${faction || '无'} | ${location || '未知'}`);
    parts.push(`\n【关系】好感:${favor}/100 | 信任:${trust}/100 | 心情:${mood}`);
    
    if (currentExampleDialogues.length > 0) {
        parts.push(`\n【示例对话】`);
        currentExampleDialogues.slice(0, 2).forEach((ex, i) => {
            parts.push(`\n示例${i+1}:`);
            if (ex.user) parts.push(`用户: ${ex.user}`);
            if (ex.character) parts.push(`角色: ${ex.character}`);
        });
    }
    
    const previewEl = document.getElementById('charPromptPreview');
    if (previewEl) {
        previewEl.textContent = parts.join('\n') || '请填写角色信息生成预览...';
    }
};

// 覆盖buildCharacterPrompt以支持V2
window.buildCharacterPrompt = function(data) {
    // 如果是V2格式数据
    if (data.core || data.visual) {
        const parts = [];
        parts.push(`【角色】${data.name || '未命名'}`);
        
        if (data.core?.description) parts.push(`\n【描述】${data.core.description}`);
        if (data.core?.personality) parts.push(`\n【性格】${data.core.personality}`);
        if (data.core?.scenario) parts.push(`\n【处境】${data.core.scenario}`);
        if (data.core?.worldConnection?.faction || data.core?.worldConnection?.location) {
            parts.push(`\n【所属】${data.core.worldConnection.faction || '无'} | ${data.core.worldConnection.location || '未知'}`);
        }
        if (data.relationship) {
            parts.push(`\n【关系】好感:${data.relationship.favor}/100 | 信任:${data.relationship.trust}/100 | 心情:${data.relationship.mood}`);
        }
        if (data.examples?.style) parts.push(`\n【说话风格】${data.examples.style}`);
        
        return parts.join('\n');
    }
    
    // 旧格式兼容
    const parts = [];
    parts.push(`【角色名称】${data.name || '未命名'}`);
    if (data.appearance) parts.push(`\n【外貌特征】${data.appearance}`);
    if (data.personality) parts.push(`\n【性格特点】${data.personality}`);
    if (data.background) parts.push(`\n【身世背景】${data.background}`);
    
    return parts.join('\n');
};

// 标记V2编辑器已加载
window._v2EditorLoaded = true;

console.log('[Character V2] Editor extension loaded');
console.log('[Character V2] Initial characters count:', window.characters?.length || 0);

// 延迟显示gameId，因为可能在初始化过程中
setTimeout(() => {
    console.log('[Character V2] gameId after init:', window.gameId);
}, 100);
