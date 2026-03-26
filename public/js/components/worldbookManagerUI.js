/**
 * 世界书管理器 UI 组件
 * SillyTavern 风格的多书本管理界面
 * 
 * 功能：
 * - 世界书列表（激活/停用、编辑、删除）
 * - 世界书切换选择
 * - 条目列表（当前选中书）
 * - 导入/导出功能
 * 
 * @author 大荒九丘
 * @version 2.0
 */

class WorldbookManagerUI {
    constructor(container, options = {}) {
        this.container = container;
        this.library = options.library || new WorldbookLibrary(options);
        this.onEntrySelect = options.onEntrySelect || (() => {});
        this.onBookSelect = options.onBookSelect || (() => {});
        
        this.currentView = 'books'; // 'books' | 'entries'
        this.filterState = {
            search: '',
            group: '',
            status: '' // 'active' | 'inactive' | ''
        };
        
        this.init();
    }

    init() {
        this.render();
        this.bindEvents();
    }

    // ==================== 渲染 ====================

    render() {
        const html = `
            <div class="wbm-container">
                <!-- 工具栏 -->
                <div class="wbm-toolbar">
                    <div class="wbm-toolbar-left">
                        <button class="wbm-btn wbm-btn-primary" data-action="create-book">
                            <span class="wbm-icon">+</span>
                            <span>新建世界书</span>
                        </button>
                        <button class="wbm-btn" data-action="import-book">
                            <span class="wbm-icon">↓</span>
                            <span>导入</span>
                        </button>
                    </div>
                    <div class="wbm-toolbar-right">
                        <span class="wbm-stats">${this._renderStats()}</span>
                    </div>
                </div>

                <!-- 主体区域 -->
                <div class="wbm-main">
                    <!-- 世界书列表侧边栏 -->
                    <div class="wbm-books-sidebar">
                        <div class="wbm-books-header">
                            <h3>世界书列表</h3>
                            <span class="wbm-hint">可同时激活多本</span>
                        </div>
                        <div class="wbm-books-list">
                            ${this._renderBooksList()}
                        </div>
                    </div>

                    <!-- 条目内容区 -->
                    <div class="wbm-entries-panel">
                        ${this._renderEntriesPanel()}
                    </div>
                </div>
            </div>

            <!-- 导入对话框 -->
            <dialog class="wbm-dialog" id="wbm-import-dialog">
                <div class="wbm-dialog-content">
                    <h3>导入世界书</h3>
                    <div class="wbm-import-options">
                        <label>
                            <input type="radio" name="import-format" value="native" checked>
                            <span>大荒九丘格式 (.json)</span>
                        </label>
                        <label>
                            <input type="radio" name="import-format" value="lorebook">
                            <span>SillyTavern Lorebook (.json)</span>
                        </label>
                    </div>
                    <textarea id="wbm-import-text" placeholder="粘贴世界书 JSON 数据..."></textarea>
                    <div class="wbm-dialog-actions">
                        <button class="wbm-btn" data-action="close-import">取消</button>
                        <button class="wbm-btn wbm-btn-primary" data-action="confirm-import">导入</button>
                    </div>
                </div>
            </dialog>
        `;

        this.container.innerHTML = html;
        this._applyStyles();
    }

    _renderStats() {
        const stats = this.library.getStats();
        return `共 ${stats.totalBooks} 本 / ${stats.activeBooks} 本激活 / ${stats.activeEntries} 条目`;
    }

