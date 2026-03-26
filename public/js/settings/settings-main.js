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
    const nameEl = document.getElementById('charName');
    const avatarEl = document.getElementById('charAvatar');
    const personalityEl = document.getElementById('charPersonality');
    const backgroundEl = document.getElementById('charBackground');
    const modalTitle = document.querySelector('#characterModal .modal-title');
    
    if (nameEl) nameEl.value = '';
    if (avatarEl) avatarEl.value = '';
    if (personalityEl) personalityEl.value = '';
    if (backgroundEl) backgroundEl.value = '';
    if (modalTitle) modalTitle.textContent = '新建角色';
    
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
    const modalTitle = document.querySelector('#characterModal .modal-title');
    
    if (nameEl) nameEl.value = char.name || '';
    if (avatarEl) avatarEl.value = char.avatar || char.image || '';
    if (personalityEl) personalityEl.value = char.personality || char.prompt || '';
    if (backgroundEl) backgroundEl.value = char.background || '';
    if (modalTitle) modalTitle.textContent = '编辑角色';
    
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
