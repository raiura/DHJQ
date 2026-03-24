/**
 * 角色卡片组件 - 显示角色信息
 * @module Components/CharacterCard
 * @description 可复用的角色展示卡片，支持好感度显示和交互
 */

/**
 * 好感度等级配置
 * @constant {Array}
 */
const FAVOR_LEVELS = [
    { min: 0, max: 20, name: '敌对', color: '#616161', className: 'favor-hostile' },
    { min: 20, max: 40, name: '冷淡', color: '#9e9e9e', className: 'favor-cold' },
    { min: 40, max: 60, name: '中立', color: '#ffb347', className: 'favor-neutral' },
    { min: 60, max: 80, name: '友好', color: '#ff6b9d', className: 'favor-friendly' },
    { min: 80, max: 100, name: '亲密', color: '#ff1744', className: 'favor-love' }
];

/**
 * 角色卡片组件
 * @class CharacterCard
 */
class CharacterCard {
    /**
     * @param {Object} character - 角色数据
     * @param {Object} [options={}] - 配置选项
     */
    constructor(character, options = {}) {
        this.character = character;
        this.options = {
            showFavor: true,
            showTrust: true,
            showStats: false,
            clickable: true,
            size: 'medium', // small, medium, large
            onClick: null,
            onEnter: null,
            ...options
        };
        
        this.element = null;
        this.render();
    }
    
    /**
     * 获取好感度等级
     * @param {number} favor - 好感度值
     * @returns {Object} 等级配置
     */
    static getFavorLevel(favor) {
        return FAVOR_LEVELS.find(l => favor >= l.min && favor < l.max) || FAVOR_LEVELS[0];
    }
    
