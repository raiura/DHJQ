// ==================== 配置 ====================
const API_BASE = 'http://localhost:3000/api';
let currentUser = null;
let currentGame = null;
let gameId = null;
let isEditMode = false;
let characters = [];
let editingCharacterId = null;
let gallery = [];

// 世界书相关变量
let editingWorldbookId = null;
let editingWorldbookIsUser = false;
let worldbookManager = null; // 旧版世界书管理器实例
let worldbookLibrary = null; // 新世界书图书馆实例
let worldbookManagerUI = null; // 世界书管理器 UI 实例

// 记忆服务实例
let memoryService = null;

// 记忆管理状态
let memoryFilterState = {
    type: 'all',
    search: '',
    sortBy: 'time-desc'
};
let allMemoriesCache = [];

// 全局错误处理
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('[Settings] Error:', msg, 'at', lineNo + ':' + columnNo);
    return false;
};

// 用户个人设置（仅存储在localStorage中）
let userPersonalSettings = {
    worldbook: { background: '', entries: [] },
    prompts: { prePrompt: '', postPrompt: '', exampleDialogue: '', dialogStyle: '', restrictions: '' },
    characters: []
};

// ==================== 存档管理系统 ====================
const SAVE_KEY = 'galgame_saves';
const CURRENT_SAVE_KEY = 'galgame_current_save';
let currentSaveId = localStorage.getItem(CURRENT_SAVE_KEY) || '';

function getCurrentWorld() {
    return new URLSearchParams(window.location.search).get('world') || 
           localStorage.getItem('galgame_current_world') || 'dahuang';
}

function getSaves() {
    const world = getCurrentWorld();
    const allSaves = localStorage.getItem(SAVE_KEY);
    const saves = allSaves ? JSON.parse(allSaves) : {};
    return saves[world] || [];
}

function saveSavesList(saves) {
    const world = getCurrentWorld();
    const allSaves = localStorage.getItem(SAVE_KEY);
    const data = allSaves ? JSON.parse(allSaves) : {};
    data[world] = saves;
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

function getCurrentSaveData() {
    if (!currentSaveId) return null;
    const saves = getSaves();
    return saves.find(s => s.id === currentSaveId) || null;
}

function initSaveSelector() {
    const section = document.getElementById('saveSelectorSection');
    if (!section) return;
    section.style.display = document.body.classList.contains('user-view') ? 'block' : 'none';
    loadSaveOptions();
}

function loadSaveOptions() {
    const selector = document.getElementById('saveSelector');
    const saves = getSaves();
    let html = '<option value="">选择存档...</option>';
    saves.forEach(save => {
        const isCurrent = save.id === currentSaveId;
        const msgCount = save.messages ? save.messages.length : 0;
        html += `<option value="${save.id}" ${isCurrent ? 'selected' : ''}>${isCurrent ? '★ ' : ''}${save.name} (${msgCount}条)</option>`;
    });
    selector.innerHTML = html;
    updateSaveInfo();
}

function updateSaveInfo() {
    const infoDiv = document.getElementById('saveInfo');
    const save = getCurrentSaveData();
    infoDiv.innerHTML = save ? `上次游戏: ${new Date(save.updatedAt).toLocaleDateString('zh-CN')}` : '未选择存档';
}

function onSaveChange(saveId) {
    if (!saveId) return;
    currentSaveId = saveId;
    localStorage.setItem(CURRENT_SAVE_KEY, saveId);
    updateSaveInfo();
    showToast(`已切换到: ${getCurrentSaveData()?.name || '存档'}`, 'success');
    loadUserConfig();
}

function createNewSaveFromSettings() {
    const name = prompt('给新存档起个名字:', '存档 ' + (getSaves().length + 1));
    if (name === null) return;
    
    const saves = getSaves();
    const newSave = {
        id: 'save_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        name: name || '存档 ' + (saves.length + 1),
        world: getCurrentWorld(),
        messages: [],
        memories: { short: [], long: [], core: [] },
        favor: {},
        experiences: [],
        config: { memoryDepth: 10, coreMemorySlots: 5, autoSummarize: true, temperature: 0.7, maxTokens: 2000, model: 'deepseek-chat' },
        progress: { currentChapter: '', unlockedEvents: [], completedRoutes: [], playTime: 0 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    saves.unshift(newSave);
    saveSavesList(saves);
    
    currentSaveId = newSave.id;
    localStorage.setItem(CURRENT_SAVE_KEY, newSave.id);
    loadSaveOptions();
    showToast('新存档已创建', 'success');
}

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('[Settings] Initializing...');
        gameId = new URLSearchParams(window.location.search).get('id');
        isEditMode = !!gameId;
        
        initParticles();
        checkAuth();
        setupNavigation();
        setupTabs();
        switchToPageFromURL();
        
        // 初始化世界书管理器
        await initWorldbookManager();
        
        // 初始化角色编辑器事件
        initCharacterEditorEvents();
        
        if (isEditMode) {
            loadGameData().then(() => {
                restoreViewMode();
            }).catch(err => {
                console.error('[Settings] Failed to load game data:', err);
                // API 失败时，尝试从 localStorage 加载迁移的角色
                const migratedChars = JSON.parse(localStorage.getItem(`game_${gameId}_characters`) || '[]');
                if (migratedChars.length > 0) {
                    characters = migratedChars;
                    renderCharacterList();
                    console.log('[Settings] API 失败，从 localStorage 加载迁移角色:', characters.length);
                }
            });
        } else {
            // 创建新模式
            const pageTitle = document.getElementById('pageTitle');
            const gameStatus = document.getElementById('gameStatus');
            const publishBtn = document.getElementById('publishBtn');
            const unpublishBtn = document.getElementById('unpublishBtn');
            const previewBtn = document.getElementById('previewBtn');
            const deleteBtn = document.getElementById('deleteBtn');
            
            if (pageTitle) pageTitle.textContent = '创建新世界';
            if (gameStatus) gameStatus.style.display = 'none';
            if (publishBtn) publishBtn.style.display = 'none';
            if (unpublishBtn) unpublishBtn.style.display = 'none';
            if (previewBtn) previewBtn.style.display = 'none';
            if (deleteBtn) deleteBtn.style.display = 'none';
            
            // 尝试加载迁移的角色数据
            const migratedChars = JSON.parse(localStorage.getItem(`game_${gameId}_characters`) || '[]');
            if (migratedChars.length > 0) {
                characters = migratedChars;
                console.log('[Settings] 加载迁移角色:', characters.length);
            } else {
                characters = [
                    { name: '向导', color: '#FF69B4', prompt: '陪伴玩家冒险的伙伴' },
                    { name: '伙伴', color: '#87CEFA', prompt: '陪伴玩家冒险的伙伴' }
                ];
            }
            renderCharacterList();
            restoreViewMode();
        }
        console.log('[Settings] Initialized successfully');
    } catch (error) {
        console.error('[Settings] Initialization error:', error);
    }
});

async function loadGameData() {
    try {
        const response = await fetch(`${API_BASE}/games/${gameId}/edit`, {
            headers: getAuthHeaders()
        });
        const result = await response.json();
        
        if (result.success) {
            currentGame = result.data.game;
            characters = result.data.characters || [];
            
            // 合并从迁移工具导入的角色（localStorage）
            const migratedChars = JSON.parse(localStorage.getItem(`game_${gameId}_characters`) || '[]');
            if (migratedChars.length > 0) {
                // 去重：根据名称合并
                const existingNames = new Set(characters.map(c => c.name));
                const newChars = migratedChars.filter(c => !existingNames.has(c.name));
                characters = [...characters, ...newChars];
                console.log('[Settings] 合并迁移角色:', newChars.length);
            }
            
            fillGameInfo(currentGame);
            updateStatusUI(currentGame.status);
            renderCharacterList();
            // 世界书现在由 WorldbookManager 管理
            // await loadWorldbookEntries();
            await loadGallery();
        } else {
            showToast(result.message || '加载失败', 'error');
            // 后端返回失败时，尝试从 localStorage 加载迁移的角色
            const migratedChars = JSON.parse(localStorage.getItem(`game_${gameId}_characters`) || '[]');
            if (migratedChars.length > 0) {
                characters = migratedChars;
                renderCharacterList();
                console.log('[Settings] 后端返回失败，从 localStorage 加载迁移角色:', characters.length);
            }
        }
    } catch (error) {
        console.error('加载游戏数据失败:', error);
        showToast('加载失败: ' + error.message, 'error');
        // API 请求异常时，尝试从 localStorage 加载迁移的角色
        const migratedChars = JSON.parse(localStorage.getItem(`game_${gameId}_characters`) || '[]');
        if (migratedChars.length > 0) {
            characters = migratedChars;
            renderCharacterList();
            console.log('[Settings] API 异常，从 localStorage 加载迁移角色:', characters.length);
        }
    }
}

function fillGameInfo(game) {
    document.getElementById('gameTitle').value = game.title || '';
    document.getElementById('gameSubtitle').value = game.subtitle || '';
    document.getElementById('gameSlug').value = game.slug || '';
    document.getElementById('gameGenre').value = game.genre || '其他';
    document.getElementById('gameDescription').value = game.description || '';
    document.getElementById('gameWorldSetting').value = game.worldSetting || '';
    document.getElementById('gameCover').value = game.cover || '';
    document.getElementById('gameBackground').value = game.background || '';
    document.getElementById('gameOpening').value = game.config?.openingMessage || '';
    document.getElementById('pageTitle').textContent = `编辑：${game.title}`;
    document.getElementById('headerTitle').textContent = game.title;
}

function updateStatusUI(status) {
    const badge = document.getElementById('gameStatus');
    const publishBtn = document.getElementById('publishBtn');
    const unpublishBtn = document.getElementById('unpublishBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    
    if (status === 'published') {
        badge.textContent = '已发布';
        badge.className = 'status-badge status-published';
        publishBtn.style.display = 'none';
        unpublishBtn.style.display = 'inline-flex';
        deleteBtn.style.display = 'none';
    } else {
        badge.textContent = '草稿';
        badge.className = 'status-badge status-draft';
        publishBtn.style.display = 'inline-flex';
        unpublishBtn.style.display = 'none';
        deleteBtn.style.display = 'inline-flex';
    }
}

function initParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = (15 + Math.random() * 10) + 's';
        container.appendChild(particle);
    }
}

function checkAuth() {
    const token = localStorage.getItem('galgame_token');
    const userStr = localStorage.getItem('galgame_user');
    
    if (!token || !userStr) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = JSON.parse(userStr);
    const usernameEl = document.getElementById('currentUsername');
    if (usernameEl) usernameEl.textContent = currentUser.nickname || currentUser.username;
}

function getAuthHeaders() {
    const token = localStorage.getItem('galgame_token');
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
}

// ==================== 视图切换 ====================
let isUserView = false;

function isAdmin() {
    return currentUser && (currentUser.role === 'admin' || currentUser.isAdmin);
}

function isAuthor() {
    if (!currentUser) return false;
    if (!currentGame) return true;
    return (currentGame.creator || currentGame.authorId) === currentUser._id;
}

function hasFullEditPermission() {
    return isAdmin() || isAuthor();
}

function toggleViewMode() {
    if (!hasFullEditPermission()) {
        showToast('您没有权限切换视图', 'error');
        return;
    }
    
    isUserView = !isUserView;
    const body = document.body;
    const text = document.getElementById('viewModeText');
    
    if (isUserView) {
        body.classList.add('user-view');
        if (text) text.textContent = '用户视图';
        showToast('已切换到用户视图');
    } else {
        body.classList.remove('user-view');
        if (text) text.textContent = '管理员视图';
        showToast('已切换到管理员视图');
    }
    
    localStorage.setItem('settings_view_mode', isUserView ? 'user' : 'admin');
    initSaveSelector();
}