    _renderBooksList() {
        const books = this.library.getAllBooks();
        const activeIds = this.library.activeBookIds;
        const selectedId = this.library.selectedBookId;

        if (books.length === 0) {
            return `<div class="wbm-empty">暂无世界书<br>点击上方按钮创建</div>`;
        }

        return books.map(book => {
            const isActive = activeIds.has(book.id);
            const isSelected = selectedId === book.id;
            const entryCount = book.entries.length;
            const activeEntryCount = book.getEnabledEntries().length;

            return `
                <div class="wbm-book-item ${isSelected ? 'selected' : ''} ${isActive ? 'active' : ''}" 
                     data-book-id="${book.id}">
                    <div class="wbm-book-checkbox" data-action="toggle-book" data-book-id="${book.id}">
                        <input type="checkbox" ${isActive ? 'checked' : ''}>
                    </div>
                    <div class="wbm-book-info" data-action="select-book" data-book-id="${book.id}">
                        <div class="wbm-book-name">${this._escapeHtml(book.name)}</div>
                        <div class="wbm-book-meta">
                            ${activeEntryCount}/${entryCount} 条目
                            ${book.isUserBook ? '<span class="wbm-tag-user">用户</span>' : ''}
                            ${book.isGlobal ? '<span class="wbm-tag-global">全局</span>' : ''}
                        </div>
                    </div>
                    <div class="wbm-book-actions">
                        <button class="wbm-btn-icon" data-action="export-book" data-book-id="${book.id}" title="导出">
                            ↑
                        </button>
                        <button class="wbm-btn-icon wbm-btn-danger" data-action="delete-book" data-book-id="${book.id}" title="删除">
                            ×
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    _renderEntriesPanel() {
        const book = this.library.getSelectedBook();
        
        if (!book) {
            return `<div class="wbm-empty-panel">请从左侧选择或创建一个世界书</div>`;
        }

        // 按分组组织条目
        const groups = book.getEntriesByGroup();
        const groupNames = Object.keys(groups).sort();

        return `
            <!-- 条目面板头部 -->
            <div class="wbm-entries-header">
                <div class="wbm-book-title">
                    <h2>${this._escapeHtml(book.name)}</h2>
                    <span class="wbm-book-desc">${this._escapeHtml(book.description || '')}</span>
                </div>
                <div class="wbm-entries-actions">
                    <button class="wbm-btn wbm-btn-primary" data-action="add-entry" data-book-id="${book.id}">
                        <span>+ 添加条目</span>
                    </button>
                    <button class="wbm-btn" data-action="edit-book-meta" data-book-id="${book.id}">
                        <span>编辑信息</span>
                    </button>
                </div>
            </div>

            <!-- 过滤器 -->
            <div class="wbm-entries-filter">
                <input type="text" class="wbm-search" placeholder="搜索条目..." 
                       value="${this._escapeHtml(this.filterState.search)}">
                <select class="wbm-group-filter">
                    <option value="">所有分组</option>
                    ${groupNames.map(g => `<option value="${this._escapeHtml(g)}" ${this.filterState.group === g ? 'selected' : ''}>${this._escapeHtml(g)}</option>`).join('')}
                </select>
                <select class="wbm-status-filter">
                    <option value="">所有状态</option>
                    <option value="active" ${this.filterState.status === 'active' ? 'selected' : ''}>启用</option>
                    <option value="inactive" ${this.filterState.status === 'inactive' ? 'selected' : ''}>禁用</option>
                </select>
            </div>

            <!-- 条目列表 -->
            <div class="wbm-entries-list">
                ${this._renderEntriesByGroup(book, groups)}
            </div>
        `;
    }

    _renderEntriesByGroup(book, groups) {
        let filteredGroups = groups;
        
        // 应用搜索过滤
        if (this.filterState.search) {
            const search = this.filterState.search.toLowerCase();
            filteredGroups = {};
            Object.entries(groups).forEach(([groupName, entries]) => {
                const filtered = entries.filter(e => 
                    (e.name && e.name.toLowerCase().includes(search)) ||
                    (e.content && e.content.toLowerCase().includes(search)) ||
                    (e.keys && e.keys.some(k => k.toLowerCase().includes(search)))
                );
                if (filtered.length > 0) {
                    filteredGroups[groupName] = filtered;
                }
            });
        }

        // 应用分组过滤
        if (this.filterState.group) {
            if (filteredGroups[this.filterState.group]) {
                filteredGroups = { [this.filterState.group]: filteredGroups[this.filterState.group] };
            } else {
                filteredGroups = {};
            }
        }

        // 应用状态过滤
        if (this.filterState.status) {
            const wantEnabled = this.filterState.status === 'active';
            Object.keys(filteredGroups).forEach(groupName => {
                filteredGroups[groupName] = filteredGroups[groupName].filter(
                    e => (e.enabled !== false) === wantEnabled
                );
            });
        }

        if (Object.keys(filteredGroups).length === 0) {
            return `<div class="wbm-empty">没有匹配的条目</div>`;
        }

        return Object.entries(filteredGroups).map(([groupName, entries]) => {
            const color = book.getGroupColor(groupName);
            return `
                <div class="wbm-entry-group">
                    <div class="wbm-entry-group-header" style="border-left-color: ${color}">
                        <span class="wbm-group-name" style="color: ${color}">${this._escapeHtml(groupName)}</span>
                        <span class="wbm-group-count">${entries.length}</span>
                    </div>
                    <div class="wbm-entry-group-content">
                        ${entries.map(entry => this._renderEntryCard(entry, color)).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    _renderEntryCard(entry, groupColor) {
        const isEnabled = entry.enabled !== false;
        const keyPreview = entry.keys ? entry.keys.slice(0, 3).join(', ') : '';
        const hasMoreKeys = entry.keys && entry.keys.length > 3;
        
        return `
            <div class="wbm-entry-card ${!isEnabled ? 'disabled' : ''}" data-entry-id="${entry.id}" data-book-id="${entry.bookId || ''}">
                <div class="wbm-entry-header">
                    <div class="wbm-entry-toggle">
                        <input type="checkbox" ${isEnabled ? 'checked' : ''} 
                               data-action="toggle-entry" data-entry-id="${entry.id}">
                    </div>
                    <div class="wbm-entry-title" data-action="edit-entry" data-entry-id="${entry.id}">
                        ${this._escapeHtml(entry.name || '未命名条目')}
                    </div>
                    <div class="wbm-entry-priority" title="优先级">
                        P${entry.priority || 100}
                    </div>
                    <div class="wbm-entry-actions">
                        <button class="wbm-btn-icon" data-action="edit-entry" data-entry-id="${entry.id}" title="编辑">
                            ✎
                        </button>
                        <button class="wbm-btn-icon wbm-btn-danger" data-action="delete-entry" data-entry-id="${entry.id}" title="删除">
                            ×
                        </button>
                    </div>
                </div>
                <div class="wbm-entry-preview" data-action="edit-entry" data-entry-id="${entry.id}">
                    <div class="wbm-entry-keys">
                        <span class="wbm-key-label">触发词:</span>
                        <span class="wbm-key-list">${this._escapeHtml(keyPreview)}${hasMoreKeys ? '...' : ''}</span>
                    </div>
                    <div class="wbm-entry-content-preview">
                        ${this._escapeHtml((entry.content || '').substring(0, 100))}${(entry.content || '').length > 100 ? '...' : ''}
                    </div>
                </div>
            </div>
        `;
    }

    _applyStyles() {
        // 检查是否已有样式
        if (document.getElementById('wbm-styles')) return;

        const style = document.createElement('style');
        style.id = 'wbm-styles';
        style.textContent = `
            .wbm-container {
                display: flex;
                flex-direction: column;
                height: 100%;
                font-family: inherit;
            }

            .wbm-toolbar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                border-bottom: 1px solid rgba(138, 109, 59, 0.3);
                background: rgba(0, 0, 0, 0.2);
            }

            .wbm-toolbar-left {
                display: flex;
                gap: 8px;
            }

            .wbm-btn {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 8px 16px;
                border: 1px solid rgba(138, 109, 59, 0.5);
                background: rgba(20, 20, 20, 0.8);
                color: #d4c4a8;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s;
            }

            .wbm-btn:hover {
                background: rgba(138, 109, 59, 0.3);
                border-color: #8a6d3b;
            }

            .wbm-btn-primary {
                background: linear-gradient(135deg, #8a6d3b 0%, #6b5637 100%);
                border-color: #8a6d3b;
                color: #fff;
            }

            .wbm-btn-primary:hover {
                background: linear-gradient(135deg, #9a7d4b 0%, #7b6647 100%);
            }

            .wbm-btn-icon {
                width: 28px;
                height: 28px;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                background: transparent;
                border: 1px solid rgba(138, 109, 59, 0.3);
                color: #d4c4a8;
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
                line-height: 1;
            }

            .wbm-btn-icon:hover {
                background: rgba(138, 109, 59, 0.2);
                border-color: #8a6d3b;
            }

            .wbm-btn-danger:hover {
                background: rgba(220, 53, 69, 0.3);
                border-color: #dc3545;
                color: #ff6b6b;
            }

            .wbm-stats {
                font-size: 12px;
                color: rgba(212, 196, 168, 0.7);
            }

            .wbm-main {
                display: flex;
                flex: 1;
                overflow: hidden;
            }

            .wbm-books-sidebar {
                width: 280px;
                min-width: 280px;
                border-right: 1px solid rgba(138, 109, 59, 0.3);
                background: rgba(0, 0, 0, 0.15);
                display: flex;
                flex-direction: column;
            }

            .wbm-books-header {
                padding: 16px;
                border-bottom: 1px solid rgba(138, 109, 59, 0.2);
            }

            .wbm-books-header h3 {
                margin: 0 0 4px 0;
                font-size: 16px;
                color: #d4c4a8;
            }

            .wbm-hint {
                font-size: 11px;
                color: rgba(212, 196, 168, 0.5);
            }

            .wbm-books-list {
                flex: 1;
                overflow-y: auto;
                padding: 8px;
            }

            .wbm-book-item {
                display: flex;
                align-items: center;
                padding: 10px 12px;
                margin-bottom: 4px;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                border: 1px solid transparent;
            }

            .wbm-book-item:hover {
                background: rgba(138, 109, 59, 0.15);
            }

            .wbm-book-item.selected {
                background: rgba(138, 109, 59, 0.25);
                border-color: rgba(138, 109, 59, 0.5);
            }

            .wbm-book-item.active::before {
                content: '';
                position: absolute;
                left: 0;
                top: 50%;
                transform: translateY(-50%);
                width: 3px;
                height: 60%;
                background: #8a6d3b;
                border-radius: 0 2px 2px 0;
            }

            .wbm-book-checkbox {
                margin-right: 10px;
            }

            .wbm-book-checkbox input {
                width: 18px;
                height: 18px;
                cursor: pointer;
                accent-color: #8a6d3b;
            }

            .wbm-book-info {
                flex: 1;
                min-width: 0;
            }

            .wbm-book-name {
                font-size: 14px;
                font-weight: 500;
                color: #d4c4a8;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .wbm-book-meta {
                font-size: 11px;
                color: rgba(212, 196, 168, 0.6);
                margin-top: 2px;
            }

            .wbm-tag-user, .wbm-tag-global {
                display: inline-block;
                padding: 1px 6px;
                border-radius: 3px;
                font-size: 10px;
                margin-left: 4px;
            }

            .wbm-tag-user {
                background: rgba(100, 149, 237, 0.3);
                color: #6495ed;
            }

            .wbm-tag-global {
                background: rgba(60, 179, 113, 0.3);
                color: #3cb371;
            }

            .wbm-book-actions {
                display: flex;
                gap: 4px;
                opacity: 0;
                transition: opacity 0.2s;
            }

            .wbm-book-item:hover .wbm-book-actions {
                opacity: 1;
            }

            .wbm-entries-panel {
                flex: 1;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }

            .wbm-empty, .wbm-empty-panel {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: rgba(212, 196, 168, 0.5);
                font-size: 14px;
                text-align: center;
                padding: 20px;
            }

            .wbm-entries-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                padding: 16px 20px;
                border-bottom: 1px solid rgba(138, 109, 59, 0.2);
            }

            .wbm-book-title h2 {
                margin: 0 0 4px 0;
                font-size: 20px;
                color: #d4c4a8;
            }

            .wbm-book-desc {
                font-size: 13px;
                color: rgba(212, 196, 168, 0.6);
            }

            .wbm-entries-actions {
                display: flex;
                gap: 8px;
            }

            .wbm-entries-filter {
                display: flex;
                gap: 12px;
                padding: 12px 20px;
                border-bottom: 1px solid rgba(138, 109, 59, 0.15);
            }

            .wbm-search, .wbm-group-filter, .wbm-status-filter {
                padding: 8px 12px;
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(138, 109, 59, 0.3);
                border-radius: 6px;
                color: #d4c4a8;
                font-size: 13px;
            }

            .wbm-search {
                flex: 1;
                min-width: 150px;
            }

            .wbm-search::placeholder {
                color: rgba(212, 196, 168, 0.4);
            }

            .wbm-group-filter, .wbm-status-filter {
                min-width: 120px;
            }

            .wbm-entries-list {
                flex: 1;
                overflow-y: auto;
                padding: 16px 20px;
            }

            .wbm-entry-group {
                margin-bottom: 20px;
            }

            .wbm-entry-group-header {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                margin-bottom: 10px;
                border-left: 3px solid;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 0 8px 8px 0;
            }

            .wbm-group-name {
                font-weight: 600;
                font-size: 14px;
            }

            .wbm-group-count {
                font-size: 11px;
                padding: 2px 8px;
                background: rgba(0, 0, 0, 0.3);
                border-radius: 10px;
                color: rgba(212, 196, 168, 0.7);
            }

            .wbm-entry-card {
                background: rgba(20, 20, 20, 0.5);
                border: 1px solid rgba(138, 109, 59, 0.2);
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 8px;
                transition: all 0.2s;
                cursor: pointer;
            }

            .wbm-entry-card:hover {
                border-color: rgba(138, 109, 59, 0.4);
                background: rgba(30, 30, 30, 0.6);
            }

            .wbm-entry-card.disabled {
                opacity: 0.5;
            }

            .wbm-entry-header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 8px;
            }

            .wbm-entry-toggle input {
                width: 16px;
                height: 16px;
                cursor: pointer;
                accent-color: #8a6d3b;
            }

            .wbm-entry-title {
                flex: 1;
                font-weight: 500;
                color: #d4c4a8;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .wbm-entry-priority {
                font-size: 11px;
                padding: 2px 8px;
                background: rgba(138, 109, 59, 0.3);
                border-radius: 4px;
                color: #d4c4a8;
            }

            .wbm-entry-actions {
                display: flex;
                gap: 4px;
                opacity: 0;
                transition: opacity 0.2s;
            }

            .wbm-entry-card:hover .wbm-entry-actions {
                opacity: 1;
            }

            .wbm-entry-preview {
                padding-left: 26px;
            }

            .wbm-entry-keys {
                font-size: 12px;
                margin-bottom: 6px;
            }

            .wbm-key-label {
                color: rgba(212, 196, 168, 0.5);
                margin-right: 6px;
            }

            .wbm-key-list {
                color: #8a6d3b;
                font-family: monospace;
            }

            .wbm-entry-content-preview {
                font-size: 12px;
                color: rgba(212, 196, 168, 0.7);
                line-height: 1.5;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }

            /* 对话框样式 */
            .wbm-dialog {
                background: rgba(20, 20, 20, 0.95);
                border: 1px solid rgba(138, 109, 59, 0.5);
                border-radius: 12px;
                padding: 0;
                max-width: 500px;
                width: 90%;
                color: #d4c4a8;
            }

            .wbm-dialog::backdrop {
                background: rgba(0, 0, 0, 0.7);
            }

            .wbm-dialog-content {
                padding: 24px;
            }

            .wbm-dialog-content h3 {
                margin: 0 0 16px 0;
                font-size: 18px;
            }

            .wbm-import-options {
                margin-bottom: 16px;
            }

            .wbm-import-options label {
                display: block;
                padding: 8px 0;
                cursor: pointer;
            }

            .wbm-import-options input {
                margin-right: 8px;
            }

            #wbm-import-text {
                width: 100%;
                height: 150px;
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(138, 109, 59, 0.3);
                border-radius: 6px;
                padding: 12px;
                color: #d4c4a8;
                font-family: monospace;
                font-size: 13px;
                resize: vertical;
                box-sizing: border-box;
            }

            .wbm-dialog-actions {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-top: 16px;
            }
        `;
        document.head.appendChild(style);
    }

    // ==================== 事件绑定 ====================

    bindEvents() {
        // 工具栏按钮
        this.container.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const bookId = btn.dataset.bookId;
                const entryId = btn.dataset.entryId;
                this._handleAction(action, bookId, entryId);
            });
        });

        // 过滤器
        const search = this.container.querySelector('.wbm-search');
        const groupFilter = this.container.querySelector('.wbm-group-filter');
        const statusFilter = this.container.querySelector('.wbm-status-filter');

        if (search) {
            search.addEventListener('input', (e) => {
                this.filterState.search = e.target.value;
                this.refresh();
            });
        }

        if (groupFilter) {
            groupFilter.addEventListener('change', (e) => {
                this.filterState.group = e.target.value;
                this.refresh();
            });
        }

        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filterState.status = e.target.value;
                this.refresh();
            });
        }
    }

    _handleAction(action, bookId, entryId) {
        switch (action) {
            case 'create-book':
                this._createNewBook();
                break;
            case 'import-book':
                this._showImportDialog();
                break;
            case 'close-import':
                document.getElementById('wbm-import-dialog').close();
                break;
            case 'confirm-import':
                this._handleImport();
                break;
            case 'toggle-book':
                this._toggleBook(bookId);
                break;
            case 'select-book':
                this._selectBook(bookId);
                break;
            case 'export-book':
                this._exportBook(bookId);
                break;
            case 'delete-book':
                this._deleteBook(bookId);
                break;
            case 'add-entry':
                this._addEntry(bookId);
                break;
            case 'edit-entry':
                this._editEntry(entryId);
                break;
            case 'delete-entry':
                this._deleteEntry(entryId);
                break;
            case 'toggle-entry':
                this._toggleEntry(entryId);
                break;
            case 'edit-book-meta':
                this._editBookMeta(bookId);
                break;
        }
    }

    // ==================== 操作方法 ====================

    _createNewBook() {
        const name = prompt('请输入世界书名称:', '新建世界书');
        if (!name) return;

        const book = this.library.createBook({ name });
        this.library.selectBook(book.id);
        this.onBookSelect(book);
        this.refresh();
    }

    _showImportDialog() {
        document.getElementById('wbm-import-dialog').showModal();
    }

    _handleImport() {
        const text = document.getElementById('wbm-import-text').value.trim();
        if (!text) return;

        try {
            const format = document.querySelector('input[name="import-format"]:checked').value;
            const data = JSON.parse(text);
            const book = this.library.importBook(data, format, { isUserBook: true });
            
            document.getElementById('wbm-import-dialog').close();
            document.getElementById('wbm-import-text').value = '';
            
            this.library.selectBook(book.id);
            this.refresh();
            alert('导入成功！');
        } catch (e) {
            alert('导入失败: ' + e.message);
        }
    }

    _toggleBook(bookId) {
        this.library.toggleBook(bookId);
        this.refresh();
    }

    _selectBook(bookId) {
        this.library.selectBook(bookId);
        this.onBookSelect(this.library.getBook(bookId));
        this.refresh();
    }

    _exportBook(bookId) {
        const data = this.library.exportBook(bookId);
        if (data) {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `worldbook_${data.name || 'export'}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }
    }

    _deleteBook(bookId) {
        const book = this.library.getBook(bookId);
        if (!book) return;

        if (confirm(`确定要删除世界书 "${book.name}" 吗？\n这将同时删除其中的 ${book.entries.length} 个条目，此操作不可恢复。`)) {
            this.library.deleteBook(bookId);
            this.refresh();
        }
    }

    _addEntry(bookId) {
        const book = this.library.getBook(bookId);
        if (book) {
            const entry = book.addEntry({
                name: '新条目',
                keys: [],
                content: '',
                group: '默认分组'
            });
            this.library._saveToStorage();
            this.refresh();
            this.onEntrySelect(entry);
        }
    }

    _editEntry(entryId) {
        const book = this.library.getSelectedBook();
        if (book) {
            const entry = book.entries.find(e => e.id === entryId);
            if (entry) {
                this.onEntrySelect(entry);
            }
        }
    }

    _deleteEntry(entryId) {
        const book = this.library.getSelectedBook();
        if (book && confirm('确定要删除这个条目吗？')) {
            book.deleteEntry(entryId);
            this.library._saveToStorage();
            this.refresh();
        }
    }

    _toggleEntry(entryId) {
        const book = this.library.getSelectedBook();
        if (book) {
            const entry = book.entries.find(e => e.id === entryId);
            if (entry) {
                entry.enabled = entry.enabled === false;
                this.library._saveToStorage();
                this.refresh();
            }
        }
    }

    _editBookMeta(bookId) {
        const book = this.library.getBook(bookId);
        if (!book) return;

        const newName = prompt('世界书名称:', book.name);
        if (newName === null) return;

        const newDesc = prompt('世界书描述:', book.description || '');
        if (newDesc === null) return;

        this.library.updateBook(bookId, {
            name: newName,
            description: newDesc
        });
        this.refresh();
    }

    // ==================== 工具方法 ====================

    _escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    refresh() {
        // 只重新渲染内容，不重新创建整个结构
        const booksList = this.container.querySelector('.wbm-books-list');
        const entriesPanel = this.container.querySelector('.wbm-entries-panel');
        const stats = this.container.querySelector('.wbm-stats');

        if (booksList) booksList.innerHTML = this._renderBooksList();
        if (entriesPanel) entriesPanel.innerHTML = this._renderEntriesPanel();
        if (stats) stats.textContent = this._renderStats();

        this.bindEvents();
    }

    // ==================== 公共 API ====================

    /**
     * 获取当前库实例
     */
    getLibrary() {
        return this.library;
    }

    /**
     * 获取选中的书本
     */
    getSelectedBook() {
        return this.library.getSelectedBook();
    }

    /**
     * 保存条目编辑
     */
    saveEntryEdit(entryId, updates) {
        const book = this.library.getSelectedBook();
        if (book) {
            book.updateEntry(entryId, updates);
            this.library._saveToStorage();
            this.refresh();
        }
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WorldbookManagerUI };
}

// 浏览器全局暴露
if (typeof window !== 'undefined') {
    window.WorldbookManagerUI = WorldbookManagerUI;
}
