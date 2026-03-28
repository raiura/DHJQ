/**
 * galgame_framework.html 角色卡2.0集成补丁
 * 
 * 使用说明：
 * 1. 在galgame_framework.html底部添加新模块加载
 * 2. 修改generateAIResponse函数
 */

// ============================================
// PART 1: 在galgame_framework.html底部添加
// ============================================

const PART1_HTML_ADDITION = `
    <!-- 角色卡2.0模块（在原有脚本后添加） -->
    <script src="public/js/core/characterCardV2.js"></script>
    <script src="public/js/core/enhancedPromptBuilder.js"></script>
    <script src="public/js/services/characterWorldbookBridge.js"></script>
    
    <!-- 集成补丁 -->
    <script>
        // 角色卡2.0集成补丁
        (function() {
            'use strict';
            
            // 全局开关
            window.USE_CHARACTER_V2 = localStorage.getItem('use_character_v2') === 'true';
            
            console.log('[CharacterV2] 补丁已加载，当前状态:', window.USE_CHARACTER_V2 ? '启用' : '禁用');
            console.log('[CharacterV2] 在控制台输入: localStorage.setItem("use_character_v2", "true") 启用V2');
        })();
    </script>
`;

// ============================================
// PART 2: 增强版generateAIResponse函数
// ============================================

/**
 * 替换原有的generateAIResponse函数（line 2984）
 * 保留原有逻辑，添加V2支持
 */