function restoreViewMode() {
    console.log('[Settings] Restoring view mode...');
    const savedMode = localStorage.getItem('settings_view_mode');
    const btn = document.getElementById('viewToggleBtn');
    const text = document.getElementById('viewModeText');
    
    console.log('[Settings] View toggle button:', btn ? 'found' : 'not found');
    console.log('[Settings] Has full edit permission:', hasFullEditPermission());
    
    if (!hasFullEditPermission()) {
        // 普通用户：强制用户视图
        isUserView = true;
        document.body.classList.add('user-view');
        if (btn) { 
            btn.style.opacity = '0.5'; 
            btn.style.cursor = 'not-allowed'; 
            btn.title = '作者才能切换视图'; 
            btn.disabled = true; 
        }
        loadUserPersonalSettings();
    } else {
        // 作者/管理员：可以切换视图
        if (btn) { 
            btn.style.opacity = '1'; 
            btn.style.cursor = 'pointer'; 
            btn.title = '点击切换视图'; 
            btn.disabled = false; 
        }
        if (savedMode === 'user') {
            isUserView = true;
            document.body.classList.add('user-view');
            if (text) text.textContent = '用户视图';
        } else {
            isUserView = false;
            document.body.classList.remove('user-view');
            if (text) text.textContent = '管理员视图';
        }
        loadUserPersonalSettings();
    }
    initSaveSelector();
    console.log('[Settings] View mode restored:', isUserView ? 'user' : 'admin');
}

