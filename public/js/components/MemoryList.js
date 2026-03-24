/**
 * 记忆列表组件 - 显示角色记忆/经历
 * @module Components/MemoryList
 * @description 展示角色记忆、经历档案，支持分页和筛选
 */

/**
 * 记忆类型配置
 * @constant {Object}
 */
const MEMORY_TYPES = {
    SHORT: { label: '短期记忆', color: '#64b5f6', icon: '📝' },
    LONG: { label: '长期记忆', color: '#81c784', icon: '📚' },
    CORE: { label: '核心记忆', color: '#ffb74d', icon: '💎' },
    EXPERIENCE: { label: '经历', color: '#ba68c8', icon: '⭐' }
};

/**
 * 记忆列表组件
 * @class MemoryList
 */
class MemoryList {
    /**
     * @param {Object} options - 配置选项
     */
    constructor(options = {}) {
        this.options = {
            container: null,
            memories: [],
            type: 'all', // all, short, long, core, experience
            showFilters: true,
            showPagination: true,
            pageSize: 10,
            onMemoryClick: null,
            onPageChange: null,
            ...options
        };
        
        this.currentPage = 1;
        this.filteredMemories = [...this.options.memories];
        this.element = null;
        
        if (this.options.container) {
            this.render(this.options.container);
        }
    }
    
    /**
     * 设置数据
     * @param {Array} memories - 记忆数据
     */
    setData(memories) {
        this.options.memories = memories;
        this.filterAndRender();
    }
    
    /**
     * 添加记忆
     * @param {Object} memory - 单条记忆
     */
    addMemory(memory) {
        this.options.memories.unshift(memory);
        this.filterAndRender();
    }
    
    /**
     * 筛选并渲染
     * @private
     */
    filterAndRender() {
        const { type, memories } = this.options;
        
        if (type === 'all') {
            this.filteredMemories = memories;
        } else {
            this.filteredMemories = memories.filter(m => 
                m.type?.toLowerCase() === type.toLowerCase()
            );
        }
        
        this.currentPage = 1;
        this.render(this.element?.parentElement);
    }
    
    /**
     * 渲染组件
     * @param {HTMLElement} container - 容器元素
     * @returns {HTMLElement}
     */
    render(container) {
        if (container) {
            this.options.container = container;
        }
        
        const wrapper = DOM.create('div', {
            className: 'memory-list-wrapper',
            style: 'background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px;'
        });
        
        // 筛选器
        if (this.options.showFilters) {
            wrapper.appendChild(this.renderFilters());
        }
        
        // 记忆列表
        const listContainer = DOM.create('div', {
            className: 'memory-list',
            style: 'min-height: 200px;'
        });
        
        const paginated = Data.paginate(
            this.filteredMemories, 
            this.currentPage, 
            this.options.pageSize
        );
        
        if (paginated.data.length === 0) {
            listContainer.appendChild(this.renderEmpty());
        } else {
            paginated.data.forEach(memory => {
                listContainer.appendChild(this.renderMemoryItem(memory));
            });
        }
        
        wrapper.appendChild(listContainer);
        
        // 分页
        if (this.options.showPagination && paginated.totalPages > 1) {
            wrapper.appendChild(this.renderPagination(paginated));
        }
        
        // 替换或添加
        if (this.element) {
            this.element.replaceWith(wrapper);
        } else if (this.options.container) {
            this.options.container.appendChild(wrapper);
        }
        
        this.element = wrapper;
        return wrapper;
    }
    
    /**
     * 渲染筛选器
     * @private
     * @returns {HTMLElement}
     */
    renderFilters() {
        const filterBar = DOM.create('div', {
            style: '
                display: flex;
                gap: 8px;
                margin-bottom: 16px;
                flex-wrap: wrap;
            '
        });
        
        const filters = [
            { key: 'all', label: '全部' },
            { key: 'short', label: '短期记忆' },
            { key: 'long', label: '长期记忆' },
            { key: 'core', label: '核心记忆' },
            { key: 'experience', label: '经历' }
        ];
        
        filters.forEach(filter => {
            const btn = DOM.create('button', {
                className: `filter-btn ${this.options.type === filter.key ? 'active' : ''}`,
                style: `
                    padding: 6px 14px;
                    border: none;
                    border-radius: 16px;
                    font-size: 13px;
                    cursor: pointer;
                    transition: all 0.2s;
                    background: ${this.options.type === filter.key ? 
                        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 
                        'rgba(255,255,255,0.1)'
                    };
                    color: ${this.options.type === filter.key ? '#fff' : '#8b92b9'};
                `,
                onclick: () => {
                    this.options.type = filter.key;
                    this.filterAndRender();
                }
            }, filter.label);
            filterBar.appendChild(btn);
        });
        
        return filterBar;
    }
    
