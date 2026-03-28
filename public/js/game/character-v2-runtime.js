/**
 * Character Card V2.0 Runtime Integration
 * 统一使用V2格式处理AI对话
 */

// ========== 提示词构建器 ==========
class GamePromptBuilder {
    constructor(options = {}) {
        this.worldName = options.worldName || '';
        this.userName = options.userName || '用户';
        this.worldSetting = options.worldSetting || '';
    }
    
    /**
     * 为角色构建完整提示词
     */
    buildForCharacter(character, context = {}) {
        const { messageHistory = [], userMessage = '', location = '' } = context;
        
        // 1. 系统提示词基础
        const systemParts = [];
        
        if (this.worldName) {
            systemParts.push(`【世界】${this.worldName}`);
        }
        if (this.worldSetting) {
            systemParts.push(`\n${this.worldSetting}`);
        }
        
        // 2. 角色核心设定
        systemParts.push(`\n【角色】${character.name}`);
        
        if (character.core?.description) {
            systemParts.push(`\n【描述】${character.core.description}`);
        }
        if (character.core?.personality) {
            systemParts.push(`\n【性格】${character.core.personality}`);
        }
        if (character.core?.scenario) {
            systemParts.push(`\n【处境】${character.core.scenario}`);
        }
        if (character.core?.worldConnection?.faction) {
            systemParts.push(`\n【势力】${character.core.worldConnection.faction}`);
        }
        if (character.core?.worldConnection?.location) {
            systemParts.push(`\n【位置】${character.core.worldConnection.location}`);
        }
        
        // 3. 关系状态
        if (character.relationship) {
            const { favor, trust, mood } = character.relationship;
            systemParts.push(`\n【关系】好感:${favor}/100 | 信任:${trust}/100 | 心情:${mood}`);
        }
        
        // 4. 说话风格
        if (character.examples?.style) {
            systemParts.push(`\n【说话风格】${character.examples.style}`);
        }
        
        // 5. 激活的世界书内容
        const activeLorebook = this.getActiveLorebook(character, userMessage, location);
        if (activeLorebook.length > 0) {
            systemParts.push(`\n【相关知识】`);
            activeLorebook.forEach(entry => {
                systemParts.push(`- ${entry.name}: ${entry.content}`);
            });
        }
        
        // 6. 示例对话
        const examples = character.examples?.dialogues || [];
        const exampleMessages = [];
        if (examples.length > 0) {
            examples.slice(0, 3).forEach(ex => {
                if (ex.user) {
                    exampleMessages.push({ role: 'user', content: ex.user });
                }
                if (ex.character) {
                    exampleMessages.push({ role: 'assistant', content: ex.character, name: character.name });
                }
            });
        }
        
        return {
            system: systemParts.join('\n'),
            examples: exampleMessages,
            character: character
        };
    }
    
    /**
     * 获取激活的世界书条目
     */
    getActiveLorebook(character, text, location) {
        const entries = [];
        const checkText = (text || '') + ' ' + (location || '');
        
        // 检查角色专属世界书
        if (character.lorebook?.entries) {
            character.lorebook.entries.forEach(entry => {
                if (!entry.enabled) return;
                
                const isMatch = entry.keys.some(key => {
                    if (!key) return false;
                    return checkText.toLowerCase().includes(key.toLowerCase());
                });
                
                if (isMatch) {
                    entries.push(entry);
                }
            });
        }
        
        // 按优先级排序
        entries.sort((a, b) => (b.priority || 100) - (a.priority || 100));
        
        return entries.slice(0, 5); // 最多5条
    }
}

// ========== Character Note 注入器 ==========
class CharacterNoteInjector {
    constructor() {
        this.turnCounter = 0;
        this.injectionHistory = new Map(); // charId -> lastInjectionTurn
    }
    
    /**
     * 检查是否应该注入Character Note
     */
    shouldInject(character) {
        const note = character.injection?.characterNote;
        if (!note || !note.content) return false;
        
        this.turnCounter++;
        const frequency = note.frequency || 1;
        
        return this.turnCounter % frequency === 0;
    }
    
    /**
     * 获取注入消息
     */
    getInjectionMessage(character) {
        const note = character.injection?.characterNote;
        if (!note || !note.content) return null;
        
        return {
            role: note.role || 'system',
            content: note.content,
            _isCharacterNote: true
        };
    }
    