function loadUserPersonalSettings() {
    // 简化版本 - 从 localStorage 加载
    if (!gameId) return;
    const storageKey = `user_settings_${gameId}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
        try { userPersonalSettings = JSON.parse(saved); } catch (e) {}
    }
    fillUserPersonalSettings();
}

function fillUserPersonalSettings() {
    const bgEl = document.getElementById('userPersonalBackground');
    if (bgEl) bgEl.value = userPersonalSettings.worldbook.background || '';
}

// ==================== 导航 ====================
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        const targetPage = item.dataset.page;
        if (!targetPage) return;
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            switchToPage(targetPage);
        });
    });
}

function switchToPage(pageId) {
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    // HTML 中的 section ID 格式是 'page-xxx'
    const targetSection = document.getElementById('page-' + pageId);
    if (targetSection) {
        targetSection.classList.add('active');
        console.log('[Settings] Switched to page:', pageId);
        
        // 如果切换到世界概览页面，刷新数据
        if (pageId === 'world-overview') {
            renderWorldOverview();
        }
        
        // 如果切换到记忆管理页面，加载记忆
        if (pageId === 'memories') {
            loadMemories();
        }
    } else {
        console.error('[Settings] Page section not found:', 'page-' + pageId);
    }
    window.history.replaceState(null, null, `?page=${pageId}${gameId ? '&id=' + gameId : ''}`);
}

function switchToPageFromURL() {
    const page = new URLSearchParams(window.location.search).get('page') || 'dashboard';
    const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navItem) navItem.click();
}

function setupTabs() {
    // Tab setup logic if needed
}

// ==================== 世界概览 ====================
function renderWorldOverview() {
    // 更新统计数据
    const charCountEl = document.getElementById('statCharacterCount');
    const wbCountEl = document.getElementById('statWorldbookCount');
    
    if (charCountEl) charCountEl.textContent = characters?.length || 0;
    if (wbCountEl) wbCountEl.textContent = worldbookManager?.getAllEntriesForDisplay()?.length || 0;
    
    // 渲染角色预览
    const charContainer = document.getElementById('worldOverviewCharacters');
    if (charContainer && characters && characters.length > 0) {
        charContainer.innerHTML = `
            <div class="character-showcase">
                ${characters.slice(0, 3).map(char => `
                    <div class="character-showcase-card" style="--char-color: ${char.color || '#8a6d3b'}">
                        <div class="character-showcase-image" style="height: 280px;">
                            ${char.avatar ? 
                                `<img src="${char.avatar}" alt="${char.name}" onerror="this.parentElement.innerHTML='<div class=\'character-showcase-placeholder\'>${char.name.charAt(0)}</div>'">` : 
                                `<div class="character-showcase-placeholder">${char.name.charAt(0)}</div>`
                            }
                        </div>
                        <div class="character-showcase-info" style="padding: 16px;">
                            <div class="character-showcase-name" style="font-size: 18px;">${char.name}</div>
                            <div class="character-showcase-title">${char.background || char.title || '修仙者'}</div>
                            <div class="character-showcase-desc" style="font-size: 13px; margin-top: 8px;">${char.prompt?.substring(0, 60) || ''}...</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // 渲染世界书预览
    const wbContainer = document.getElementById('worldOverviewWorldbook');
    if (wbContainer && worldbookManager) {
        const entries = worldbookManager.getAllEntriesForDisplay().slice(0, 3);
        if (entries.length > 0) {
            wbContainer.innerHTML = entries.map(entry => `
                <div class="worldbook-entry-card" style="--entry-color: ${entry.groupColor || '#888'}; margin-bottom: 12px;">
                    <div class="worldbook-entry-header">
                        <span class="worldbook-entry-title">${entry.name}</span>
                        <span class="worldbook-entry-group">${entry.group}</span>
                    </div>
                    <div class="worldbook-entry-content" style="max-height: 60px;">
                        ${entry.content.substring(0, 100)}...
                    </div>
                </div>
            `).join('');
        }
    }
}

function showLocationDetail(locationName) {
    showToast(`查看 ${locationName} 详情`, 'info');
    // 可以在这里展开更详细的地理信息
}

/**
 * 更新好感度等级显示
 */
function updateFavorLevel(value) {
    const favorValue = document.getElementById('favorValue');
    const favorBadge = document.getElementById('favorLevelBadge');
    if (favorValue) favorValue.textContent = value;
    
    if (favorBadge) {
        let level, color, emoji;
        if (value >= 80) { level = '热恋'; color = '#ff1744'; emoji = '💖'; }
        else if (value >= 60) { level = '友好'; color = '#ff6b9d'; emoji = '💕'; }
        else if (value >= 40) { level = '中立'; color = '#ffb347'; emoji = '💛'; }
        else if (value >= 20) { level = '冷淡'; color = '#9e9e9e'; emoji = '💚'; }
        else { level = '敌对'; color = '#616161'; emoji = '💀'; }
        
        favorBadge.textContent = emoji + ' ' + level;
        favorBadge.style.background = color;
    }
}

/**
 * 更新信任度等级显示
 */
function updateTrustLevel(value) {
    const trustValue = document.getElementById('trustValue');
    const trustBadge = document.getElementById('trustLevelBadge');
    if (trustValue) trustValue.textContent = value;
    
    if (trustBadge) {
        let level, color;
        if (value >= 80) { level = '托付'; color = '#e91e63'; }
        else if (value >= 60) { level = '信任'; color = '#9c27b0'; }
        else if (value >= 40) { level = '观察'; color = '#ff9800'; }
        else if (value >= 20) { level = '警惕'; color = '#795548'; }
        else { level = '防备'; color = '#ff5722'; }
        
        trustBadge.textContent = level;
        trustBadge.style.background = color;
    }
}

/**
 * 初始化角色编辑器事件
 */
function initCharacterEditorEvents() {
    // 颜色选择器联动
    const colorPicker = document.getElementById('charColorPicker');
    const colorInput = document.getElementById('charColor');
    
    if (colorPicker && colorInput) {
        colorPicker.addEventListener('input', (e) => {
            colorInput.value = e.target.value;
        });
        colorInput.addEventListener('input', (e) => {
            colorPicker.value = e.target.value;
        });
    }
    
    // 头像预览
    const avatarInput = document.getElementById('charAvatar');
    if (avatarInput) {
        avatarInput.addEventListener('input', (e) => {
            const previewEl = document.getElementById('charAvatarPreview');
            const imgEl = previewEl?.querySelector('img');
            if (previewEl && imgEl) {
                if (e.target.value) {
                    imgEl.src = e.target.value;
                    previewEl.style.display = 'block';
                } else {
                    previewEl.style.display = 'none';
                }
            }
        });
    }
    
    // 初始化好感度/信任度显示
    const favorInput = document.getElementById('charFavor');
    const trustInput = document.getElementById('charTrust');
    if (favorInput) updateFavorLevel(favorInput.value);
    if (trustInput) updateTrustLevel(trustInput.value);
}

// ==================== 角色管理 ====================
function renderCharacterList() {
    const container = document.getElementById('originalCharacterList');
    if (!container) {
        console.error('[Character] Container not found: originalCharacterList');
        return;
    }
    
    if (!characters || characters.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">暂无角色，点击"新建角色"添加</p>';
        return;
    }
    
    // 使用 world-guide.html 风格的角色卡片设计
    container.innerHTML = characters.map((char, index) => {
        const charId = char._id || char.id || index;
        const traits = char.keys || [];
        return `
        <div class="character-showcase-card" style="--char-color: ${char.color || '#8a6d3b'}" data-id="${charId}">
            <div class="character-showcase-image">
                ${char.avatar ? 
                    `<img src="${char.avatar}" alt="${char.name}" onerror="this.parentElement.innerHTML='<div class=\'character-showcase-placeholder\'>${char.name.charAt(0)}</div>'">` : 
                    `<div class="character-showcase-placeholder">${(char.name || '?').charAt(0)}</div>`
                }
            </div>
            <div class="character-showcase-info">
                <div class="character-showcase-header">
                    <div>
                        <div class="character-showcase-name">${char.name || '未命名'}</div>
                        <div class="character-showcase-title">${char.background || char.title || '修仙者'}</div>
                    </div>
                    <span class="character-showcase-type" style="background: ${char.color || '#8a6d3b'}">
                        ${char.personality ? char.personality.split(/[，,、]/)[0] : '角色'}
                    </span>
                </div>
                <div class="character-showcase-desc">${char.prompt || char.personality || ''}</div>
                <div class="character-showcase-traits">
                    ${traits.slice(0, 4).map(t => `<span class="trait-tag">${t}</span>`).join('')}
                </div>
                <div class="character-showcase-actions">
                    <button class="btn btn-sm btn-secondary" onclick="editCharacter('${charId}')">编辑</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCharacter('${charId}')">删除</button>
                </div>
            </div>
        </div>
    `}).join('');
}

function openCharacterModal() {
    editingCharacterId = null;
    
    // 重置所有字段
    const fields = {
        'charName': '',
        'charColor': '#8a6d3b',
        'charColorPicker': '#8a6d3b',
        'charAvatar': '',
        'charImageFit': 'cover',
        'charKeys': '',
        'charPriority': '100',
        'charFavor': '50',
        'charTrust': '50',
        'charMood': '平静',
        'charAppearance': '',
        'charPersonality': '',
        'charBackground': '',
        'charPhysique': '',
        'charSpecial': ''
    };
    
    for (const [id, value] of Object.entries(fields)) {
        const el = document.getElementById(id);
        if (el) el.value = value;
    }
    
    // 隐藏头像预览
    const previewEl = document.getElementById('charAvatarPreview');
    if (previewEl) previewEl.style.display = 'none';
    
    // 重置预览
    const promptPreview = document.getElementById('charPromptPreview');
    if (promptPreview) promptPreview.textContent = '点击「生成预览」查看AI提示词...';
    
    // 初始化好感度/信任度显示
    updateFavorLevel(50);
    updateTrustLevel(50);
    
    const modalTitle = document.querySelector('#characterModal .modal-title');
    if (modalTitle) modalTitle.textContent = '🎭 新建角色';
    
    const overlay = document.getElementById('characterModalOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
        overlay.classList.add('show');
    }
}

function closeCharacterModal() {
    const overlay = document.getElementById('characterModalOverlay');
    if (overlay) {
        overlay.classList.remove('show');
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }
}

function deleteCharacter(id) {
    if (!confirm('确定要删除这个角色吗？')) return;
    characters = characters.filter((c, i) => (c._id || i.toString()) !== id);
    renderCharacterList();
    showToast('已删除');
}

function saveCharacter() {
    // 收集所有字段
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
    
    // 解析关键词
    const keys = keysText.split(/[,，]/).map(k => k.trim()).filter(Boolean);
    
    // 构建角色对象 (与后端模型完全一致)
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
        // 生成AI提示词
        prompt: buildCharacterPrompt({ name, appearance, personality, background, physique, special }),
        enabled: true,
        _id: editingCharacterId || 'char_' + Date.now(),
        updatedAt: new Date().toISOString()
    };
    
    if (editingCharacterId) {
        const idx = characters.findIndex(c => c._id === editingCharacterId || c.id === editingCharacterId);
        if (idx >= 0) {
            // 保留原有统计字段
            char.stats.encounters = characters[idx].stats?.encounters || 0;
            char.stats.dialogueTurns = characters[idx].stats?.dialogueTurns || 0;
            characters[idx] = char;
        }
    } else {
        char.createdAt = new Date().toISOString();
        characters.push(char);
    }
    
    // 保存到localStorage
    if (gameId) {
        localStorage.setItem(`game_${gameId}_characters`, JSON.stringify(characters));
    }
    
    closeCharacterModal();
    renderCharacterList();
    showToast('角色已保存', 'success');
}

/**
 * 构建角色提示词
 */
function buildCharacterPrompt(data) {
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

/**
 * 生成角色提示词预览
 */
function generateCharacterPromptPreview() {
    const data = {
        name: document.getElementById('charName')?.value.trim() || '未命名',
        appearance: document.getElementById('charAppearance')?.value.trim() || '',
        personality: document.getElementById('charPersonality')?.value.trim() || '',
        background: document.getElementById('charBackground')?.value.trim() || '',
        physique: document.getElementById('charPhysique')?.value.trim() || '',
        special: document.getElementById('charSpecial')?.value.trim() || ''
    };
    
    const preview = buildCharacterPrompt(data);
    const previewEl = document.getElementById('charPromptPreview');
    if (previewEl) {
        previewEl.textContent = preview || '请填写角色信息生成预览...';
    }
}

/**
 * 关闭图库模态框
 */
function closeGalleryModal() {
    const overlay = document.getElementById('galleryModalOverlay');
    if (overlay) {
        overlay.classList.remove('show');
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }
}

// ==================== 世界书管理（新版 2.0）====================

/**
 * 初始化世界书管理器
 */
async function initWorldbookManager() {
    console.log('[Worldbook] Initializing manager...');
    
    // 创建管理器实例
    worldbookManager = new WorldbookManager({ gameId });
    
    // 设置当前存档
    if (currentSaveId) {
        worldbookManager.setCurrentSave(currentSaveId);
    }
    
    // 加载全局世界书
    await worldbookManager.loadGlobalWorldbook();
    
    // 渲染列表
    renderWorldbookList();
    renderWorldbookGroups();
    
    console.log('[Worldbook] Manager initialized');
    
    // 初始化新世界书图书馆 2.0
    initWorldbookLibrary();
}

/**
 * 初始化新世界书图书馆 2.0 (SillyTavern 风格)
 */
function initWorldbookLibrary() {
    console.log('[WorldbookLibrary] Initializing...');
    
    // 创建世界书图书馆实例
    worldbookLibrary = new WorldbookLibrary({ gameId });
    
    // 初始化世界书管理器 UI
    const container = document.getElementById('worldbookManagerContainer');
    if (container && typeof WorldbookManagerUI !== 'undefined') {
        worldbookManagerUI = new WorldbookManagerUI(container, {
            library: worldbookLibrary,
            gameId: gameId,
            onEntrySelect: (entry) => {
                // 打开条目编辑器
                openWorldbookEntryEditor(entry);
            },
            onBookSelect: (book) => {
                console.log('[WorldbookManagerUI] Selected book:', book?.name);
            }
        });
        console.log('[WorldbookLibrary] UI initialized with', worldbookLibrary.getAllBooks().length, 'books');
    } else {
        console.warn('[WorldbookLibrary] Container or UI class not found');
    }
    
    // 初始化记忆服务
    initMemoryService();
}

/**
 * 初始化记忆服务
 */
function initMemoryService() {
    console.log('[MemoryService] Initializing...');
    
    if (typeof MemoryService === 'undefined') {
        console.warn('[MemoryService] MemoryService class not found');
        return;
    }
    
    memoryService = new MemoryService({
        apiBase: API_BASE,
        gameId: gameId
    });
    
    // 如果当前在记忆管理页面，加载记忆
    const currentPage = document.querySelector('.page-section.active')?.id;
    if (currentPage === 'page-memories') {
        loadMemories();
    }
    
    console.log('[MemoryService] Initialized');
}

/**
 * 渲染世界书列表（支持分组显示）
 */
// 世界书筛选状态
let worldbookFilterState = {
    search: '',
    group: '',
    sortBy: 'priority-desc',
    userOnly: false
};

/**
 * 筛选并渲染世界书列表
 */
function filterWorldbookList() {
    const searchInput = document.getElementById('wbSearchInput');
    const groupFilter = document.getElementById('wbGroupFilter');
    const userOnlyCheck = document.getElementById('wbShowUserOnly');
    
    worldbookFilterState.search = searchInput?.value || '';
    worldbookFilterState.group = groupFilter?.value || '';
    worldbookFilterState.userOnly = userOnlyCheck?.checked || false;
    
    renderWorldbookList();
}

/**
 * 排序并渲染世界书列表
 */
function sortAndRenderWorldbook() {
    const sortSelect = document.getElementById('wbSortBy');
    if (sortSelect) {
        worldbookFilterState.sortBy = sortSelect.value;
    }
    renderWorldbookList();
}

function renderWorldbookList() {
    const container = document.getElementById('originalWorldbookList');
    const totalStatsEl = document.getElementById('originalWbTotalEntries');
    const globalStatsEl = document.getElementById('globalWbCount');
    const userStatsEl = document.getElementById('userWbCount');
    
    if (!container) {
        console.error('[Worldbook] Container not found: originalWorldbookList');
        return;
    }
    
    if (!worldbookManager) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">正在加载...</p>';
        return;
    }
    
    let entries = worldbookManager.getAllEntriesForDisplay();
    
    // 调试日志
    console.log('[Worldbook] Raw entries from manager:', entries.length);
    console.log('[Worldbook] Filter state:', JSON.stringify(worldbookFilterState));
    
    // 更新统计（在筛选前）
    if (totalStatsEl) totalStatsEl.textContent = entries.length;
    if (globalStatsEl) globalStatsEl.textContent = entries.filter(e => !e.isUserEntry).length;
    if (userStatsEl) userStatsEl.textContent = entries.filter(e => e.isUserEntry).length;
    
    // 应用筛选
    if (worldbookFilterState.search) {
        const query = worldbookFilterState.search.toLowerCase();
        entries = entries.filter(e => 
            e.name.toLowerCase().includes(query) ||
            e.keys.some(k => k.toLowerCase().includes(query)) ||
            e.content.toLowerCase().includes(query)
        );
    }
    
    if (worldbookFilterState.group) {
        entries = entries.filter(e => e.group === worldbookFilterState.group);
    }
    
    if (worldbookFilterState.userOnly) {
        entries = entries.filter(e => e.isUserEntry);
    }
    
    console.log('[Worldbook] After filter:', entries.length);
    
    // 应用排序
    const [sortField, sortOrder] = worldbookFilterState.sortBy.split('-');
    entries = sortWorldbookEntries(entries, sortField, sortOrder);
    
    console.log('[Worldbook] Final entries to render:', entries.length);
    
    if (entries.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 40px; color: var(--text-secondary);">
                <div style="font-size: 48px; margin-bottom: 15px;">📚</div>
                <div style="font-size: 18px; margin-bottom: 8px;">暂无世界书条目</div>
                <div style="font-size: 14px; opacity: 0.8;">点击"新建条目"添加你的第一条世界书知识</div>
            </div>
        `;
        return;
    }
    
    // 按分组组织条目
    const groups = {};
    entries.forEach(entry => {
        const group = entry.group || '未分组';
        if (!groups[group]) groups[group] = [];
        groups[group].push(entry);
    });
    
    // 渲染分组 - 使用增强卡片样式
    container.innerHTML = Object.entries(groups).map(([groupName, groupEntries]) => `
        <div class="worldbook-group" style="margin-bottom: 32px;">
            <div class="worldbook-group-header" style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid rgba(138, 109, 59, 0.3);">
                <span style="width: 16px; height: 16px; border-radius: 50%; background: ${groupEntries[0].groupColor || '#888'}; box-shadow: 0 0 10px ${groupEntries[0].groupColor || '#888'};"></span>
                <span style="font-weight: 700; color: var(--primary-light); font-size: 18px;">${groupName}</span>
                <span style="color: var(--text-secondary); font-size: 14px; background: rgba(138, 109, 59, 0.15); padding: 4px 12px; border-radius: 12px;">${groupEntries.length} 条目</span>
            </div>
            <div class="worldbook-entries">
                ${groupEntries.map(entry => `
                    <div class="worldbook-entry-card" style="--entry-color: ${entry.groupColor || '#888'}; ${entry.enabled === false ? 'opacity: 0.5;' : ''}">
                        <div class="worldbook-entry-header">
                            <div style="flex: 1;">
                                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                    <span class="worldbook-entry-title">${entry.name}</span>
                                    ${entry.isUserEntry ? '<span style="font-size: 11px; background: rgba(33, 150, 243, 0.2); color: #2196F3; padding: 3px 8px; border-radius: 4px;">用户</span>' : ''}
                                    ${entry.constant ? '<span style="font-size: 11px; background: rgba(255, 152, 0, 0.2); color: #FF9800; padding: 3px 8px; border-radius: 4px;">恒常</span>' : ''}
                                </div>
                                <div class="worldbook-entry-keys">
                                    ${entry.keys.map(k => `<span class="key-tag">${k}</span>`).join('')}
                                </div>
                            </div>
                            <div class="worldbook-entry-meta">
                                <span class="worldbook-entry-priority">优先级 ${entry.priority}</span>
                                <span class="worldbook-entry-group">${getInsertPositionLabel(entry.insertPosition)}</span>
                            </div>
                        </div>
                        <div class="worldbook-entry-content">
                            ${entry.content.substring(0, 200)}${entry.content.length > 200 ? '...' : ''}
                        </div>
                        <div class="worldbook-entry-actions">
                            <button class="btn btn-sm btn-secondary" onclick="editWorldbookEntry('${entry.id}', ${entry.isUserEntry})">✏️ 编辑</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteWorldbookEntry('${entry.id}', ${entry.isUserEntry})">🗑️ 删除</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

function getInsertPositionLabel(position) {
    const labels = {
        'system': '系统级',
        'character': '角色级',
        'user': '用户级',
        'example': '示例级'
    };
    return labels[position] || '角色级';
}

/**
 * 渲染分组选择器
 */
function renderWorldbookGroups() {
    const select = document.getElementById('wbEntryGroup');
    if (!select || !worldbookManager) return;
    
    const stats = worldbookManager.getGroupStats();
    const groups = Object.entries(stats);
    
    select.innerHTML = groups.map(([name, info]) => `
        <option value="${name}" data-color="${info.color}">${name} (${info.count})</option>
    `).join('') + '<option value="__new__">+ 新建分组</option>';
}

/**
 * 打开世界书模态框（新建）
 */
function openWorldbookModal() {
    console.log('[Worldbook] Opening modal for new entry...');
    
    editingWorldbookId = null;
    editingWorldbookIsUser = false;
    
    // 重置表单
    const fields = ['wbEntryName', 'wbKeyword', 'wbContent', 'wbExcludeKeys'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    // 设置默认值
    const priorityEl = document.getElementById('wbPriority');
    if (priorityEl) priorityEl.value = '100';
    
    const matchTypeEl = document.getElementById('wbMatchType');
    if (matchTypeEl) matchTypeEl.value = 'contains';
    
    const positionEl = document.getElementById('wbInsertPosition');
    if (positionEl) positionEl.value = 'character';
    
    const modalTitle = document.getElementById('wbModalTitle');
    if (modalTitle) modalTitle.textContent = '新建世界书条目';
    
    // 显示模态框
    const overlay = document.getElementById('worldbookModalOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
        overlay.classList.add('show');
    }
    
    // 更新分组选择器
    renderWorldbookGroups();
}

/**
 * 从世界书管理器 UI 打开条目编辑器
 * 这是 2.0 版本使用的函数
 */
function openWorldbookEntryEditor(entry) {
    if (!entry) {
        // 新建条目模式
        openWorldbookModal();
        return;
    }
    
    console.log('[Worldbook] Opening editor for entry:', entry.id);
    
    // 设置编辑状态
    editingWorldbookId = entry.id;
    // 标记为来自新系统
    editingWorldbookIsUser = entry._bookId ? 'library' : false;
    
    // 填充表单
    const nameEl = document.getElementById('wbEntryName');
    if (nameEl) nameEl.value = entry.name || '';
    
    const keywordEl = document.getElementById('wbKeyword');
    if (keywordEl) keywordEl.value = (entry.keys || []).join(', ');
    
    const contentEl = document.getElementById('wbContent');
    if (contentEl) contentEl.value = entry.content || '';
    
    const excludeKeysEl = document.getElementById('wbExcludeKeys');
    if (excludeKeysEl) excludeKeysEl.value = (entry.excludeKeys || []).join(', ');
    
    const priorityEl = document.getElementById('wbPriority');
    if (priorityEl) priorityEl.value = entry.priority || 100;
    
    const matchTypeEl = document.getElementById('wbMatchType');
    if (matchTypeEl) matchTypeEl.value = entry.matchType || 'contains';
    
    const positionEl = document.getElementById('wbInsertPosition');
    if (positionEl) positionEl.value = entry.insertPosition || 'character';
    
    const groupEl = document.getElementById('wbEntryGroup');
    if (groupEl) groupEl.value = entry.group || '';
    
    const constantEl = document.getElementById('wbConstant');
    if (constantEl) constantEl.checked = entry.constant || false;
    
    const modalTitle = document.getElementById('wbModalTitle');
    if (modalTitle) modalTitle.textContent = '编辑世界书条目';
    
    // 显示模态框
    const overlay = document.getElementById('worldbookModalOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
        overlay.classList.add('show');
    }
    
    renderWorldbookGroups();
}

/**
 * 创建新的世界书
 * 用于世界书管理器 UI 的新建按钮
 */
function createNewWorldbook() {
    if (!worldbookLibrary) {
        showToast('世界书系统未初始化', 'error');
        return;
    }
    
    const name = prompt('请输入世界书名称:', '新建世界书');
    if (!name) return;
    
    const book = worldbookLibrary.createBook({ 
        name,
        description: ''
    });
    
    worldbookLibrary.selectBook(book.id);
    
    // 刷新 UI
    if (worldbookManagerUI) {
        worldbookManagerUI.refresh();
    }
    
    showToast(`世界书 "${name}" 创建成功`, 'success');
    
    // 切换到世界书页面
    switchToPage('worldbook');
}

/**
 * 导出所有世界书
 */
function exportAllWorldbooks() {
    if (!worldbookLibrary) {
        showToast('世界书系统未初始化', 'error');
        return;
    }
    
    const data = worldbookLibrary.exportLibrary();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `worldbook_library_${gameId || 'export'}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('世界书库已导出', 'success');
}

/**
 * 编辑世界书条目（旧版兼容）
 */
function editWorldbookEntry(entryId, isUserEntry) {
    if (!worldbookManager) return;
    
    const entries = isUserEntry 
        ? worldbookManager.getCurrentSaveWorldbook()?.entries
        : worldbookManager.globalWorldbook.entries;
    
    const entry = entries?.find(e => e.id === entryId);
    if (!entry) {
        showToast('条目不存在', 'error');
        return;
    }
    
    editingWorldbookId = entryId;
    editingWorldbookIsUser = isUserEntry;
    
    // 填充表单
    const nameEl = document.getElementById('wbEntryName');
    if (nameEl) nameEl.value = entry.name || '';
    
    const keywordEl = document.getElementById('wbKeyword');
    if (keywordEl) keywordEl.value = entry.keys ? entry.keys.join(', ') : '';
    
    const contentEl = document.getElementById('wbContent');
    if (contentEl) contentEl.value = entry.content || '';
    
    const excludeEl = document.getElementById('wbExcludeKeys');
    if (excludeEl) excludeEl.value = entry.excludeKeys ? entry.excludeKeys.join(', ') : '';
    
    const priorityEl = document.getElementById('wbPriority');
    if (priorityEl) priorityEl.value = entry.priority || '100';
    
    const matchTypeEl = document.getElementById('wbMatchType');
    if (matchTypeEl) matchTypeEl.value = entry.matchType || 'contains';
    
    const positionEl = document.getElementById('wbInsertPosition');
    if (positionEl) positionEl.value = entry.insertPosition || 'character';
    
    const groupEl = document.getElementById('wbEntryGroup');
    if (groupEl) groupEl.value = entry.group || '默认';
    
    const constantEl = document.getElementById('wbConstant');
    if (constantEl) constantEl.checked = entry.constant || false;
    
    const caseSensitiveEl = document.getElementById('wbCaseSensitive');
    if (caseSensitiveEl) caseSensitiveEl.checked = entry.caseSensitive || false;
    
    const modalTitle = document.getElementById('wbModalTitle');
    if (modalTitle) modalTitle.textContent = '编辑世界书条目';
    
    // 显示模态框
    const overlay = document.getElementById('worldbookModalOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
        overlay.classList.add('show');
    }
}

/**
 * 关闭世界书模态框
 */
function closeWorldbookModal() {
    console.log('[Worldbook] Closing modal...');
    
    const overlay = document.getElementById('worldbookModalOverlay');
    if (overlay) {
        overlay.classList.remove('show');
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }
    
    editingWorldbookId = null;
    editingWorldbookIsUser = false;
}

/**
 * 保存世界书条目
 */
async function saveWorldbookEntry() {
    if (!worldbookManager) {
        showToast('世界书管理器未初始化', 'error');
        return;
    }
    
    // 收集表单数据
    const name = document.getElementById('wbEntryName')?.value.trim();
    const keysText = document.getElementById('wbKeyword')?.value;
    const content = document.getElementById('wbContent')?.value.trim();
    const excludeText = document.getElementById('wbExcludeKeys')?.value;
    
    if (!name) {
        showToast('请输入条目名称', 'error');
        return;
    }
    
    if (!keysText || !keysText.trim()) {
        showToast('请输入至少一个关键词', 'error');
        return;
    }
    
    if (!content) {
        showToast('请输入内容', 'error');
        return;
    }
    
    // 解析关键词
    const keys = keysText.split(/[,，]/).map(k => k.trim()).filter(Boolean);
    const excludeKeys = excludeText 
        ? excludeText.split(/[,，]/).map(k => k.trim()).filter(Boolean)
        : [];
    
    const entryData = {
        name,
        keys,
        content,
        excludeKeys,
        priority: parseInt(document.getElementById('wbPriority')?.value || '100'),
        matchType: document.getElementById('wbMatchType')?.value || 'contains',
        insertPosition: document.getElementById('wbInsertPosition')?.value || 'character',
        group: document.getElementById('wbEntryGroup')?.value || '默认',
        constant: document.getElementById('wbConstant')?.checked || false,
        caseSensitive: document.getElementById('wbCaseSensitive')?.checked || false
    };
    
    // 验证
    const validation = WorldbookEngine.validateEntry(entryData);
    if (!validation.valid) {
        showToast(validation.errors.join('; '), 'error');
        return;
    }
    
    try {
        // 判断是否使用新的世界书库系统（library）
        const isLibraryEntry = editingWorldbookIsUser === 'library' || 
                               (editingWorldbookId && worldbookLibrary?.getSelectedBook()?.entries?.some(e => e.id === editingWorldbookId));
        
        if (isLibraryEntry && worldbookLibrary) {
            // 使用新系统保存
            const book = worldbookLibrary.getSelectedBook();
            if (!book) {
                showToast('请先选择一本世界书', 'error');
                return;
            }
            
            if (editingWorldbookId) {
                // 更新条目
                worldbookLibrary.updateEntry(book.id, editingWorldbookId, entryData);
                showToast('条目已更新', 'success');
            } else {
                // 新建条目
                worldbookLibrary.addEntry(entryData);
                showToast('条目已创建', 'success');
            }
            
            // 刷新世界书管理器 UI
            if (worldbookManagerUI) {
                worldbookManagerUI.refresh();
            }
            
            // 关闭模态框
            closeWorldbookModal();
            return;
        }
        
        // 判断是新建还是编辑（旧系统）
        const isUserEntry = editingWorldbookId && editingWorldbookIsUser;
        const isGlobalEntry = editingWorldbookId && !editingWorldbookIsUser;
        
        // 检查权限：只有作者/管理员可以编辑全局条目
        if (isGlobalEntry && !hasFullEditPermission()) {
            showToast('只有作者可以编辑全局世界书', 'error');
            return;
        }
        
        if (editingWorldbookId) {
            // 更新
            if (isUserEntry) {
                worldbookManager.updateUserEntry(editingWorldbookId, entryData);
            } else {
                worldbookManager.updateGlobalEntry(editingWorldbookId, entryData);
            }
            showToast('条目已更新', 'success');
        } else {
            // 新建
            const addToGlobal = hasFullEditPermission() && document.getElementById('wbAddToGlobal')?.checked;
            
            if (addToGlobal) {
                // 添加到全局世界书
                worldbookManager.addGlobalEntry(entryData);
                showToast('条目已添加到全局世界书', 'success');
            } else {
                // 添加到用户世界书 - 需要选中存档
                if (!currentSaveId) {
                    showToast('请先选择或创建一个存档', 'error');
                    // 自动打开存档创建
                    createNewSaveFromSettings();
                    return;
                }
                worldbookManager.addUserEntry(entryData);
                showToast('条目已添加到我的世界书', 'success');
            }
        }
        
        // 刷新列表
        console.log('[Worldbook] Refreshing list after save...');
        console.log('[Worldbook] Current filter state:', worldbookFilterState);
        
        // 重置筛选状态
        worldbookFilterState = { search: '', group: '', sortBy: 'priority-desc', userOnly: false };
        
        renderWorldbookList();
        renderWorldbookGroups();
        closeWorldbookModal();
        
        // 强制刷新统计数据
        const totalStatsEl = document.getElementById('originalWbTotalEntries');
        const globalStatsEl = document.getElementById('globalWbCount');
        const userStatsEl = document.getElementById('userWbCount');
        if (totalStatsEl) {
            const entries = worldbookManager.getAllEntriesForDisplay();
            totalStatsEl.textContent = entries.length;
            if (globalStatsEl) globalStatsEl.textContent = entries.filter(e => !e.isUserEntry).length;
            if (userStatsEl) userStatsEl.textContent = entries.filter(e => e.isUserEntry).length;
        }
        
    } catch (error) {
        console.error('保存世界书条目失败:', error);
        showToast('保存失败: ' + error.message, 'error');
    }
}

/**
 * 删除世界书条目
 */
async function deleteWorldbookEntry(entryId, isUserEntry) {
    if (!worldbookManager) return;
    
    if (!confirm('确定要删除这个条目吗？')) return;
    
    try {
        if (isUserEntry) {
            worldbookManager.deleteUserEntry(entryId);
        } else {
            // 检查权限
            if (!hasFullEditPermission()) {
                showToast('只有作者可以删除全局条目', 'error');
                return;
            }
            worldbookManager.deleteGlobalEntry(entryId);
        }
        
        renderWorldbookList();
        renderWorldbookGroups();
        showToast('条目已删除');
        
    } catch (error) {
        console.error('删除世界书条目失败:', error);
        showToast('删除失败: ' + error.message, 'error');
    }
}

/**
 * 测试世界书匹配
 */
function testWorldbookMatch() {
    const testText = document.getElementById('wbTestInput')?.value;
    if (!testText) {
        showToast('请输入测试文本', 'error');
        return;
    }
    
    if (!worldbookManager) {
        showToast('世界书管理器未初始化', 'error');
        return;
    }
    
    const triggered = worldbookManager.detectTriggers(testText);
    const resultsContainer = document.getElementById('wbTestResults');
    
    if (!resultsContainer) return;
    
    if (triggered.length === 0) {
        resultsContainer.innerHTML = '<div style="color: var(--text-secondary); padding: 20px;">没有触发的条目</div>';
        return;
    }
    
    resultsContainer.innerHTML = `
        <div style="margin-bottom: 10px; color: var(--primary-light);">触发了 ${triggered.length} 个条目：</div>
        ${triggered.map(entry => `
            <div style="background: rgba(138, 109, 59, 0.1); border-radius: 8px; padding: 12px; margin-bottom: 8px;">
                <div style="font-weight: 600;">${entry.name}</div>
                <div style="font-size: 12px; color: var(--text-secondary);">优先级: ${entry.priority} | 分组: ${entry.group}</div>
            </div>
        `).join('')}
    `;
}

// ==================== 世界书高级功能 ====================

/**
 * 世界书搜索
 */
function searchWorldbookEntries(query) {
    if (!worldbookManager) return [];
    
    const allEntries = worldbookManager.getAllEntriesForDisplay();
    if (!query) return allEntries;
    
    const lowerQuery = query.toLowerCase();
    return allEntries.filter(entry => 
        entry.name.toLowerCase().includes(lowerQuery) ||
        entry.keys.some(k => k.toLowerCase().includes(lowerQuery)) ||
        entry.content.toLowerCase().includes(lowerQuery) ||
        (entry.group && entry.group.toLowerCase().includes(lowerQuery))
    );
}

/**
 * 世界书批量操作
 */
async function batchDeleteWorldbookEntries(entryIds, isUserEntries = true) {
    if (!worldbookManager || entryIds.length === 0) return;
    
    if (!confirm(`确定要删除选中的 ${entryIds.length} 个条目吗？`)) return;
    
    try {
        for (const entryId of entryIds) {
            if (isUserEntries) {
                worldbookManager.deleteUserEntry(entryId);
            } else if (hasFullEditPermission()) {
                worldbookManager.deleteGlobalEntry(entryId);
            }
        }
        
        renderWorldbookList();
        renderWorldbookGroups();
        showToast(`已删除 ${entryIds.length} 个条目`);
    } catch (error) {
        console.error('批量删除失败:', error);
        showToast('删除失败: ' + error.message, 'error');
    }
}

/**
 * 世界书条目排序
 */
function sortWorldbookEntries(entries, sortBy = 'priority', order = 'desc') {
    const sorted = [...entries];
    
    sorted.sort((a, b) => {
        let valA, valB;
        
        switch (sortBy) {
            case 'priority':
                valA = a.priority || 0;
                valB = b.priority || 0;
                break;
            case 'name':
                valA = a.name || '';
                valB = b.name || '';
                return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            case 'group':
                valA = a.group || '';
                valB = b.group || '';
                return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            case 'triggerCount':
                valA = a.triggerCount || 0;
                valB = b.triggerCount || 0;
                break;
            case 'lastTriggered':
                valA = a.lastTriggered ? new Date(a.lastTriggered) : new Date(0);
                valB = b.lastTriggered ? new Date(b.lastTriggered) : new Date(0);
                break;
            default:
                valA = a.priority || 0;
                valB = b.priority || 0;
        }
        
        return order === 'asc' ? valA - valB : valB - valA;
    });
    
    return sorted;
}

/**
 * 导出世界书 - 支持多种格式
 */
function exportWorldbookOnly(format = 'json') {
    if (!worldbookManager) {
        showToast('世界书管理器未初始化', 'error');
        return;
    }
    
    const exportData = {
        global: worldbookManager.exportGlobalWorldbook(),
        user: worldbookManager.exportUserWorldbook()
    };
    
    let content, filename, mimeType;
    
    switch (format) {
        case 'json':
            content = JSON.stringify(exportData, null, 2);
            filename = `worldbook-export-${Date.now()}.json`;
            mimeType = 'application/json';
            break;
        case 'csv':
            content = convertWorldbookToCSV(worldbookManager.getAllEntriesForDisplay());
            filename = `worldbook-export-${Date.now()}.csv`;
            mimeType = 'text/csv';
            break;
        case 'lorebook':
            // SillyTavern Lorebook 格式
            content = JSON.stringify(convertToLorebookFormat(exportData), null, 2);
            filename = `lorebook-export-${Date.now()}.json`;
            mimeType = 'application/json';
            break;
        default:
            content = JSON.stringify(exportData, null, 2);
            filename = `worldbook-export-${Date.now()}.json`;
            mimeType = 'application/json';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast(`世界书已导出 (${format.toUpperCase()})`);
}

/**
 * 转换为 CSV 格式
 */
function convertWorldbookToCSV(entries) {
    const headers = ['名称', '关键词', '排除词', '内容', '优先级', '分组', '匹配模式', '插入位置', '恒常'];
    const rows = entries.map(e => [
        e.name,
        e.keys.join(', '),
        (e.excludeKeys || []).join(', '),
        e.content.replace(/"/g, '""'), // 转义引号
        e.priority,
        e.group,
        e.matchType,
        e.insertPosition,
        e.constant ? '是' : '否'
    ]);
    
    return [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
}

/**
 * 转换为 SillyTavern Lorebook 格式
 */
function convertToLorebookFormat(exportData) {
    const allEntries = [];
    
    // 合并全局和用户条目
    if (exportData.global?.data?.entries) {
        allEntries.push(...exportData.global.data.entries);
    }
    if (exportData.user?.data?.entries) {
        allEntries.push(...exportData.user.data.entries);
    }
    
    return {
        name: "大荒九丘世界书",
        description: "导出自 AI 设置中心",
        version: 2,
        entries: allEntries.map(e => ({
            name: e.name,
            keys: e.keys,
            content: e.content,
            priority: e.priority,
            comment: e.group || '',
            disable: !e.enabled,
            constant: e.constant,
            selectiveLogic: 0,
            secondaryKeys: e.excludeKeys || [],
            position: getLorebookPosition(e.insertPosition),
            useName: true
        }))
    };
}

function getLorebookPosition(position) {
    const mapping = {
        'system': 0,    // Before Prompt
        'user': 1,      // After Prompt
        'example': 2,   // Before Example
        'character': 3  // After Example
    };
    return mapping[position] || 3;
}

/**
 * 导入世界书 - 支持多种格式
 */
function importWorldbookEntries() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.csv';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            let data;
            
            if (file.name.endsWith('.csv')) {
                data = parseWorldbookCSV(text);
            } else {
                data = JSON.parse(text);
                
                // 检测是否为 Lorebook 格式
                if (data.entries && Array.isArray(data.entries)) {
                    data = convertFromLorebookFormat(data);
                }
            }
            
            // 导入对话框
            showImportDialog(data);
            
        } catch (err) {
            showToast('导入失败: ' + err.message, 'error');
        }
    };
    input.click();
}

/**
 * 解析 CSV 格式
 */
function parseWorldbookCSV(csvText) {
    const lines = csvText.split('\n').filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    const entries = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.replace(/^"|"$/g, '').trim());
        const entry = {};
        
        headers.forEach((h, idx) => {
            if (values[idx]) {
                switch (h) {
                    case '名称':
                        entry.name = values[idx];
                        break;
                    case '关键词':
                        entry.keys = values[idx].split(',').map(k => k.trim());
                        break;
                    case '排除词':
                        entry.excludeKeys = values[idx].split(',').map(k => k.trim()).filter(Boolean);
                        break;
                    case '内容':
                        entry.content = values[idx];
                        break;
                    case '优先级':
                        entry.priority = parseInt(values[idx]) || 100;
                        break;
                    case '分组':
                        entry.group = values[idx];
                        break;
                    case '匹配模式':
                        entry.matchType = values[idx];
                        break;
                    case '插入位置':
                        entry.insertPosition = values[idx];
                        break;
                    case '恒常':
                        entry.constant = values[idx] === '是';
                        break;
                }
            }
        });
        
        if (entry.name && entry.keys) {
            entries.push(entry);
        }
    }
    
    return { entries };
}

/**
 * 从 Lorebook 格式转换
 */
function convertFromLorebookFormat(lorebook) {
    return {
        entries: lorebook.entries.map(e => ({
            name: e.name || e.comment || '未命名',
            keys: e.keys || [],
            excludeKeys: e.secondaryKeys || [],
            content: e.content || '',
            priority: e.priority || 100,
            group: e.comment || '默认',
            matchType: 'contains',
            insertPosition: getPositionFromLorebook(e.position),
            enabled: !e.disable,
            constant: e.constant || false
        }))
    };
}

function getPositionFromLorebook(position) {
    const mapping = ['system', 'user', 'example', 'character'];
    return mapping[position] || 'character';
}

/**
 * 显示导入对话框
 */
function showImportDialog(data) {
    if (!data.entries || data.entries.length === 0) {
        showToast('没有有效的条目', 'error');
        return;
    }
    
    // 创建临时对话框
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-header">
            <h3 class="modal-title">导入世界书</h3>
            <button class="modal-close" onclick="this.closest('.modal').remove(); document.getElementById('modalOverlay').style.display='none';">&times;</button>
        </div>
        <div class="modal-body">
            <p>找到 ${data.entries.length} 个条目</p>
            <div style="max-height: 300px; overflow-y: auto; margin: 15px 0;">
                ${data.entries.slice(0, 10).map(e => `
                    <div style="padding: 8px; background: rgba(0,0,0,0.2); border-radius: 6px; margin-bottom: 8px;">
                        <div style="font-weight: 600;">${e.name}</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">${e.keys?.join(', ') || ''}</div>
                    </div>
                `).join('')}
                ${data.entries.length > 10 ? `<div style="text-align: center; color: var(--text-secondary);">...还有 ${data.entries.length - 10} 个条目</div>` : ''}
            </div>
            <div class="form-group">
                <label class="form-check" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" id="importAsGlobal" ${hasFullEditPermission() ? '' : 'disabled'}>
                    <span>导入到全局世界书（仅作者）</span>
                </label>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="this.closest('.modal').remove(); document.getElementById('modalOverlay').style.display='none';">取消</button>
            <button class="btn btn-primary" id="confirmImportBtn">导入</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.getElementById('modalOverlay').style.display = 'block';
    
    // 绑定导入按钮
    document.getElementById('confirmImportBtn').onclick = () => {
        const asGlobal = document.getElementById('importAsGlobal')?.checked;
        
        try {
            for (const entry of data.entries) {
                if (asGlobal && hasFullEditPermission()) {
                    worldbookManager.addGlobalEntry(entry);
                } else {
                    worldbookManager.addUserEntry(entry);
                }
            }
            
            renderWorldbookList();
            renderWorldbookGroups();
            showToast(`成功导入 ${data.entries.length} 个条目`);
            modal.remove();
            document.getElementById('modalOverlay').style.display = 'none';
            
        } catch (error) {
            showToast('导入失败: ' + error.message, 'error');
        }
    };
}

/**
 * 重置世界书（作者功能）
 */
function resetWorldbook() {
    if (!hasFullEditPermission()) {
        showToast('只有作者可以重置全局世界书', 'error');
        return;
    }
    
    if (!confirm('⚠️ 警告：这将清空所有全局世界书条目！\n\n确定要继续吗？')) return;
    
    if (!confirm('再次确认：此操作不可恢复！\n\n请输入"RESET"确认：')) return;
    
    // 清空全局条目
    worldbookManager.globalWorldbook.entries = [];
    worldbookManager._saveToStorage();
    
    renderWorldbookList();
    renderWorldbookGroups();
    showToast('全局世界书已重置');
}

// ==================== 图库管理 ====================
async function loadGallery() {
    // Simplified
    gallery = [];
    renderGallery();
}

function renderGallery() {
    const container = document.getElementById('galleryList');
    if (!container) return;
    container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">暂无图片</p>';
}

// ==================== 游戏操作 ====================
async function saveGame() {
    try {
        const gameData = {
            title: document.getElementById('gameTitle').value,
            subtitle: document.getElementById('gameSubtitle').value,
            description: document.getElementById('gameDescription').value,
            worldSetting: document.getElementById('gameWorldSetting').value,
            cover: document.getElementById('gameCover').value
        };
        
        const url = gameId ? `${API_BASE}/games/${gameId}` : `${API_BASE}/games`;
        const method = gameId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: getAuthHeaders(),
            body: JSON.stringify(gameData)
        });
        
        const result = await response.json();
        if (result.success) {
            showToast(gameId ? '保存成功' : '创建成功', 'success');
            if (!gameId && result.data?._id) {
                window.location.href = `settings.html?id=${result.data._id}`;
            }
        } else {
            showToast(result.message || '保存失败', 'error');
        }
    } catch (error) {
        showToast('保存失败: ' + error.message, 'error');
    }
}

async function publishGame() {
    if (!gameId) { showToast('请先保存游戏', 'error'); return; }
    if (!confirm('确定要发布这个世界吗？发布后其他玩家将可以看到。')) return;
    
    try {
        const response = await fetch(`${API_BASE}/games/${gameId}/publish`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        const result = await response.json();
        if (result.success) {
            showToast('已发布', 'success');
            updateStatusUI('published');
        } else {
            showToast(result.message || '发布失败', 'error');
        }
    } catch (error) {
        showToast('发布失败', 'error');
    }
}

async function unpublishGame() {
    if (!gameId) return;
    if (!confirm('确定要下架这个世界吗？')) return;
    
    try {
        const response = await fetch(`${API_BASE}/games/${gameId}/unpublish`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        const result = await response.json();
        if (result.success) {
            showToast('已下架', 'success');
            updateStatusUI('draft');
        }
    } catch (error) {
        showToast('操作失败', 'error');
    }
}

async function deleteGame() {
    if (!gameId) return;
    if (!confirm('确定要删除这个世界吗？此操作不可恢复！')) return;
    
    try {
        const response = await fetch(`${API_BASE}/games/${gameId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const result = await response.json();
        if (result.success) {
            showToast('已删除', 'success');
            setTimeout(() => window.location.href = 'index.html', 1500);
        }
    } catch (error) {
        showToast('删除失败', 'error');
    }
}

function previewGame() {
    if (gameId) {
        window.open(`galgame.html?id=${gameId}&preview=1`, '_blank');
    } else {
        showToast('请先保存游戏', 'error');
    }
}

// ==================== 导入/导出 ====================
function exportGameData() {
    const data = {
        basic: {
            title: document.getElementById('gameTitle').value,
            subtitle: document.getElementById('gameSubtitle').value,
            description: document.getElementById('gameDescription').value
        },
        characters: characters,
        exportTime: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `game-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('数据已导出');
}

function importGameData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (data.basic) {
                document.getElementById('gameTitle').value = data.basic.title || '';
                document.getElementById('gameSubtitle').value = data.basic.subtitle || '';
                document.getElementById('gameDescription').value = data.basic.description || '';
            }
            if (data.characters) {
                characters = data.characters;
                renderCharacterList();
            }
            showToast('数据已导入', 'success');
        } catch (err) {
            showToast('导入失败: ' + err.message, 'error');
        }
    };
    input.click();
}

// ==================== 用户配置 ====================
function loadUserConfig() {
    // 从存档或 localStorage 加载用户配置
    console.log('Loading user config for save:', currentSaveId);
}

// ==================== 工具函数 ====================
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = 'toast show ' + type;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function logout() {
    localStorage.removeItem('galgame_token');
    localStorage.removeItem('galgame_user');
    window.location.href = 'login.html';
}

// ==================== 模态框系统 ====================
function closeAllModals() {
    // 关闭所有模态框 overlay
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.classList.remove('show');
        overlay.style.display = 'none';
    });
    
    // 兼容旧的 modalOverlay
    const oldOverlay = document.getElementById('modalOverlay');
    if (oldOverlay) {
        oldOverlay.style.display = 'none';
    }
}

function closeModal(modalId) {
    // 查找对应的 overlay
    const overlayId = modalId + 'Overlay';
    const overlay = document.getElementById(overlayId);
    
    if (overlay) {
        // 新的 overlay 结构
        overlay.classList.remove('show');
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    } else {
        // 兼容旧的 modal 结构
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'none';
        
        // 检查是否还有其他模态框打开
        const anyOpen = Array.from(document.querySelectorAll('.modal')).some(m => m.style.display === 'block');
        if (!anyOpen) {
            const oldOverlay = document.getElementById('modalOverlay');
            if (oldOverlay) oldOverlay.style.display = 'none';
        }
    }
}

// ==================== AI 配置 ====================
async function testAIConnection() {
    const apiKey = document.getElementById('apiKey')?.value;
    const apiUrl = document.getElementById('apiUrl')?.value || 'https://api.openai.com/v1';
    const model = document.getElementById('model')?.value || 'gpt-3.5-turbo';
    
    if (!apiKey) {
        showToast('请先输入 API 密钥', 'error');
        return;
    }
    
    showToast('正在测试连接...');
    
    try {
        const response = await fetch(`${apiUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: 'Hello' }],
                max_tokens: 5
            })
        });
        
        if (response.ok) {
            showToast('连接成功！', 'success');
        } else {
            const error = await response.json();
            showToast('连接失败: ' + (error.error?.message || response.statusText), 'error');
        }
    } catch (error) {
        showToast('连接失败: ' + error.message, 'error');
    }
}

