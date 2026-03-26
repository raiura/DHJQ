/**
 * 提示词构建器 (Prompt Builder)
 * 
 * 设计目标：
 * - 实现 SillyTavern 风格的分层提示词架构
 * - 支持 token 预算管理和智能截断
 * - 变量替换系统 ({{user}}, {{char}}, {{world}}, {{time}})
 * - 各层优先级管理
 * 
 * 分层架构（从底到顶，优先级递增）：
 * 1. System (系统级) - 最基础的世界设定
 * 2. Character (角色级) - 角色定义、性格描述
 * 3. Worldbook (世界书) - 动态知识注入
 * 4. User (用户级) - 用户自定义提示词
 * 5. Example (示例级) - few-shot 示例
 * 6. Scenario (场景级) - 当前场景描述
 * 
 * @author 大荒九丘
 * @version 1.0
 */

class PromptBuilder {
    constructor(options = {}) {
        // 分层提示词存储
        this.layers = {
            system: [],      // 系统级提示词
            character: [],   // 角色级提示词
            worldbook: [],   // 世界书条目
            user: [],        // 用户自定义
            example: [],     // few-shot 示例
            scenario: []     // 场景描述
        };
        
        // 变量上下文
        this.variables = {
            user: options.userName || '用户',
            char: options.characterName || '角色',
            world: options.worldName || '世界',
            time: () => new Date().toLocaleString('zh-CN'),
            ...options.customVars
        };
        
        // Token 预算配置
        this.tokenBudget = {
            system: options.systemBudget || 500,
            character: options.characterBudget || 800,
            worldbook: options.worldbookBudget || 1000,
            user: options.userBudget || 300,
            example: options.exampleBudget || 600,
            scenario: options.scenarioBudget || 400,
            total: options.totalBudget || 4000
        };
        
        // 统计信息
        this.stats = {
            totalTokens: 0,
            layerTokens: {},
            truncated: false
        };
    }

    // ==================== 分层设置方法 ====================

    /**
     * 设置系统级提示词
     */
    setSystem(prompt, priority = 100) {
        if (!prompt) return this;
        this.layers.system.push({ content: prompt, priority });
        return this;
    }

    /**
     * 设置角色级提示词
     */
    setCharacter(prompt, characterName = null, priority = 100) {
        if (!prompt) return this;
        this.layers.character.push({ 
            content: prompt, 
            characterName,
            priority 
        });
        return this;
    }

    /**
     * 添加世界书条目
     * @param {Array} entries - 从 worldbookEngine 获取的触发条目
     */
    addWorldbook(entries) {
        if (!entries || entries.length === 0) return this;
        
        entries.forEach(entry => {
            this.layers.worldbook.push({
                content: entry.content,
                name: entry.name,
                priority: entry.priority || 100,
                group: entry.group,
                insertPosition: entry.insertPosition || 'character'
            });
        });
        
        return this;
    }

    /**
     * 设置用户级提示词
     */
    setUserPrompt(prompt, priority = 100) {
        if (!prompt) return this;
        this.layers.user.push({ content: prompt, priority });
        return this;
    }

    /**
     * 添加 few-shot 示例
     */
    addExamples(examples, priority = 100) {
        if (!examples || examples.length === 0) return this;
        
        examples.forEach(ex => {
            this.layers.example.push({
                content: typeof ex === 'string' ? ex : this._formatExample(ex),
                priority
            });
        });
        
        return this;
    }

    /**
     * 设置场景描述
     */
    setScenario(scenario, priority = 100) {
        if (!scenario) return this;
        this.layers.scenario.push({ content: scenario, priority });
        return this;
    }

    // ==================== 构建方法 ====================

