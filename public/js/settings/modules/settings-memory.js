/**
 * 设置页面记忆管理模块
 */

// 初始化记忆服务
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

// 加载记忆列表
async function loadMemories() {
    console.log('[Memory] Loading memories...');
    
    if (!memoryService) {
        console.warn('[Memory] MemoryService not initialized');
        loadMemoriesFromLocal();
        return;
    }
    
    try {
        // 获取统计
        const stats = await memoryService.getStats();
        updateMemoryStats(stats);
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

// 从本地存储加载记忆
function loadMemoriesFromLocal() {
    const save = getCurrentSaveData ? getCurrentSaveData() : null;
    const memories = save?.memories || { short: [], long: [], core: [] };
    
    const allMemories = [
        ...memories.short.map(m => ({ ...m, type: 'short' })),
        ...memories.long.map(m => ({ ...m, type: 'long' })),
        ...memories.core.map(m => ({ ...m, type: 'core' }))
    ];
    
    allMemoriesCache = allMemories;
    
    updateMemoryStats({
        short: memories.short?.length || 0,
        long: memories.long?.length || 0,
        core: memories.core?.length || 0,
        total: allMemories.length
    });
    
    const filtered = filterAndSortMemories(allMemories);
    renderMemoriesList(filtered);
}

// 更新记忆统计
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

// 更新时间线存档状态
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

// 筛选和排序记忆
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
            case 'time-desc': return new Date(b.timestamp) - new Date(a.timestamp);
            case 'time-asc': return new Date(a.timestamp) - new Date(b.timestamp);
            case 'importance': return (b.importance || 50) - (a.importance || 50);
            default: return 0;
        }
    });
    
    return result;
}

// 渲染记忆列表
function renderMemoriesList(memories) {
    const container = document.getElementById('memoriesList');
    if (!container) return;
    
    if (memories.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 60px 20px;">
                <div style="font-size: 48px; margin-bottom: 16px;">🧠</div>
                <div style="color: var(--text-secondary); font-size: 16px;">暂无符合条件的记忆</div>
            </div>
        `;
        return;
    }
    
    const typeColors = { short: '#4a9eff', long: '#9b59b6', core: '#e74c3c' };
    const typeLabels = { short: '短期', long: '长期', core: '核心' };
    
    container.innerHTML = memories.map(mem => `
        <div class="memory-item" style="padding: 16px; background: rgba(0,0,0,0.2); border-radius: 10px; margin-bottom: 12px; border-left: 4px solid ${typeColors[mem.type] || '#888'};">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="padding: 3px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; background: ${typeColors[mem.type]}20; color: ${typeColors[mem.type]};">${typeLabels[mem.type]}</span>
                    ${(mem.importance || 50) >= 80 ? '<span style="color: #e74c3c; font-size: 12px;">🔥 重要</span>' : ''}
                </div>
                <button class="btn btn-sm btn-danger" onclick="deleteMemory('${mem._id || mem.id}')">🗑️</button>
            </div>
            <p style="margin: 0 0 10px 0;">${escapeHtml(mem.content || '')}</p>
            <div style="font-size: 12px; color: var(--text-secondary);">
                ${new Date(mem.timestamp).toLocaleString('zh-CN')}
            </div>
        </div>
    `).join('');
}

// 筛选记忆
function filterMemories(type) {
    memoryFilterState.type = type;
    
    document.querySelectorAll('.memory-filter-btn').forEach(btn => {
        btn.classList.remove('btn-primary', 'active');
        btn.classList.add('btn-secondary');
        if (btn.dataset.filter === type) {
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-primary', 'active');
        }
    });
    
    const filtered = filterAndSortMemories(allMemoriesCache);
    renderMemoriesList(filtered);
}

// 搜索记忆
function searchMemories() {
    const input = document.getElementById('memorySearchInput');
    memoryFilterState.search = input?.value || '';
    const filtered = filterAndSortMemories(allMemoriesCache);
    renderMemoriesList(filtered);
}

// 排序记忆
function sortMemories() {
    const select = document.getElementById('memorySortBy');
    memoryFilterState.sortBy = select?.value || 'time-desc';
    const filtered = filterAndSortMemories(allMemoriesCache);
    renderMemoriesList(filtered);
}

// 固化时间线
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
        }
    }
    
    showToast('固化功能需要后端支持', 'warning');
}

// 清空记忆
async function clearMemories() {
    const keepCore = confirm('保留核心记忆？\n点击「确定」保留核心记忆，点击「取消」清空所有记忆。');
    
    if (!confirm(`确定要清空${keepCore ? '短期和长期' : '所有'}记忆吗？`)) return;
    
    if (memoryService) {
        try {
            const result = await memoryService.clearMemories(keepCore);
            showToast(`已清空 ${result.deletedCount || 0} 条记忆`, 'success');
            loadMemories();
            return;
        } catch (error) {
            console.error('[Memory] Clear failed:', error);
        }
    }
    
    showToast('清空功能需要后端支持', 'warning');
}

// 导出所有记忆
async function exportAllMemories() {
    let data;
    
    if (memoryService) {
        try {
            data = await memoryService.exportMemories();
        } catch (error) {
            console.error('[Memory] Export failed:', error);
        }
    }
    
    if (!data) {
        const save = typeof getCurrentSaveData === 'function' ? getCurrentSaveData() : null;
        const memories = save?.memories || { short: [], long: [], core: [] };
        const allMemories = [
            ...memories.short.map(m => ({ ...m, type: 'short' })),
            ...memories.long.map(m => ({ ...m, type: 'long' })),
            ...memories.core.map(m => ({ ...m, type: 'core' }))
        ];
        data = { version: '1.0', gameId, exportedAt: new Date().toISOString(), memories: allMemories };
    }
    
    downloadJSON(data, `memories-export-${gameId || 'backup'}-${Date.now()}.json`);
    showToast('记忆已导出', 'success');
}

// 导出到全局
if (typeof window !== 'undefined') {
    window.initMemoryService = initMemoryService;
    window.loadMemories = loadMemories;
    window.loadMemoriesFromLocal = loadMemoriesFromLocal;
    window.filterMemories = filterMemories;
    window.searchMemories = searchMemories;
    window.sortMemories = sortMemories;
    window.solidifyTimeline = solidifyTimeline;
    window.clearMemories = clearMemories;
    window.exportAllMemories = exportAllMemories;
}