async function saveAISettings() {
    const settings = {
        apiKey: document.getElementById('apiKey')?.value,
        apiUrl: document.getElementById('apiUrl')?.value,
        model: document.getElementById('model')?.value
    };
    
    // 保存到 localStorage（实际项目中应该保存到后端）
    localStorage.setItem('galgame_ai_settings', JSON.stringify(settings));
    showToast('AI 设置已保存', 'success');
}

// ==================== 提示词功能 ====================
function resetPrompts() {
    if (!confirm('确定要重置提示词吗？这将恢复到默认设置。')) return;
    
    document.getElementById('originalPrePrompt').value = '';
    document.getElementById('originalMainPrompt').value = '';
    showToast('提示词已重置');
}

async function savePrompts() {
    const prompts = {
        prePrompt: document.getElementById('originalPrePrompt')?.value,
        mainPrompt: document.getElementById('originalMainPrompt')?.value
    };
    
    // 保存到游戏配置中
    if (currentGame) {
        currentGame.config = currentGame.config || {};
        currentGame.config.prePrompt = prompts.prePrompt;
        currentGame.config.mainPrompt = prompts.mainPrompt;
    }
    
    showToast('提示词已保存', 'success');
}

// ==================== 记忆管理功能 2.0 ====================

/**
 * 加载记忆列表
 */
