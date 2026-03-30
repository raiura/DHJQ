/**
 * 设置页面世界书管理模块
 */

// 初始化世界书管理器
async function initWorldbookManager() {
    console.log('[Worldbook] Initializing manager...');
    
    worldbookManager = new WorldbookManager({ gameId });
    
    if (currentSaveId) {
        worldbookManager.setCurrentSave(currentSaveId);
    }
    
    await worldbookManager.loadGlobalWorldbook();
    renderWorldbookList();
    renderWorldbookGroups();
    
    console.log('[Worldbook] Manager initialized');
    
    // 初始化新世界书图书馆 2.0
    initWorldbookLibrary();
}

// 初始化世界书图书馆
function initWorldbookLibrary() {
    console.log('[WorldbookLibrary] Initializing...');
    
    worldbookLibrary = new WorldbookLibrary({ gameId });
    
    const container = document.getElementById('worldbookManagerContainer');
    if (container && typeof WorldbookManagerUI !== 'undefined') {
        worldbookManagerUI = new WorldbookManagerUI(container, {
            library: worldbookLibrary,
            gameId: gameId,
            onEntrySelect: (entry) => {
                openWorldbookEntryEditor(entry);
            },
            onBookSelect: (book) => {
                console.log('[WorldbookManagerUI] Selected book:', book?.name);
            }
        });
        console.log('[WorldbookLibrary] UI initialized with', worldbookLibrary.getAllBooks().length, 'books');
    }
    
    // 初始化记忆服务
    initMemoryService();
}

// 筛选世界书列表
function filterWorldbookList() {
    const searchInput = document.getElementById('wbSearchInput');
    const groupFilter = document.getElementById('wbGroupFilter');
    const userOnlyCheck = document.getElementById('wbShowUserOnly');
    
    worldbookFilterState.search = searchInput?.value || '';
    worldbookFilterState.group = groupFilter?.value || '';
    worldbookFilterState.userOnly = userOnlyCheck?.checked || false;
    
    renderWorldbookList();
}

// 排序世界书列表
function sortAndRenderWorldbook() {
    const sortSelect = document.getElementById('wbSortBy');
    if (sortSelect) {
        worldbookFilterState.sortBy = sortSelect.value;
    }
    renderWorldbookList();
}

// 渲染世界书列表
function renderWorldbookList() {
    const container = document.getElementById('originalWorldbookList');
    const totalStatsEl = document.getElementById('originalWbTotalEntries');
    const globalStatsEl = document.getElementById('globalWbCount');
    const userStatsEl = document.getElementById('userWbCount');
    
    if (!container) return;
    
    if (!worldbookManager) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">正在加载...</p>';
        return;
    }
    
    let entries = worldbookManager.getAllEntriesForDisplay();
    
    // 更新统计
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
    
    // 应用排序
    entries.sort((a, b) => {
        switch (worldbookFilterState.sortBy) {
            case 'priority-desc': return (b.priority || 100) - (a.priority || 100);
            case 'priority-asc': return (a.priority || 100) - (b.priority || 100);
            case 'name-asc': return a.name.localeCompare(b.name);
            case 'name-desc': return b.name.localeCompare(a.name);
            case 'group': return (a.group || '').localeCompare(b.group || '');
            default: return 0;
        }
    });
    
    // 按分组渲染
    renderWorldbookEntriesByGroup(container, entries);
}