    /**
     * 在消息数组中注入Character Note
     */
    injectIntoMessages(messages, character) {
        const note = character.injection?.characterNote;
        if (!note || !note.content) return messages;
        
        const depth = note.depth || 0;
        const injectIndex = Math.max(0, messages.length - depth);
        
        const injected = [...messages];
        injected.splice(injectIndex, 0, {
            role: note.role || 'system',
            content: `[Character Note] ${note.content}`,
            _isCharacterNote: true
        });
        
        return injected;
    }
}

// ========== Post-History 处理器 ==========
class PostHistoryProcessor {
    /**
     * 获取后置指令
     */
    getPostHistory(character) {
        const post = character.injection?.postHistory;
        if (!post || !post.enabled || !post.content) return null;
        return post.content;
    }
    
    /**
     * 将后置指令添加到系统提示词
     */
    appendToSystem(systemPrompt, character) {
        const postHistory = this.getPostHistory(character);
        if (!postHistory) return systemPrompt;
        
        return `${systemPrompt}\n\n[Post-History Instructions]\n${postHistory}`;
    }
}

// ========== 全局实例 ==========
const promptBuilder = new GamePromptBuilder();
const noteInjector = new CharacterNoteInjector();
const postHistoryProcessor = new PostHistoryProcessor();

// ========== 增强的AI响应生成 ==========
async function generateAIResponseV2(userMessage, options = {}) {
    const { character, worldContext = {} } = options;
    
    if (!character) {
        throw new Error('未指定角色');
    }
    
    // 1. 构建提示词
    const promptResult = promptBuilder.buildForCharacter(character, {
        userMessage,
        location: worldContext.location || '',
        messageHistory: worldContext.messageHistory || []
    });
    
    // 2. 处理Post-History
    let systemPrompt = postHistoryProcessor.appendToSystem(promptResult.system, character);
    
    // 3. 构建消息数组
    let messages = [];
    
    // 添加示例对话作为few-shot
    if (promptResult.examples.length > 0) {
        messages.push(...promptResult.examples);
    }
    
    // 添加历史消息（如果有）
    if (worldContext.messageHistory) {
        messages.push(...worldContext.messageHistory.slice(-10)); // 最近10条
    }
    
    // 添加用户消息
    messages.push({ role: 'user', content: userMessage });
    
    // 4. 注入Character Note
    messages = noteInjector.injectIntoMessages(messages, character);
    
    return {
        system: systemPrompt,
        messages: messages,
        character: character
    };
}

// ========== 兼容旧数据 ==========
function migrateToV2IfNeeded(data) {
    // 如果已经是V2格式
    if (data.core && data.visual) {
        return data;
    }
    
    // 从V1迁移
    return {
        name: data.name || '未命名角色',
        visual: {
            avatar: data.image || data.avatar || '',
            cover: '',
            color: data.color || '#8a6d3b',
            emotionCGs: {}
        },
        core: {
            description: [data.appearance, data.physique, data.special].filter(Boolean).join('\n\n'),
            personality: data.personality || '',
            scenario: data.background || '',
            firstMessage: data.firstMessage || '',
            worldConnection: { faction: '', location: '' }
        },
        activation: {
            keys: data.keys || [],
            priority: data.priority || 100,
            enabled: data.enabled !== false
        },
        examples: { style: '', dialogues: [] },
        lorebook: { entries: [], linkMode: 'MANUAL', linkedEntryIds: [] },
        injection: {
            characterNote: { content: '', depth: 0, frequency: 1, role: 'system' },
            postHistory: { content: '', enabled: false }
        },
        relationship: {
            favor: data.favor || 50,
            trust: data.trust || 50,
            mood: data.mood || '平静'
        },
        meta: {
            description: '',
            tags: [],
            creator: '',
            version: '2.0.0',
            updatedAt: new Date().toISOString()
        }
    };
}

// ========== 导出到全局 ==========
window.GamePromptBuilder = GamePromptBuilder;
window.CharacterNoteInjector = CharacterNoteInjector;
window.PostHistoryProcessor = PostHistoryProcessor;
window.generateAIResponseV2 = generateAIResponseV2;
window.migrateToV2IfNeeded = migrateToV2IfNeeded;
window.promptBuilder = promptBuilder;
window.noteInjector = noteInjector;
window.postHistoryProcessor = postHistoryProcessor;

console.log('[Character V2] Runtime module loaded');