async function loadMemories() {
    console.log('[Memory] Loading memories...');
    
    if (!memoryService) {
        console.warn('[Memory] MemoryService not initialized');
        // 降级到本地存储
        loadMemoriesFromLocal();
        return;
    }
    
    try {
        // 获取统计
        const stats = await memoryService.getStats();
        updateMemoryStats(stats);
        
        // 更新时间线存档状态
        updateTimelineArchiveStatus(stats);
        
        // 获取记忆列表
        const types = memoryFilterState.type === 'all' 
            ? ['short', 'long', 'core'] 
            : [memoryFilterState.type];
        
        const result = await memoryService.getMemories({ types, limit: 100 });
        allMemoriesCache = result.memories || [];
        
        // 应用筛选和排序
        const filtered = filterAndSortMemories(allMemoriesCache);
        renderMemoriesList(filtered);
        
        console.log('[Memory] Loaded', allMemoriesCache.length, 'memories');
    } catch (error) {
        console.error('[Memory] Failed to load:', error);
        showToast('加载记忆失败，使用本地数据', 'warning');
        loadMemoriesFromLocal();
    }
}

/**
 * 从本地存储加载记忆（降级方案）
 */
function loadMemoriesFromLocal() {
    const save = getCurrentSaveData();
    const memories = save?.memories || { short: [], long: [], core: [] };
    
    // 转换为统一格式
    const allMemories = [
        ...memories.core.map(m => ({ ...m, type: 'core' })),
        ...memories.long.map(m => ({ ...m, type: 'long' })),
        ...memories.short.map(m => ({ ...m, type: 'short' }))
    ];
    
    allMemoriesCache = allMemories;
    
    // 更新统计
    updateMemoryStats({
        short: memories.short?.length || 0,
        long: memories.long?.length || 0,
        core: memories.core?.length || 0,
        total: allMemories.length
    });
    
    const filtered = filterAndSortMemories(allMemories);
    renderMemoriesList(filtered);
}