    /**
     * 构建最终提示词
     * @param {Object} options - 构建选项
     * @returns {Object} { system, messages, stats }
     */
    build(options = {}) {
        const format = options.format || 'openai'; // openai, claude, custom
        const includeExamples = options.includeExamples !== false;
        const enableTruncation = options.enableTruncation !== false;
        
        // 重置统计
        this.stats = {
            totalTokens: 0,
            layerTokens: {},
            truncated: false
        };
        
        // 处理变量替换
        this._processVariables();
        
        // 按优先级排序各层
        this._sortLayers();
        
        // 构建系统提示词（合并 system + character + worldbook）
        let systemPrompt = this._buildSystemPrompt(enableTruncation);
        
        // 构建消息列表
        const messages = [];
        
        // 添加示例消息（few-shot）
        if (includeExamples && this.layers.example.length > 0) {
            const exampleContent = this._buildLayerContent('example', enableTruncation);
            if (exampleContent) {
                messages.push({
                    role: 'system',
                    content: `示例对话风格：\n${exampleContent}`
                });
            }
        }
        
        // 添加场景消息
        if (this.layers.scenario.length > 0) {
            const scenarioContent = this._buildLayerContent('scenario', enableTruncation);
            if (scenarioContent) {
                messages.push({
                    role: 'system',
                    content: `当前场景：${scenarioContent}`
                });
            }
        }
        
        // 根据格式返回
        if (format === 'openai') {
            return {
                system: systemPrompt,
                messages: messages,
                stats: { ...this.stats }
            };
        } else if (format === 'claude') {
            // Claude 格式：系统提示词放在最前面
            return {
                system: systemPrompt,
                messages: messages,
                stats: { ...this.stats }
            };
        } else {
            return {
                system: systemPrompt,
                messages: messages,
                stats: { ...this.stats }
            };
        }
    }

    /**
     * 构建系统提示词
     */
    _buildSystemPrompt(enableTruncation) {
        const parts = [];
        
        // System 层
        const systemContent = this._buildLayerContent('system', enableTruncation);
        if (systemContent) parts.push(systemContent);
        
        // Character 层
        const characterContent = this._buildLayerContent('character', enableTruncation);
        if (characterContent) parts.push(characterContent);
        
        // Worldbook 层（按插入位置分组）
        const worldbookContent = this._buildWorldbookContent(enableTruncation);
        if (worldbookContent) parts.push(worldbookContent);
        
        // User 层
        const userContent = this._buildLayerContent('user', enableTruncation);
        if (userContent) parts.push(userContent);
        
        return parts.join('\n\n');
    }

    /**
     * 构建单层内容
     */
    _buildLayerContent(layerName, enableTruncation) {
        const entries = this.layers[layerName];
        if (entries.length === 0) return '';
        
        let content = entries.map(e => e.content).join('\n\n');
        
        // Token 预算检查
        if (enableTruncation) {
            const budget = this.tokenBudget[layerName];
            const tokens = this._estimateTokens(content);
            
            this.stats.layerTokens[layerName] = tokens;
            this.stats.totalTokens += tokens;
            
            if (tokens > budget) {
                content = this._truncateToBudget(content, budget);
                this.stats.truncated = true;
                this.stats.layerTokens[layerName] = budget;
            }
        }
        
        return content;
    }

    /**
     * 构建世界书内容（按插入位置分组）
     */
    _buildWorldbookContent(enableTruncation) {
        const entries = this.layers.worldbook;
        if (entries.length === 0) return '';
        
        // 按插入位置分组
        const byPosition = {
            system: [],
            character: [],
            user: [],
            example: []
        };
        
        entries.forEach(entry => {
            const pos = entry.insertPosition || 'character';
            if (byPosition[pos]) {
                byPosition[pos].push(entry);
            }
        });
        
        // 只构建 character 和 user 位置的（system 位置的在系统提示词中处理）
        const parts = [];
        
        ['system', 'character', 'user'].forEach(pos => {
            if (byPosition[pos].length > 0) {
                const content = byPosition[pos]
                    .map(e => e.content)
                    .join('\n\n');
                parts.push(content);
            }
        });
        
        let result = parts.join('\n\n');
        
        // Token 预算检查
        if (enableTruncation) {
            const budget = this.tokenBudget.worldbook;
            const tokens = this._estimateTokens(result);
            
            this.stats.layerTokens.worldbook = tokens;
            this.stats.totalTokens += tokens;
            
            if (tokens > budget) {
                result = this._truncateToBudget(result, budget);
                this.stats.truncated = true;
                this.stats.layerTokens.worldbook = budget;
            }
        }
        
        return result ? `【相关知识】\n${result}` : '';
    }