    /**
     * 渲染卡片
     * @returns {HTMLElement}
     */
    render() {
        const { character, options } = this;
        const favor = character.favor ?? 50;
        const trust = character.trust ?? 50;
        const favorLevel = CharacterCard.getFavorLevel(favor);
        
        const card = DOM.create('div', {
            className: `character-card character-card-${options.size}`,
            'data-character-id': character._id || character.id
        });
        
        // 尺寸样式
        const sizeStyles = {
            small: { width: '120px', imageSize: '80px' },
            medium: { width: '160px', imageSize: '120px' },
            large: { width: '200px', imageSize: '160px' }
        };
        const size = sizeStyles[options.size] || sizeStyles.medium;
        
        card.style.cssText = `
            width: ${size.width};
            background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
            border-radius: 12px;
            overflow: hidden;
            cursor: ${options.clickable ? 'pointer' : 'default'};
            transition: transform 0.2s, box-shadow 0.2s;
            position: relative;
        `;
        
        // 悬停效果
        if (options.clickable) {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-4px)';
                card.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.3)';
                if (options.onEnter) options.onEnter(character);
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
                card.style.boxShadow = '';
            });
            card.addEventListener('click', () => {
                if (options.onClick) options.onClick(character);
            });
        }
        
        // 图片区域
        const imageContainer = DOM.create('div', {
            style: `
                width: 100%;
                height: ${size.imageSize};
                position: relative;
                overflow: hidden;
            `
        });
        
        const img = DOM.create('img', {
            src: character.image || '/assets/default-avatar.png',
            alt: character.name,
            style: `
                width: 100%;
                height: 100%;
                object-fit: cover;
                transition: transform 0.3s;
            `,
            onerror: `this.src='/assets/default-avatar.png'`
        });
        
        // 图片悬停放大
        card.addEventListener('mouseenter', () => {
            img.style.transform = 'scale(1.05)';
        });
        card.addEventListener('mouseleave', () => {
            img.style.transform = '';
        });
        
        imageContainer.appendChild(img);
        
        // 好感度徽章
        if (options.showFavor) {
            const badge = DOM.create('div', {
                style: `
                    position: absolute;
                    bottom: 8px;
                    right: 8px;
                    padding: 4px 8px;
                    background: ${favorLevel.color};
                    color: white;
                    font-size: 11px;
                    border-radius: 10px;
                    font-weight: 500;
                `
            }, favorLevel.name);
            imageContainer.appendChild(badge);
        }
        
        card.appendChild(imageContainer);
        
        // 信息区域
        const info = DOM.create('div', {
            style: 'padding: 12px;'
        });
        
        // 名字
        const name = DOM.create('div', {
            style: `
                font-size: ${options.size === 'small' ? '13px' : '15px'};
                font-weight: 600;
                color: #fff;
                margin-bottom: 8px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            `
        }, DOM.escape(character.name));
        info.appendChild(name);
        
        // 好感度条
        if (options.showFavor) {
            info.appendChild(this.createProgressBar('好感', favor, favorLevel.color));
        }
        
        // 信任度条
        if (options.showTrust) {
            info.appendChild(this.createProgressBar('信任', trust, '#4CAF50'));
        }
        
        // 统计数据
        if (options.showStats && character.stats) {
            const stats = DOM.create('div', {
                style: `
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 8px;
                    margin-top: 10px;
                    padding-top: 10px;
                    border-top: 1px solid rgba(255,255,255,0.1);
                `
            });
            
            const statItems = [
                { label: '对话', value: character.stats.dialogueTurns || 0 },
                { label: '相遇', value: character.stats.encounters || 0 }
            ];
            
            statItems.forEach(stat => {
                const item = DOM.create('div', {
                    style: 'text-align: center;'
                });
                item.appendChild(DOM.create('div', {
                    style: 'font-size: 12px; color: #8b92b9;'
                }, stat.label));
                item.appendChild(DOM.create('div', {
                    style: 'font-size: 14px; color: #fff; font-weight: 500;'
                }, stat.value.toString()));
                stats.appendChild(item);
            });
            
            info.appendChild(stats);
        }
        
        card.appendChild(info);
        
        // 心情标签（如果有）
        if (character.stats?.mood) {
            const moodTag = DOM.create('div', {
                style: `
                    position: absolute;
                    top: 8px;
                    left: 8px;
                    padding: 3px 8px;
                    background: rgba(0,0,0,0.6);
                    backdrop-filter: blur(4px);
                    border-radius: 10px;
                    font-size: 11px;
                    color: #ffb347;
                `
            }, character.stats.mood);
            card.appendChild(moodTag);
        }
        
        this.element = card;
        return card;
    }
    
    /**
     * 创建进度条
     * @private
     * @param {string} label - 标签
     * @param {number} value - 当前值
     * @param {string} color - 颜色
     * @returns {HTMLElement}
     */
    createProgressBar(label, value, color) {
        const container = DOM.create('div', {
            style: 'margin-bottom: 8px;'
        });
        
        const header = DOM.create('div', {
            style: 'display: flex; justify-content: space-between; margin-bottom: 4px;'
        });
        header.appendChild(DOM.create('span', {
            style: 'font-size: 11px; color: #8b92b9;'
        }, label));
        header.appendChild(DOM.create('span', {
            style: 'font-size: 11px; color: #fff;'
        }, `${Math.round(value)}`));
        container.appendChild(header);
        
        const barBg = DOM.create('div', {
            style: `
                height: 4px;
                background: rgba(255,255,255,0.1);
                border-radius: 2px;
                overflow: hidden;
            `
        });
        
        const barFill = DOM.create('div', {
            style: `
                height: 100%;
                width: ${value}%;
                background: ${color};
                border-radius: 2px;
                transition: width 0.3s ease;
            `
        });
        barBg.appendChild(barFill);
        container.appendChild(barBg);
        
        return container;
    }
    
    /**
     * 更新好感度
     * @param {number} newFavor - 新好感度值
     */
    updateFavor(newFavor) {
        this.character.favor = newFavor;
        // 重新渲染或局部更新
        const newElement = this.render();
        this.element.replaceWith(newElement);
        this.element = newElement;
    }
    
    /**
     * 获取DOM元素
     * @returns {HTMLElement}
     */
    getElement() {
        return this.element;
    }
    
    /**
     * 销毁组件
     */
    destroy() {
        this.element?.remove();
        this.element = null;
    }
    
    /**
     * 创建角色列表
     * @param {Array} characters - 角色数组
     * @param {Object} options - 配置选项
     * @returns {HTMLElement}
     */
    static createList(characters, options = {}) {
        const container = DOM.create('div', {
            className: 'character-list',
            style: `
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
                gap: 16px;
                padding: 16px;
            `
        });
        
        characters.forEach(char => {
            const card = new CharacterCard(char, options);
            container.appendChild(card.getElement());
        });
        
        return container;
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CharacterCard, FAVOR_LEVELS };
}