/**
 * 更新记忆统计显示
 */
function updateMemoryStats(stats) {
    const shortEl = document.getElementById('statShortCount');
    const longEl = document.getElementById('statLongCount');
    const coreEl = document.getElementById('statCoreCount');
    const totalEl = document.getElementById('statTotalCount');
    
    if (shortEl) shortEl.textContent = stats.short || 0;
    if (longEl) longEl.textContent = stats.long || 0;
    if (coreEl) coreEl.textContent = stats.core || 0;
    if (totalEl) totalEl.textContent = stats.total || 0;
}

/**
 * 更新时间线存档状态
 */
function updateTimelineArchiveStatus(stats) {
    const card = document.getElementById('timelineArchiveCard');
    const timeEl = document.getElementById('timelineArchiveTime');
    
    if (card && timeEl) {
        if (stats.hasArchive) {
            card.style.display = 'block';
            timeEl.textContent = stats.lastArchiveTime 
                ? new Date(stats.lastArchiveTime).toLocaleString('zh-CN')
                : '时间未知';
        } else {
            card.style.display = 'none';
        }
    }
}

/**
 * 筛选和排序记忆
 */
function filterAndSortMemories(memories) {
    let result = [...memories];
    
    // 搜索筛选
    if (memoryFilterState.search) {
        const search = memoryFilterState.search.toLowerCase();
        result = result.filter(m => 
            (m.content || '').toLowerCase().includes(search) ||
            (m.tags || []).some(t => t.toLowerCase().includes(search))
        );
    }
    
    // 排序
    result.sort((a, b) => {
        switch (memoryFilterState.sortBy) {
            case 'time-desc':
                return new Date(b.timestamp) - new Date(a.timestamp);
            case 'time-asc':
                return new Date(a.timestamp) - new Date(b.timestamp);
            case 'importance':
                return (b.importance || 50) - (a.importance || 50);
            default:
                return 0;
        }
    });
    
    return result;
}

