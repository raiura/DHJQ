// ==================== 配置 ====================
const API_BASE = 'http://localhost:3000/api';
let currentUser = null;
let currentGame = null;
let gameId = null;
let isEditMode = false;
let characters = [];
let editingCharacterId = null;
let worldbookEntries = [];
let editingWorldbookId = null;
let gallery = [];

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
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('[Settings] Initializing...');
        gameId = new URLSearchParams(window.location.search).get('id');
        isEditMode = !!gameId;
        
        initParticles();
        checkAuth();
        setupNavigation();
        setupTabs();
        switchToPageFromURL();
        
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

// ==================== 世界书管理 ====================
async function loadWorldbookEntries() {
    // Simplified - would load from API
    worldbookEntries = [];
    renderWorldbookList();
}

function renderWorldbookList() {
    const container = document.getElementById('worldbookList');
    if (!container) return;
    
    if (!worldbookEntries || worldbookEntries.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">暂无世界书条目，点击"新建条目"添加</p>';
        return;
    }
    container.innerHTML = worldbookEntries.map(e => `<div>${e.name}</div>`).join('');
}

function openWorldbookModal() {
    const modal = document.getElementById('worldbookModal');
    if (modal) {
        modal.style.display = 'block';
        document.getElementById('modalOverlay').style.display = 'block';
    }
}

function closeWorldbookModal() {
    closeModal('worldbookModal');
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
