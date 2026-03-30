/**
 * 游戏 API 模块
 * 封装所有后端 API 调用
 */

// 加载世界配置
async function loadWorldConfig() {
    const slug = getWorldSlugFromUrl();
    
    if (!slug) {
        console.log('使用默认世界配置');
        return null;
    }
    
    try {
        const response = await fetch(`${API_BASE}/games/${slug}`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        
        if (data.success) {
            currentWorld = data.data;
            console.log('加载世界:', currentWorld.title);
            
            if (typeof applyWorldConfig === 'function') {
                applyWorldConfig(currentWorld);
            }
            return currentWorld;
        } else {
            console.warn('世界加载失败:', data.message);
            return null;
        }
    } catch (error) {
        console.error('加载世界配置失败:', error);
        return null;
    }
}

// 加载游戏列表
async function loadGameList() {
    try {
        const response = await fetch(`${API_BASE}/games`, {
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        const container = document.getElementById('game-list-container');
        if (!container) return;
        
        if (data.success && data.data && data.data.length > 0) {
            const currentSlug = getWorldSlugFromUrl();
            
            container.innerHTML = data.data.map(game => {
                const isCurrent = game.slug === currentSlug;
                const cover = game.cover || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27100%27 height=%27100%27%3E%3Crect fill=%27%23333%27 width=%27100%27 height=%27100%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 fill=%27%23666%27 font-size=%2730%27 text-anchor=%27middle%27%3E%3F%3C/text%3E%3C/svg%3E';
                
                return `
                    <div style="display: flex; align-items: center; gap: 15px; padding: 15px; background: ${isCurrent ? 'rgba(138, 109, 59, 0.3)' : 'rgba(255,255,255,0.05)'}; border: 1px solid ${isCurrent ? '#8a6d3b' : 'rgba(255,255,255,0.1)'}; border-radius: 12px; cursor: pointer; transition: all 0.3s;" 
                         onclick="switchToGame('${game.slug}')"
                         onmouseover="this.style.background='rgba(138, 109, 59, 0.2)'"
                         onmouseout="this.style.background='${isCurrent ? 'rgba(138, 109, 59, 0.3)' : 'rgba(255,255,255,0.05)'}'">
                        <img src="${cover}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;" alt="${game.title}">
                        <div style="flex: 1;">
                            <div style="color: #fff; font-size: 16px; font-weight: bold; margin-bottom: 4px;">
                                ${isCurrent ? '📌 ' : ''}${game.title}
                            </div>
                            <div style="color: #888; font-size: 13px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                                ${game.subtitle || game.description || '无副标题'}
                            </div>
                        </div>
                        ${isCurrent ? '<span style="color: #8a6d3b; font-size: 12px; padding: 4px 8px; background: rgba(138, 109, 59, 0.2); border-radius: 4px;">当前</span>' : '<span style="color: #666; font-size: 20px;">›</span>'}
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = '<p style="color: #888; text-align: center; padding: 40px;">暂无游戏</p>';
        }
    } catch (error) {
        console.error('加载游戏列表失败:', error);
        const container = document.getElementById('game-list-container');
        if (container) {
            container.innerHTML = '<p style="color: #ff6b6b; text-align: center; padding: 40px;">加载失败</p>';
        }
    }
}

// 加载世界图库
async function loadWorldGallery(gameId) {
    if (!gameId) return;
    
    try {
        const response = await fetch(`${API_BASE}/gallery/${gameId}`, {
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (data.success) {
            worldGallery = data.data || [];
            console.log(`加载图库: ${worldGallery.length} 张图片`);
        }
    } catch (error) {
        console.error('加载图库失败:', error);
    }
}

// 根据场景匹配背景图
async function matchBackgroundForScene(sceneText) {
    if (!currentWorld || !currentWorld._id || worldGallery.length === 0) {
        return null;
    }

    try {
        const response = await fetch(`${API_BASE}/gallery/${currentWorld._id}/match`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({ scene: sceneText })
        });

        const data = await response.json();

        if (data.success && data.data.length > 0) {
            return data.data[0];
        }

        return localMatchBackground ? localMatchBackground(sceneText) : null;
    } catch (error) {
        console.error('匹配背景图失败:', error);
        return localMatchBackground ? localMatchBackground(sceneText) : null;
    }
}

// 导出到全局
if (typeof window !== 'undefined') {
    window.loadWorldConfig = loadWorldConfig;
    window.loadGameList = loadGameList;
    window.loadWorldGallery = loadWorldGallery;
    window.matchBackgroundForScene = matchBackgroundForScene;
}