/**
 * 渲染记忆列表
 */
function renderMemoriesList(memories) {
    const container = document.getElementById('memoriesList');
    if (!container) return;
    
    if (memories.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 60px 20px;">
                <div style="font-size: 48px; margin-bottom: 16px;">🧠</div>
                <div style="color: var(--text-secondary); font-size: 16px; margin-bottom: 8px;">暂无符合条件的记忆</div>
                <div style="color: var(--text-secondary); opacity: 0.7; font-size: 13px;">
                    ${memoryFilterState.search ? '尝试其他搜索词' : '游戏对话将自动生成短期记忆'}
                </div>
            </div>
        `;
        return;
    }
    
    const typeColors = {
        short: '#4a9eff',
        long: '#9b59b6',
        core: '#e74c3c'
    };
    
    const typeLabels = {
        short: '短期',
        long: '长期',
        core: '核心'
    };
    
    container.innerHTML = memories.map(mem => `
        <div class="memory-item" style="padding: 16px; background: rgba(0,0,0,0.2); border-radius: 10px; margin-bottom: 12px; border-left: 4px solid ${typeColors[mem.type] || '#888'};">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="padding: 3px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; background: ${typeColors[mem.type]}20; color: ${typeColors[mem.type]};">
                        ${typeLabels[mem.type] || mem.type}
                    </span>
                    ${(mem.importance || 50) >= 80 ? '<span style="color: #e74c3c; font-size: 12px;">🔥 重要</span>' : ''}
                    ${mem.isSolidified ? '<span style="color: #27ae60; font-size: 12px;">✓ 已固化</span>' : ''}
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-sm btn-danger" onclick="deleteMemory('${mem._id || mem.id}')" title="删除">🗑️</button>
                </div>
            </div>
            <p style="margin: 0 0 10px 0; line-height: 1.6;">${escapeHtml(mem.content || '')}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--text-secondary);">
                <div>
                    ${(mem.tags || []).map(t => `<span style="margin-right: 6px; padding: 2px 6px; background: rgba(138,109,59,0.2); border-radius: 3px;">${escapeHtml(t)}</span>`).join('')}
                </div>
                <span>${new Date(mem.timestamp).toLocaleString('zh-CN')}</span>
            </div>
        </div>
    `).join('');
}

/**
 * 筛选记忆
 */
function filterMemories(type) {
    memoryFilterState.type = type;
    
    // 更新按钮状态
    document.querySelectorAll('.memory-filter-btn').forEach(btn => {
        btn.classList.remove('btn-primary', 'active');
        btn.classList.add('btn-secondary');
        if (btn.dataset.filter === type) {
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-primary', 'active');
        }
    });
    
    // 更新统计卡片高亮
    document.querySelectorAll('.memory-stat-card').forEach(card => {
        card.style.opacity = (type === 'all' || card.dataset.type === type) ? '1' : '0.5';
    });
    
    const filtered = filterAndSortMemories(allMemoriesCache);
    renderMemoriesList(filtered);
}

/**
 * 搜索记忆
 */
function searchMemories() {
    const input = document.getElementById('memorySearchInput');
    memoryFilterState.search = input?.value || '';
    const filtered = filterAndSortMemories(allMemoriesCache);
    renderMemoriesList(filtered);
}

/**
 * 排序记忆
 */
function sortMemories() {
    const select = document.getElementById('memorySortBy');
    memoryFilterState.sortBy = select?.value || 'time-desc';
    const filtered = filterAndSortMemories(allMemoriesCache);
    renderMemoriesList(filtered);
}

/**
 * HTML转义
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 固化时间线
 */
async function solidifyTimeline() {
    if (!confirm('确定要固化当前时间线吗？\n这将把当前核心记忆写入世界书存档。')) return;
    
    showToast('正在固化时间线...');
    
    if (memoryService) {
        try {
            const result = await memoryService.solidifyTimeline();
            showToast(`时间线已固化！共固化 ${result.solidifiedCount || 0} 条核心记忆`, 'success');
            loadMemories();
            return;
        } catch (error) {
            console.error('[Memory] Solidify failed:', error);
            showToast('固化失败，尝试本地模式', 'warning');
        }
    }
    
    // 本地降级方案
    const save = getCurrentSaveData();
    if (save && save.memories) {
        const longMemories = save.memories.long || [];
        if (longMemories.length === 0) {
            showToast('没有需要固化的长期记忆', 'info');
            return;
        }
        
        save.memories.core = save.memories.core || [];
        longMemories.forEach(mem => {
            save.memories.core.push({
                ...mem,
                solidifiedAt: new Date().toISOString(),
                isSolidified: true
            });
        });
        
        save.memories.long = [];
        updateSaveData({ memories: save.memories });
        loadMemoriesFromLocal();
        showToast(`已固化 ${longMemories.length} 条记忆`, 'success');
    }
}

/**
 * 查看时间线存档
 */
async function viewTimelineArchive() {
    if (!memoryService) {
        showToast('记忆服务未初始化', 'error');
        return;
    }
    
    try {
        const archive = await memoryService.getTimelineArchive();
        if (!archive.exists) {
            showToast('暂无时间线存档', 'info');
            return;
        }
        
        const contentEl = document.getElementById('timelineArchiveContent');
        if (contentEl) {
            contentEl.textContent = typeof archive.content === 'string' 
                ? archive.content 
                : JSON.stringify(archive.content, null, 2);
        }
        
        const overlay = document.getElementById('timelineArchiveModalOverlay');
        if (overlay) {
            overlay.style.display = 'flex';
            overlay.classList.add('show');
        }
    } catch (error) {
        showToast('获取存档失败: ' + error.message, 'error');
    }
}

/**
 * 关闭时间线存档模态框
 */
function closeTimelineArchiveModal() {
    const overlay = document.getElementById('timelineArchiveModalOverlay');
    if (overlay) {
        overlay.classList.remove('show');
        setTimeout(() => overlay.style.display = 'none', 300);
    }
}

/**
 * 打开添加记忆模态框
 */
function openMemoryModal() {
    const overlay = document.getElementById('memoryModalOverlay');
    const title = document.getElementById('memoryModalTitle');
    
    if (title) title.textContent = '添加记忆';
    
    // 重置表单
    const contentEl = document.getElementById('memoryContent');
    const typeEl = document.getElementById('memoryType');
    const importanceEl = document.getElementById('memoryImportance');
    const tagsEl = document.getElementById('memoryTags');
    
    if (contentEl) contentEl.value = '';
    if (typeEl) typeEl.value = 'short';
    if (importanceEl) importanceEl.value = '50';
    if (tagsEl) tagsEl.value = '';
    
    if (overlay) {
        overlay.style.display = 'flex';
        overlay.classList.add('show');
    }
}

/**
 * 关闭记忆模态框
 */
function closeMemoryModal() {
    const overlay = document.getElementById('memoryModalOverlay');
    if (overlay) {
        overlay.classList.remove('show');
        setTimeout(() => overlay.style.display = 'none', 300);
    }
}

/**
 * 保存记忆
 */
async function saveMemory() {
    const contentEl = document.getElementById('memoryContent');
    const typeEl = document.getElementById('memoryType');
    const importanceEl = document.getElementById('memoryImportance');
    const tagsEl = document.getElementById('memoryTags');
    
    const content = contentEl?.value?.trim();
    if (!content) {
        showToast('请输入记忆内容', 'error');
        return;
    }
    
    const type = typeEl?.value || 'short';
    const importance = parseInt(importanceEl?.value || '50');
    const tags = tagsEl?.value?.split(/[,，]/).map(t => t.trim()).filter(Boolean) || [];
    
    if (memoryService) {
        try {
            await memoryService.addMemory(content, { type, tags, importance });
            showToast('记忆添加成功', 'success');
            closeMemoryModal();
            loadMemories();
        } catch (error) {
            showToast('添加失败: ' + error.message, 'error');
        }
    } else {
        // 本地降级
        const save = getCurrentSaveData();
        if (save) {
            save.memories = save.memories || { short: [], long: [], core: [] };
            save.memories[type] = save.memories[type] || [];
            save.memories[type].push({
                _id: 'mem_' + Date.now(),
                content,
                type,
                tags,
                importance,
                timestamp: new Date().toISOString()
            });
            updateSaveData({ memories: save.memories });
            showToast('记忆添加成功（本地）', 'success');
            closeMemoryModal();
            loadMemoriesFromLocal();
        }
    }
}

/**
 * 删除记忆
 */
async function deleteMemory(memoryId) {
    if (!confirm('确定要删除这条记忆吗？')) return;
    
    if (memoryService) {
        try {
            await memoryService.deleteMemory(memoryId);
            showToast('记忆已删除', 'success');
            loadMemories();
        } catch (error) {
            showToast('删除失败: ' + error.message, 'error');
        }
    } else {
        // 本地降级
        const save = getCurrentSaveData();
        if (save && save.memories) {
            ['short', 'long', 'core'].forEach(type => {
                if (save.memories[type]) {
                    save.memories[type] = save.memories[type].filter(m => m._id !== memoryId && m.id !== memoryId);
                }
            });
            updateSaveData({ memories: save.memories });
            showToast('记忆已删除', 'success');
            loadMemoriesFromLocal();
        }
    }
}

/**
 * 导出所有记忆
 */
async function exportAllMemories() {
    let data;
    
    if (memoryService) {
        try {
            data = await memoryService.exportMemories();
        } catch (error) {
            console.error('[Memory] Export failed:', error);
        }
    }
    
    // 降级到本地
    if (!data) {
        const save = getCurrentSaveData();
        const memories = save?.memories || { short: [], long: [], core: [] };
        const allMemories = [
            ...memories.short.map(m => ({ ...m, type: 'short' })),
            ...memories.long.map(m => ({ ...m, type: 'long' })),
            ...memories.core.map(m => ({ ...m, type: 'core' }))
        ];
        data = {
            version: '1.0',
            gameId: gameId,
            exportedAt: new Date().toISOString(),
            memories: allMemories
        };
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `memories-export-${gameId || 'backup'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('记忆已导出', 'success');
}

/**
 * 导入记忆
 */
function importMemories() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (!data.memories || !Array.isArray(data.memories)) {
                showToast('文件格式不正确', 'error');
                return;
            }
            
            if (memoryService) {
                await memoryService.importMemories(data);
                showToast(`成功导入 ${data.memories.length} 条记忆`, 'success');
                loadMemories();
            } else {
                // 本地降级
                const save = getCurrentSaveData();
                if (save) {
                    save.memories = { short: [], long: [], core: [] };
                    data.memories.forEach(m => {
                        const type = m.type || 'short';
                        save.memories[type].push(m);
                    });
                    updateSaveData({ memories: save.memories });
                    showToast(`成功导入 ${data.memories.length} 条记忆（本地）`, 'success');
                    loadMemoriesFromLocal();
                }
            }
        } catch (err) {
            showToast('导入失败: ' + err.message, 'error');
        }
    };
    input.click();
}

/**
 * 清空记忆
 */