// 按分组渲染世界书条目
function renderWorldbookEntriesByGroup(container, entries) {
    if (entries.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">暂无条目</p>';
        return;
    }
    
    // 按分组组织
    const groups = {};
    entries.forEach(entry => {
        const group = entry.group || '未分组';
        if (!groups[group]) groups[group] = [];
        groups[group].push(entry);
    });
    
    // 渲染分组
    container.innerHTML = Object.entries(groups).map(([groupName, groupEntries]) => {
        const color = groupEntries[0].groupColor || '#888';
        return `
            <div class="worldbook-group" style="margin-bottom: 24px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid ${color};">
                    <span style="width: 12px; height: 12px; background: ${color}; border-radius: 50%;"></span>
                    <span style="font-weight: 600; color: var(--primary-light);">${escapeHtml(groupName)}</span>
                    <span style="color: var(--text-secondary); font-size: 12px;">(${groupEntries.length})</span>
                </div>
                ${groupEntries.map(entry => renderWorldbookEntryCard(entry)).join('')}
            </div>
        `;
    }).join('');
}

// 渲染世界书条目卡片
function renderWorldbookEntryCard(entry) {
    const isEnabled = entry.enabled !== false;
    const typeLabel = entry.isUserEntry ? '用户' : '全局';
    const typeClass = entry.isUserEntry ? 'user' : 'global';
    
    return `
        <div class="worldbook-entry ${!isEnabled ? 'disabled' : ''}" data-id="${entry.id}" data-user="${entry.isUserEntry}">
            <div class="entry-header">
                <span class="entry-name">${escapeHtml(entry.name)}</span>
                <span class="entry-type ${typeClass}">${typeLabel}</span>
                <span class="entry-priority">P${entry.priority || 100}</span>
            </div>
            <div class="entry-keys">${entry.keys.map(k => `<span class="key">${escapeHtml(k)}</span>`).join('')}</div>
            <div class="entry-content">${escapeHtml(entry.content.substring(0, 100))}${entry.content.length > 100 ? '...' : ''}</div>
            <div class="entry-actions">
                <button class="btn btn-sm" onclick="editWorldbookEntry('${entry.id}', ${entry.isUserEntry})">编辑</button>
                <button class="btn btn-sm btn-danger" onclick="deleteWorldbookEntry('${entry.id}', ${entry.isUserEntry})">删除</button>
            </div>
        </div>
    `;
}

// 渲染分组选择器
function renderWorldbookGroups() {
    const select = document.getElementById('wbEntryGroup');
    if (!select || !worldbookManager) return;
    
    const stats = worldbookManager.getGroupStats();
    const groups = Object.entries(stats);
    
    select.innerHTML = groups.map(([name, info]) => `
        <option value="${escapeHtml(name)}" style="color: ${info.color}">${escapeHtml(name)} (${info.count})</option>
    `).join('');
}

// 创建新世界书
function createNewWorldbook() {
    if (!worldbookLibrary) {
        showToast('世界书系统未初始化', 'error');
        return;
    }
    
    const name = prompt('请输入世界书名称:', '新建世界书');
    if (!name) return;
    
    const book = worldbookLibrary.createBook({ name, description: '' });
    worldbookLibrary.selectBook(book.id);
    
    if (worldbookManagerUI) {
        worldbookManagerUI.refresh();
    }
    
    showToast(`世界书 "${name}" 创建成功`, 'success');
    switchToPage('worldbook');
}

// 导出所有世界书
function exportAllWorldbooks() {
    if (!worldbookLibrary) {
        showToast('世界书系统未初始化', 'error');
        return;
    }
    
    const data = worldbookLibrary.exportLibrary();
    downloadJSON(data, `worldbook_library_${gameId || 'export'}_${Date.now()}.json`);
    showToast('世界书库已导出', 'success');
}

// 导出到全局
if (typeof window !== 'undefined') {
    window.initWorldbookManager = initWorldbookManager;
    window.initWorldbookLibrary = initWorldbookLibrary;
    window.filterWorldbookList = filterWorldbookList;
    window.sortAndRenderWorldbook = sortAndRenderWorldbook;
    window.renderWorldbookList = renderWorldbookList;
    window.renderWorldbookGroups = renderWorldbookGroups;
    window.createNewWorldbook = createNewWorldbook;
    window.exportAllWorldbooks = exportAllWorldbooks;
}
