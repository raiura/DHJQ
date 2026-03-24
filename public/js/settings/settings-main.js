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
    gameId = new URLSearchParams(window.location.search).get('id');
    isEditMode = !!gameId;
    
    initParticles();
    checkAuth();
    setupNavigation();
    setupTabs();
    switchToPageFromURL();
    
    if (isEditMode) {
        loadGameData().then(() => restoreViewMode());
    } else {
        document.getElementById('pageTitle').textContent = '创建新世界';
        document.getElementById('gameStatus').style.display = 'none';
        document.getElementById('publishBtn').style.display = 'none';
        document.getElementById('unpublishBtn').style.display = 'none';
        document.getElementById('previewBtn').style.display = 'none';
        document.getElementById('deleteBtn').style.display = 'none';
        
        characters = [
            { name: '向导', color: '#FF69B4', prompt: '陪伴玩家冒险的伙伴' },
            { name: '伙伴', color: '#87CEFA', prompt: '陪伴玩家冒险的伙伴' }
        ];
        renderCharacterList();
        restoreViewMode();
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
    const savedMode = localStorage.getItem('settings_view_mode');
    const btn = document.getElementById('viewToggleBtn');
    const text = document.getElementById('viewModeText');
    
    if (!hasFullEditPermission()) {
        isUserView = true;
        document.body.classList.add('user-view');
        if (btn) { btn.style.opacity = '0.5'; btn.style.cursor = 'not-allowed'; btn.title = '作者才能切换视图'; btn.disabled = true; }
        loadUserPersonalSettings();
    } else {
        if (btn) { btn.style.opacity = '1'; btn.style.cursor = 'pointer'; btn.title = '点击切换视图'; btn.disabled = false; }
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
    const targetSection = document.getElementById(pageId + '-section');
    if (targetSection) targetSection.classList.add('active');
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
                <div class="avatar-fallback">${(char.name || '?').charAt(0)}</div>
            </div>
            <div class="character-info">
                <div class="character-name">${char.name || '未命名'}</div>
                <div class="character-prompt">${char.prompt || ''}</div>
            </div>
            <div class="character-actions">
                <button class="btn btn-secondary" onclick="editCharacter('${char._id || index}')">编辑</button>
                <button class="btn btn-danger" onclick="deleteCharacter('${char._id || index}')">删除</button>
            </div>
        </div>
    `).join('');
}

function openCharacterModal() {
    editingCharacterId = null;
    document.getElementById('charName').value = '';
    document.getElementById('charPrompt').value = '';
    document.getElementById('charColor').value = '#FF69B4';
    document.getElementById('charImage').value = '';
    document.getElementById('modalTitle').textContent = '新建角色';
    document.getElementById('characterModal').classList.add('show');
}

function closeCharacterModal() {
    document.getElementById('characterModal').classList.remove('show');
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
    const name = document.getElementById('charName').value.trim();
    const prompt = document.getElementById('charPrompt').value.trim();
    const color = document.getElementById('charColor').value;
    
    if (!name) { showToast('请输入角色名称', 'error'); return; }
    
    const char = { name, prompt, color, _id: editingCharacterId || 'local_' + Date.now() };
    
    if (editingCharacterId) {
        const idx = characters.findIndex(c => c._id === editingCharacterId);
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
    document.getElementById('worldbookModal').classList.add('show');
}

function closeWorldbookModal() {
    document.getElementById('worldbookModal').classList.remove('show');
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