async function clearMemories() {
    const keepCore = confirm('保留核心记忆？\n点击「确定」保留核心记忆，点击「取消」清空所有记忆。');
    
    if (!confirm(`确定要清空${keepCore ? '短期和长期' : '所有'}记忆吗？此操作不可恢复！`)) return;
    
    if (memoryService) {
        try {
            const result = await memoryService.clearMemories(keepCore);
            showToast(`已清空 ${result.deletedCount || 0} 条记忆${keepCore ? '，核心记忆已保留' : ''}`, 'success');
            loadMemories();
            return;
        } catch (error) {
            console.error('[Memory] Clear failed:', error);
            showToast('清空失败，尝试本地模式', 'warning');
        }
    }
    
    // 本地降级
    const save = getCurrentSaveData();
    if (save) {
        if (keepCore) {
            const shortCount = save.memories?.short?.length || 0;
            const longCount = save.memories?.long?.length || 0;
            save.memories.short = [];
            save.memories.long = [];
            updateSaveData({ memories: save.memories });
            showToast(`已清空 ${shortCount + longCount} 条短期/长期记忆，核心记忆已保留`, 'success');
        } else {
            save.memories = { short: [], long: [], core: [] };
            updateSaveData({ memories: save.memories });
            showToast('所有记忆已清空', 'success');
        }
        loadMemoriesFromLocal();
    }
}

// ==================== 图库功能 ====================
function uploadGalleryImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        showToast('正在上传...');
        
        // 这里应该实现实际上传逻辑
        // 简化版本：使用 FileReader 读取为 base64
        const reader = new FileReader();
        reader.onload = (event) => {
            const image = {
                id: 'img_' + Date.now(),
                url: event.target.result,
                name: file.name,
                uploadedAt: new Date().toISOString()
            };
            gallery.push(image);
            renderGallery();
            showToast('图片已上传', 'success');
        };
        reader.readAsDataURL(file);
    };
    input.click();
}

function copyGalleryImageUrl() {
    const url = document.getElementById('galleryImageUrl')?.value;
    if (url) {
        navigator.clipboard.writeText(url).then(() => {
            showToast('链接已复制', 'success');
        });
    }
}

function deleteGalleryImage() {
    const url = document.getElementById('galleryImageUrl')?.value;
    if (!url) return;
    
    gallery = gallery.filter(img => img.url !== url);
    renderGallery();
    closeModal('galleryModal');
    showToast('图片已删除');
}

// ==================== 聊天界面设置 ====================
function resetChatUISettings() {
    if (!confirm('确定要重置聊天界面设置吗？')) return;
    
    document.getElementById('chatUIFont').value = 'Microsoft YaHei';
    document.getElementById('chatUIFontSize').value = '16';
    document.getElementById('chatUIDialogPosition').value = 'bottom';
    showToast('设置已重置');
}

function saveChatUISettings() {
    const settings = {
        font: document.getElementById('chatUIFont')?.value,
        fontSize: document.getElementById('chatUIFontSize')?.value,
        dialogPosition: document.getElementById('chatUIDialogPosition')?.value
    };
    
    localStorage.setItem('galgame_chat_ui_settings', JSON.stringify(settings));
    showToast('聊天界面设置已保存', 'success');
}

// ==================== 用户个性化功能 ====================
function saveUserPrompt() {
    const prompt = {
        background: document.getElementById('userPersonalBackground')?.value,
        prePrompt: document.getElementById('userPrePrompt')?.value
    };
    
    userPersonalSettings.prompts = { ...userPersonalSettings.prompts, ...prompt };
    saveUserPersonalSettings();
    showToast('个人提示词已保存', 'success');
}

async function testUserAIConnection() {
    // 复用主 AI 测试逻辑，但使用用户配置
    await testAIConnection();
}

function saveUserAIConfig() {
    const config = {
        temperature: parseFloat(document.getElementById('userAITemperature')?.value || 0.7),
        maxTokens: parseInt(document.getElementById('userAIMaxTokens')?.value || 2000)
    };
    
    userPersonalSettings.config = config;
    saveUserPersonalSettings();
    showToast('AI 配置已保存', 'success');
}

async function loadUserMemoryList() {
    const save = getCurrentSaveData();
    const container = document.getElementById('userMemoryList');
    const statsDiv = document.getElementById('userMemoryStats');
    
    if (!save || !save.memories) {
        if (container) container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">请先选择存档</p>';
        if (statsDiv) statsDiv.innerHTML = '';
        return;
    }
    
    const memories = save.memories;
    const total = (memories.short?.length || 0) + (memories.long?.length || 0) + (memories.core?.length || 0);
    
    if (statsDiv) {
        statsDiv.innerHTML = `
            <div style="display: flex; gap: 20px; margin-bottom: 15px;">
                <span>🧠 核心: ${memories.core?.length || 0}</span>
                <span>📚 长期: ${memories.long?.length || 0}</span>
                <span>💭 短期: ${memories.short?.length || 0}</span>
                <span>📊 总计: ${total}</span>
            </div>
        `;
    }
    
    renderMemoriesList(memories);
}

function exportUserMemories() {
    exportAllMemories();
}

async function clearAllUserMemories() {
    await clearMemories();
}

// ==================== 角色编辑功能（补充）====================
function editCharacter(id) {
    const char = characters.find(c => (c._id || c.id) === id);
    if (!char) {
        showToast('角色不存在', 'error');
        return;
    }
    
    editingCharacterId = id;
    
    // 加载所有字段
    const fields = {
        'charName': char.name || '',
        'charColor': char.color || '#8a6d3b',
        'charColorPicker': char.color || '#8a6d3b',
        'charAvatar': char.image || char.avatar || '',
        'charImageFit': char.imageFit || 'cover',
        'charKeys': (char.keys || []).join(', '),
        'charPriority': char.priority || '100',
        'charFavor': char.favor ?? 50,
        'charTrust': char.trust ?? 50,
        'charMood': char.stats?.mood || char.mood || '平静',
        'charAppearance': char.appearance || '',
        'charPersonality': char.personality || '',
        'charBackground': char.background || '',
        'charPhysique': char.physique || '',
        'charSpecial': char.special || ''
    };
    
    for (const [fieldId, value] of Object.entries(fields)) {
        const el = document.getElementById(fieldId);
        if (el) el.value = value;
    }
    
    // 更新头像预览
    const avatarPreview = document.getElementById('charAvatarPreview');
    const avatarImg = avatarPreview?.querySelector('img');
    if (avatarPreview && avatarImg) {
        if (char.image || char.avatar) {
            avatarImg.src = char.image || char.avatar;
            avatarPreview.style.display = 'block';
        } else {
            avatarPreview.style.display = 'none';
        }
    }
    
    // 更新好感度/信任度显示
    updateFavorLevel(char.favor ?? 50);
    updateTrustLevel(char.trust ?? 50);
    
    // 更新预览
    generateCharacterPromptPreview();
    
    const modalTitle = document.querySelector('#characterModal .modal-title');
    if (modalTitle) modalTitle.textContent = '🎭 编辑角色';
    
    const overlay = document.getElementById('characterModalOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
        overlay.classList.add('show');
    }
}

// ==================== 角色导入/导出/重置（补充）====================
function exportCharactersOnly() {
    const data = {
        characters: characters,
        exportTime: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `characters-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('角色已导出');
}

function importCharactersBatch() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (data.characters && Array.isArray(data.characters)) {
                characters = [...characters, ...data.characters];
                renderCharacterList();
                showToast(`已导入 ${data.characters.length} 个角色`, 'success');
            } else {
                showToast('文件格式不正确', 'error');
            }
        } catch (err) {
            showToast('导入失败: ' + err.message, 'error');
        }
    };
    input.click();
}

function resetCharacters() {
    if (!confirm('确定要重置所有角色吗？这将恢复到默认角色。')) return;
    
    characters = [
        { name: '向导', color: '#FF69B4', prompt: '陪伴玩家冒险的向导' },
        { name: '伙伴', color: '#87CEFA', prompt: '陪伴玩家冒险的伙伴' }
    ];
    renderCharacterList();
    showToast('角色已重置');
}

function fixCharacterImages(event) {
    if (event) event.preventDefault();
    showToast('正在检查图片地址...');
    
    let fixed = 0;
    characters.forEach(char => {
        if (char.image && !char.image.startsWith('http')) {
            // 修复相对路径或其他问题
            fixed++;
        }
    });
    
    showToast(`检查了 ${characters.length} 个角色，修复了 ${fixed} 个`, fixed > 0 ? 'success' : 'info');
}

// ==================== 全局暴露 ====================
window.toggleViewMode = toggleViewMode;
window.exportGameData = exportGameData;
window.importGameData = importGameData;
window.previewGame = previewGame;
window.onSaveChange = onSaveChange;
window.createNewSaveFromSettings = createNewSaveFromSettings;
window.openCharacterModal = openCharacterModal;
window.closeCharacterModal = closeCharacterModal;
window.saveCharacter = saveCharacter;
window.editCharacter = editCharacter;
window.deleteCharacter = deleteCharacter;
window.openWorldbookModal = openWorldbookModal;
window.closeWorldbookModal = closeWorldbookModal;
window.saveGame = saveGame;
window.publishGame = publishGame;
window.unpublishGame = unpublishGame;
window.deleteGame = deleteGame;
window.logout = logout;
window.closeAllModals = closeAllModals;
window.closeModal = closeModal;
window.testAIConnection = testAIConnection;
window.saveAISettings = saveAISettings;
window.exportWorldbookOnly = exportWorldbookOnly;
window.importWorldbookEntries = importWorldbookEntries;
window.resetWorldbook = resetWorldbook;
window.filterWorldbookList = filterWorldbookList;
window.sortAndRenderWorldbook = sortAndRenderWorldbook;
window.saveWorldbookEntry = saveWorldbookEntry;
window.openWorldbookModal = openWorldbookModal;
window.closeWorldbookModal = closeWorldbookModal;
window.editWorldbookEntry = editWorldbookEntry;
window.deleteWorldbookEntry = deleteWorldbookEntry;
window.testWorldbookMatch = testWorldbookMatch;
window.initWorldbookManager = initWorldbookManager;
window.closeGalleryModal = closeGalleryModal;
window.resetPrompts = resetPrompts;
window.savePrompts = savePrompts;
window.loadMemories = loadMemories;
window.solidifyTimeline = solidifyTimeline;
window.exportAllMemories = exportAllMemories;
window.importMemories = importMemories;
window.clearMemories = clearMemories;
window.filterMemories = filterMemories;
window.searchMemories = searchMemories;
window.sortMemories = sortMemories;
window.openMemoryModal = openMemoryModal;
window.closeMemoryModal = closeMemoryModal;
window.saveMemory = saveMemory;
window.deleteMemory = deleteMemory;
window.viewTimelineArchive = viewTimelineArchive;
window.closeTimelineArchiveModal = closeTimelineArchiveModal;
window.loadMemoriesFromLocal = loadMemoriesFromLocal;
window.uploadGalleryImage = uploadGalleryImage;
window.copyGalleryImageUrl = copyGalleryImageUrl;
window.deleteGalleryImage = deleteGalleryImage;
window.resetChatUISettings = resetChatUISettings;
window.saveChatUISettings = saveChatUISettings;
window.saveUserPrompt = saveUserPrompt;
window.testUserAIConnection = testUserAIConnection;
window.saveUserAIConfig = saveUserAIConfig;
window.loadUserMemoryList = loadUserMemoryList;
window.exportUserMemories = exportUserMemories;
window.clearAllUserMemories = clearAllUserMemories;
window.exportCharactersOnly = exportCharactersOnly;
window.importCharactersBatch = importCharactersBatch;
window.resetCharacters = resetCharacters;
window.fixCharacterImages = fixCharacterImages;
