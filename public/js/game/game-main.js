
        // ==================== 认证检查 ====================
        const API_BASE = 'http://localhost:3000/api';
        
        // 当前游戏世界配置
        let currentWorld = null;
        
        // 从URL获取世界slug
        function getWorldSlugFromUrl() {
            const params = new URLSearchParams(window.location.search);
            return params.get('world') || localStorage.getItem('galgame_current_world');
        }
        
        // 加载世界配置
        async function loadWorldConfig() {
            const slug = getWorldSlugFromUrl();
            
            if (!slug) {
                // 没有指定世界，使用默认配置
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
                    
                    // 应用世界配置
                    applyWorldConfig(currentWorld);
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
                document.getElementById('game-list-container').innerHTML = '<p style="color: #ff6b6b; text-align: center; padding: 40px;">加载失败</p>';
            }
        }
        
        // 切换到指定游戏
        function switchToGame(slug) {
            localStorage.setItem('galgame_current_world', slug);
            window.location.href = `galgame_framework.html?world=${slug}`;
        }
        
        // 图库数据
        let worldGallery = [];
        let currentBackground = null;

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

        // 根据场景匹配合适的背景图
        async function matchBackgroundForScene(sceneText) {
            if (!currentWorld || !currentWorld._id || worldGallery.length === 0) {
                return null;
            }

            try {
                // 调用后端匹配 API
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
                    return data.data[0]; // 返回最匹配的图片
                }

                // 如果没有匹配结果，使用本地简单匹配
                return localMatchBackground(sceneText);
            } catch (error) {
                console.error('匹配背景图失败:', error);
                return localMatchBackground(sceneText);
            }
        }

        // 本地简单匹配
        function localMatchBackground(sceneText) {
            const text = sceneText.toLowerCase();
            
            // 按匹配分数排序
            const scored = worldGallery
                .filter(img => img.type === 'background')
                .map(img => {
                    let score = 0;
                    const imgText = `${img.name} ${img.description} ${img.tags?.join(' ') || ''}`.toLowerCase();
                    
                    // 关键词匹配
                    const keywords = text.split(/\s+/);
                    keywords.forEach(keyword => {
                        if (keyword.length > 1 && imgText.includes(keyword)) {
                            score += 1;
                        }
                    });

                    // 场景类型匹配
                    const scenes = [
                        { keywords: ['森林', '树林', 'forest', 'wood'], type: 'forest' },
                        { keywords: ['城市', '城镇', 'city', 'town'], type: 'city' },
                        { keywords: ['室内', '房间', 'indoor', 'room'], type: 'indoor' },
                        { keywords: ['夜晚', 'night'], type: 'night' },
                        { keywords: ['战斗', 'battle', 'fight'], type: 'battle' },
                        { keywords: ['山', '山脉', 'mountain'], type: 'mountain' },
                        { keywords: ['水', '海', '湖', 'water', 'sea', 'lake'], type: 'water' }
                    ];

                    scenes.forEach(s => {
                        if (s.keywords.some(k => text.includes(k)) && 
                            (imgText.includes(s.type) || s.keywords.some(k => imgText.includes(k)))) {
                            score += 5;
                        }
                    });

                    return { ...img, score };
                })
                .filter(img => img.score > 0)
                .sort((a, b) => b.score - a.score);

            return scored[0] || null;
        }

        // 切换背景图
        function switchBackground(imageUrl, duration = 1000) {
            if (!imageUrl || imageUrl === currentBackground) return;
            
            const bgElement = document.getElementById('background-image');
            
            // 淡出
            bgElement.style.transition = `opacity ${duration}ms ease`;
            bgElement.style.opacity = '0';
            
            setTimeout(() => {
                bgElement.src = imageUrl;
                currentBackground = imageUrl;
                
                // 图片加载完成后淡入
                bgElement.onload = () => {
                    bgElement.style.opacity = '1';
                };
                
                // 如果图片已缓存，立即显示
                if (bgElement.complete) {
                    bgElement.style.opacity = '1';
                }
            }, duration);
        }

        // 应用世界配置到游戏
        function applyWorldConfig(world) {
            // 更新标题
            document.title = `${world.title} - 大荒书店`;
            
            // 更新背景图
            if (world.background) {
                document.getElementById('background-image').src = world.background;
                currentBackground = world.background;
            }
            
            // 更新开场白
            if (world.config && world.config.openingMessage) {
                // 开场白会在startGame时使用
            }
            
            // 加载图库
            loadWorldGallery(world._id);
            
            // 加载自定义聊天界面配置
            loadCustomChatUI(world._id);
        }
        
        // 加载自定义聊天界面配置
        async function loadCustomChatUI(gameId) {
            try {
                // 从localStorage加载
                const saved = localStorage.getItem(`chatui_${gameId}`);
                
                if (saved) {
                    const config = JSON.parse(saved);
                    applyCustomChatUI(config);
                    console.log('已应用自定义聊天界面配置');
                } else {
                    // 尝试从服务器加载
                    const response = await fetch(`${API_BASE}/games/${gameId}/chatui`, {
                        headers: getAuthHeaders()
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        if (data.data) {
                            applyCustomChatUI(data.data);
                            // 缓存到localStorage
                            localStorage.setItem(`chatui_${gameId}`, JSON.stringify(data.data));
                            console.log('已从服务器加载并应用自定义聊天界面配置');
                        }
                    }
                }
            } catch (error) {
                console.error('加载自定义聊天界面失败:', error);
            }
        }
        
        // 应用自定义聊天界面
        function applyCustomChatUI(config) {
            if (!config || (!config.html && !config.css)) return;
            
            // 如果有自定义HTML，替换游戏容器内容
            if (config.html) {
                const gameContainer = document.getElementById('game-container');
                if (gameContainer) {
                    // 保留基础结构，只替换内容区域
                    const originalContent = gameContainer.innerHTML;
                    
                    // 创建新的内容结构
                    gameContainer.innerHTML = config.html + `
                        <div id="game-controls" style="position: absolute; top: 20px; right: 20px; z-index: 5; display: flex; gap: 10px;">
                            <button class="control-btn" id="menu-btn" title="菜南">☰</button>
                            <button class="control-btn" id="edit-world-btn" title="编辑设定">✏️</button>
                            <button class="control-btn" id="world-guide-btn" title="世界指南">📖</button>
                            <button class="control-btn" id="characters-panel-btn" title="角色栏">👥</button>
                            <button class="control-btn" id="log-btn" title="对话记录">📋</button>
                            <button class="control-btn" id="back-btn" title="返回书店">📚</button>
                        </div>
                        <div id="game-menu" style="display: none;">
                            <h2 style="color: #fff; margin-bottom: 30px;">🎮 游戏菜单</h2>
                            <div class="menu-btn" id="continue-btn">▶ 继续游戏</div>
                            <div class="menu-btn" id="memory-btn">🧠 记忆库</div>
                            <div class="menu-btn" id="world-guide-menu-btn">📖 世界指南</div>
                            <div class="menu-btn" id="switch-game-btn">🔄 切换游戏</div>
                            <div class="menu-btn" id="new-game-btn">🌟 新游戏</div>
                            <div class="menu-btn" id="exit-btn">📖 返回书店</div>
                            <div class="menu-btn" id="logout-menu-btn" style="color: #ff6b6b;">🚪 退出登录</div>
                        </div>
                    `;
                    
                    // 重新绑定事件
                    bindGameEvents();
                }
            }
            
            // 如果有自定义CSS，添加样式
            if (config.css) {
                let customStyle = document.getElementById('custom-chatui-style');
                if (!customStyle) {
                    customStyle = document.createElement('style');
                    customStyle.id = 'custom-chatui-style';
                    document.head.appendChild(customStyle);
                }
                customStyle.textContent = config.css;
            }
            
            // 如果有自定义JS，执行它
            if (config.js) {
                try {
                    // 使用Function构造函数创建一个独立的函数作用域
                    const customFunc = new Function('GameAPI', config.js);
                    customFunc(window.GameAPI || {});
                } catch (error) {
                    console.error('执行自定义JavaScript失败:', error);
                }
            }
        }
        
        // 重新绑定游戏事件
        function bindGameEvents() {
            // 菜单按钮
            document.getElementById('menu-btn')?.addEventListener('click', () => {
                document.getElementById('game-menu').classList.add('show');
            });
            
            // 继续游戏
            document.getElementById('continue-btn')?.addEventListener('click', () => {
                document.getElementById('game-menu').classList.remove('show');
            });
            
            // 返回书店
            document.getElementById('exit-btn')?.addEventListener('click', () => {
                window.location.href = 'index.html';
            });
            document.getElementById('back-btn')?.addEventListener('click', () => {
                window.location.href = 'index.html';
            });
            
            // 编辑设定
            document.getElementById('edit-world-btn')?.addEventListener('click', () => {
                if (currentWorld && currentWorld._id) {
                    window.location.href = `settings.html?id=${currentWorld._id}`;
                }
            });
            
            // 世界指南
            document.getElementById('world-guide-btn')?.addEventListener('click', () => {
                const slug = getWorldSlugFromUrl() || 'dahuang';
                window.location.href = `world-guide.html?world=${slug}`;
            });
            document.getElementById('world-guide-menu-btn')?.addEventListener('click', () => {
                const slug = getWorldSlugFromUrl() || 'dahuang';
                window.location.href = `world-guide.html?world=${slug}`;
            });
            
            // 切换游戏
            document.getElementById('switch-game-btn')?.addEventListener('click', () => {
                loadGameList();
                document.getElementById('game-list-modal').style.display = 'flex';
            });
            
            // 关闭游戏列表
            document.getElementById('close-game-list')?.addEventListener('click', () => {
                document.getElementById('game-list-modal').style.display = 'none';
            });
            
            // 点击背景关闭游戏列表
            document.getElementById('game-list-modal')?.addEventListener('click', (e) => {
                if (e.target.id === 'game-list-modal') {
                    document.getElementById('game-list-modal').style.display = 'none';
                }
            });
            
            // 发送按钮
            const sendBtn = document.getElementById('send-btn');
            const userInput = document.getElementById('user-input');
            
            if (sendBtn) {
                sendBtn.addEventListener('click', () => {
                    const text = userInput?.value.trim();
                    if (text) {
                        // 使用全局的handleChatMessage函数
                        if (typeof handleChatMessage === 'function') {
                            handleChatMessage(text);
                        }
                    }
                });
            }
            
            if (userInput) {
                userInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        sendBtn?.click();
                    }
                });
            }
            
            // 初始化角色栏
            initCharactersPanel();
        }
        
        // 检查登录状态
        function checkAuthentication() {
            const token = localStorage.getItem('galgame_token');
            if (!token) {
                // 未登录，跳转到登录页
                window.location.href = 'login.html';
                return false;
            }
            return true;
        }
        
        // 获取当前用户
        function getCurrentUser() {
            const userStr = localStorage.getItem('galgame_user');
            return userStr ? JSON.parse(userStr) : null;
        }
        
        // 获取认证头
        function getAuthHeaders() {
            const token = localStorage.getItem('galgame_token');
            return {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            };
        }
        
        // 登出
        function logout() {
            localStorage.removeItem('galgame_token');
            localStorage.removeItem('galgame_user');
            window.location.href = 'login.html';
        }
        
        // 页面加载时检查认证
        if (!checkAuthentication()) {
            throw new Error('未登录'); // 阻止后续代码执行
        }
        
        // 游戏状态
        const gameState = {
            currentScene: 1,
            currentDialogue: 0,
            characterPositions: {
                left: null,
                center: null,
                right: null
            }
        };
        // 游戏数据
        const gameData = {
            scenes: [
                {
                    id: 1,
                    background: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1920' height='1080'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%231a1a2e'/%3E%3Cstop offset='50%25' stop-color='%2316213e'/%3E%3Cstop offset='100%25' stop-color='%230f3460'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill='url(%23g)' width='1920' height='1080'/%3E%3C/svg%3E",
                    dialogues: [
                        {
                            character: "林婉",
                            text: "你好，欢迎来到这个世界。这里是一个充满奇迹和冒险的地方，希望你能在这里找到属于自己的故事。"
                        }
                    ]
                },
                {
                    id: 2,
                    background: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1920' height='1080'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%231a1a2e'/%3E%3Cstop offset='50%25' stop-color='%2316213e'/%3E%3Cstop offset='100%25' stop-color='%230f3460'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill='url(%23g)' width='1920' height='1080'/%3E%3C/svg%3E",
                    dialogues: [
                        {
                            character: "林婉",
                            text: "我也很高兴认识你！我叫林婉，是这里的向导。如果你有任何问题，都可以问我。"
                        }
                    ]
                },
                {
                    id: 3,
                    background: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1920' height='1080'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%231a1a2e'/%3E%3Cstop offset='50%25' stop-color='%2316213e'/%3E%3Cstop offset='100%25' stop-color='%230f3460'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill='url(%23g)' width='1920' height='1080'/%3E%3C/svg%3E",
                    dialogues: [
                        {
                            character: "陆苍雪",
                            text: "你好，我是陆苍雪。这里的冰雪世界很美，不是吗？"
                        }
                    ]
                },
                {
                    id: 4,
                    background: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1920' height='1080'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%231a1a2e'/%3E%3Cstop offset='50%25' stop-color='%2316213e'/%3E%3Cstop offset='100%25' stop-color='%230f3460'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill='url(%23g)' width='1920' height='1080'/%3E%3C/svg%3E",
                    dialogues: [
                        {
                            character: "陆苍雪",
                            text: "我擅长冰系法术，如果你遇到任何困难，我可以帮助你。"
                        }
                    ]
                },
                {
                    id: 5,
                    background: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1920' height='1080'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%231a1a2e'/%3E%3Cstop offset='50%25' stop-color='%2316213e'/%3E%3Cstop offset='100%25' stop-color='%230f3460'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill='url(%23g)' width='1920' height='1080'/%3E%3C/svg%3E",
                    dialogues: [
                        {
                            character: "轩辕霓裳",
                            text: "哈哈，你就是新来的吧？我是轩辕霓裳，这里的守护者之一。"
                        }
                    ]
                },
                {
                    id: 6,
                    background: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1920' height='1080'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%231a1a2e'/%3E%3Cstop offset='50%25' stop-color='%2316213e'/%3E%3Cstop offset='100%25' stop-color='%230f3460'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill='url(%23g)' width='1920' height='1080'/%3E%3C/svg%3E",
                    dialogues: [
                        {
                            character: "轩辕霓裳",
                            text: "我喜欢热闹的地方，如果你想找乐子，就来找我吧！"
                        }
                    ]
                }
            ]
        };
        // 角色配置对象 - 统一管理角色信息，支持动态添加
        let characterConfig = {
            '默认描述者': {
                color: '#999999',
                image: null
            },
            '林婉': {
                color: '#FF69B4',
                image: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'400\'%3E%3Crect fill=\'%23FF69B4\' width=\'300\' height=\'400\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' fill=\'%23fff\' font-family=\'Microsoft YaHei\' font-size=\'20\' text-anchor=\'middle\'%3E林婉%3C/text%3E%3C/svg%3E'
            },
            '陆苍雪': {
                color: '#87CEFA',
                image: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'400\'%3E%3Crect fill=\'%234ECDC4\' width=\'300\' height=\'400\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' fill=\'%23fff\' font-family=\'Microsoft YaHei\' font-size=\'20\' text-anchor=\'middle\'%3E陆苍雪%3C/text%3E%3C/svg%3E'
            },
            '轩辕霓裳': {
                color: '#FF4500',
                image: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'400\'%3E%3Crect fill=\'%23FFD93D\' width=\'300\' height=\'400\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' fill=\'%23fff\' font-family=\'Microsoft YaHei\' font-size=\'20\' text-anchor=\'middle\'%3E玄辙霓裳%3C/text%3E%3C/svg%3E'
            },
            'AI': {
                color: '#4CAF50',
                image: null
            },
            'You': {
                color: '#2196F3',
                image: null
            }
        };
        // 角色颜色映射表（保持兼容性）
        let characterColors = {
            '默认描述者': '#999999',
            '林婉': '#FF69B4',
            '陆苍雪': '#87CEFA',
            '轩辕霓裳': '#FF4500',
            'AI': '#4CAF50',
            'You': '#2196F3'
        };
        // 动态添加角色的函数
        function addCharacter(characterName, characterInfo) {
            // 默认颜色和立绘
            const defaultColor = getRandomColor();
            const defaultImage = ``;
            // 添加到角色配置
            characterConfig[characterName] = {
                color: characterInfo.color || defaultColor,
                image: characterInfo.image || defaultImage
            };
            // 添加到颜色映射表
            characterColors[characterName] = characterInfo.color || defaultColor;
            // 添加到提示词配置
            if (characterInfo.prompt) {
                characterPrompts[characterName] = characterInfo.prompt;
            }
        }
        // 生成随机颜色的辅助函数
        function getRandomColor() {
            const letters = '0123456789ABCDEF';
            let color = '#';
            for (let i = 0; i < 6; i++) {
                color += letters[Math.floor(Math.random() * 16)];
            }
            return color;
        }
        // 聊天历史
        const chatHistory = [];
        // AI回复历史 - 保存所有完整的AI回复
        const aiResponseHistory = [];
        // 当前发言人
        let currentSpeaker = '环境描写';
        // 角色提示词设置
        let characterPrompts = {
            '林婉': '林婉是一个温柔、细腻、关心他人的女孩，说话轻声细语，总是为他人着想。她是修仙世界的向导，对周围的环境非常熟悉。',
            '陆苍雪': '陆苍雪是一个冷静、智慧、神秘的男孩，擅长冰系法术。他说话简洁有力，富有哲理，给人一种高深莫测的感觉。',
            '轩辕霓裳': '轩辕霓裳是一个活泼、热情、豪爽的女孩，充满活力和趣味性。她喜欢热闹的地方，总是能给周围的人带来快乐。'
        };
        // AI API设置
        let aiApiSettings = {
            apiKey: 'sk-ohkdoeggttsnylwvggqbovjakxjxtqnatuwidaucuxmdxfxs',
            apiUrl: 'https://api.siliconflow.cn/v1/chat/completions',
            model: 'Pro/deepseek-ai/DeepSeek-V3.2',
            provider: 'siliconflow',
            temperature: 0.7,
            topP: 0.9,
            maxTokens: 2000,
            presencePenalty: 0,
            streaming: true,
            thinkChain: false,
            jsonMode: false,
            systemPrompt: ''
        };
        // DOM元素
        const elements = {
            loadingScreen: document.getElementById('loading-screen'),
            loadingProgress: document.getElementById('loading-progress'),
            backgroundImage: document.getElementById('background-image'),
            characterLeft: document.getElementById('character-left'),
            characterCenter: document.getElementById('character-center'),
            characterRight: document.getElementById('character-right'),
            dialogueLayer: document.getElementById('dialogue-layer'),
            dialogueBox: document.getElementById('dialogue-box'),
            characterName: document.getElementById('character-name'),
            dialogueText: document.getElementById('dialogue-text'),
            menuBtn: document.getElementById('menu-btn'),
            gameMenu: document.getElementById('game-menu'),
            continueBtn: document.getElementById('continue-btn'),
            newGameBtn: document.getElementById('new-game-btn'),
            loadGameBtn: document.getElementById('load-game-btn'),
            exitBtn: document.getElementById('exit-btn'),
            settingsMenuBtn: document.getElementById('settings-menu-btn'),
            userInput: document.getElementById('user-input'),
            sendBtn: document.getElementById('send-btn'),
            // AI设置相关元素
            characterSettings: document.getElementById('character-settings'),
            apiKey: document.getElementById('api-key'),
            modelName: document.getElementById('model-name'),
            saveSettings: document.getElementById('save-settings'),
            closeSettings: document.getElementById('close-settings'),
            // 对话log相关元素
            logBtn: document.getElementById('log-btn'),
            dialogueLog: document.getElementById('dialogue-log'),
            closeLog: document.getElementById('close-log'),
            logContent: document.getElementById('log-content'),
            // AI回复历史相关元素
            aiLogBtn: document.getElementById('ai-log-btn'),
            aiLog: document.getElementById('ai-log'),
            closeAiLog: document.getElementById('close-ai-log'),
            aiLogContent: document.getElementById('ai-log-content'),
            // 用户个人设置相关元素
            editWorldBtn: document.getElementById('edit-world-btn'),
            backBtn: document.getElementById('back-btn'),
            // 用户设置表单元素
            userBackground: document.getElementById('user-background'),
            userPersonality: document.getElementById('user-personality'),
            userDialogStyle: document.getElementById('user-dialog-style'),
            userRestrictions: document.getElementById('user-restrictions'),
            userApiKey: document.getElementById('user-api-key'),
            userApiProvider: document.getElementById('user-api-provider'),
            userApiUrl: document.getElementById('user-api-url'),
            userModelName: document.getElementById('user-model-name'),
            userTemperature: document.getElementById('user-temperature'),
            // AI配置预设相关
            aiPresetSelect: document.getElementById('ai-preset-select'),
            presetName: document.getElementById('preset-name'),
            userTopP: document.getElementById('user-top-p'),
            userMaxTokens: document.getElementById('user-max-tokens'),
            userPresencePenalty: document.getElementById('user-presence-penalty'),
            userStreaming: document.getElementById('user-streaming'),
            userThinkChain: document.getElementById('user-think-chain'),
            userJsonMode: document.getElementById('user-json-mode'),
            userSystemPrompt: document.getElementById('user-system-prompt')
        };
        // 保存AI设置
        function saveCharacterSettings() {
            aiApiSettings.apiKey = elements.apiKey.value.trim() || 'sk-ohkdoeggttsnylwvggqbovjakxjxtqnatuwidaucuxmdxfxs';
            aiApiSettings.model = elements.modelName.value.trim() || 'Pro/deepseek-ai/DeepSeek-V3.2';
            // 隐藏设置面板
            elements.characterSettings.style.display = 'none';
            // 提示保存成功
            alert('AI设置保存成功！');
        }
        // 加载AI设置到表单
        function loadCharacterSettings() {
            elements.apiKey.value = aiApiSettings.apiKey || '';
            elements.modelName.value = aiApiSettings.model || '';
        }
        // 显示AI设置面板
        function showCharacterSettings() {
            loadCharacterSettings();
            elements.characterSettings.style.display = 'block';
        }
        // 隐藏AI设置面板
        function hideCharacterSettings() {
            elements.characterSettings.style.display = 'none';
        }

        // ==================== 用户个人设置管理 ====================
        // 用户设置数据结构
        let userSettings = {
            worldbook: {
                background: '',
                entries: []
            },
            prompt: {
                personality: '',
                dialogStyle: '',
                restrictions: ''
            },
            ai: {
                apiKey: '',
                provider: '',
                apiUrl: '',
                modelName: '',
                temperature: 0.7,
                topP: 0.9,
                maxTokens: 2000,
                presencePenalty: 0,
                streaming: true,
                thinkChain: false,
                jsonMode: false,
                systemPrompt: ''
            }
        };

        // 从localStorage加载用户设置
        function loadUserSettingsFromStorage() {
            const saved = localStorage.getItem('galgame_user_settings');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    userSettings = { ...userSettings, ...parsed };
                } catch (e) {
                    console.error('解析用户设置失败:', e);
                }
            }
        }

        // 保存用户设置到localStorage
        function saveUserSettingsToStorage() {
            localStorage.setItem('galgame_user_settings', JSON.stringify(userSettings));
        }

        // 加载用户设置到表单
        function loadUserSettings() {
            loadUserSettingsFromStorage();
            // 世界书
            if (elements.userBackground) elements.userBackground.value = userSettings.worldbook.background || '';
            renderUserWorldbookEntries();
            // 提示词
            if (elements.userPersonality) elements.userPersonality.value = userSettings.prompt.personality || '';
            if (elements.userDialogStyle) elements.userDialogStyle.value = userSettings.prompt.dialogStyle || '';
            if (elements.userRestrictions) elements.userRestrictions.value = userSettings.prompt.restrictions || '';
            // AI配置
            if (elements.userApiKey) elements.userApiKey.value = userSettings.ai.apiKey || '';
            if (elements.userApiProvider) {
                elements.userApiProvider.value = userSettings.ai.provider || '';
                toggleApiUrlInput(); // 根据选择显示/隐藏API地址输入
            }
            if (elements.userApiUrl) elements.userApiUrl.value = userSettings.ai.apiUrl || '';
            if (elements.userModelName) elements.userModelName.value = userSettings.ai.modelName || '';
            if (elements.userTemperature) {
                elements.userTemperature.value = userSettings.ai.temperature || 0.7;
                document.getElementById('temp-value').textContent = userSettings.ai.temperature || 0.7;
            }
            if (elements.userTopP) {
                elements.userTopP.value = userSettings.ai.topP || 0.9;
                document.getElementById('top-p-value').textContent = userSettings.ai.topP || 0.9;
            }
            if (elements.userMaxTokens) elements.userMaxTokens.value = userSettings.ai.maxTokens || 2000;
            if (elements.userPresencePenalty) {
                elements.userPresencePenalty.value = userSettings.ai.presencePenalty || 0;
                document.getElementById('presence-value').textContent = userSettings.ai.presencePenalty || 0;
            }
            if (elements.userStreaming) elements.userStreaming.checked = userSettings.ai.streaming !== false;
            if (elements.userThinkChain) elements.userThinkChain.checked = userSettings.ai.thinkChain || false;
            if (elements.userJsonMode) elements.userJsonMode.checked = userSettings.ai.jsonMode || false;
            if (elements.userSystemPrompt) elements.userSystemPrompt.value = userSettings.ai.systemPrompt || '';
        }

        // 切换API地址输入框显示
        function toggleApiUrlInput() {
            const provider = elements.userApiProvider?.value;
            const urlGroup = document.getElementById('custom-api-url-group');
            if (urlGroup) {
                urlGroup.style.display = provider === 'custom' ? 'block' : 'none';
            }
        }

        // ==================== AI配置预设管理 ====================
        let aiPresets = [];
        let currentPresetId = null;

        // 从localStorage加载AI预设
        function loadAIPresetsFromStorage() {
            const saved = localStorage.getItem('galgame_ai_presets');
            if (saved) {
                try {
                    aiPresets = JSON.parse(saved);
                } catch (e) {
                    console.error('解析AI预设失败:', e);
                    aiPresets = [];
                }
            }
            // 如果没有预设，创建默认预设
            if (aiPresets.length === 0) {
                createDefaultPresets();
            }
            renderAIPresetSelect();
        }

        // 创建默认预设
        function createDefaultPresets() {
            aiPresets = [
                {
                    id: 'default-siliconflow',
                    name: 'SiliconFlow-DeepSeek',
                    provider: 'siliconflow',
                    modelName: 'Pro/deepseek-ai/DeepSeek-V3.2',
                    temperature: 0.7,
                    topP: 0.9,
                    maxTokens: 2000,
                    presencePenalty: 0,
                    streaming: true,
                    thinkChain: false,
                    jsonMode: false,
                    systemPrompt: ''
                },
                {
                    id: 'default-openai',
                    name: 'OpenAI-GPT4',
                    provider: 'openai',
                    modelName: 'gpt-4',
                    temperature: 0.7,
                    topP: 0.9,
                    maxTokens: 2000,
                    presencePenalty: 0,
                    streaming: true,
                    thinkChain: false,
                    jsonMode: false,
                    systemPrompt: ''
                },
                {
                    id: 'default-creative',
                    name: '高创意模式',
                    provider: 'siliconflow',
                    modelName: 'Pro/deepseek-ai/DeepSeek-V3.2',
                    temperature: 1.2,
                    topP: 0.95,
                    maxTokens: 2000,
                    presencePenalty: 0.5,
                    streaming: true,
                    thinkChain: true,
                    jsonMode: false,
                    systemPrompt: '请以创意、富有想象力的方式回答，允许进行适度的推演和脚本创作。'
                }
            ];
            saveAIPresetsToStorage();
        }

        // 保存AI预设到localStorage
        function saveAIPresetsToStorage() {
            localStorage.setItem('galgame_ai_presets', JSON.stringify(aiPresets));
        }

        // 渲染预设下拉选择
        function renderAIPresetSelect() {
            const select = elements.aiPresetSelect;
            if (!select) return;
            
            const currentValue = select.value;
            select.innerHTML = '<option value="">选择预设...</option>' +
                aiPresets.map(preset => `<option value="${preset.id}">${preset.name}</option>`).join('');
            select.value = currentValue;
        }

        // 加载选中的预设到表单
        function loadAIPreset() {
            const presetId = elements.aiPresetSelect?.value;
            if (!presetId) return;
            
            const preset = aiPresets.find(p => p.id === presetId);
            if (!preset) return;
            
            currentPresetId = presetId;
            
            // 填充表单
            if (elements.presetName) elements.presetName.value = preset.name || '';
            if (elements.userApiProvider) {
                elements.userApiProvider.value = preset.provider || 'siliconflow';
                toggleApiUrlInput();
            }
            if (elements.userModelName) elements.userModelName.value = preset.modelName || '';
            if (elements.userTemperature) {
                elements.userTemperature.value = preset.temperature || 0.7;
                updateRangeValue('temp-value', preset.temperature || 0.7);
            }
            if (elements.userTopP) {
                elements.userTopP.value = preset.topP || 0.9;
                updateRangeValue('top-p-value', preset.topP || 0.9);
            }
            if (elements.userMaxTokens) elements.userMaxTokens.value = preset.maxTokens || 2000;
            if (elements.userPresencePenalty) {
                elements.userPresencePenalty.value = preset.presencePenalty || 0;
                updateRangeValue('presence-value', preset.presencePenalty || 0);
            }
            if (elements.userStreaming) elements.userStreaming.checked = preset.streaming !== false;
            if (elements.userThinkChain) elements.userThinkChain.checked = preset.thinkChain || false;
            if (elements.userJsonMode) elements.userJsonMode.checked = preset.jsonMode || false;
            if (elements.userSystemPrompt) elements.userSystemPrompt.value = preset.systemPrompt || '';
        }

        // 保存为新预设
        function saveAsNewPreset() {
            const name = elements.presetName?.value.trim();
            if (!name) {
                alert('请输入预设名称');
                return;
            }
            
            const preset = {
                id: 'preset_' + Date.now(),
                name: name,
                apiKey: elements.userApiKey?.value || '',
                apiUrl: elements.userApiUrl?.value || '',
                provider: elements.userApiProvider?.value || 'siliconflow',
                modelName: elements.userModelName?.value || '',
                temperature: parseFloat(elements.userTemperature?.value) || 0.7,
                topP: parseFloat(elements.userTopP?.value) || 0.9,
                maxTokens: parseInt(elements.userMaxTokens?.value) || 2000,
                presencePenalty: parseFloat(elements.userPresencePenalty?.value) || 0,
                streaming: elements.userStreaming?.checked !== false,
                thinkChain: elements.userThinkChain?.checked || false,
                jsonMode: elements.userJsonMode?.checked || false,
                systemPrompt: elements.userSystemPrompt?.value || ''
            };
            
            aiPresets.push(preset);
            saveAIPresetsToStorage();
            renderAIPresetSelect();
            elements.aiPresetSelect.value = preset.id;
            currentPresetId = preset.id;
            alert('预设已保存！');
        }

        // 删除当前预设
        function deleteCurrentPreset() {
            if (!currentPresetId) {
                alert('请先选择一个预设');
                return;
            }
            
            if (!confirm('确定要删除这个预设吗？')) return;
            
            aiPresets = aiPresets.filter(p => p.id !== currentPresetId);
            saveAIPresetsToStorage();
            renderAIPresetSelect();
            elements.aiPresetSelect.value = '';
            currentPresetId = null;
            alert('预设已删除');
        }

        // 更新滑块显示值
        function updateRangeValue(elementId, value) {
            const element = document.getElementById(elementId);
            if (element) element.textContent = value;
        }

        // 保存用户设置
        function saveUserSettings() {
            // 如果有当前预设，更新它
            if (currentPresetId) {
                const presetIndex = aiPresets.findIndex(p => p.id === currentPresetId);
                if (presetIndex !== -1) {
                    aiPresets[presetIndex] = {
                        ...aiPresets[presetIndex],
                        apiKey: elements.userApiKey?.value || '',
                        apiUrl: elements.userApiUrl?.value || '',
                        provider: elements.userApiProvider?.value || 'siliconflow',
                        modelName: elements.userModelName?.value || '',
                        temperature: parseFloat(elements.userTemperature?.value) || 0.7,
                        topP: parseFloat(elements.userTopP?.value) || 0.9,
                        maxTokens: parseInt(elements.userMaxTokens?.value) || 2000,
                        presencePenalty: parseFloat(elements.userPresencePenalty?.value) || 0,
                        streaming: elements.userStreaming?.checked !== false,
                        thinkChain: elements.userThinkChain?.checked || false,
                        jsonMode: elements.userJsonMode?.checked || false,
                        systemPrompt: elements.userSystemPrompt?.value || ''
                    };
                    saveAIPresetsToStorage();
                }
            }
            
            // 世界书
            userSettings.worldbook.background = elements.userBackground?.value || '';
            // 收集条目
            const entryElements = document.querySelectorAll('.user-entry-item');
            userSettings.worldbook.entries = Array.from(entryElements).map(el => ({
                keyword: el.querySelector('.entry-keyword').value,
                content: el.querySelector('.entry-content').value
            })).filter(e => e.keyword || e.content);
            // 提示词
            userSettings.prompt.personality = elements.userPersonality?.value || '';
            userSettings.prompt.dialogStyle = elements.userDialogStyle?.value || '';
            userSettings.prompt.restrictions = elements.userRestrictions?.value || '';
            // AI配置
            userSettings.ai.apiKey = elements.userApiKey?.value || '';
            userSettings.ai.provider = elements.userApiProvider?.value || '';
            userSettings.ai.apiUrl = elements.userApiUrl?.value || '';
            userSettings.ai.modelName = elements.userModelName?.value || '';
            userSettings.ai.temperature = parseFloat(elements.userTemperature?.value) || 0.7;
            userSettings.ai.topP = parseFloat(elements.userTopP?.value) || 0.9;
            userSettings.ai.maxTokens = parseInt(elements.userMaxTokens?.value) || 2000;
            userSettings.ai.presencePenalty = parseFloat(elements.userPresencePenalty?.value) || 0;
            userSettings.ai.streaming = elements.userStreaming?.checked !== false;
            userSettings.ai.thinkChain = elements.userThinkChain?.checked || false;
            userSettings.ai.jsonMode = elements.userJsonMode?.checked || false;
            userSettings.ai.systemPrompt = elements.userSystemPrompt?.value || '';
            // 保存到localStorage
            saveUserSettingsToStorage();
            // 更新AI配置（优先使用用户设置）
            updateAISettingsFromUser();
            alert('个人设置已保存！');
            elements.userSettingsPanel.style.display = 'none';
        }

        // 渲染用户世界书条目
        function renderUserWorldbookEntries() {
            const container = document.getElementById('user-entries-list');
            if (!container) return;
            if (!userSettings.worldbook.entries || userSettings.worldbook.entries.length === 0) {
                container.innerHTML = '';
                return;
            }
            container.innerHTML = userSettings.worldbook.entries.map((entry, index) => `
                <div class="user-entry-item">
                    <div class="user-entry-header">
                        <input type="text" class="entry-keyword" placeholder="关键词" value="${entry.keyword || ''}">
                        <button class="btn-remove-entry" onclick="removeUserEntry(${index})">删除</button>
                    </div>
                    <div class="user-entry-content">
                        <textarea class="entry-content" placeholder="内容...">${entry.content || ''}</textarea>
                    </div>
                </div>
            `).join('');
        }

        // 添加条目
        function addUserWorldbookEntry() {
            userSettings.worldbook.entries.push({ keyword: '', content: '' });
            renderUserWorldbookEntries();
        }

        // 删除条目
        function removeUserEntry(index) {
            userSettings.worldbook.entries.splice(index, 1);
            renderUserWorldbookEntries();
        }

        // 根据用户设置更新AI配置（优先级：用户 > 书本 > 默认）
        function updateAISettingsFromUser() {
            // 如果用户设置了API密钥，优先使用
            if (userSettings.ai.apiKey) {
                aiApiSettings.apiKey = userSettings.ai.apiKey;
            }
            // 如果用户设置了自定义API地址，优先使用
            if (userSettings.ai.apiUrl) {
                aiApiSettings.apiUrl = userSettings.ai.apiUrl;
            }
            if (userSettings.ai.modelName) {
                aiApiSettings.model = userSettings.ai.modelName;
            }
            // 高级设置
            if (userSettings.ai.temperature !== undefined) {
                aiApiSettings.temperature = userSettings.ai.temperature;
            }
            if (userSettings.ai.topP !== undefined) {
                aiApiSettings.topP = userSettings.ai.topP;
            }
            if (userSettings.ai.maxTokens !== undefined) {
                aiApiSettings.maxTokens = userSettings.ai.maxTokens;
            }
            if (userSettings.ai.presencePenalty !== undefined) {
                aiApiSettings.presencePenalty = userSettings.ai.presencePenalty;
            }
            aiApiSettings.streaming = userSettings.ai.streaming !== false;
            aiApiSettings.thinkChain = userSettings.ai.thinkChain || false;
            aiApiSettings.jsonMode = userSettings.ai.jsonMode || false;
            if (userSettings.ai.systemPrompt) {
                aiApiSettings.systemPrompt = userSettings.ai.systemPrompt;
            }
            aiApiSettings.provider = userSettings.ai.provider || 'siliconflow';
        }

        // 获取用于AI对话的完整提示词（合并用户设置）
        function getUserPromptAddon() {
            const parts = [];
            if (userSettings.worldbook.background) {
                parts.push(`【个人背景】${userSettings.worldbook.background}`);
            }
            if (userSettings.prompt.personality) {
                parts.push(`【性格强调】${userSettings.prompt.personality}`);
            }
            if (userSettings.prompt.dialogStyle) {
                parts.push(`【对话风格】${userSettings.prompt.dialogStyle}`);
            }
            if (userSettings.prompt.restrictions) {
                parts.push(`【限制条件】${userSettings.prompt.restrictions}`);
            }
            return parts.join('\n');
        }

        // 🎭 获取情感系统提示词
        function getEmotionSystemPrompt() {
            return `
【情感标签系统 - 必须遵守】
你必须在每句角色对话的末尾添加情感标签，格式如下：
[emotion:类型]或[emotion:类型:强度]

【情感类型说明】
- calm: 平静/日常/普通对话
- happy: 开心/笑/满足
- angry: 生气/怒/威严/命令
- sad: 悲伤/失落/沉默
- shy: 害羞/脸红/结巴/傲娇
- surprise: 惊讶/震惊/意外
- serious: 认真/严肃/战斗/责任
- hurt: 受伤/痛苦/脆弱

【强度等级】
- :1 轻微（略显）
- :2 中等（明显）← 默认
- :3 强烈（情绪爆发）

【示例】
玩家："你好"
你："嗯，找我何事？[emotion:calm:1]"

玩家："谢谢你"
你："（转过头）才、才不是为了你呢...[emotion:shy:2]"

玩家："你去哪了"
你："这不关你的事！[emotion:angry:2]"

玩家："再见"
你："保重...[emotion:sad:2]"

【规则】
1. 标签必须在文本最后，无空格
2. 根据对话内容选择最贴切的情感
3. 强度要符合语境，不要每句都用:3
4. 无强烈情绪时默认[emotion:calm:1]`;
        }

        // ==================== 记忆库管理 ====================
        // 记忆数据结构
        let memoryData = {
            short: [],  // 短期记忆
            long: [],   // 长期记忆
            core: []    // 核心记忆
        };

        // 从localStorage加载记忆
        function loadMemoryFromStorage() {
            const saved = localStorage.getItem('galgame_memory_data');
            if (saved) {
                try {
                    memoryData = JSON.parse(saved);
                    // 确保所有数组存在
                    if (!memoryData.short) memoryData.short = [];
                    if (!memoryData.long) memoryData.long = [];
                    if (!memoryData.core) memoryData.core = [];
                } catch (e) {
                    console.error('解析记忆数据失败:', e);
                }
            }
            updateMemoryStats();
        }

        // 保存记忆到localStorage
        function saveMemoryToStorage() {
            localStorage.setItem('galgame_memory_data', JSON.stringify(memoryData));
        }

        // 更新记忆统计显示
        function updateMemoryStats() {
            const shortCount = memoryData.short.length;
            const longCount = memoryData.long.length;
            const coreCount = memoryData.core.length;
            
            // 更新头部统计
            document.getElementById('short-count').textContent = shortCount;
            document.getElementById('long-count').textContent = longCount;
            document.getElementById('core-count').textContent = coreCount;
            
            // 更新选项卡计数
            document.getElementById('tab-short-count').textContent = shortCount;
            document.getElementById('tab-long-count').textContent = longCount;
            document.getElementById('tab-core-count').textContent = coreCount;
            
            // 更新菜单徽章
            const badge = document.getElementById('memory-badge');
            const total = shortCount + longCount + coreCount;
            if (total > 0) {
                badge.textContent = total;
                badge.style.display = 'inline';
            } else {
                badge.style.display = 'none';
            }
            
            // 检查是否需要合并提示
            checkMemoryMergeNeeded();
        }

        // 检查是否需要合并记忆
        function checkMemoryMergeNeeded() {
            // 短期记忆达到6条，提示合并为长期记忆
            if (memoryData.short.length >= 6) {
                showMergeModal('short');
            }
            // 长期记忆达到12条，提示合并为核心记忆
            else if (memoryData.long.length >= 12) {
                showMergeModal('long');
            }
        }

        // 显示合并确认弹窗
        function showMergeModal(type) {
            const modal = document.getElementById('memory-merge-modal');
            const message = document.getElementById('merge-message');
            const preview = document.getElementById('merge-preview');
            
            if (type === 'short') {
                message.innerHTML = '<strong>短期记忆已达6条</strong><br>是否将它们总结成一条长期记忆？';
                preview.innerHTML = memoryData.short.map(m => `<div style="margin: 5px 0; padding: 5px; background: rgba(255,193,7,0.1); border-radius: 4px;">${m.content.substring(0, 50)}...</div>`).join('');
            } else {
                message.innerHTML = '<strong>长期记忆已达12条</strong><br>是否将它们总结成核心记忆？';
                preview.innerHTML = memoryData.long.map(m => `<div style="margin: 5px 0; padding: 5px; background: rgba(76,175,80,0.1); border-radius: 4px;">${m.content.substring(0, 50)}...</div>`).join('');
            }
            
            modal.dataset.mergeType = type;
            modal.style.display = 'flex';
        }

        // 确认合并
        async function confirmMerge() {
            const modal = document.getElementById('memory-merge-modal');
            const type = modal.dataset.mergeType;
            modal.style.display = 'none';
            
            if (type === 'short') {
                // 合并短期记忆为长期记忆
                await mergeShortToLong();
            } else {
                // 合并长期记忆为核心记忆
                await mergeLongToCore();
            }
            
            renderMemoryList();
            updateMemoryStats();
        }

        // 取消合并
        function cancelMerge() {
            document.getElementById('memory-merge-modal').style.display = 'none';
        }

        // 合并短期记忆为长期记忆
        async function mergeShortToLong() {
            const contents = memoryData.short.map(m => m.content).join('\n\n');
            const summary = await summarizeMemory(contents, '长期');
            
            memoryData.long.push({
                id: Date.now(),
                content: summary,
                createdAt: new Date().toLocaleString(),
                sourceCount: memoryData.short.length
            });
            
            memoryData.short = []; // 清空短期记忆
            saveMemoryToStorage();
            showToast('已生成长期记忆', 'success');
        }

        // 合并长期记忆为核心记忆
        async function mergeLongToCore() {
            const contents = memoryData.long.map(m => m.content).join('\n\n');
            const summary = await summarizeMemory(contents, '核心');
            
            memoryData.core.push({
                id: Date.now(),
                content: summary,
                createdAt: new Date().toLocaleString(),
                sourceCount: memoryData.long.length,
                editable: true
            });
            
            memoryData.long = []; // 清空长期记忆
            saveMemoryToStorage();
            showToast('已生成核心记忆', 'success');
        }

        // AI总结记忆
        async function summarizeMemory(contents, type) {
            try {
                const response = await fetch(`${API_BASE}/dialogue`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                        message: `请将以下内容总结成一杯${type}记忆，保留关键信息，简洁明了：\n\n${contents}`,
                        isSummary: true
                    })
                });
                const result = await response.json();
                if (result.success && result.data) {
                    return result.data[0]?.content || result.data;
                }
            } catch (error) {
                console.error('记忆总结失败:', error);
            }
            // 如果AI总结失败，返回简单摘要
            return `[${type}记忆}] ${contents.substring(0, 100)}...`;
        }

        // 添加短期记忆（在对话后调用）
        async function addShortMemory(userMessage, aiResponse) {
            const content = `用户: ${userMessage}\nAI: ${aiResponse}`;
            memoryData.short.push({
                id: Date.now(),
                content: content,
                createdAt: new Date().toLocaleString()
            });
            saveMemoryToStorage();
            updateMemoryStats();
        }

        // 渲染记忆列表
        function renderMemoryList() {
            // 渲染短期记忆
            const shortList = document.getElementById('short-memory-list');
            if (shortList) {
                shortList.innerHTML = memoryData.short.map(m => `
                    <div class="memory-item">
                        <div class="memory-item-header">
                            <span class="memory-item-type mem-type-short">短期</span>
                            <span class="memory-item-time">${m.createdAt}</span>
                        </div>
                        <div class="memory-item-content">${m.content}</div>
                        <div class="memory-item-actions">
                            <button class="memory-item-btn delete" onclick="deleteMemory('short', ${m.id})">删除</button>
                        </div>
                    </div>
                `).join('') || '<div style="text-align: center; color: #666; padding: 40px;">暂无短期记忆</div>';
            }
            
            // 渲染长期记忆
            const longList = document.getElementById('long-memory-list');
            if (longList) {
                longList.innerHTML = memoryData.long.map(m => `
                    <div class="memory-item">
                        <div class="memory-item-header">
                            <span class="memory-item-type mem-type-long">长期</span>
                            <span class="memory-item-time">${m.createdAt}</span>
                        </div>
                        <div class="memory-item-content">${m.content}</div>
                        <div class="memory-item-actions">
                            <button class="memory-item-btn delete" onclick="deleteMemory('long', ${m.id})">删除</button>
                        </div>
                    </div>
                `).join('') || '<div style="text-align: center; color: #666; padding: 40px;">暂无长期记忆</div>';
            }
            
            // 渲染核心记忆
            const coreList = document.getElementById('core-memory-list');
            if (coreList) {
                coreList.innerHTML = memoryData.core.map(m => `
                    <div class="memory-item">
                        <div class="memory-item-header">
                            <span class="memory-item-type mem-type-core">核心</span>
                            <span class="memory-item-time">${m.createdAt}</span>
                        </div>
                        <div class="memory-item-content" contenteditable="${m.editable !== false}" onblur="updateCoreMemory(${m.id}, this.innerText)">${m.content}</div>
                        <div class="memory-item-actions">
                            <button class="memory-item-btn import" onclick="showImportModal(${m.id})">导入设定</button>
                            <button class="memory-item-btn delete" onclick="deleteMemory('core', ${m.id})">删除</button>
                        </div>
                    </div>
                `).join('') || '<div style="text-align: center; color: #666; padding: 40px;">暂无核心记忆</div>';
            }
        }

        // 更新核心记忆内容（可编辑）
        function updateCoreMemory(id, newContent) {
            const memory = memoryData.core.find(m => m.id === id);
            if (memory) {
                memory.content = newContent;
                saveMemoryToStorage();
            }
        }

        // 删除记忆
        function deleteMemory(type, id) {
            if (!confirm('确定要删除这条记忆吗？')) return;
            memoryData[type] = memoryData[type].filter(m => m.id !== id);
            saveMemoryToStorage();
            renderMemoryList();
            updateMemoryStats();
        }

        // 显示导入弹窗
        let currentImportMemoryId = null;
        function showImportModal(id) {
            currentImportMemoryId = id;
            document.getElementById('memory-import-modal').style.display = 'flex';
        }

        // 关闭导入弹窗
        function closeImportModal() {
            document.getElementById('memory-import-modal').style.display = 'none';
            currentImportMemoryId = null;
        }

        // 导入到世界书
        function importToWorldbook() {
            const memory = memoryData.core.find(m => m.id === currentImportMemoryId);
            if (!memory) return;
            
            // 添加到用户世界书条目
            if (!userSettings.worldbook.entries) userSettings.worldbook.entries = [];
            userSettings.worldbook.entries.push({
                keyword: '核心记忆',
                content: memory.content
            });
            saveUserSettingsToStorage();
            
            showToast('已导入到个人世界书', 'success');
            closeImportModal();
        }

        // 导入到提示词
        function importToPrompt() {
            const memory = memoryData.core.find(m => m.id === currentImportMemoryId);
            if (!memory) return;
            
            // 添加到用户提示词设定
            userSettings.prompt.personality += `\n\n[核心记忆] ${memory.content}`;
            saveUserSettingsToStorage();
            
            showToast('已导入到提示词设定', 'success');
            closeImportModal();
        }

        // 打开记忆库面板
        function openMemoryPanel() {
            loadMemoryFromStorage();
            renderMemoryList();
            document.getElementById('memory-panel').style.display = 'flex';
        }

        // 关闭记忆库面板
        function closeMemoryPanel() {
            document.getElementById('memory-panel').style.display = 'none';
        }

        // 显示对话log
        function showDialogueLog() {
            updateDialogueLog();
            elements.dialogueLog.style.display = 'block';
        }
        // 隐藏对话log
        function hideDialogueLog() {
            elements.dialogueLog.style.display = 'none';
        }
        
        // ==================== 状态栏功能 ====================
        
        /**
         * 状态栏数据结构接口
         * 供后续拓展，可通过 API 获取服务器数据或本地存储
         */
        const GameStatusAPI = {
            // 获取玩家状态
            getPlayerStatus: async function() {
                // TODO: 实现从服务器获取玩家状态
                // 目前返回本地存储的数据
                const saved = localStorage.getItem('galgame_player_status');
                if (saved) {
                    return JSON.parse(saved);
                }
                return null;
            },
            
            // 保存玩家状态
            savePlayerStatus: async function(status) {
                localStorage.setItem('galgame_player_status', JSON.stringify(status));
                // TODO: 同步到服务器
            },
            
            // 获取角色好感度列表
            getCharacterFavor: async function() {
                // TODO: 实现从服务器获取角色好感度
                const saved = localStorage.getItem('galgame_character_favor');
                if (saved) {
                    return JSON.parse(saved);
                }
                return [];
            },
            
            // 更新角色好感度
            updateCharacterFavor: async function(characterId, delta) {
                const favors = await this.getCharacterFavor();
                const index = favors.findIndex(c => c.id === characterId);
                if (index >= 0) {
                    favors[index].favor = Math.max(0, Math.min(100, favors[index].favor + delta));
                    favors[index].lastUpdate = new Date().toISOString();
                }
                localStorage.setItem('galgame_character_favor', JSON.stringify(favors));
                // TODO: 同步到服务器
                return favors;
            },
            
            // 初始化角色数据（从游戏世界配置中加载）
            initCharactersFromWorld: async function(worldData) {
                if (!worldData || !worldData.characters) return;
                
                const favors = await this.getCharacterFavor();
                const newCharacters = worldData.characters
                    .filter(c => !favors.find(f => f.id === c.id))
                    .map(c => ({
                        id: c.id,
                        name: c.name,
                        role: c.role || '未知角色',
                        avatar: c.avatar || '👤',
                        favor: c.initialFavor || 50,
                        lastUpdate: new Date().toISOString()
                    }));
                
                if (newCharacters.length > 0) {
                    const updated = [...favors, ...newCharacters];
                    localStorage.setItem('galgame_character_favor', JSON.stringify(updated));
                }
            }
        };
        
        // 角色栏显示状态
        let charactersPanelVisible = false;
        
        // 初始化角色栏按钮事件
        function initCharactersPanel() {
            const btn = document.getElementById('characters-panel-btn');
            const panel = document.getElementById('characters-panel');
            const closeBtn = document.getElementById('close-characters-panel');
            
            console.log('初始化角色栏:', {btn: !!btn, panel: !!panel, closeBtn: !!closeBtn});
            
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('角色栏按钮被点击');
                    toggleCharactersPanel();
                });
            }
            
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    if (panel) panel.style.display = 'none';
                });
            }
        }
        
        // 切换角色栏显示
        function toggleCharactersPanel() {
            console.log('切换角色栏');
            const panel = document.getElementById('characters-panel');
            if (!panel) {
                console.error('找不到角色栏面板');
                return;
            }
            
            if (panel.style.display === 'none' || !panel.style.display) {
                console.log('显示角色栏');
                refreshCharactersPanel();
                panel.style.display = 'block';
                charactersPanelVisible = true;
            } else {
                console.log('隐藏角色栏');
                panel.style.display = 'none';
                charactersPanelVisible = false;
            }
        }
        
        // 刷新角色栏内容
        async function refreshCharactersPanel() {
            try {
                // 加载角色列表
                const characters = await loadCharactersForPanel();
                renderCharactersList(characters);
            } catch (error) {
                console.error('加载角色失败:', error);
                document.getElementById('characters-list').innerHTML = '<p style="color: #ff6b6b; text-align: center; padding: 30px;">加载失败</p>';
            }
        }
        
        // 加载角色列表
        async function loadCharactersForPanel() {
            const gameId = currentWorld?._id;
            const url = gameId ? `${API_BASE}/characters?gameId=${gameId}` : `${API_BASE}/characters`;
            
            const response = await fetch(url, { headers: getAuthHeaders() });
            const result = await response.json();
            
            if (result.success && result.data) {
                // 保存完整的角色数据到全局变量
                window.currentGameCharacters = result.data.map(char => ({
                    ...char,
                    id: char._id || char.id,
                    _id: char._id || char.id
                }));
                
                return result.data.map(char => ({
                    _id: char._id || char.id,
                    id: char._id || char.id,
                    name: char.name,
                    color: char.color || '#8a6d3b',
                    image: char.image,
                    prompt: char.prompt || '',
                    favor: char.favor || 50,
                    trust: char.trust || 50,
                    enabled: char.enabled !== false
                }));
            }
            return [];
        }
        
        // 渲染玩家状态
        function renderPlayerStatus(status) {
            const container = document.getElementById('player-status-content');
            
            if (!status) {
                container.innerHTML = '<p class="status-empty">暂无状态数据<br><small>游戏进行中会自动记录你的状态</small></p>';
                return;
            }
            
            // 默认显示一些基本状态字段
            const defaultFields = [
                { key: 'name', label: '名称', value: status.name || '未知' },
                { key: 'level', label: '等级', value: status.level || 1 },
                { key: 'hp', label: '生命值', value: `${status.hp || 100}/${status.maxHp || 100}` },
                { key: 'mp', label: '灵力值', value: `${status.mp || 100}/${status.maxMp || 100}` },
                { key: 'exp', label: '经验值', value: status.exp || 0 },
                { key: 'location', label: '当前位置', value: status.location || '未知' }
            ];
            
            // 如果有自定义字段，也显示出来
            const customFields = status.custom || [];
            
            let html = '';
            [...defaultFields, ...customFields].forEach(field => {
                html += `
                    <div class="player-status-item">
                        <span class="player-status-label">${field.label}</span>
                        <span class="player-status-value">${field.value}</span>
                    </div>
                `;
            });
            
            container.innerHTML = html;
        }
        
        // 渲染角色列表
        function renderCharactersList(characters) {
            const container = document.getElementById('characters-list');
            
            if (!characters || characters.length === 0) {
                container.innerHTML = '<p style="color: rgba(255,255,255,0.5); text-align: center; padding: 30px;">暂无角色数据</p>';
                return;
            }
            
            let html = '';
            characters.forEach(char => {
                // 根据好感度显示不同颜色
                let favorColor = '#ff6b9d';
                let favorLevel = '陌生';
                if (char.favor >= 80) { favorColor = '#ff1744'; favorLevel = '热恋'; }
                else if (char.favor >= 60) { favorColor = '#ff6b9d'; favorLevel = '友好'; }
                else if (char.favor >= 40) { favorColor = '#ffb347'; favorLevel = '中立'; }
                else if (char.favor >= 20) { favorColor = '#9e9e9e'; favorLevel = '冷淡'; }
                else { favorColor = '#616161'; favorLevel = '敌对'; }
                
                // 信任度
                const trust = char.trust !== undefined ? char.trust : 50;
                
                // 角色简介（取prompt前30字）
                const desc = char.prompt ? char.prompt.substring(0, 30) + '...' : '神秘的修仙者';
                
                // 头像显示
                const avatarHtml = char.image ? 
                    `<img src="${char.image}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" onerror="this.style.display='none'">` : 
                    char.name.charAt(0);
                
                html += `
                    <div class="character-item" data-character-id="${char._id || char.id}" style="
                        display: flex;
                        align-items: center;
                        padding: 12px;
                        background: rgba(255,255,255,0.05);
                        border-radius: 10px;
                        margin-bottom: 10px;
                        cursor: pointer;
                        transition: all 0.3s;
                        border: 1px solid rgba(138, 109, 59, 0.2);
                    " onmouseover="this.style.background='rgba(138,109,59,0.2)'; this.style.borderColor='rgba(138,109,59,0.5)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.borderColor='rgba(138,109,59,0.2)'">
                        <div style="
                            width: 50px;
                            height: 50px;
                            border-radius: 50%;
                            background: ${char.color || '#8a6d3b'};
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 20px;
                            margin-right: 12px;
                            border: 2px solid ${favorColor}60;
                            flex-shrink: 0;
                            overflow: hidden;
                        ">${avatarHtml}</div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="
                                font-weight: bold;
                                color: #fff;
                                font-size: 15px;
                                margin-bottom: 3px;
                            ">${char.name}</div>
                            <div style="
                                color: rgba(255,255,255,0.5);
                                font-size: 11px;
                                white-space: nowrap;
                                overflow: hidden;
                                text-overflow: ellipsis;
                            ">${desc}</div>
                            <div style="
                                display: flex;
                                gap: 10px;
                                margin-top: 4px;
                                font-size: 11px;
                            ">
                                <span style="color: ${favorColor};">❤️ ${char.favor || 0}</span>
                                <span style="color: #4CAF50;">🤝 ${trust}</span>
                            </div>
                        </div>
                        <div style="
                            text-align: center;
                            margin-left: 10px;
                            flex-shrink: 0;
                        ">
                            <div style="
                                font-size: 11px;
                                padding: 3px 8px;
                                background: ${favorColor}20;
                                border: 1px solid ${favorColor}60;
                                border-radius: 10px;
                                color: ${favorColor};
                                font-weight: bold;
                            ">${favorLevel}</div>
                        </div>
                    </div>
                `;
            });
            
            container.innerHTML = html;
            
            // 添加点击事件
            container.querySelectorAll('.character-item').forEach(item => {
                item.addEventListener('click', () => {
                    const charId = item.dataset.characterId;
                    showCharacterDetail(charId);
                });
            });
        }
        
        // 显示角色详情（完整属性展示）- 左右分栏布局（带角色经历）
        async function showCharacterDetail(characterId) {
            console.log('查看角色详情:', characterId);
            
            // 从localStorage获取角色好感度数据
            const saved = localStorage.getItem('galgame_character_favor');
            const favorData = saved ? JSON.parse(saved) : [];
            const favorChar = favorData.find(c => c.id === characterId || c._id === characterId);
            
            // 从全局角色数据获取完整信息
            let char = window.currentGameCharacters?.find(c => c._id === characterId || c.id === characterId);
            
            // 如果全局没有，尝试从localStorage的完整数据获取
            if (!char && favorChar && favorChar.image !== undefined) {
                char = favorChar;
            }
            
            // 如果还没有，尝试从API获取
            if (!char) {
                try {
                    const response = await fetch(`${API_BASE}/characters/${characterId}`, {
                        headers: getAuthHeaders()
                    });
                    if (response.ok) {
                        const result = await response.json();
                        if (result.success && result.data) {
                            char = result.data;
                        }
                    }
                } catch (e) {
                    console.warn('获取角色详情失败:', e);
                }
            }
            
            if (!char && !favorChar) {
                showToast('未找到角色数据', 'error');
                return;
            }
            
            // 合并数据（以实时数据为主）
            const mergedChar = {
                ...favorChar,
                ...char,
                favor: favorChar?.favor ?? char?.favor ?? 50,
                trust: favorChar?.trust ?? char?.trust ?? 50
            };
            
            // 使用合并后的数据
            const charData = mergedChar;
            
            console.log('角色详情数据:', charData);
            
            // 创建详情弹窗
            const modal = document.createElement('div');
            modal.id = 'character-detail-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.85);
                z-index: 3000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            `;
            
            // 好感度等级和颜色
            let favorLevel = '敌对', favorColor = '#616161', favorEmoji = '💀';
            let trustLevel = '防备', trustColor = '#ff5722';
            if (charData.favor >= 80) { 
                favorLevel = '热恋'; favorColor = '#ff1744'; favorEmoji = '💖';
                trustLevel = '托付'; trustColor = '#e91e63';
            }
            else if (charData.favor >= 60) { 
                favorLevel = '友好'; favorColor = '#ff6b9d'; favorEmoji = '💕';
                trustLevel = '信任'; trustColor = '#9c27b0';
            }
            else if (charData.favor >= 40) { 
                favorLevel = '中立'; favorColor = '#ffb347'; favorEmoji = '💛';
                trustLevel = '观察'; trustColor = '#ff9800';
            }
            else if (charData.favor >= 20) { 
                favorLevel = '冷淡'; favorColor = '#9e9e9e'; favorEmoji = '💚';
                trustLevel = '警惕'; trustColor = '#795548';
            }
            
            const trust = charData.trust !== undefined ? charData.trust : 50;
            const mood = charData.mood || (charData.stats && charData.stats.mood) || '平静';
            const encounters = charData.meetCount || (charData.stats && charData.stats.encounters) || 1;
            const dialogueTurns = charData.dialogueCount || (charData.stats && charData.stats.dialogueTurns) || 0;
            
            // 心情表情
            const moodEmoji = {
                '平静': '😌', '开心': '😊', '低落': '😔',
                '生气': '😠', '紧张': '😰', '好奇': '🤔'
            }[mood] || '😌';
            
            // 图片地址处理 - 宽松判断，只要有内容就尝试显示
            const imageUrl = charData.image || charData.imageUrl || '';
            const displayImage = imageUrl && imageUrl.length > 5; // 只要URL长度足够就尝试显示
            
            // 调试信息
            console.log('角色图片信息:', {
                name: charData.name,
                image: charData.image,
                imageUrl: charData.imageUrl,
                displayImage: displayImage,
                finalUrl: imageUrl
            });
            
            modal.innerHTML = `
                <div style="
                    background: linear-gradient(135deg, #1a1a2e, #16213e);
                    border: 1px solid rgba(138, 109, 59, 0.4);
                    border-radius: 20px;
                    max-width: 800px;
                    width: 100%;
                    max-height: 90vh;
                    overflow: hidden;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                ">
                    <!-- 顶部标题栏 -->
                    <div style="
                        background: linear-gradient(90deg, rgba(138,109,59,0.3), transparent);
                        padding: 20px 25px;
                        border-bottom: 1px solid rgba(138,109,59,0.2);
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    ">
                        <h2 style="color: #d4a574; margin: 0; font-size: 20px;">👤 角色详情</h2>
                        <button onclick="document.getElementById('character-detail-modal').remove()" style="
                            background: none;
                            border: none;
                            color: rgba(255,255,255,0.6);
                            font-size: 24px;
                            cursor: pointer;
                            padding: 0;
                            width: 32px;
                            height: 32px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            border-radius: 50%;
                            transition: all 0.2s;
                        " onmouseover="this.style.background='rgba(255,255,255,0.1)'; this.style.color='#fff'" 
                           onmouseout="this.style.background='none'; this.style.color='rgba(255,255,255,0.6)'">&times;</button>
                    </div>
                    
                    <!-- 内容区域 - 左右分栏 -->
                    <div style="display: flex; flex: 1; overflow: hidden;">
                        <!-- 左侧：角色立绘区 -->
                        <div style="
                            width: 260px;
                            background: rgba(0,0,0,0.3);
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: flex-start;
                            padding: 25px;
                            border-right: 1px solid rgba(138,109,59,0.2);
                            overflow-y: auto;
                        ">
                            <!-- 角色图片/头像 -->
                            <div style="
                                width: 200px;
                                height: 260px;
                                border-radius: 12px;
                                overflow: hidden;
                                border: 3px solid ${favorColor};
                                box-shadow: 0 0 30px ${favorColor}40;
                                margin-bottom: 15px;
                                position: relative;
                                background: ${charData.color || '#8a6d3b'};
                            " id="char-detail-avatar">
                                ${displayImage ? `
                                    <img src="${imageUrl}" style="width: 100%; height: 100%; object-fit: cover; display: block;" 
                                         onload="console.log('角色图片加载成功:', '${charData.name}')"
                                         onerror="console.log('角色图片加载失败:', '${charData.name}', '${imageUrl}'); this.style.display='none'; document.getElementById('avatar-fallback-${characterId}').style.display='flex';">
                                    <div id="avatar-fallback-${characterId}" style="display: none; width: 100%; height: 100%; position: absolute; top: 0; left: 0; 
                                                align-items: center; justify-content: center; font-size: 80px; color: rgba(255,255,255,0.9); background: ${charData.color || '#8a6d3b'};">
                                        ${charData.name ? charData.name.charAt(0) : '?'}
                                    </div>
                                ` : `
                                    <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 80px; color: rgba(255,255,255,0.9);">
                                        ${charData.name ? charData.name.charAt(0) : '?'}
                                    </div>
                                `}
                                <!-- 心情标签 -->
                                <div style="
                                    position: absolute;
                                    bottom: 10px;
                                    right: 10px;
                                    background: rgba(0,0,0,0.8);
                                    padding: 6px 12px;
                                    border-radius: 15px;
                                    font-size: 12px;
                                    color: #fff;
                                    display: flex;
                                    align-items: center;
                                    gap: 4px;
                                    border: 1px solid rgba(255,255,255,0.2);
                                ">
                                    ${moodEmoji} ${mood}
                                </div>
                            </div>
                            
                            <!-- 角色名称 -->
                            <h3 style="color: #fff; margin: 0 0 8px 0; font-size: 22px; text-align: center;">${charData.name}</h3>
                            
                            <!-- 好感度等级标签 -->
                            <div style="
                                background: ${favorColor}20;
                                border: 1px solid ${favorColor}60;
                                padding: 6px 18px;
                                border-radius: 20px;
                                font-size: 14px;
                                color: ${favorColor};
                                font-weight: bold;
                                display: flex;
                                align-items: center;
                                gap: 6px;
                                margin-bottom: 15px;
                            ">
                                ${favorEmoji} ${favorLevel}
                            </div>
                            
                            <!-- 角色简介 -->
                            <p style="
                                color: rgba(255,255,255,0.6); 
                                font-size: 12px; 
                                text-align: center; 
                                line-height: 1.6;
                                margin: 0;
                                padding: 0 10px;
                            ">
                                ${charData.prompt ? charData.prompt.substring(0, 60) + '...' : '神秘的修仙者'}
                            </p>
                        </div>
                        
                        <!-- 右侧：属性面板 -->
                        <div style="flex: 1; padding: 25px; overflow-y: auto;">
                            <!-- 好感度条 -->
                            <div style="margin-bottom: 18px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                    <span style="color: rgba(255,255,255,0.7); font-size: 13px;">💕 好感度</span>
                                    <span style="color: ${favorColor}; font-weight: bold; font-size: 16px;">${charData.favor}/100</span>
                                </div>
                                <div style="height: 10px; background: rgba(255,255,255,0.1); border-radius: 5px; overflow: hidden;">
                                    <div style="
                                        width: ${charData.favor}%; 
                                        height: 100%; 
                                        background: linear-gradient(90deg, ${favorColor}80, ${favorColor}); 
                                        border-radius: 5px;
                                        transition: width 0.5s ease;
                                        box-shadow: 0 0 10px ${favorColor}40;
                                    "></div>
                                </div>
                            </div>
                            
                            <!-- 信任度条 -->
                            <div style="margin-bottom: 20px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                    <span style="color: rgba(255,255,255,0.7); font-size: 13px;">🤝 信任度</span>
                                    <span style="color: ${trustColor}; font-weight: bold; font-size: 14px;">${trust}/100 (${trustLevel})</span>
                                </div>
                                <div style="height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
                                    <div style="
                                        width: ${trust}%; 
                                        height: 100%; 
                                        background: ${trustColor}; 
                                        border-radius: 3px;
                                        transition: width 0.5s ease;
                                    "></div>
                                </div>
                            </div>
                            
                            <!-- 属性网格 -->
                            <div style="
                                display: grid;
                                grid-template-columns: 1fr 1fr;
                                gap: 10px;
                                margin-bottom: 20px;
                            ">
                                <div style="
                                    background: rgba(255,255,255,0.05); 
                                    padding: 12px; 
                                    border-radius: 10px;
                                    border: 1px solid rgba(255,255,255,0.1);
                                ">
                                    <div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-bottom: 4px;">相遇次数</div>
                                    <div style="font-size: 20px; color: #FF9800; font-weight: bold;">${encounters}</div>
                                </div>
                                <div style="
                                    background: rgba(255,255,255,0.05); 
                                    padding: 12px; 
                                    border-radius: 10px;
                                    border: 1px solid rgba(255,255,255,0.1);
                                ">
                                    <div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-bottom: 4px;">对话轮数</div>
                                    <div style="font-size: 20px; color: #9C27B0; font-weight: bold;">${dialogueTurns}</div>
                                </div>
                            </div>
                            
                            <!-- 角色设定 -->
                            <div style="margin-bottom: 20px;">
                                <h4 style="color: #d4a574; font-size: 13px; margin: 0 0 8px 0; display: flex; align-items: center; gap: 5px;">
                                    <span>📝</span> 角色设定
                                </h4>
                                <p style="
                                    color: rgba(255,255,255,0.7); 
                                    font-size: 12px; 
                                    line-height: 1.6; 
                                    margin: 0;
                                    padding: 12px;
                                    background: rgba(0,0,0,0.2);
                                    border-radius: 8px;
                                    max-height: 80px;
                                    overflow-y: auto;
                                ">
                                    ${charData.prompt || charData.description || '一位神秘的修仙者，等待着与你编写属于你们的故事...'}
                                </p>
                            </div>
                            
                            <!-- 角色近期经历 -->
                            <div>
                                <h4 style="color: #d4a574; font-size: 13px; margin: 0 0 10px 0; display: flex; align-items: center; gap: 5px;">
                                    <span>📜</span> 角色近期经历
                                </h4>
                                <div id="character-experiences" style="
                                    background: rgba(0,0,0,0.2);
                                    border-radius: 10px;
                                    padding: 12px;
                                    min-height: 60px;
                                    max-height: 150px;
                                    overflow-y: auto;
                                ">
                                    <div style="color: rgba(255,255,255,0.4); font-size: 12px; text-align: center; padding: 20px;">
                                        加载中...
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // 点击背景关闭
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
            
            // 加载角色经历
            loadCharacterExperiences(characterId);
        }
        
        // 加载角色经历
        async function loadCharacterExperiences(characterId) {
            const container = document.getElementById('character-experiences');
            if (!container) return;
            
            try {
                const response = await fetch(`${API_BASE}/characters/${characterId}/experiences`, {
                    headers: getAuthHeaders()
                });
                
                // 如果API不存在(404)，显示友好提示
                if (response.status === 404) {
                    container.innerHTML = `
                        <div style="color: rgba(255,255,255,0.4); font-size: 12px; text-align: center; padding: 15px;">
                            暂无角色经历<br>
                            <span style="font-size: 11px;">与角色互动后会自动记录</span>
                        </div>
                    `;
                    return;
                }
                
                if (!response.ok) {
                    throw new Error('获取经历失败');
                }
                
                const result = await response.json();
                
                if (result.success && result.data && result.data.length > 0) {
                    // 按时间倒序排列，只显示已揭示的经历
                    const experiences = result.data
                        .filter(exp => exp.revealed)
                        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                        .slice(0, 5); // 最多显示5条
                    
                    if (experiences.length === 0) {
                        container.innerHTML = `
                            <div style="color: rgba(255,255,255,0.4); font-size: 12px; text-align: center; padding: 15px;">
                                暂无已揭示的经历
                            </div>
                        `;
                        return;
                    }
                    
                    container.innerHTML = experiences.map(exp => {
                        const importanceColor = {
                            'critical': '#ff1744',
                            'high': '#ff6b6d',
                            'normal': '#ffb347',
                            'low': '#9e9e9e'
                        }[exp.importance] || '#ffb347';
                        
                        const date = exp.gameDate || new Date(exp.createdAt).toLocaleDateString('zh-CN');
                        
                        return `
                            <div style="
                                padding: 10px 12px;
                                background: rgba(255,255,255,0.05);
                                border-radius: 8px;
                                margin-bottom: 8px;
                                border-left: 3px solid ${importanceColor};
                            ">
                                <div style="
                                    display: flex;
                                    justify-content: space-between;
                                    align-items: center;
                                    margin-bottom: 4px;
                                ">
                                    <span style="
                                        font-size: 12px; 
                                        font-weight: bold; 
                                        color: #fff;
                                    ">${exp.title}</span>
                                    <span style="
                                        font-size: 10px; 
                                        color: rgba(255,255,255,0.5);
                                    ">${date}</span>
                                </div>
                                <p style="
                                    font-size: 11px; 
                                    color: rgba(255,255,255,0.7); 
                                    margin: 0;
                                    line-height: 1.5;
                                    display: -webkit-box;
                                    -webkit-line-clamp: 2;
                                    -webkit-box-orient: vertical;
                                    overflow: hidden;
                                ">${exp.summary}</p>
                            </div>
                        `;
                    }).join('');
                    
                } else {
                    container.innerHTML = `
                        <div style="color: rgba(255,255,255,0.4); font-size: 12px; text-align: center; padding: 15px;">
                            暂无角色经历<br>
                            <span style="font-size: 11px;">与角色互动后会自动记录</span>
                        </div>
                    `;
                }
            } catch (error) {
                console.error('加载角色经历失败:', error);
                container.innerHTML = `
                    <div style="color: rgba(255,255,255,0.4); font-size: 12px; text-align: center; padding: 15px;">
                        加载失败<br>
                        <span style="font-size: 11px;">${error.message}</span>
                    </div>
                `;
            }
        }
        
        // 初始化状态栏（在游戏加载时调用）
        async function initGameStatus() {
            try {
                // 从后端API获取角色列表
                const gameId = currentWorld?._id;
                const url = gameId ? `${API_BASE}/characters?gameId=${gameId}` : `${API_BASE}/characters`;
                
                const response = await fetch(url, {
                    headers: getAuthHeaders()
                });
                
                if (response.ok) {
                    const result = await response.json();
                    const characters = result.data || [];
                    
                    if (characters.length > 0) {
                        // 获取现有的好感度数据
                        const saved = localStorage.getItem('galgame_character_favor');
                        const existingFavors = saved ? JSON.parse(saved) : [];
                        
                        // 保存完整的角色数据到全局变量（用于详情弹窗显示）
                        window.currentGameCharacters = characters.map(char => ({
                            ...char,
                            id: char._id || char.id,
                            _id: char._id || char.id
                        }));
                        
                        // 合并角色数据（用于角色栏列表显示）
                        const mergedCharacters = characters.map(char => {
                            const existing = existingFavors.find(f => f.id === char._id || f.id === char.id);
                            return {
                                _id: char._id || char.id,
                                id: char._id || char.id,
                                name: char.name,
                                prompt: char.prompt || '',
                                image: char.image || '',
                                role: char.prompt ? char.prompt.substring(0, 20) + '...' : '修仙者',
                                avatar: char.image ? '👤' : char.name.charAt(0),
                                favor: existing ? existing.favor : (char.favor || 50),
                                trust: char.trust || 50,
                                color: char.color || '#8a6d3b',
                                lastUpdate: existing ? existing.lastUpdate : new Date().toISOString()
                            };
                        });
                        
                        // 保存到localStorage
                        localStorage.setItem('galgame_character_favor', JSON.stringify(mergedCharacters));
                        console.log(`[GameStatus] 初始化了 ${mergedCharacters.length} 个角色状态`);
                    }
                }
            } catch (error) {
                console.error('初始化状态栏失败:', error);
            }
        }
        
        // Toast提示
        function showToast(message, type = 'success') {
            const toast = document.createElement('div');
            toast.style.cssText = `
                position: fixed;
                bottom: 30px;
                left: 50%;
                transform: translateX(-50%);
                padding: 12px 24px;
                background: ${type === 'success' ? 'rgba(76, 175, 80, 0.9)' : type === 'error' ? 'rgba(255, 99, 132, 0.9)' : 'rgba(138, 109, 59, 0.9)'};
                color: #fff;
                border-radius: 8px;
                font-size: 14px;
                z-index: 9999;
                animation: fadeInUp 0.3s ease;
            `;
            toast.textContent = message;
            document.body.appendChild(toast);
            setTimeout(() => {
                toast.style.animation = 'fadeOutDown 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
        // 添加动画样式
        const toastStyle = document.createElement('style');
        toastStyle.textContent = `
            @keyframes fadeInUp {
                from { opacity: 0; transform: translateX(-50%) translateY(20px); }
                to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
            @keyframes fadeOutDown {
                from { opacity: 1; transform: translateX(-50%) translateY(0); }
                to { opacity: 0; transform: translateX(-50%) translateY(20px); }
            }
        `;
        document.head.appendChild(toastStyle);
        // 更新对话log内容
        function updateDialogueLog() {
            elements.logContent.innerHTML = '';
            chatHistory.forEach((entry, index) => {
                const logEntry = document.createElement('div');
                logEntry.className = 'log-entry';
                logEntry.style.cursor = 'pointer';
                logEntry.style.transition = 'background-color 0.2s ease';
                // 添加点击事件监听器，实现跳转功能
                logEntry.addEventListener('click', () => {
                    jumpToChatEntry(index);
                });
                // 添加悬停效果
                logEntry.addEventListener('mouseenter', () => {
                    logEntry.style.backgroundColor = 'rgba(255, 179, 71, 0.1)';
                });
                logEntry.addEventListener('mouseleave', () => {
                    logEntry.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                });
                const speaker = document.createElement('div');
                speaker.className = 'log-speaker';
                speaker.textContent = escapeHtml(entry.character);
                const content = document.createElement('div');
                content.className = 'log-content';
                content.textContent = escapeHtml(entry.text);
                logEntry.appendChild(speaker);
                logEntry.appendChild(content);
                elements.logContent.appendChild(logEntry);
            });
        }
        // 显示AI回复历史
        function showAIResponseLog() {
            updateAIResponseLog();
            elements.aiLog.style.display = 'block';
        }
        // 隐藏AI回复历史
        function hideAIResponseLog() {
            elements.aiLog.style.display = 'none';
        }
        // 跳转到指定的聊天条目
        function jumpToChatEntry(index) {
            if (index >= 0 && index < chatHistory.length) {
                const entry = chatHistory[index];
                updateChatDisplay(entry.character, entry.text);
                // 隐藏对话log面板，回到主界面
                hideDialogueLog();
            }
        }
        // 更新AI回复历史内容
        function updateAIResponseLog() {
            elements.aiLogContent.innerHTML = '';
            if (aiResponseHistory.length === 0) {
                const emptyMessage = document.createElement('div');
                emptyMessage.style.textAlign = 'center';
                emptyMessage.style.color = '#999';
                emptyMessage.style.padding = '40px 0';
                emptyMessage.textContent = '暂无AI回复历史';
                elements.aiLogContent.appendChild(emptyMessage);
                return;
            }
            aiResponseHistory.forEach((entry, index) => {
                const logEntry = document.createElement('div');
                logEntry.className = 'ai-log-entry';
                const header = document.createElement('div');
                header.style.display = 'flex';
                header.style.justifyContent = 'space-between';
                header.style.alignItems = 'center';
                header.style.marginBottom = '10px';
                const indexElement = document.createElement('div');
                indexElement.style.fontWeight = 'bold';
                indexElement.style.color = '#4CAF50';
                indexElement.textContent = `回复 #${index + 1}`;
                const timestamp = document.createElement('div');
                timestamp.className = 'ai-log-timestamp';
                timestamp.textContent = entry.timestamp;
                header.appendChild(indexElement);
                header.appendChild(timestamp);
                const content = document.createElement('div');
                content.className = 'ai-log-content';
                
                // 尝试解析并美化显示
                try {
                    const parsed = JSON.parse(entry.content);
                    if (Array.isArray(parsed)) {
                        // 显示为对话列表
                        content.innerHTML = parsed.map((part, i) => `
                            <div style="margin-bottom: 8px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 6px; border-left: 3px solid ${getCharacterColor(part.type)};">
                                <strong style="color: ${getCharacterColor(part.type)};">${part.type}</strong>
                                <div style="margin-top: 4px; color: #ccc;">${escapeHtml(part.content.substring(0, 100))}${part.content.length > 100 ? '...' : ''}</div>
                            </div>
                        `).join('');
                    } else if (parsed.success && Array.isArray(parsed.data)) {
                        // 新的响应格式
                        content.innerHTML = parsed.data.map((part, i) => `
                            <div style="margin-bottom: 8px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 6px; border-left: 3px solid ${getCharacterColor(part.type)};">
                                <strong style="color: ${getCharacterColor(part.type)};">${part.type}</strong>
                                <div style="margin-top: 4px; color: #ccc;">${escapeHtml(part.content.substring(0, 100))}${part.content.length > 100 ? '...' : ''}</div>
                            </div>
                        `).join('');
                    } else {
                        content.textContent = entry.content;
                    }
                } catch (e) {
                    // 如果不是JSON，直接显示
                    content.textContent = entry.content;
                }
                
                logEntry.appendChild(header);
                logEntry.appendChild(content);
                elements.aiLogContent.appendChild(logEntry);
            });
        }
        // 拆解AI生成的内容
        function parseAIResponse(response) {
            // 智能拆解逻辑，提取角色发言和默认描述内容
            const parts = [];
            const defaultDescriptions = [];
            // 按换行符分割内容，支持各种换行方式
            const lines = response.split(/\n+/).filter(line => line.trim());
            // 获取所有角色名称
            const characterNames = Object.keys(characterConfig).filter(name => 
                name !== '默认描述者' && name !== 'AI' && name !== 'You'
            );
            // 遍历每一行内容
            lines.forEach(line => {
                // 去除首尾空白
                let content = line.trim();
                
                // 移除类型标签，如**角色对话：**、**旁白：**、**环境描写：**
                content = content.replace(/^\s*\*\*[\u4e00-\u9fa5]*[：:]*\*\*\s*/, '').trim();
                // 移除旁白：格式的标签
                content = content.replace(/^\s*旁白[：:]*\s*/, '').trim();
                // 移除其他可能的类型标签，如角色对话：、环境描写：等
                content = content.replace(/^\s*[\u4e00-\u9fa5]*[：:]*\s*/, '').trim();
                
                // 标志是否匹配到角色
                let matched = false;
                // 遍历所有角色，检查是否是该角色的发言
                for (const characterName of characterNames) {
                    // 构建正则表达式，匹配角色名称开头带冒号的情况，包括**角色名称**：格式，忽略开头空白
                    const regex = new RegExp(`^\s*(\*\*${characterName}\*\*|${characterName})[：:]`);
                    // 检查是否匹配
                    if (regex.test(content) || 
                        (content.includes(characterName) && (content.includes('说') || content.includes('道') || content.includes('问道') || content.includes('说道')))) {
                        // 提取角色发言内容
                        const characterContent = content.replace(regex, '').trim();
                        // 移除结尾的**标记
                        const cleanedContent = characterContent.replace(/\*\*\s*$/, '').trim();
                        parts.push({
                            type: characterName,
                            content: cleanedContent
                        });
                        matched = true;
                        break;
                    }
                }
                // 其他内容作为默认描述者的发言
                if (!matched && content) {
                    defaultDescriptions.push(content);
                }
            });
            // 如果有默认描述内容，添加到parts中
            if (defaultDescriptions.length > 0) {
                // 将默认描述内容合并为一个段落
                const descriptionContent = defaultDescriptions.join('\n').trim();
                if (descriptionContent) {
                    parts.unshift({
                        type: '默认描述者',
                        content: descriptionContent
                    });
                }
            }
            // 如果没有提取到任何内容，尝试更宽松的匹配
            if (parts.length === 0) {
                // 再次遍历，使用更宽松的匹配规则
                lines.forEach(line => {
                    let content = line.trim();
                    
                    // 移除类型标签
                    content = content.replace(/^\s*\*\*[\u4e00-\u9fa5]*[：:]*\*\*\s*/, '').trim();
                    // 移除旁白：格式的标签
                    content = content.replace(/^\s*旁白[：:]*\s*/, '').trim();
                    // 移除其他可能的类型标签，如角色对话：、环境描写：等
                    content = content.replace(/^\s*[\u4e00-\u9fa5]*[：:]*\s*/, '').trim();
                    
                    // 标志是否匹配到角色
                    let matched = false;
                    // 遍历所有角色，检查是否包含角色名称
                    for (const characterName of characterNames) {
                        if (content.includes(characterName)) {
                            parts.push({
                                type: characterName,
                                content: content.trim()
                            });
                            matched = true;
                            break;
                        }
                    }
                    // 其他内容
                    if (!matched && content) {
                        parts.push({
                            type: '默认描述者',
                            content: content.trim()
                        });
                    }
                });
            }
            return parts;
        }
        // 处理聊天消息
        function handleChatMessage(message) {
            if (!message.trim()) return;
            // 退出回溯模式，回到正常模式
            backtrackMode = false;
            // 添加用户消息到聊天历史
            chatHistory.push({
                character: 'You',
                text: message
            });
            // 显示用户消息
            updateChatDisplay('You', message);
            // 清空输入框
            elements.userInput.value = '';
            // 模拟AI思考延迟
            setTimeout(() => {
                generateAIResponse(message);
            }, 1000);
        }
        // 生成AI回复
        async function generateAIResponse(userMessage) {
            // 显示AI正在思考的提示
            updateChatDisplay('旁白', 'AI正在思考，请稍候...');
            console.log('开始生成AI回复:', userMessage);
            try {
                // ========== 新世界书系统 ==========
                let worldbookEntries = [];
                if (worldbookManager) {
                    // 使用新的世界书引擎检测触发
                    const context = {
                        userName: window.currentUserCharacter?.name || '用户',
                        characterName: currentCharacter?.name,
                        recentMessages: chatHistory.slice(-5).map(h => h.text)
                    };
                    worldbookEntries = worldbookManager.detectTriggers(userMessage, context);
                    console.log('[Worldbook] 触发的条目:', worldbookEntries.length);
                }
                
                // 收集用户个人设置（旧系统兼容）
                const userPromptAddon = getUserPromptAddon();
                const userEntries = userSettings.worldbook.entries
                    .filter(e => userMessage.includes(e.keyword))
                    .map(e => `[${e.keyword}] ${e.content}`)
                    .join('\n');
                
                // 情感系统提示词
                const emotionPrompt = getEmotionSystemPrompt();
                
                // ========== 使用 PromptBuilder 构建提示词 ==========
                const gameConfig = {
                    userName: window.currentUserCharacter?.name || '用户',
                    characterName: currentCharacter?.name || '角色',
                    worldName: currentWorld?.title || '世界'
                };
                
                const builder = new PromptBuilder(gameConfig);
                
                // System 层：基础设定
                if (aiApiSettings.systemPrompt) {
                    builder.setSystem(aiApiSettings.systemPrompt);
                }
                
                // Character 层：角色定义
                if (currentCharacter?.prompt) {
                    builder.setCharacter(currentCharacter.prompt, currentCharacter.name);
                }
                
                // Worldbook 层：动态知识
                if (worldbookEntries.length > 0) {
                    builder.addWorldbook(worldbookEntries);
                }
                
                // User 层：用户自定义
                if (userPromptAddon) {
                    builder.setUserPrompt(userPromptAddon);
                }
                if (userEntries) {
                    builder.setUserPrompt(userEntries);
                }
                
                // 构建最终提示词
                const promptResult = builder.build({ format: 'openai' });
                const fullSystemPrompt = promptResult.system + '\n' + emotionPrompt;
                
                console.log('[PromptBuilder] Token 统计:', promptResult.stats);
                
                // 调用后端 API
                console.log('发送请求到后端API...');
                const response = await fetch(`${API_BASE}/dialogue`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                        message: userMessage,
                        characterId: '123',
                        userSettings: {
                            promptAddon: userPromptAddon,
                            worldbookEntries: userEntries,
                            temperature: userSettings.ai.temperature,
                            systemPrompt: fullSystemPrompt
                        }
                    })
                });
                
                console.log('收到后端响应:', response.status, response.statusText);
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`API请求失败: ${response.status} ${response.statusText}\n${errorData.error || ''}`);
                }
                
                // 解析后端响应
                const result = await response.json();
                console.log('后端响应数据:', result);
                
                // 保存完整的AI回复到历史记录
                aiResponseHistory.push({
                    timestamp: new Date().toLocaleString(),
                    content: JSON.stringify(result)
                });
                
                // 提取AI回复内容用于记忆
                const aiContent = result.data && result.data[0] ? result.data[0].content : JSON.stringify(result);
                
                // 添加到短期记忆
                await addShortMemory(userMessage, aiContent);
                
                // 按顺序显示拆解后的内容
                // 注意：result.data 是实际的对话内容数组
                const dialogueData = result.data || result;
                showParsedContent(dialogueData);
            } catch (error) {
                console.error('API调用错误:', error);
                // 显示详细的错误信息
                const errorMessage = `API调用失败: ${error.message}\n\n请检查:\n1. 后端服务是否运行在 http://localhost:3000\n2. 网络连接是否正常\n3. 浏览器控制台是否有其他错误`;
                updateChatDisplay('旁白', errorMessage);
                // 同时显示在AI回复历史中
                aiResponseHistory.push({
                    timestamp: new Date().toLocaleString(),
                    content: `错误: ${error.message}`
                });
            }
        }
        // 按顺序显示拆解后的内容
        let currentParts = [];
        let currentIndex = 0;
        let dialogueCount = 0;
        // 回溯模式变量
        let backtrackMode = false;
        let backtrackIndex = 0;
        function showParsedContent(parts) {
            currentParts = parts;
            currentIndex = 0;
            dialogueCount = 0;
            // 开始显示第一部分
            showNextPart();
        }
        function showNextPart() {
            if (backtrackMode) {
                // 在回溯模式下，推进对话历史
                backtrackIndex++;
                if (backtrackIndex < chatHistory.length) {
                    const entry = chatHistory[backtrackIndex];
                    updateChatDisplay(entry.character, entry.text);
                } else {
                    // 到达最后一轮后，跳回第一次对话
                    backtrackIndex = 0;
                    const firstEntry = chatHistory[0];
                    updateChatDisplay(firstEntry.character, firstEntry.text);
                }
            } else {
                // 正常模式下，处理AI生成的内容
                if (currentIndex < currentParts.length) {
                    const part = currentParts[currentIndex];
                    
                    // 🎭 情感分析处理
                    const characterId = part.type;
                    const rawContent = part.content;
                    
                    // 如果是角色对话，进行情感解析
                    if (characterId !== '默认描述者' && characterId !== '旁白') {
                        const emotionResult = processAIResponseWithEmotion(characterId, rawContent);
                        // 使用解析后的纯文本更新内容
                        part.content = emotionResult.cleanText;
                    }
                    
                    // 添加到聊天历史
                    chatHistory.push({
                        character: part.type,
                        text: part.content
                    });
                    // 显示当前部分
                    updateChatDisplay(part.type, part.content);
                    // 增加对话计数
                    dialogueCount++;
                    currentIndex++;
                } else if (chatHistory.length > 0) {
                    // 处理完所有AI生成的内容后，自动进入回溯模式
                    startDialogueBacktrack();
                }
            }
        }
        // 开始对话回溯 - 改进版，回到对话开始并支持重新推进
        function startDialogueBacktrack() {
            // 进入回溯模式，回到对话开始
            backtrackMode = true;
            backtrackIndex = 0;
            if (chatHistory.length > 0) {
                const firstEntry = chatHistory[0];
                updateChatDisplay(firstEntry.character, firstEntry.text);
                // 添加提示：输入新消息可继续对话
                setTimeout(() => {
                    updateChatDisplay('旁白', '💡 点击对话框可回顾历史，在下方输入新消息即可继续新的对话');
                }, 2000);
            } else {
                // 如果没有聊天历史，显示初始提示
                updateChatDisplay('旁白', '欢迎来到修仙世界！请输入你的基础信息，例如你的名字、来自哪里、为什么来到这里等，我们将根据你的信息开始这段奇妙的旅程。');
            }
        }
        // HTML转义函数，防止XSS攻击
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        // 获取角色颜色
        function getCharacterColor(characterName) {
            if (characterConfig[characterName] && characterConfig[characterName].color) {
                return characterConfig[characterName].color;
            }
            if (characterColors[characterName]) {
                return characterColors[characterName];
            }
            return '#999999';
        }
        
        // 验证图片URL安全性的函数
        function isValidImageUrl(url) {
            // 检查是否是有效的URL格式
            if (!url || url.trim() === '') {
                return false;
            }
            try {
                const urlObj = new URL(url);
                // 确保URL使用http或https协议
                if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
                    return false;
                }
                // 确保URL是图片格式（可选）
                const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
                const path = urlObj.pathname.toLowerCase();
                return imageExtensions.some(ext => path.endsWith(ext)) || 
                       url.includes('text_to_image'); // 允许文本转图片API
            } catch (e) {
                return false;
            }
        }
        // 初始化角色
        async function initCharacters(gameId) {
            console.log('开始初始化角色...', gameId ? `(游戏ID: ${gameId})` : '(无游戏ID，获取全局角色)');
            try {
                // 调用后端 API 获取角色列表
                const url = gameId ? `${API_BASE}/characters?gameId=${gameId}` : `${API_BASE}/characters`;
                console.log('发送请求获取角色列表:', url);
                const response = await fetch(url, {
                    headers: getAuthHeaders()
                });
                console.log('角色列表响应:', response.status, response.statusText);
                
                if (!response.ok) {
                    throw new Error('Failed to fetch characters');
                }
                
                const result = await response.json();
                console.log('角色响应:', result);
                
                // 获取角色数据数组
                const characters = result.data || [];
                console.log('获取到的角色数量:', characters.length);
                
                // 如果没有角色，创建默认角色
                if (characters.length === 0) {
                    console.log('没有角色，创建默认角色...');
                    await createDefaultCharacters();
                } else {
                    // 更新角色配置
                    console.log('更新角色配置...');
                    characters.forEach(character => {
                        characterConfig[character.name] = {
                            color: character.color,
                            image: character.image
                        };
                        characterColors[character.name] = character.color;
                    });
                }
            } catch (error) {
                console.error('初始化角色错误:', error);
                // 如果后端不可用，使用本地默认角色
                console.log('使用本地默认角色');
            }
        }

        // 创建默认角色
        async function createDefaultCharacters() {
            const defaultCharacters = [
                {
                    name: '林婉',
                    color: '#FF69B4',
                    image: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'400\'%3E%3Crect fill=\'%23FF69B4\' width=\'300\' height=\'400\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' fill=\'%23fff\' font-family=\'Microsoft YaHei\' font-size=\'20\' text-anchor=\'middle\'%3E林婉%3C/text%3E%3C/svg%3E',
                    prompt: '林婉是一个温柔、细腻、关心他人的女孩，说话轻声细语，总是为他人着想。她是修仙世界的向导，对周围的环境非常熟悉。'
                },
                {
                    name: '陆苍雪',
                    color: '#87CEFA',
                    image: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'400\'%3E%3Crect fill=\'%234ECDC4\' width=\'300\' height=\'400\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' fill=\'%23fff\' font-family=\'Microsoft YaHei\' font-size=\'20\' text-anchor=\'middle\'%3E陆苍雪%3C/text%3E%3C/svg%3E',
                    prompt: '陆苍雪是一个冷静、智慧、神秘的男孩，擅长冰系法术。他说话简洁有力，富有哲理，给人一种高深莫测的感觉。'
                },
                {
                    name: '轩辕霓裳',
                    color: '#FF4500',
                    image: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'400\'%3E%3Crect fill=\'%23FFD93D\' width=\'300\' height=\'400\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' fill=\'%23fff\' font-family=\'Microsoft YaHei\' font-size=\'20\' text-anchor=\'middle\'%3E玄辙霓裳%3C/text%3E%3C/svg%3E',
                    prompt: '轩辕霓裳是一个活泼、热情、豪爽的女孩，充满活力和趣味性。她喜欢热闹的地方，总是能给周围的人带来快乐。'
                }
            ];
            
            for (const character of defaultCharacters) {
                try {
                    await fetch(`${API_BASE}/characters`, {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        body: JSON.stringify(character)
                    });
                } catch (error) {
                    console.error('Error creating character:', error);
                }
            }
        }
        // 更新聊天显示
        function updateChatDisplay(speaker, message) {
            // 更新角色名称和对话内容，进行HTML转义
            if (speaker === '默认描述者') {
                // 默认描述者不需要名字，只显示内容
                elements.characterName.textContent = '';
            } else {
                elements.characterName.textContent = escapeHtml(speaker);
            }
            elements.dialogueText.textContent = escapeHtml(message);
            // 更新角色颜色
            updateCharacterColor(speaker);
            // 根据发言人显示对应的立绘
            if (speaker === '林婉') {
                // 显示林婉角色（左侧）
                showCharacterByName('林婉');
            } else if (speaker === '陆苍雪') {
                // 显示陆苍雪角色（中央）
                showCharacterByName('陆苍雪');
            } else if (speaker === '轩辕霓裳') {
                // 显示轩辕霓裳角色（右侧）
                showCharacterByName('轩辕霓裳');
            } else if (speaker === 'You') {
                // 用户发言时不显示任何角色立绘
                hideAllCharacters();
            } else if (characterConfig[speaker] && speaker !== '默认描述者') {
                // 处理其他已配置的角色，但排除默认描述者
                showCharacterByName(speaker);
            } else {
                // 旁白、环境描写和默认描述者时隐藏所有角色
                hideAllCharacters();
            }
            // 更新当前发言人
            currentSpeaker = speaker;

            // 自动切换背景图（仅当旁白/描述且内容较长时）
            if ((speaker === '旁白' || speaker === '默认描述者') && message.length > 10) {
                autoSwitchBackground(message);
            }
        }

        // 自动切换背景
        let backgroundSwitchTimeout = null;
        async function autoSwitchBackground(sceneText) {
            // 防抖：避免频繁切换
            if (backgroundSwitchTimeout) {
                clearTimeout(backgroundSwitchTimeout);
            }
            
            backgroundSwitchTimeout = setTimeout(async () => {
                const matchedBg = await matchBackgroundForScene(sceneText);
                if (matchedBg && matchedBg.url !== currentBackground) {
                    console.log(`切换背景: ${matchedBg.name}`);
                    switchBackground(matchedBg.url);
                }
            }, 500); // 延迟500ms，避免连续对话时频繁切换
        }
        // 预加载资源
        function preloadResources() {
            return new Promise((resolve) => {
                let loaded = 0;
                const total = gameData.scenes.length + Object.keys(characterConfig).length;
                // 预加载背景图
                gameData.scenes.forEach(scene => {
                    if (scene.background) {
                        const img = new Image();
                        img.src = scene.background;
                        img.onload = () => {
                            loaded++;
                            updateLoadingProgress(loaded, total);
                            if (loaded >= total) {
                                resolve();
                            }
                        };
                        img.onerror = () => {
                            loaded++;
                            updateLoadingProgress(loaded, total);
                            if (loaded >= total) {
                                resolve();
                            }
                        };
                    } else {
                        loaded++;
                        updateLoadingProgress(loaded, total);
                        if (loaded >= total) {
                            resolve();
                        }
                    }
                });
                // 预加载角色图片
                Object.values(characterConfig).forEach(config => {
                    if (config.image) {
                        const img = new Image();
                        img.src = config.image;
                        img.onload = () => {
                            loaded++;
                            updateLoadingProgress(loaded, total);
                            if (loaded >= total) {
                                resolve();
                            }
                        };
                        img.onerror = () => {
                            loaded++;
                            updateLoadingProgress(loaded, total);
                            if (loaded >= total) {
                                resolve();
                            }
                        };
                    } else {
                        loaded++;
                        updateLoadingProgress(loaded, total);
                        if (loaded >= total) {
                            resolve();
                        }
                    }
                });
            });
        }
        // 更新加载进度
        function updateLoadingProgress(loaded, total) {
            const progress = Math.min(Math.round((loaded / total) * 100), 100);
            elements.loadingProgress.style.width = `${progress}%`;
        }
        // 游戏初始化
        // 用户选择的角色预设
        let selectedUserCharacter = null;

        async function initGame() {
            // 首先加载世界配置
            await loadWorldConfig();
            
            // 初始化游戏状态（状态栏数据）
            await initGameStatus();
            
            // 检查是否需要选择角色
            const token = localStorage.getItem('galgame_token');
            if (token && currentWorld?.config?.allowCustomCharacter !== false) {
                // 加载用户角色预设
                const hasCharacter = await loadUserCharacterSelection();
                if (hasCharacter) {
                    // 显示角色选择界面
                    showCharacterSelection();
                    return;
                }
            }
            
            // 直接初始化世界角色
            await initGameWithCharacter(null);
        }

        // 加载用户的角色预设
        async function loadUserCharacterSelection() {
            try {
                const response = await fetch(`${API_BASE}/user-characters`, {
                    headers: getAuthHeaders()
                });
                const data = await response.json();
                
                if (data.success && data.data && data.data.length > 0) {
                    window.userCharacterPresets = data.data;
                    return true;
                }
                return false;
            } catch (error) {
                console.error('加载角色预设失败:', error);
                return false;
            }
        }

        // 显示角色选择界面
        function showCharacterSelection() {
            const presets = window.userCharacterPresets || [];
            
            // 创建角色选择界面
            const selectionHtml = `
                <div id="characterSelection" style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
                    z-index: 1000;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 40px;
                ">
                    <h2 style="font-size: 32px; margin-bottom: 10px; color: #f5f2eb;">选择你的身份</h2>
                    <p style="color: rgba(245, 242, 235, 0.7); margin-bottom: 40px;">
                        选择一个角色预设，或直接使用默认身份开始游戏
                    </p>
                    
                    <div style="
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                        gap: 24px;
                        max-width: 1000px;
                        width: 100%;
                    ">
                        <!-- 默认身份选项 -->
                        <div onclick="selectCharacter(null)" style="
                            background: rgba(138, 109, 59, 0.2);
                            border: 2px solid rgba(138, 109, 59, 0.5);
                            border-radius: 16px;
                            padding: 30px;
                            cursor: pointer;
                            transition: all 0.3s;
                            text-align: center;
                        " onmouseover="this.style.background='rgba(138, 109, 59, 0.3)'" 
                           onmouseout="this.style.background='rgba(138, 109, 59, 0.2)'">
                            <div style="font-size: 48px; margin-bottom: 16px;">👤</div>
                            <h3 style="margin-bottom: 8px;">默认身份</h3>
                            <p style="color: rgba(245, 242, 235, 0.6); font-size: 14px;">
                                以普通玩家身份进入世界
                            </p>
                        </div>
                        
                        ${presets.map(char => `
                            <div onclick="selectCharacter('${char._id}')" style="
                                background: rgba(30, 30, 46, 0.95);
                                border: 2px solid rgba(138, 109, 59, 0.3);
                                border-radius: 16px;
                                padding: 30px;
                                cursor: pointer;
                                transition: all 0.3s;
                                text-align: center;
                            " onmouseover="this.style.borderColor='rgba(138, 109, 59, 0.8)'; this.style.transform='translateY(-4px)'" 
                               onmouseout="this.style.borderColor='rgba(138, 109, 59, 0.3)'; this.style.transform='translateY(0)'">
                                <div style="
                                    width: 80px;
                                    height: 80px;
                                    border-radius: 50%;
                                    background: ${char.appearance?.hairColor || '#8a6d3b'};
                                    margin: 0 auto 16px;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    font-size: 32px;
                                ">${char.appearance?.avatar || '👤'}</div>
                                <h3 style="margin-bottom: 8px;">${char.name}</h3>
                                <p style="color: rgba(245, 242, 235, 0.6); font-size: 14px; line-height: 1.4;">
                                    ${char.background?.slice(0, 50) || '自定义角色'}...
                                </p>
                            </div>
                        `).join('')}
                    </div>
                    
                    <button onclick="window.location.href='user-character.html'" style="
                        margin-top: 40px;
                        padding: 12px 30px;
                        background: transparent;
                        border: 1px solid rgba(138, 109, 59, 0.5);
                        color: #f5f2eb;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 14px;
                    ">+ 创建新角色</button>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', selectionHtml);
            
            // 隐藏加载界面
            elements.loadingScreen.style.opacity = '0';
            setTimeout(() => {
                elements.loadingScreen.style.display = 'none';
            }, 500);
        }

        // 选择角色
        window.selectCharacter = function(characterId) {
            // 移除选择界面
            const selectionEl = document.getElementById('characterSelection');
            if (selectionEl) selectionEl.remove();
            
            // 获取选中的角色
            if (characterId) {
                selectedUserCharacter = window.userCharacterPresets.find(c => c._id === characterId);
            }
            
            // 继续初始化游戏
            initGameWithCharacter(selectedUserCharacter);
        };

        // 世界书管理器实例
        let worldbookManager = null;
        
        async function initGameWithCharacter(userCharacter) {
            // 初始化世界角色
            await initCharacters(currentWorld?._id);
            
            // 如果用户选择了角色，将其信息添加到开场白
            if (userCharacter) {
                console.log('使用角色预设:', userCharacter.name);
                window.currentUserCharacter = userCharacter;
            }
            
            // 检查当前用户是否是书本作者
            await checkAuthorPermission();
            
            // 加载用户个人设置
            loadUserSettingsFromStorage();
            loadAIPresetsFromStorage();
            updateAISettingsFromUser();
            
            // 加载记忆库
            loadMemoryFromStorage();
            
            // 初始化世界书系统
            await initWorldbookSystem();
            
            // 开始预加载资源
            preloadResources().then(() => {
                setTimeout(() => {
                    elements.loadingScreen.style.opacity = '0';
                    setTimeout(() => {
                        elements.loadingScreen.style.display = 'none';
                        // 初始化角色栏按钮事件
                        initCharactersPanel();
                        startGame();
                    }, 500);
                }, 500);
            });
        }

        // 初始化世界书系统
        async function initWorldbookSystem() {
            console.log('[Worldbook] 初始化世界书系统...');
            
            try {
                // 获取当前游戏ID
                const gameId = currentWorld?._id || currentWorld?.id;
                if (!gameId) {
                    console.warn('[Worldbook] 未找到游戏ID，跳过世界书初始化');
                    return;
                }
                
                // 创建世界书管理器
                worldbookManager = new WorldbookManager({ gameId });
                
                // 加载全局世界书
                await worldbookManager.loadGlobalWorldbook();
                
                // 如果有当前存档，设置存档
                const currentSaveId = localStorage.getItem(`galgame_current_save_${gameId}`);
                if (currentSaveId) {
                    worldbookManager.setCurrentSave(currentSaveId);
                }
                
                const stats = worldbookManager.getStats();
                console.log('[Worldbook] 世界书系统初始化完成:', stats);
                
            } catch (error) {
                console.error('[Worldbook] 初始化失败:', error);
                // 失败不影响游戏继续进行
            }
        }

        // 检查用户是否是书本作者
        async function checkAuthorPermission() {
            const token = localStorage.getItem('galgame_token');
            if (!token || !currentWorld) return;
            
            try {
                // 获取当前用户信息
                const userStr = localStorage.getItem('galgame_user');
                if (!userStr) return;
                
                const user = JSON.parse(userStr);
                const isAuthor = currentWorld.creator === user._id || currentWorld.creator === user.userId;
                const isAdmin = user.role === 'admin';
                
                // 如果不是作者也不是管理员，隐藏作者级设置
                if (!isAuthor && !isAdmin) {
                    console.log('当前用户不是作者，隐藏作者设置');
                    // 隐藏AI配置按钮（如果存在）
                    const aiConfigBtn = document.getElementById('ai-config-btn');
                    if (aiConfigBtn) aiConfigBtn.style.display = 'none';
                    // 移除设置菜单中的"设置"选项
                    const settingsMenuBtn = document.getElementById('settings-menu-btn');
                    if (settingsMenuBtn) settingsMenuBtn.style.display = 'none';
                }
            } catch (error) {
                console.error('检查作者权限失败:', error);
            }
        }
        
        // 开始游戏
        function startGame() {
            let openingMessage = currentWorld?.config?.openingMessage || 
                (currentWorld ? `欢迎来到《${currentWorld.title}》！${currentWorld.subtitle || ''}` : 
                '欢迎来到修仙世界！请输入你的基础信息，例如你的名字、来自哪里、为什么来到这里等，我们将根据你的信息开始这段奇妙的旅程。');
            
            // 如果用户选择了角色预设，追加角色信息
            if (window.currentUserCharacter) {
                const char = window.currentUserCharacter;
                const charInfo = `\n\n【玩家身份】\n姓名：${char.name}\n背景：${char.background || '暂无'}\n性格：${char.personality || '暂无'}`;
                openingMessage += charInfo;
            }
            
            updateChatDisplay('旁白', openingMessage);
            setupEventListeners();
        }
        // 更新场景
        function updateScene(sceneId) {
            const scene = gameData.scenes.find(s => s.id === sceneId);
            if (!scene) return;
            // 不更新背景，保持修仙背景不变
            // elements.backgroundImage.src = scene.background;
            // 更新对话
            const dialogue = scene.dialogues[0];
            elements.characterName.textContent = dialogue.character;
            elements.dialogueText.textContent = dialogue.text;
            // 更新角色颜色
            updateCharacterColor(dialogue.character);
            // 根据角色显示对应的立绘
            if (dialogue.character !== '旁白' && dialogue.character !== '环境描写') {
                // 显示所有非旁白角色
                showSceneCharacters();
            } else {
                // 旁白或环境描写时隐藏所有角色
                hideAllCharacters();
            }
            // 更新游戏状态
            gameState.currentScene = sceneId;
        }
        // 设置事件监听器
        function setupEventListeners() {
            // 菜单按钮
            elements.menuBtn.addEventListener('click', () => {
                elements.gameMenu.classList.add('show');
            });
            // 继续游戏按钮
            elements.continueBtn?.addEventListener('click', () => {
                elements.gameMenu.classList.remove('show');
            });
            // 新游戏按钮
            elements.newGameBtn?.addEventListener('click', () => {
                elements.gameMenu.classList.remove('show');
                // 重置聊天历史
                chatHistory.length = 0;
                currentSpeaker = '旁白';
                // 显示输入基础信息的提示
                updateChatDisplay('旁白', '欢迎来到修仙世界！请输入你的基础信息，例如你的名字、来自哪里、为什么来到这里等，我们将根据你的信息开始这段奇妙的旅程。');
            });
            
            // 世界指南按钮（菜单）
            document.getElementById('world-guide-menu-btn')?.addEventListener('click', () => {
                const slug = getWorldSlugFromUrl() || 'dahuang';
                window.location.href = `world-guide.html?world=${slug}`;
            });
            
            // 加载游戏按钮
            elements.loadGameBtn?.addEventListener('click', () => {
                alert('加载游戏功能开发中...');
            });
            // 设置菜单按钮 - 跳转到 AI 设置中心（仅作者可见）
            elements.settingsMenuBtn?.addEventListener('click', () => {
                window.location.href = 'settings.html';
            });
            // 退出游戏按钮
            elements.exitBtn?.addEventListener('click', () => {
                if (confirm('确定要退出游戏吗？')) {
                    window.location.href = 'index.html';
                }
            });
            // 退出登录按钮（菜单）
            document.getElementById('logout-menu-btn')?.addEventListener('click', () => {
                if (confirm('确定要退出登录吗？')) {
                    logout();
                }
            });
            // 发送按钮点击事件
            elements.sendBtn.addEventListener('click', () => {
                const userInput = elements.userInput.value.trim();
                if (userInput) {
                    handleChatMessage(userInput);
                }
            });
            // 输入框回车事件
            elements.userInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const userInput = elements.userInput.value.trim();
                    if (userInput) {
                        handleChatMessage(userInput);
                    }
                }
            });
            // 点击对话框推进到下一部分内容
            elements.dialogueBox.addEventListener('click', () => {
                showNextPart();
            });
            // 保存设置按钮点击事件
            elements.saveSettings.addEventListener('click', saveCharacterSettings);
            // 关闭设置按钮点击事件
            elements.closeSettings.addEventListener('click', hideCharacterSettings);
            // 对话log按钮点击事件
            elements.logBtn.addEventListener('click', showDialogueLog);
            // 关闭对话log按钮点击事件
            elements.closeLog?.addEventListener('click', hideDialogueLog);
            
            // ========== 编辑设定按钮 ==========
            elements.editWorldBtn?.addEventListener('click', () => {
                if (currentWorld && currentWorld._id) {
                    window.location.href = `settings.html?id=${currentWorld._id}`;
                } else {
                    alert('无法获取世界ID');
                }
            });
            
            // 返回书店
            elements.backBtn?.addEventListener('click', () => {
                window.location.href = 'index.html';
            });
            
            // 世界指南
            document.getElementById('world-guide-btn')?.addEventListener('click', () => {
                const slug = getWorldSlugFromUrl() || 'dahuang';
                window.location.href = `world-guide.html?world=${slug}`;
            });
            
            // ========== 记忆库事件 ==========
            // 打开记忆库
            document.getElementById('memory-btn')?.addEventListener('click', () => {
                openMemoryPanel();
                elements.gameMenu.classList.remove('show'); // 关闭菜单
            });
            // 关闭记忆库
            document.getElementById('close-memory')?.addEventListener('click', closeMemoryPanel);
            // 记忆选项卡切换
            document.querySelectorAll('.mem-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    document.querySelectorAll('.mem-tab').forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('.mem-panel').forEach(p => p.classList.remove('active'));
                    tab.classList.add('active');
                    document.getElementById(`mem-panel-${tab.dataset.tab}`).classList.add('active');
                });
            });
            // 用户设置选项卡切换
            document.querySelectorAll('.uset-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    document.querySelectorAll('.uset-tab').forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('.uset-panel').forEach(p => p.classList.remove('active'));
                    tab.classList.add('active');
                    document.getElementById(`panel-${tab.dataset.tab}`).classList.add('active');
                });
            });
            // 温度滑块
            elements.userTemperature?.addEventListener('input', (e) => {
                document.getElementById('temp-value').textContent = e.target.value;
            });
        }
        // 显示角色
        function showCharacter(position) {
            const characterElement = elements[`character${position.charAt(0).toUpperCase() + position.slice(1)}`];
            if (characterElement) {
                characterElement.classList.add('show');
            }
        }
        // 隐藏角色
        function hideCharacter(position) {
            const characterElement = elements[`character${position.charAt(0).toUpperCase() + position.slice(1)}`];
            if (characterElement) {
                characterElement.classList.remove('show');
            }
        }
        // 设置角色图片
        function setCharacterImage(position, imageUrl) {
            // 验证图片URL的安全性
            if (!isValidImageUrl(imageUrl)) {
                console.warn('Invalid image URL:', imageUrl);
                return;
            }
            const characterElement = elements[`character${position.charAt(0).toUpperCase() + position.slice(1)}`];
            if (characterElement) {
                const imageElement = characterElement.querySelector('.character-image');
                if (imageElement) {
                    imageElement.src = imageUrl;
                }
            }
        }
        // 重置所有角色图片
        function resetAllCharacterImages() {
            const positions = ['left', 'center', 'right'];
            positions.forEach(position => {
                const characterElement = elements[`character${position.charAt(0).toUpperCase() + position.slice(1)}`];
                if (characterElement) {
                    const imageElement = characterElement.querySelector('.character-image');
                    if (imageElement) {
                        // 清空图片地址
                        imageElement.src = '';
                    }
                }
            });
        }
        // 隐藏所有角色
        function hideAllCharacters() {
            hideCharacter('left');
            hideCharacter('center');
            hideCharacter('right');
        }
        // 角色位置映射
        let characterPositions = {
            '林婉': 'left',
            '陆苍雪': 'center',
            '轩辕霓裳': 'right'
        };
        // 位置列表，用于为新角色分配位置
        const availablePositions = ['left', 'center', 'right'];
        // 显示特定角色
        function showCharacterByName(characterName) {
            console.log('显示角色:', characterName);
            // 根据角色名称获取位置，如果没有则分配一个默认位置
            let position = characterPositions[characterName];
            console.log('角色位置:', position);
            // 如果角色还没有分配位置，为其分配一个
            if (!position) {
                // 为新角色分配位置
                position = assignPositionToCharacter(characterName);
                console.log('新分配的位置:', position);
            }
            // 根据角色配置获取图片
            let imageUrl = '';
            if (characterConfig[characterName] && characterConfig[characterName].image) {
                imageUrl = characterConfig[characterName].image;
                console.log('角色图片URL:', imageUrl);
            } else {
                // 默认图片
                imageUrl = ``;
                console.log('没有找到角色图片，使用默认值');
            }
            // 验证图片URL的安全性
            if (!isValidImageUrl(imageUrl)) {
                console.warn('Invalid image URL for character:', characterName);
                // 图片URL无效时，不设置图片，保持为空字符串
                // 这样即使图片URL无效，角色位置仍然会被显示
            }
            // 获取角色元素
            const elementKey = `character${position.charAt(0).toUpperCase() + position.slice(1)}`;
            console.log('角色元素键:', elementKey);
            const characterElement = elements[elementKey];
            console.log('角色元素:', characterElement);
            if (characterElement) {
                // 获取图片元素
                const imageElement = characterElement.querySelector('.character-image');
                console.log('图片元素:', imageElement);
                if (imageElement) {
                    // 添加图片加载错误的处理
                    imageElement.onerror = function() {
                        console.warn('Error loading image for character:', characterName);
                        // 图片加载失败时，不隐藏角色元素，只是记录错误
                        // 这样即使图片加载失败，角色位置仍然会被显示
                    };
                    // 只有当图片地址不同时才更新，避免闪烁
                    if (imageElement.src !== imageUrl) {
                        console.log('更新图片URL:', imageUrl);
                        imageElement.src = imageUrl;
                    }
                }
                // 显示角色
                console.log('显示角色元素');
                characterElement.classList.add('show');
                // 确保角色元素可见，即使图片加载失败
                characterElement.style.display = 'block';
                console.log('角色元素显示状态:', characterElement.classList.contains('show'));
            } else {
                console.error('角色元素不存在:', elementKey);
            }
        }
        // 为新角色分配位置的函数
        function assignPositionToCharacter(characterName) {
            // 简单的轮询分配策略
            const positionIndex = Object.keys(characterPositions).length % availablePositions.length;
            const position = availablePositions[positionIndex];
            // 保存角色位置映射
            characterPositions[characterName] = position;
            return position;
        }
        // 显示所有角色
        function showSceneCharacters() {
            // 直接显示所有非旁白角色，不需要先隐藏和重置
            const charactersToShow = Object.keys(characterConfig).filter(name => 
                name !== '默认描述者' && name !== 'AI' && name !== 'You'
            );
            charactersToShow.forEach(characterName => {
                showCharacterByName(characterName);
            });
        }
        // 更新角色颜色
        function updateCharacterColor(character) {
            // 从角色配置获取颜色
            let color = '#999999';
            if (characterConfig[character] && characterConfig[character].color) {
                color = characterConfig[character].color;
            } else if (characterColors[character]) {
                // 保持兼容性
                color = characterColors[character];
            }
            if (elements.dialogueBox) {
                elements.dialogueBox.style.borderTopColor = color;
                elements.dialogueBox.style.boxShadow = `0 -5px 20px ${color}40`;
            }
            if (elements.characterName) {
                elements.characterName.style.color = color;
            }
        }
        // ==================== 情感提取与CG切换系统 ====================
        
        // 初始化情感CG桥接器
        let emotionBridge = null;
        
        function initEmotionSystem() {
            // 定义CG系统接口
            const cgSystem = {
                show: (config) => {
                    const { characterId, emotion, level, text, isEntrance } = config;
                    
                    // 更新对话文本
                    const dialogueText = document.getElementById('dialogue-text');
                    if (dialogueText) {
                        dialogueText.textContent = text;
                    }
                    
                    // 切换角色CG/表情
                    switchCharacterEmotion(characterId, emotion, level, isEntrance);
                    
                    console.log(`[CG Switch] ${characterId} -> ${emotion} L${level}`, isEntrance ? '[Entrance]' : '');
                },
                
                updateText: (characterId, text) => {
                    // 仅更新文字，不切换CG
                    const dialogueText = document.getElementById('dialogue-text');
                    if (dialogueText) {
                        dialogueText.textContent = text;
                    }
                }
            };
            
            // 创建情感桥接器
            emotionBridge = new EmotionSystem.EmotionCGBridge(cgSystem);
            
            console.log('[Emotion System] 情感系统已初始化');
        }
        
        // 切换角色表情/立绘
        function switchCharacterEmotion(characterId, emotion, level, isEntrance) {
            // 获取角色位置
            const position = characterPositions[characterId] || 'center';
            const characterElement = elements[`character${position.charAt(0).toUpperCase() + position.slice(1)}`];
            
            if (!characterElement) return;
            
            // 如果是登场，显示角色
            if (isEntrance) {
                characterElement.classList.add('show');
            }
            
            // 应用情感样式效果
            applyEmotionEffect(characterElement, emotion, level);
            
            // 更新角色配置中的当前情感
            if (characterConfig[characterId]) {
                characterConfig[characterId].currentEmotion = emotion;
                characterConfig[characterId].emotionLevel = level;
            }
        }
        
        // 应用情感视觉效果
        function applyEmotionEffect(element, emotion, level) {
            // 移除旧的情感样式
            element.classList.remove('emotion-calm', 'emotion-happy', 'emotion-angry', 
                                    'emotion-sad', 'emotion-shy', 'emotion-surprise', 
                                    'emotion-serious', 'emotion-hurt');
            
            // 添加新的情感样式
            element.classList.add(`emotion-${emotion}`);
            
            // 根据强度调整效果
            const intensity = level === 3 ? 'high' : level === 2 ? 'medium' : 'low';
            element.dataset.intensity = intensity;
            
            // 应用CSS变化
            const effects = {
                calm: { filter: 'brightness(1)', transform: 'scale(1)' },
                happy: { filter: 'brightness(1.1) saturate(1.2)', transform: 'scale(1.02)' },
                angry: { filter: 'contrast(1.2) brightness(0.9) sepia(0.2)', transform: 'scale(1.05)' },
                sad: { filter: 'brightness(0.85) saturate(0.8) hue-rotate(200deg)', transform: 'scale(0.98)' },
                shy: { filter: 'brightness(1.05) sepia(0.1) hue-rotate(320deg)', transform: 'scale(0.95)' },
                surprise: { filter: 'brightness(1.15) contrast(1.1)', transform: 'scale(1.03)' },
                serious: { filter: 'contrast(1.15) brightness(0.95)', transform: 'scale(1)' },
                hurt: { filter: 'brightness(0.8) saturate(0.6) hue-rotate(180deg)', transform: 'scale(0.97)' }
            };
            
            const effect = effects[emotion] || effects.calm;
            const imageElement = element.querySelector('.character-image');
            if (imageElement) {
                imageElement.style.filter = effect.filter;
                imageElement.style.transform = effect.transform;
                imageElement.style.transition = 'all 0.5s ease';
            }
        }
        
        // 处理AI对话响应（带情感分析）
        async function processAIResponseWithEmotion(characterId, rawResponse) {
            if (!emotionBridge) {
                initEmotionSystem();
            }
            
            return emotionBridge.handleAIResponse(characterId, rawResponse);
        }
        
        // ==================== 初始化游戏 ====================
        window.addEventListener('DOMContentLoaded', () => {
            initGame();
            initEmotionSystem();
        });
        
        // 显示默认角色
        setTimeout(() => {
            showCharacter('left');
        }, 1000);
    