    // ==================== 辅助方法 ====================

    /**
     * 处理变量替换
     */
    _processVariables() {
        const varRegex = /\{\{(\w+)\}\}/g;
        
        for (const layerName in this.layers) {
            this.layers[layerName].forEach(entry => {
                if (entry.content) {
                    entry.content = entry.content.replace(varRegex, (match, varName) => {
                        const value = this.variables[varName];
                        if (typeof value === 'function') {
                            return value();
                        }
                        return value !== undefined ? value : match;
                    });
                }
            });
        }
    }

    /**
     * 按优先级排序各层
     */
    _sortLayers() {
        for (const layerName in this.layers) {
            this.layers[layerName].sort((a, b) => b.priority - a.priority);
        }
    }

    /**
     * 格式化示例对象
     */
    _formatExample(example) {
        if (typeof example === 'string') return example;
        
        let result = '';
        if (example.user) result += `用户: ${example.user}\n`;
        if (example.assistant) result += `助手: ${example.assistant}\n`;
        if (example.comment) result += `// ${example.comment}\n`;
        return result.trim();
    }

    /**
     * 估算 token 数（简化算法）
     */
    _estimateTokens(text) {
        // 简化估算：中文按 1 字 = 1 token，英文按空格分词
        const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
        const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
        const others = text.length - chineseChars - englishWords;
        return Math.ceil(chineseChars + englishWords * 0.75 + others * 0.5);
    }

    /**
     * 截断文本到指定 token 预算
     */
    _truncateToBudget(text, budget) {
        // 简化截断：按段落截断
        const paragraphs = text.split('\n\n');
        let result = [];
        let currentTokens = 0;
        
        for (const para of paragraphs) {
            const paraTokens = this._estimateTokens(para);
            if (currentTokens + paraTokens > budget) {
                break;
            }
            result.push(para);
            currentTokens += paraTokens;
        }
        
        return result.join('\n\n') + (result.length < paragraphs.length ? '\n\n...(已截断)' : '');
    }

    // ==================== 快捷方法 ====================

    /**
     * 从游戏配置快速构建
     */
    static fromGameConfig(config, options = {}) {
        const builder = new PromptBuilder({
            userName: config.userName,
            characterName: config.characterName,
            worldName: config.worldName,
            ...options
        });
        
        // 设置系统提示词
        if (config.systemPrompt) {
            builder.setSystem(config.systemPrompt);
        }
        
        // 设置角色提示词
        if (config.characterPrompt) {
            builder.setCharacter(config.characterPrompt, config.characterName);
        }
        
        // 设置场景
        if (config.scenario) {
            builder.setScenario(config.scenario);
        }
        
        // 设置用户提示词
        if (config.userPrompt) {
            builder.setUserPrompt(config.userPrompt);
        }
        
        return builder;
    }

    /**
     * 快速构建提示词（一行代码）
     */
    static quickBuild(config, worldbookEntries = []) {
        const builder = PromptBuilder.fromGameConfig(config);
        
        if (worldbookEntries && worldbookEntries.length > 0) {
            builder.addWorldbook(worldbookEntries);
        }
        
        return builder.build();
    }

    /**
     * 获取统计信息
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * 清空所有层
     */
    clear() {
        for (const layerName in this.layers) {
            this.layers[layerName] = [];
        }
        return this;
    }
}

// 导出模块（如果支持）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PromptBuilder;
}

// 浏览器全局暴露
if (typeof window !== 'undefined') {
    window.PromptBuilder = PromptBuilder;
}