async function generateAIResponse_Patched(userMessage) {
    // 显示AI正在思考的提示
    updateChatDisplay('旁白', 'AI正在思考，请稍候...');
    console.log('开始生成AI回复:', userMessage);
    
    try {
        // ========== 检测是否使用V2 ==========
        let useV2Format = false;
        let characterV2 = null;
        let enhancedPrompt = null;
        
        if (window.USE_CHARACTER_V2 && window.CharacterCardV2) {
            try {
                const { CharacterCardAdapter } = window.CharacterCardV2;
                const adapter = new CharacterCardAdapter();
                
                // 尝试获取V2格式角色
                characterV2 = await adapter.getCharacter(currentCharacterId);
                
                if (characterV2 && characterV2.version && characterV2.version.startsWith('2.')) {
                    console.log('[CharacterV2] 检测到V2角色:', characterV2.name);
                    useV2Format = true;
                }
            } catch (e) {
                console.log('[CharacterV2] 非V2角色或加载失败:', e.message);
            }
        }
        
        // ========== 构建提示词 ==========
        let systemPrompt, exampleMessages = [], postHistory = '';
        
        if (useV2Format && characterV2) {
            // 使用V2增强提示词构建
            const promptResult = await buildEnhancedPrompt(characterV2, userMessage);
            systemPrompt = promptResult.system;
            exampleMessages = promptResult.messages || [];
            postHistory = promptResult.postHistory || '';
        } else {
            // 使用原有V1逻辑
            const emotionPrompt = getEmotionSystemPrompt();
            systemPrompt = aiApiSettings.systemPrompt 
                ? aiApiSettings.systemPrompt + '\n' + emotionPrompt 
                : emotionPrompt;
        }
        
        // ========== 世界书处理（新旧兼容） ==========
        let worldbookEntries = [];
        
        // 新版世界书引擎
        if (worldbookManager) {
            const context = {
                userName: window.currentUserCharacter?.name || '用户',
                characterName: currentCharacter?.name,
                recentMessages: chatHistory.slice(-5).map(h => h.text)
            };
            worldbookEntries = worldbookManager.detectTriggers(userMessage, context);
            console.log('[Worldbook] 触发的条目:', worldbookEntries.length);
        }
        
        // V2角色专属世界书
        if (useV2Format && characterV2 && window.CharacterWorldbookBridge) {
            try {
                const { CharacterWorldbookBridge } = window;
                const bridge = new CharacterWorldbookBridge({
                    worldbookEngine: worldbookManager?.getEngine?.()
                });
                
                const charWorldbook = bridge.getActivatedWorldbookContent(characterV2, {
                    text: userMessage,
                    location: currentLocation || ''
                });
                
                // 合并到世界书条目
                if (charWorldbook.character && charWorldbook.character.length > 0) {
                    worldbookEntries.push(...charWorldbook.character);
                }
            } catch (e) {
                console.warn('[CharacterV2] 专属世界书加载失败:', e);
            }
        }
        
        // 旧版用户个人世界书（兼容）
        const userEntries = userSettings.worldbook.entries
            .filter(e => userMessage.includes(e.keyword))
            .map(e => ({ name: e.keyword, content: e.content }));
        
        // 合并所有世界书条目
        const allWorldbookEntries = [
            ...worldbookEntries.map(e => `[${e.name}] ${e.content}`),
            ...userEntries.map(e => `[${e.name}] ${e.content}`)
        ].filter(Boolean).join('\n');
        
        // ========== 调用后端API ==========
        console.log('发送请求到后端API...');
        console.log('[CharacterV2] 使用格式:', useV2Format ? 'V2' : 'V1');
        
        const response = await fetch(\`\${API_BASE}/dialogue\`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                message: userMessage,
                characterId: currentCharacterId,
                userSettings: {
                    // 提示词设置
                    systemPrompt: systemPrompt,
                    examples: exampleMessages,
                    postHistory: postHistory,
                    promptAddon: getUserPromptAddon(),
                    worldbookEntries: allWorldbookEntries,
                    
                    // AI参数
                    temperature: userSettings.ai.temperature,
                    maxTokens: userSettings.ai.maxTokens,
                    topP: userSettings.ai.topP,
                    presencePenalty: userSettings.ai.presencePenalty,
                    
                    // 标记格式版本
                    useV2Format: useV2Format,
                    characterVersion: useV2Format ? '2.0' : '1.0'
                }
            })
        });
        
        console.log('收到后端响应:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(\`API请求失败: \${response.status} \${response.statusText}\\n\${errorData.error || ''}\`);
        }
        
        // 解析后端响应
        const result = await response.json();
        console.log('后端响应数据:', result);
        
        // 保存完整的AI回复到历史记录
        aiResponseHistory.push({
            timestamp: new Date().toLocaleString(),
            content: JSON.stringify(result),
            useV2Format: useV2Format
        });
        
        // 提取AI回复内容用于记忆
        const aiContent = result.data && result.data[0] ? result.data[0].content : JSON.stringify(result);
        
        // 添加到短期记忆
        await addShortMemory(userMessage, aiContent);
        
        // 按顺序显示拆解后的内容
        const dialogueData = result.data || result;
        showParsedContent(dialogueData);
        
        // 如果是V2角色，处理CharacterNote注入
        if (useV2Format && characterV2 && characterV2.injection?.characterNote?.content) {
            scheduleCharacterNoteInjection(characterV2);
        }
        
    } catch (error) {
        console.error('API调用错误:', error);
        const errorMessage = \`API调用失败: \${error.message}\\n\\n请检查:\\n1. 后端服务是否运行在 http://localhost:3000\\n2. 网络连接是否正常\\n3. 浏览器控制台是否有其他错误\`;
        updateChatDisplay('旁白', errorMessage);
        aiResponseHistory.push({
            timestamp: new Date().toLocaleString(),
            content: \`错误: \${error.message}\`
        });
    }
}

/**
 * 构建增强提示词（V2）
 */
async function buildEnhancedPrompt(characterV2, userMessage) {
    try {
        const { EnhancedPromptBuilder } = window.EnhancedPromptBuilder || {};
        
        if (!EnhancedPromptBuilder) {
            throw new Error('EnhancedPromptBuilder模块未加载');
        }
        
        const builder = new EnhancedPromptBuilder({
            userName: window.currentUserCharacter?.name || '用户',
            characterName: characterV2.name,
            worldName: currentWorld?.title
        });
        
        const result = builder.buildForCharacter(characterV2, {
            worldSetting: currentWorld?.worldSetting,
            isNewChat: chatHistory.length === 0,
            location: currentLocation || ''
        });
        
        // 添加情感系统提示词
        const emotionPrompt = getEmotionSystemPrompt();
        if (emotionPrompt) {
            result.system += '\n\n' + emotionPrompt;
        }
        
        return result;
    } catch (error) {
        console.error('[CharacterV2] 增强提示词构建失败:', error);
        // 回退到简单构建
        return {
            system: buildSimplePromptFromV2(characterV2),
            messages: [],
            postHistory: characterV2.injection?.postHistory || ''
        };
    }
}

/**
 * 从V2构建简单提示词（降级方案）
 */
function buildSimplePromptFromV2(v2Data) {
    const parts = [];
    
    if (v2Data.core?.description) {
        parts.push(\`【角色】\${v2Data.name}\\n\${v2Data.core.description}\`);
    }
    if (v2Data.core?.personality) {
        parts.push(\`【性格】\\n\${v2Data.core.personality}\`);
    }
    if (v2Data.core?.scenario) {
        parts.push(\`【处境】\\n\${v2Data.core.scenario}\`);
    }
    if (v2Data.injection?.characterNote?.content) {
        parts.push(\`【状态】\\n\${v2Data.injection.characterNote.content}\`);
    }
    
    return parts.join('\\n\\n');
}

/**
 * 调度CharacterNote注入
 */
function scheduleCharacterNoteInjection(characterV2) {
    // 简单的注入计数器
    if (!window.characterNoteCounter) {
        window.characterNoteCounter = 0;
    }
    window.characterNoteCounter++;
    
    const charNote = characterV2.injection?.characterNote;
    if (!charNote || !charNote.content) return;
    
    const frequency = charNote.frequency || 1;
    
    // 判断是否该注入
    if (window.characterNoteCounter % frequency === 0) {
        console.log('[CharacterV2] 注入CharacterNote:', charNote.content.substring(0, 50) + '...');
        
        // 存储到对话上下文中（供下次使用）
        window.pendingCharacterNote = {
            content: charNote.content,
            depth: charNote.depth || 0,
            role: charNote.role || 'system',
            timestamp: Date.now()
        };
    }
}

// ============================================
// PART 3: 安装补丁
// ============================================

/**
 * 安装补丁
 */
function installGalgameV2Patch() {
    console.log('[CharacterV2 Patch] 正在安装galgame_framework补丁...');
    
    // 保存原始函数
    if (typeof generateAIResponse === 'function') {
        window._originalGenerateAIResponse = generateAIResponse;
        
        // 替换为补丁版本
        window.generateAIResponse = generateAIResponse_Patched;
        
        console.log('[CharacterV2 Patch] generateAIResponse已替换');
    } else {
        console.error('[CharacterV2 Patch] 未找到generateAIResponse函数');
        return;
    }
    
    // 添加辅助函数到全局
    window.buildEnhancedPrompt = buildEnhancedPrompt;
    window.buildSimplePromptFromV2 = buildSimplePromptFromV2;
    window.scheduleCharacterNoteInjection = scheduleCharacterNoteInjection;
    
    console.log('[CharacterV2 Patch] 补丁安装完成');
    console.log('[CharacterV2 Patch] 当前状态:', window.USE_CHARACTER_V2 ? 'V2已启用' : 'V2已禁用（使用V1）');
    console.log('[CharacterV2 Patch] 启用V2: localStorage.setItem("use_character_v2", "true")');
    console.log('[CharacterV2 Patch] 禁用V2: localStorage.setItem("use_character_v2", "false")');
}

// 延迟安装，确保原有脚本已加载
if (document.readyState === 'complete') {
    setTimeout(installGalgameV2Patch, 2000);
} else {
    window.addEventListener('load', () => {
        setTimeout(installGalgameV2Patch, 2000);
    });
}

// 导出
window.GalgameV2Patch = {
    install: installGalgameV2Patch,
    enable: () => {
        localStorage.setItem('use_character_v2', 'true');
        window.USE_CHARACTER_V2 = true;
        console.log('[CharacterV2] 已启用');
    },
    disable: () => {
        localStorage.setItem('use_character_v2', 'false');
        window.USE_CHARACTER_V2 = false;
        console.log('[CharacterV2] 已禁用');
    },
    status: () => ({
        enabled: window.USE_CHARACTER_V2,
        hasV2Module: !!window.CharacterCardV2,
        hasV2Character: !!window.currentCharacterV2
    })
};
