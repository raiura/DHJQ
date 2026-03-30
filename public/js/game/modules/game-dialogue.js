/**
 * 游戏对话模块
 * 处理AI对话生成和消息渲染
 */

// 对话历史
let chatHistory = [];
let currentCharacter = null;

// AI API 设置
let aiApiSettings = {
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    apiKey: '',
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    temperature: 0.7,
    maxTokens: 2000,
    systemPrompt: ''
};

// 获取用户设置
function getUserSettings() {
    const settings = localStorage.getItem('galgame_user_settings');
    return settings ? JSON.parse(settings) : {};
}

// 生成AI回复
async function generateAIResponse(userMessage) {
    console.log('开始生成AI回复:', userMessage);
    
    try {
        // 构建上下文
        const context = {
            userName: window.currentUserCharacter?.name || '用户',
            characterName: currentCharacter?.name,
            recentMessages: chatHistory.slice(-5).map(h => h.text)
        };
        
        // 检测世界书触发
        const worldbookEntries = detectWorldbookTriggers ? detectWorldbookTriggers(userMessage, context) : [];
        
        // 收集用户个人设置
        const userEntries = collectUserWorldbookEntries ? collectUserWorldbookEntries(userMessage) : '';
        
        // 情感系统提示词
        const emotionPrompt = getEmotionSystemPrompt ? getEmotionSystemPrompt() : '';
        
        // 使用 PromptBuilder 构建提示词
        const gameConfig = {
            userName: window.currentUserCharacter?.name || '用户',
            characterName: currentCharacter?.name || '角色',
            worldName: currentWorld?.title || '世界'
        };
        
        let promptText = '';
        
        // 构建提示词（兼容没有 PromptBuilder 的情况）
        if (typeof PromptBuilder !== 'undefined') {
            const builder = new PromptBuilder(gameConfig);
            
            if (aiApiSettings.systemPrompt) {
                builder.setSystem(aiApiSettings.systemPrompt);
            }
            
            if (currentCharacter?.prompt) {
                builder.setCharacter(currentCharacter.prompt, currentCharacter.name);
            }
            
            if (worldbookEntries.length > 0) {
                builder.addWorldbook(worldbookEntries);
            }
            
            if (userEntries) {
                builder.setUserPrompt(userEntries);
            }
            
            if (emotionPrompt) {
                builder.addToLayer('system', emotionPrompt);
            }
            
            const result = builder.build();
            promptText = result.system;
        } else {
            // 降级方案：手动构建
            const parts = [];
            if (aiApiSettings.systemPrompt) parts.push(aiApiSettings.systemPrompt);
            if (currentCharacter?.prompt) parts.push(currentCharacter.prompt);
            if (worldbookEntries.length > 0) {
                parts.push(worldbookEntries.map(e => e.content).join('\n'));
            }
            if (emotionPrompt) parts.push(emotionPrompt);
            promptText = parts.join('\n\n');
        }
        
        // 调用 AI API
        const response = await callAIAPI(promptText, userMessage);
        return response;
        
    } catch (error) {
        console.error('生成AI回复失败:', error);
        return '（AI响应出错，请检查设置）';
    }
}

// 调用 AI API
async function callAIAPI(systemPrompt, userMessage) {
    const response = await fetch(aiApiSettings.apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${aiApiSettings.apiKey}`
        },
        body: JSON.stringify({
            model: aiApiSettings.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ],
            temperature: aiApiSettings.temperature,
            max_tokens: aiApiSettings.maxTokens
        })
    });
    
    if (!response.ok) {
        throw new Error(`API错误: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
}

// 添加消息到对话
function addMessageToChat(role, text, options = {}) {
    const message = {
        role,
        text,
        timestamp: new Date().toISOString(),
        ...options
    };
    
    chatHistory.push(message);
    renderMessage(message);
    
    return message;
}

// 渲染消息
function renderMessage(message) {
    const container = document.getElementById('chatContainer');
    if (!container) return;
    
    const isUser = message.role === 'user';
    const div = document.createElement('div');
    div.className = `chat-message ${isUser ? 'user' : 'ai'}`;
    
    if (isUser) {
        div.innerHTML = `
            <div class="message-content">${escapeHtml(message.text)}</div>
        `;
    } else {
        // 解析情感标签
        const emotion = parseEmotionTag ? parseEmotionTag(message.text) : null;
        const cleanText = removeEmotionTag ? removeEmotionTag(message.text) : message.text;
        
        div.innerHTML = `
            <div class="message-avatar" style="background: ${emotion ? getEmotionColor(emotion.type) : '#8a6d3b'}">
                ${currentCharacter?.name?.charAt(0) || 'AI'}
            </div>
            <div class="message-content">
                <div class="message-sender">${currentCharacter?.name || 'AI'}</div>
                <div class="message-text">${escapeHtml(cleanText)}</div>
                ${emotion ? `<span class="emotion-tag" style="color: ${getEmotionColor(emotion.type)}">${getEmotionLabel(emotion.type)}</span>` : ''}
            </div>
        `;
    }
    
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// HTML转义
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 导出到全局
if (typeof window !== 'undefined') {
    window.chatHistory = chatHistory;
    window.currentCharacter = currentCharacter;
    window.aiApiSettings = aiApiSettings;
    window.generateAIResponse = generateAIResponse;
    window.addMessageToChat = addMessageToChat;
    window.renderMessage = renderMessage;
}
