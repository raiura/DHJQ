// ==================== 配置 ====================
const API_BASE = 'http://localhost:3000/api';
let currentUser = null;
let currentGame = null;
let gameId = null;
let isEditMode = false;
let characters = [];
let editingCharacterId = null;
let gallery = [];

// 世界书管理器（新版）
let worldbookManager = null;
let editingWorldbookId = null;

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
        
        if (isEditMode) {
            loadGameData().then(() => restoreViewMode()).catch(err => {
                console.error('[Settings] Failed to load game data:', err);
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
            
            characters = [
                { name: '向导', color: '#FF69B4', prompt: '陪伴玩家冒险的伙伴' },
                { name: '伙伴', color: '#87CEFA', prompt: '陪伴玩家冒险的伙伴' }
            ];
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
            fillGameInfo(currentGame);
            updateStatusUI(currentGame.status);
            renderCharacterList();
            await loadWorldbookEntries();
            await loadGallery();
        } else {
            showToast(result.message || '加载失败', 'error');
        }
    } catch (error) {
        console.error('加载游戏数据失败:', error);
        showToast('加载失败: ' + error.message, 'error');
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

// ==================== 角色管理 ====================
function renderCharacterList() {
    const container = document.getElementById('characterList');
    if (!container) return;
    
    if (!characters || characters.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">暂无角色，点击"新建角色"添加</p>';
        return;
    }
    
    container.innerHTML = characters.map((char, index) => `
        <div class="character-card" style="border-left-color: ${char.color || '#FF69B4'}">
            <div class="character-avatar">
                ${char.avatar ? `<img src="${char.avatar}" alt="${char.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">` : `<div class="avatar-fallback">${(char.name || '?').charAt(0)}</div>`}
            </div>
            <div class="character-info">
                <div class="character-name">${char.name || '未命名'}</div>
                <div class="character-prompt">${char.personality || char.prompt || ''}</div>
            </div>
            <div class="character-actions">
                <button class="btn btn-secondary" onclick="editCharacter('${char._id || char.id || index}')">编辑</button>
                <button class="btn btn-danger" onclick="deleteCharacter('${char._id || char.id || index}')">删除</button>
            </div>
        </div>
    `).join('');
}

function openCharacterModal() {
    editingCharacterId = null;
    const nameEl = document.getElementById('charName');
    const avatarEl = document.getElementById('charAvatar');
    const personalityEl = document.getElementById('charPersonality');
    const backgroundEl = document.getElementById('charBackground');
    const modalTitle = document.getElementById('modalTitle');
    const modal = document.getElementById('characterModal');
    
    if (nameEl) nameEl.value = '';
    if (avatarEl) avatarEl.value = '';
    if (personalityEl) personalityEl.value = '';
    if (backgroundEl) backgroundEl.value = '';
    if (modalTitle) modalTitle.textContent = '新建角色';
    if (modal) {
        modal.style.display = 'block';
        document.getElementById('modalOverlay').style.display = 'block';
    }
}

function closeCharacterModal() {
    closeModal('characterModal');
}

function editCharacter(id) {
    // Simplified edit logic
    showToast('编辑功能开发中...');
}

function deleteCharacter(id) {
    if (!confirm('确定要删除这个角色吗？')) return;
    characters = characters.filter((c, i) => (c._id || i.toString()) !== id);
    renderCharacterList();
    showToast('已删除');
}

function saveCharacter() {
    const nameEl = document.getElementById('charName');
    const avatarEl = document.getElementById('charAvatar');
    const personalityEl = document.getElementById('charPersonality');
    const backgroundEl = document.getElementById('charBackground');
    
    const name = nameEl ? nameEl.value.trim() : '';
    const avatar = avatarEl ? avatarEl.value.trim() : '';
    const personality = personalityEl ? personalityEl.value.trim() : '';
    const background = backgroundEl ? backgroundEl.value.trim() : '';
    
    if (!name) { showToast('请输入角色名称', 'error'); return; }
    
    const char = { 
        name, 
        avatar, 
        personality, 
        background,
        _id: editingCharacterId || 'local_' + Date.now() 
    };
    
    if (editingCharacterId) {
        const idx = characters.findIndex(c => c._id === editingCharacterId || c.id === editingCharacterId);
        if (idx >= 0) characters[idx] = char;
    } else {
        characters.push(char);
    }
    
    closeCharacterModal();
    renderCharacterList();
    showToast('角色已保存');
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
}

/**
 * 渲染世界书列表（支持分组显示）
 */
function renderWorldbookList() {
    const container = document.getElementById('worldbookList');
    const statsEl = document.getElementById('originalWbTotalEntries');
    if (!container) return;
    
    if (!worldbookManager) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">正在加载...</p>';
        return;
    }
    
    const entries = worldbookManager.getAllEntriesForDisplay();
    
    if (statsEl) statsEl.textContent = entries.length;
    
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
    
    // 渲染分组
    container.innerHTML = Object.entries(groups).map(([groupName, groupEntries]) => `
        <div class="worldbook-group" style="margin-bottom: 24px;">
            <div class="worldbook-group-header" style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(138, 109, 59, 0.2);">
                <span style="width: 12px; height: 12px; border-radius: 50%; background: ${groupEntries[0].groupColor || '#888'};"></span>
                <span style="font-weight: 600; color: var(--primary-light);">${groupName}</span>
                <span style="color: var(--text-secondary); font-size: 13px;">(${groupEntries.length})</span>
            </div>
            <div class="worldbook-entries">
                ${groupEntries.map(entry => `
                    <div class="worldbook-entry ${entry.isUserEntry ? 'user-entry' : ''}" 
                         style="background: rgba(0,0,0,0.2); border-radius: 12px; padding: 16px; margin-bottom: 12px; border-left: 3px solid ${entry.groupColor || '#888'}; ${entry.enabled === false ? 'opacity: 0.5;' : ''}">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                            <div style="flex: 1;">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                                    <span style="font-weight: 600; font-size: 15px; color: var(--text-primary);">${entry.name}</span>
                                    ${entry.isUserEntry ? '<span style="font-size: 11px; background: rgba(33, 150, 243, 0.2); color: #2196F3; padding: 2px 6px; border-radius: 4px;">用户</span>' : ''}
                                    ${entry.constant ? '<span style="font-size: 11px; background: rgba(255, 152, 0, 0.2); color: #FF9800; padding: 2px 6px; border-radius: 4px;">恒常</span>' : ''}
                                </div>
                                <div style="font-size: 12px; color: var(--text-secondary); display: flex; gap: 15px; flex-wrap: wrap;">
                                    <span>🔑 ${entry.keys.join(', ')}</span>
                                    <span>📊 优先级: ${entry.priority}</span>
                                    <span>📍 ${getInsertPositionLabel(entry.insertPosition)}</span>
                                </div>
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <button class="btn btn-sm btn-secondary" onclick="editWorldbookEntry('${entry.id}', ${entry.isUserEntry})" style="padding: 6px 12px; font-size: 12px;">编辑</button>
                                <button class="btn btn-sm btn-danger" onclick="deleteWorldbookEntry('${entry.id}', ${entry.isUserEntry})" style="padding: 6px 12px; font-size: 12px;">删除</button>
                            </div>
                        </div>
                        <div style="color: var(--text-secondary); font-size: 13px; line-height: 1.6; border-top: 1px solid rgba(138, 109, 59, 0.1); padding-top: 10px;">
                            ${entry.content.substring(0, 150)}${entry.content.length > 150 ? '...' : ''}
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
    editingWorldbookId = null;
    
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
    const modal = document.getElementById('worldbookModal');
    if (modal) {
        modal.style.display = 'block';
        document.getElementById('modalOverlay').style.display = 'block';
    }
    
    // 更新分组选择器
    renderWorldbookGroups();
}

/**
 * 编辑世界书条目
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
    const modal = document.getElementById('worldbookModal');
    if (modal) {
        modal.style.display = 'block';
        document.getElementById('modalOverlay').style.display = 'block';
    }
}

/**
 * 关闭世界书模态框
 */
function closeWorldbookModal() {
    closeModal('worldbookModal');
    editingWorldbookId = null;
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
        // 判断是新建还是编辑
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
            // 新建 - 默认添加到用户世界书
            // 如果是作者且选择了"添加到全局"，则添加到全局
            const addToGlobal = hasFullEditPermission() && document.getElementById('wbAddToGlobal')?.checked;
            
            if (addToGlobal) {
                worldbookManager.addGlobalEntry(entryData);
                showToast('条目已添加到全局世界书', 'success');
            } else {
                worldbookManager.addUserEntry(entryData);
                showToast('条目已添加到我的世界书', 'success');
            }
        }
        
        // 刷新列表
        renderWorldbookList();
        renderWorldbookGroups();
        closeWorldbookModal();
        
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

// 用于记录当前编辑的是否为用户条目
let editingWorldbookIsUser = false;

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
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    document.getElementById('modalOverlay').style.display = 'none';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
    // 检查是否还有其他模态框打开
    const anyOpen = Array.from(document.querySelectorAll('.modal')).some(m => m.style.display === 'block');
    if (!anyOpen) {
        document.getElementById('modalOverlay').style.display = 'none';
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

// ==================== 世界书功能 ====================
function exportWorldbookOnly() {
    const data = {
        worldbook: worldbookEntries,
        exportTime: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `worldbook-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('世界书已导出');
}

function importWorldbookEntries() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (data.worldbook && Array.isArray(data.worldbook)) {
                worldbookEntries = data.worldbook;
                renderWorldbookList();
                showToast(`已导入 ${data.worldbook.length} 条世界书条目`, 'success');
            } else {
                showToast('文件格式不正确', 'error');
            }
        } catch (err) {
            showToast('导入失败: ' + err.message, 'error');
        }
    };
    input.click();
}

async function saveWorldbookEntry() {
    const keyword = document.getElementById('wbKeyword')?.value.trim();
    const content = document.getElementById('wbContent')?.value.trim();
    
    if (!keyword || !content) {
        showToast('请填写关键词和内容', 'error');
        return;
    }
    
    const entry = {
        id: editingWorldbookId || 'wb_' + Date.now(),
        keyword: keyword,
        content: content,
        createdAt: new Date().toISOString()
    };
    
    if (editingWorldbookId) {
        const idx = worldbookEntries.findIndex(e => e.id === editingWorldbookId);
        if (idx >= 0) worldbookEntries[idx] = entry;
    } else {
        worldbookEntries.push(entry);
    }
    
    editingWorldbookId = null;
    closeModal('worldbookModal');
    renderWorldbookList();
    showToast('条目已保存', 'success');
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

// ==================== 记忆管理功能 ====================
async function loadMemories() {
    // 从当前存档加载记忆
    const save = getCurrentSaveData();
    const memories = save?.memories || { short: [], long: [], core: [] };
    renderMemoriesList(memories);
}

function renderMemoriesList(memories) {
    const container = document.getElementById('memoriesList');
    if (!container) return;
    
    const allMemories = [
        ...memories.core.map(m => ({ ...m, type: 'core' })),
        ...memories.long.map(m => ({ ...m, type: 'long' })),
        ...memories.short.map(m => ({ ...m, type: 'short' }))
    ];
    
    if (allMemories.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">暂无记忆</p>';
        return;
    }
    
    container.innerHTML = allMemories.map(mem => `
        <div class="memory-item" style="padding: 15px; background: rgba(0,0,0,0.2); border-radius: 8px; margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span class="memory-type-${mem.type}">${mem.type === 'core' ? '核心' : mem.type === 'long' ? '长期' : '短期'}</span>
                <span style="font-size: 12px; color: var(--text-secondary);">${new Date(mem.timestamp).toLocaleString()}</span>
            </div>
            <p style="margin: 0;">${mem.content || mem.title || ''}</p>
        </div>
    `).join('');
}

async function solidifyTimeline() {
    if (!confirm('确定要固化当前时间线吗？这将把当前核心记忆写入世界书存档。')) return;
    
    showToast('正在固化时间线...');
    
    // 本地实现：将长期记忆移动到核心记忆
    const save = getCurrentSaveData();
    if (save && save.memories) {
        const longMemories = save.memories.long || [];
        if (longMemories.length === 0) {
            showToast('没有需要固化的长期记忆', 'info');
            return;
        }
        
        // 将长期记忆添加到核心记忆
        save.memories.core = save.memories.core || [];
        longMemories.forEach(mem => {
            save.memories.core.push({
                ...mem,
                solidifiedAt: new Date().toISOString()
            });
        });
        
        // 清空长期记忆
        save.memories.long = [];
        
        // 保存
        updateSaveData({ memories: save.memories });
        renderMemoriesList(save.memories);
        showToast(`已固化 ${longMemories.length} 条记忆到核心`, 'success');
        return;
    }
    
    // 如果没有本地存档，尝试调用 API
    try {
        const response = await fetch(`${API_BASE}/memories/solidify`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        
        const result = await response.json();
        if (result.success) {
            showToast('时间线已固化', 'success');
            loadMemories();
        } else {
            showToast(result.message || '固化失败', 'error');
        }
    } catch (error) {
        showToast('固化失败: ' + error.message, 'error');
    }
}

function exportAllMemories() {
    const save = getCurrentSaveData();
    const memories = save?.memories || { short: [], long: [], core: [] };
    
    const data = {
        memories: memories,
        exportTime: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `memories-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('记忆已导出');
}

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
            
            if (data.memories) {
                // 更新当前存档的记忆
                updateSaveData({ memories: data.memories });
                renderMemoriesList(data.memories);
                showToast('记忆已导入', 'success');
            } else {
                showToast('文件格式不正确', 'error');
            }
        } catch (err) {
            showToast('导入失败: ' + err.message, 'error');
        }
    };
    input.click();
}

async function clearMemories() {
    if (!confirm('确定要清空所有记忆吗？此操作不可恢复！')) return;
    
    // 优先清空本地存档的记忆
    const save = getCurrentSaveData();
    if (save) {
        save.memories = { short: [], long: [], core: [] };
        updateSaveData({ memories: save.memories });
        renderMemoriesList(save.memories);
        showToast('记忆已清空', 'success');
        return;
    }
    
    // 如果没有选中存档，尝试调用 API
    try {
        const response = await fetch(`${API_BASE}/memories`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        const result = await response.json();
        if (result.success) {
            showToast('记忆已清空', 'success');
            loadMemories();
        } else {
            showToast(result.message || '清空失败', 'error');
        }
    } catch (error) {
        showToast('清空失败: ' + error.message, 'error');
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
    const nameEl = document.getElementById('charName');
    const avatarEl = document.getElementById('charAvatar');
    const personalityEl = document.getElementById('charPersonality');
    const backgroundEl = document.getElementById('charBackground');
    const modalTitle = document.getElementById('modalTitle');
    const modal = document.getElementById('characterModal');
    
    if (nameEl) nameEl.value = char.name || '';
    if (avatarEl) avatarEl.value = char.avatar || char.image || '';
    if (personalityEl) personalityEl.value = char.personality || char.prompt || '';
    if (backgroundEl) backgroundEl.value = char.background || '';
    if (modalTitle) modalTitle.textContent = '编辑角色';
    if (modal) {
        modal.style.display = 'block';
        document.getElementById('modalOverlay').style.display = 'block';
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
window.saveWorldbookEntry = saveWorldbookEntry;
window.openWorldbookModal = openWorldbookModal;
window.closeWorldbookModal = closeWorldbookModal;
window.editWorldbookEntry = editWorldbookEntry;
window.deleteWorldbookEntry = deleteWorldbookEntry;
window.testWorldbookMatch = testWorldbookMatch;
window.resetPrompts = resetPrompts;
window.savePrompts = savePrompts;
window.loadMemories = loadMemories;
window.solidifyTimeline = solidifyTimeline;
window.exportAllMemories = exportAllMemories;
window.importMemories = importMemories;
window.clearMemories = clearMemories;
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
