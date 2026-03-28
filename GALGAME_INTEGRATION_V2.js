/**
 * galgame_framework.html 角色卡2.0集成文件
 * 
 * 使用方法：
 * 1. 将此文件复制到 public/js/game/ 目录
 * 2. 在galgame_framework.html底部添加：
 *    <script src="public/js/game/GALGAME_INTEGRATION_V2.js"></script>
 * 
 * 特性：
 * - 支持V1/V2角色自动检测
 * - 支持手动/自动世界书联动
 * - 完全向后兼容
 */

(function() {
    'use strict';
    
    console.log('[CharacterV2 Game Integration] 开始加载...');
    
    // 配置
    const CONFIG = {
        // 全局开关（可通过localStorage控制）
        enabled: localStorage.getItem('use_character_v2') === 'true',
        
        // 调试模式
        debug: localStorage.getItem('character_v2_debug') === 'true',
        
        // 回退到V1的阈值（V2构建失败时）
        fallbackOnError: true
    };
    
    // 日志函数
    function log(...args) {
        if (CONFIG.debug) {
            console.log('[CharacterV2]', ...args);
        }
    }
    
    // 等待游戏脚本加载
    function waitForGame() {
        return new Promise((resolve) => {
            const check = () => {
                if (typeof generateAIResponse === 'function') {
                    resolve();
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }
    
    waitForGame().then(() => {
        log('检测到游戏脚本，开始集成');
        integrateGameV2();
    });
    
    function integrateGameV2() {
        // 保存原函数
        const originalGenerateAIResponse = window.generateAIResponse;
        
        // 替换generateAIResponse
        window.generateAIResponse = async function(userMessage) {
            if (!CONFIG.enabled) {
                log('V2已禁用，使用原函数');
                return originalGenerateAIResponse(userMessage);
            }
            
            try {
                return await generateAIResponseV2(userMessage, originalGenerateAIResponse);
            } catch (error) {
                console.error('[CharacterV2] V2处理失败:', error);
                
                if (CONFIG.fallbackOnError) {
                    log('回退到V1处理');
                    return originalGenerateAIResponse(userMessage);
                } else {
                    throw error;
                }
            }
        };
        
        log('集成完成，V2状态:', CONFIG.enabled ? '启用' : '禁用');
        
        // 添加控制台命令
        window.CharacterV2Control = {
            enable: () => {
                localStorage.setItem('use_character_v2', 'true');
                CONFIG.enabled = true;
                console.log('[CharacterV2] 已启用，刷新页面生效');
            },
            disable: () => {
                localStorage.setItem('use_character_v2', 'false');
                CONFIG.enabled = false;
                console.log('[CharacterV2] 已禁用，刷新页面生效');
            },
            status: () => ({
                enabled: CONFIG.enabled,
                hasV2Module: !!window.CharacterCardV2,
                hasBuilder: !!window.EnhancedPromptBuilder,
                hasBridge: !!window.CharacterWorldbookBridge
            }),
            debug: (on) => {
                localStorage.setItem('character_v2_debug', on ? 'true' : 'false');
                CONFIG.debug = on;
            }
        };
    }
    
    /**
     * V2版本的generateAIResponse
     */
    async function generateAIResponseV2(userMessage, originalFn) {
        log('使用V2逻辑处理消息:', userMessage.substring(0, 50));
        
        // 获取当前角色
        const characterId = window.currentCharacterId || window.currentCharacter?._id;
        if (!characterId) {
            log('未找到角色ID，使用V1');
            return originalFn(userMessage);
        }
        
        // 尝试加载V2角色
        let characterV2 = null;
        let useV2Format = false;
        
        try {
            const { CharacterCardAdapter } = window.CharacterCardV2 || {};
            if (CharacterCardAdapter) {
                const adapter = new CharacterCardAdapter();
                characterV2 = await adapter.getCharacter(characterId);
                
                if (characterV2 && characterV2.version && characterV2.version.startsWith('2.')) {
                    useV2Format = true;
                    log('检测到V2角色:', characterV2.name);
                }
            }
        } catch (e) {
            log('获取V2角色失败:', e.message);
        }
        
        // 如果不是V2，使用原函数
        if (!useV2Format) {
            log('角色不是V2格式，使用原函数');
            return originalFn(userMessage);
        }
        
        // ========== V2处理流程 ==========
        
        // 1. 显示思考提示
        updateChatDisplay('旁白', 'AI正在思考(V2)，请稍候...');
        
        try {
            // 2. 构建增强提示词
            const promptResult = await buildEnhancedPrompt(characterV2);
            log('提示词构建完成，token估算:', promptResult.stats?.totalTokens);
            
            // 3. 处理世界书（支持手动/自动模式）
            const worldbookContent = await buildWorldbookContent(characterV2, userMessage);
            
            // 4. 合并到系统提示词
            if (worldbookContent) {
                promptResult.system += '\n\n' + worldbookContent;
            }
            
            // 5. 准备示例对话
            const examples = promptResult.messages || [];
            
            // 6. 调用API
            const response = await callDialogueAPI(userMessage, characterId, {
                systemPrompt: promptResult.system,
                examples: examples,
                postHistory: promptResult.postHistory,
                useV2Format: true,
                worldbookEntries: worldbookContent
            });
            
            // 7. 处理响应
            await handleAIResponse(response, userMessage);
            
            // 8. 处理CharacterNote注入（用于下次对话）
            scheduleCharacterNoteForNextTurn(characterV2);
            
        } catch (error) {
            console.error('[CharacterV2] V2处理失败:', error);
            updateChatDisplay('旁白', 'V2处理失败，回退到标准模式...');
            return originalFn(userMessage);
        }
    }
    
    /**
     * 构建增强提示词
     */
    async function buildEnhancedPrompt(characterV2) {
        const { EnhancedPromptBuilder } = window.EnhancedPromptBuilder || {};
        
        if (!EnhancedPromptBuilder) {
            throw new Error('EnhancedPromptBuilder未加载');
        }
        
        const builder = new EnhancedPromptBuilder({
            userName: window.currentUserCharacter?.name || '用户',
            characterName: characterV2.name,
            worldName: window.currentWorld?.title
        });
        
        return builder.buildForCharacter(characterV2, {
            worldSetting: window.currentWorld?.worldSetting,
            isNewChat: window.chatHistory && window.chatHistory.length === 0,
            location: window.currentLocation || ''
        });
    }
    
    /**
     * 构建世界书内容（支持手动/自动模式）
     */
    async function buildWorldbookContent(characterV2, userMessage) {
        if (!window.CharacterWorldbookBridge) {
            log('WorldbookBridge未加载，跳过世界书');
            return '';
        }
        
        const bridge = new CharacterWorldbookBridge({
            worldbookEngine: window.worldbookManager?.getEngine?.(),
            linkMode: characterV2.lorebook?._linkMode || 'manual',
            debug: CONFIG.debug
        });
        
        // 获取激活的世界书内容
        const content = bridge.getActivatedWorldbookContent(characterV2, {
            text: userMessage,
            location: window.currentLocation || ''
        });
        
        // 格式化为字符串
        const parts = [];
        
        if (content.character && content.character.length > 0) {
            parts.push('【角色相关知识】\n' + 
                content.character.map(e => `[${e.name}]: ${e.content}`).join('\n'));
        }
        
        if (content.linked && content.linked.length > 0) {
            parts.push('【关联世界书】\n' + 
                content.linked.map(e => `[${e.name}]: ${e.content}`).join('\n'));
        }
        
        return parts.join('\n\n');
    }
    
    /**
     * 调用对话API
     */
    async function callDialogueAPI(message, characterId, settings) {
        const API_BASE = window.API_BASE || 'http://localhost:3000/api';
        
        const response = await fetch(`${API_BASE}/dialogue`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({
                message: message,
                characterId: characterId,
                userSettings: settings
            })
        });
        
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status}`);
        }
        
        return await response.json();
    }
    
    /**
     * 处理AI响应
     */
    async function handleAIResponse(result, userMessage) {
        // 保存到历史
        if (window.aiResponseHistory) {
            window.aiResponseHistory.push({
                timestamp: new Date().toLocaleString(),
                content: JSON.stringify(result),
                useV2Format: true
            });
        }
        
        // 添加到记忆
        if (window.addShortMemory) {
            const aiContent = result.data && result.data[0] 
                ? result.data[0].content 
                : JSON.stringify(result);
            await window.addShortMemory(userMessage, aiContent);
        }
        
        // 显示内容
        if (window.showParsedContent) {
            window.showParsedContent(result.data || result);
        } else {
            // 降级显示
            const content = result.data && result.data[0] 
                ? result.data[0].content 
                : JSON.stringify(result);
            window.updateChatDisplay('AI', content);
        }
    }
    
    /**
     * 为下一轮调度CharacterNote
     */
    function scheduleCharacterNoteForNextTurn(characterV2) {
        const charNote = characterV2.injection?.characterNote;
        if (!charNote || !charNote.content) return;
        
        // 简单的计数器逻辑
        if (!window.characterNoteCounter) {
            window.characterNoteCounter = 0;
        }
        window.characterNoteCounter++;
        
        const frequency = charNote.frequency || 1;
        
        if (window.characterNoteCounter % frequency === 0) {
            log('调度CharacterNote注入');
            
            window.pendingCharacterNote = {
                content: charNote.content,
                depth: charNote.depth || 0,
                role: charNote.role || 'system',
                timestamp: Date.now()
            };
        }
    }
    
    /**
     * 获取认证头
     */
    function getAuthHeaders() {
        const token = localStorage.getItem('galgame_token');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }
    
    // ========== 辅助函数（兼容原代码） ==========
    
    function updateChatDisplay(character, text) {
        if (window.updateChatDisplay) {
            window.updateChatDisplay(character, text);
        } else {
            console.log(`[${character}] ${text}`);
        }
    }
    
    log('集成脚本加载完成');
    
})();