    /**
     * 渲染单条记忆
     * @private
     * @param {Object} memory - 记忆数据
     * @returns {HTMLElement}
     */
    renderMemoryItem(memory) {
        const typeKey = (memory.type || 'SHORT').toUpperCase();
        const typeConfig = MEMORY_TYPES[typeKey] || MEMORY_TYPES.SHORT;
        
        const item = DOM.create('div', {
            className: 'memory-item',
            style: `
                padding: 14px;
                margin-bottom: 10px;
                background: rgba(0,0,0,0.2);
                border-radius: 10px;
                border-left: 3px solid ${typeConfig.color};
                cursor: ${this.options.onMemoryClick ? 'pointer' : 'default'};
                transition: all 0.2s;
            `
        });
        
        if (this.options.onMemoryClick) {
            item.addEventListener('click', () => this.options.onMemoryClick(memory));
            item.addEventListener('mouseenter', () => {
                item.style.background = 'rgba(255,255,255,0.08)';
                item.style.transform = 'translateX(4px)';
            });
            item.addEventListener('mouseleave', () => {
                item.style.background = '';
                item.style.transform = '';
            });
        }
        
        // 头部
        const header = DOM.create('div', {
            style: '
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            '
        });
        
        const typeBadge = DOM.create('span', {
            style: `
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 3px 8px;
                background: ${typeConfig.color}20;
                color: ${typeConfig.color};
                font-size: 11px;
                border-radius: 10px;
            `
        }, `${typeConfig.icon} ${typeConfig.label}`);
        header.appendChild(typeBadge);
        
        if (memory.createdAt || memory.timestamp) {
            const date = DOM.create('span', {
                style: 'font-size: 11px; color: #666;'
            }, Format.date(memory.createdAt || memory.timestamp, 'MM-DD'));
            header.appendChild(date);
        }
        
        item.appendChild(header);
        
        // 内容
        const content = DOM.create('div', {
            style: '
                font-size: 14px;
                color: #e0e0e0;
                line-height: 1.6;
                margin-bottom: 8px;
            '
        });
        
        if (memory.content) {
            content.textContent = Format.truncate(memory.content, 150);
        } else if (memory.description) {
            content.textContent = Format.truncate(memory.description, 150);
        }
        item.appendChild(content);
        
        // 元信息
        const meta = DOM.create('div', {
            style: '
                display: flex;
                gap: 12px;
                font-size: 12px;
                color: #888;
            '
        });
        
        if (memory.importance !== undefined) {
            const importance = DOM.create('span', {}, 
                `重要性: ${'★'.repeat(memory.importance)}${'☆'.repeat(5 - memory.importance)}`
            );
            meta.appendChild(importance);
        }
        
        if (memory.source) {
            meta.appendChild(DOM.create('span', {}, `来源: ${memory.source}`));
        }
        
        if (meta.children.length > 0) {
            item.appendChild(meta);
        }
        
        // 标签（经历类型）
        if (memory.tags && memory.tags.length > 0) {
            const tags = DOM.create('div', {
                style: 'margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px;'
            });
            
            memory.tags.forEach(tag => {
                tags.appendChild(DOM.create('span', {
                    style: `
                        padding: 2px 8px;
                        background: rgba(102, 126, 234, 0.2);
                        color: #a29bfe;
                        font-size: 11px;
                        border-radius: 4px;
                    `
                }, tag));
            });
            
            item.appendChild(tags);
        }
        
        return item;
    }
    
    /**
     * 渲染空状态
     * @private
     * @returns {HTMLElement}
     */
    renderEmpty() {
        return DOM.create('div', {
            style: '
                text-align: center;
                padding: 48px 24px;
                color: #666;
            '
        }, DOM.create('div', null, `
            <div style="font-size: 48px; margin-bottom: 16px;">📝</div>
            <div style="font-size: 14px;">暂无记忆记录</div>
        `));
    }
    
    /**
     * 渲染分页
     * @private
     * @param {Object} pagination - 分页数据
     * @returns {HTMLElement}
     */
    renderPagination(pagination) {
        const { page, totalPages } = pagination;
        
        const container = DOM.create('div', {
            style: '
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 8px;
                margin-top: 16px;
                padding-top: 16px;
                border-top: 1px solid rgba(255,255,255,0.1);
            '
        });
        
        // 上一页
        const prevBtn = DOM.create('button', {
            disabled: page <= 1,
            style: `
                padding: 6px 12px;
                border: none;
                border-radius: 6px;
                background: ${page <= 1 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)'};
                color: ${page <= 1 ? '#666' : '#fff'};
                cursor: ${page <= 1 ? 'not-allowed' : 'pointer'};
                font-size: 13px;
            `,
            onclick: () => this.goToPage(page - 1)
        }, '上一页');
        container.appendChild(prevBtn);
        
        // 页码
        const pageInfo = DOM.create('span', {
            style: 'font-size: 13px; color: #8b92b9; padding: 0 12px;'
        }, `${page} / ${totalPages}`);
        container.appendChild(pageInfo);
        
        // 下一页
        const nextBtn = DOM.create('button', {
            disabled: page >= totalPages,
            style: `
                padding: 6px 12px;
                border: none;
                border-radius: 6px;
                background: ${page >= totalPages ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)'};
                color: ${page >= totalPages ? '#666' : '#fff'};
                cursor: ${page >= totalPages ? 'not-allowed' : 'pointer'};
                font-size: 13px;
            `,
            onclick: () => this.goToPage(page + 1)
        }, '下一页');
        container.appendChild(nextBtn);
        
        return container;
    }
    
    /**
     * 跳转到指定页
     * @param {number} page - 页码
     */
    goToPage(page) {
        this.currentPage = page;
        if (this.options.onPageChange) {
            this.options.onPageChange(page);
        }
        this.render();
    }
    
    /**
     * 销毁组件
     */
    destroy() {
        this.element?.remove();
        this.element = null;
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MemoryList, MEMORY_TYPES };
}
