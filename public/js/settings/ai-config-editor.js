/**
 * AI配置编辑器 2.0
 * 参考 OpenAI Playground / SillyTavern 的AI配置界面
 * 支持完整参数控制、预设管理、模型选择
 */

class AIConfigEditor {
    constructor(options = {}) {
        this.containerId = options.containerId || 'aiConfigContainer';
        this.onChange = options.onChange || (() => {});
        this.onSave = options.onSave || (() => {});
        
        // 默认配置
        this.config = this.getDefaultConfig();
        
        // 预设列表
        this.presets = this.loadPresets();
        
        // 模型列表
        this.models = this.getModelList();
        
        // 参数说明
        this.paramDescriptions = {
            temperature: {
                title: 'Temperature',
                desc: '控制输出的随机性。值越低，回答越确定和保守；值越高，回答越随机和有创造性。',
                range: '0.0 - 2.0',
                recommended: '0.7-1.0 用于角色扮演'
            },
            topP: {
                title: 'Top P',
                desc: '核采样概率。只从累积概率前P%的词汇中选择，控制输出的多样性。',
                range: '0.0 - 1.0',
                recommended: '0.9 是较好的起点'
            },
            maxTokens: {
                title: 'Max Tokens',
                desc: '生成内容的最大长度。一个token约等于一个汉字或半个英文单词。',
                range: '100 - 8000',
                recommended: '2000 适合一般对话'
            },
            frequencyPenalty: {
                title: 'Frequency Penalty',
                desc: '降低重复用词的概率。值越高，越不容易重复使用相同的词汇。',
                range: '-2.0 - 2.0',
                recommended: '0.0-0.5 防止重复'
            },
            presencePenalty: {
                title: 'Presence Penalty',
                desc: '降低重复主题的概率。值越高，越容易引入新的话题。',
                range: '-2.0 - 2.0',
                recommended: '0.0-0.5 增加多样性'
            }
        };
        
        this.init();
    }
    
    getDefaultConfig() {
        return {
            version: '2.0',
            model: {
                provider: 'openai',
                name: 'gpt-4o',
                contextWindow: 128000,
                customModelName: '',
                apiKey: '',
                baseUrl: ''
            },
            generation: {
                temperature: 0.7,
                maxTokens: 2000,
                topP: 0.9,
                frequencyPenalty: 0.0,
                presencePenalty: 0.0,
                stopSequences: []
            },
            streaming: {
                enabled: true,
                chunkSize: 10
            },
            retry: {
                maxAttempts: 3,
                timeout: 30000
            },
            chainOfThought: {
                enabled: false,
                depth: 'standard',
                showThinking: true
            },
            safety: {
                filterLevel: 'standard',
                autoTruncate: true
            }
        };
    }
    
    getModelList() {
        return {
            openai: [
                { id: 'gpt-4o', name: 'GPT-4o', context: 128000, cost: '中' },
                { id: 'gpt-4o-mini', name: 'GPT-4o Mini', context: 128000, cost: '低' },
                { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', context: 128000, cost: '高' },
                { id: 'gpt-4', name: 'GPT-4', context: 8192, cost: '高' },
                { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', context: 16385, cost: '低' }
            ],
            anthropic: [
                { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet', context: 200000, cost: '中' },
                { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', context: 200000, cost: '高' },
                { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', context: 200000, cost: '中' },
                { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', context: 200000, cost: '低' }
            ],
            google: [
                { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', context: 2000000, cost: '中' },
                { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', context: 1000000, cost: '低' },
                { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro', context: 32768, cost: '低' }
            ],
            openrouter: [
                { id: 'openai/gpt-4o', name: 'OpenAI GPT-4o', context: 128000, cost: '中' },
                { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', context: 200000, cost: '中' },
                { id: 'google/gemini-1.5-pro', name: 'Gemini 1.5 Pro', context: 2000000, cost: '中' },
                { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', context: 131072, cost: '低' },
                { id: 'deepseek/deepseek-chat', name: 'DeepSeek V2.5', context: 64000, cost: '低' }
            ],
            deepseek: [
                { id: 'deepseek-chat', name: 'DeepSeek V3', context: 64000, cost: '低' },
                { id: 'deepseek-reasoner', name: 'DeepSeek R1', context: 64000, cost: '低' }
            ],
            moonshot: [
                { id: 'moonshot-v1-8k', name: 'Moonshot 8K', context: 8192, cost: '低' },
                { id: 'moonshot-v1-32k', name: 'Moonshot 32K', context: 32768, cost: '低' },
                { id: 'moonshot-v1-128k', name: 'Moonshot 128K', context: 128000, cost: '中' }
            ],
            siliconflow: [
                { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3', context: 64000, cost: '低' },
                { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1', context: 64000, cost: '低' },
                { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen2.5 72B', context: 32768, cost: '低' },
                { id: 'meta-llama/Llama-3.3-70B-Instruct', name: 'Llama 3.3 70B', context: 32768, cost: '低' }
            ],
            aliyun: [
                { id: 'qwen-max', name: '通义千问 Max', context: 32768, cost: '中' },
                { id: 'qwen-plus', name: '通义千问 Plus', context: 131072, cost: '低' },
                { id: 'qwen-turbo', name: '通义千问 Turbo', context: 131072, cost: '低' }
            ],
            azure: [
                { id: 'gpt-4o', name: 'Azure GPT-4o', context: 128000, cost: '中' },
                { id: 'gpt-4', name: 'Azure GPT-4', context: 8192, cost: '高' },
                { id: 'gpt-35-turbo', name: 'Azure GPT-3.5', context: 16384, cost: '低' }
            ],
            local: [
                { id: 'local-llm', name: '本地模型', context: 4096, cost: '免费' }
            ],
            custom: [
                { id: '__custom__', name: '自定义模型', context: 8192, cost: '未知' }
            ]
        };
    }
    
    loadPresets() {
        const defaultPresets = [
            {
                id: 'balanced',
                name: '🎯 平衡模式',
                description: '适合大多数场景的平衡配置',
                config: {
                    model: { provider: 'openai', name: 'gpt-4', contextWindow: 8192 },
                    generation: { temperature: 0.7, maxTokens: 2000, topP: 0.9, frequencyPenalty: 0, presencePenalty: 0 }
                },
                isDefault: true,
                isBuiltin: true
            },
            {
                id: 'creative',
                name: '🎨 创意模式',
                description: '更具创造性和想象力的输出',
                config: {
                    model: { provider: 'openai', name: 'gpt-4', contextWindow: 8192 },
                    generation: { temperature: 1.2, maxTokens: 2000, topP: 0.95, frequencyPenalty: 0.2, presencePenalty: 0.2 }
                },
                isDefault: false,
                isBuiltin: true
            },
            {
                id: 'precise',
                name: '📚 精确模式',
                description: '更精确、一致的输出',
                config: {
                    model: { provider: 'openai', name: 'gpt-4', contextWindow: 8192 },
                    generation: { temperature: 0.3, maxTokens: 2000, topP: 0.9, frequencyPenalty: 0, presencePenalty: 0 }
                },
                isDefault: false,
                isBuiltin: true
            },
            {
                id: 'rp-xianxia',
                name: '🎭 修仙风格',
                description: '适合修仙角色扮演',
                config: {
                    model: { provider: 'anthropic', name: 'claude-3-sonnet', contextWindow: 200000 },
                    generation: { temperature: 0.85, maxTokens: 2500, topP: 0.92, frequencyPenalty: 0.3, presencePenalty: 0.1 }
                },
                isDefault: false,
                isBuiltin: true
            },
            {
                id: 'rp-romance',
                name: '💕 恋爱模式',
                description: '适合恋爱养成场景',
                config: {
                    model: { provider: 'openai', name: 'gpt-4', contextWindow: 8192 },
                    generation: { temperature: 0.9, maxTokens: 2000, topP: 0.9, frequencyPenalty: 0.1, presencePenalty: 0.1 }
                },
                isDefault: false,
                isBuiltin: true
            },
            {
                id: 'rp-battle',
                name: '⚔️ 战斗场景',
                description: '适合战斗和动作场景',
                config: {
                    model: { provider: 'openai', name: 'gpt-4', contextWindow: 8192 },
                    generation: { temperature: 1.0, maxTokens: 2500, topP: 0.95, frequencyPenalty: 0.2, presencePenalty: 0.2 }
                },
                isDefault: false,
                isBuiltin: true
            }
        ];
        
        // 从localStorage加载用户预设
        const savedPresets = JSON.parse(localStorage.getItem('ai_config_presets') || '[]');
        
        return [...defaultPresets, ...savedPresets];
    }
    
    init() {
        this.render();
        this.attachEvents();
        this.updateParamDescription('temperature');
    }
    
    render() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`[AIConfigEditor] Container #${this.containerId} not found`);
            return;
        }
        
        container.innerHTML = `
            <div class="ai-config-editor">
                <!-- 预设选择 -->
                <div class="config-presets-card">
                    <div class="config-presets-header">
                        <span>💾 配置预设</span>
                        <div class="preset-actions">
                            <button class="btn-text" onclick="aiConfigEditor.saveCurrentAsPreset()">+ 保存当前</button>
                            <button class="btn-text" onclick="aiConfigEditor.importPreset()">导入</button>
                            <button class="btn-text" onclick="aiConfigEditor.exportAllPresets()">导出</button>
                        </div>
                    </div>
                    <div class="config-presets-list" id="ai_presetsList">
                        ${this.renderPresetsList()}
                    </div>
                </div>
                
                <!-- 使用说明 -->
                <div class="config-help-card" style="margin-bottom: 20px;">
                    <div class="config-help-header">
                        <span>📖 使用说明</span>
                    </div>
                    <div class="config-help-content">
                        <p><strong>1. 选择模型提供商：</strong>根据你的 API 来源选择对应的提供商。OpenAI、DeepSeek、Moonshot、SiliconFlow、阿里云等均支持 OpenAI 兼容格式。</p>
                        <p><strong>2. 填写 API 信息：</strong>在「API 密钥」和「API Base URL」中填入你的密钥和接口地址。Base URL 会根据所选提供商自动提示默认值。</p>
                        <p><strong>3. 自定义模型：</strong>如果下拉列表中没有你要使用的模型，可在「模型选择」中选择「✏️ 自定义模型...」，手动输入模型名称。</p>
                        <p><strong>4. 测试连接：</strong>配置完成后，点击「🔌 测试连接」按钮，系统会发送一个简单的请求验证 API 是否可用。</p>
                        <p><strong>5. 应用预设与保存：</strong>左侧「配置预设」可快速切换常用的参数组合；调整完成后点击页面右上角的「💾 保存配置」即可生效。</p>
                        <p style="color: var(--text-secondary); font-size: 12px; margin-top: 10px;">💡 提示：API 密钥仅存储在你的浏览器本地，不会上传到服务器。</p>
                    </div>
                </div>
                
                <!-- 基本设置 -->
                <div class="config-section" data-section="model">
                    <div class="config-section-header">
                        <span class="section-icon">🎯</span>
                        <span>基本设置</span>
                    </div>
                    <div class="config-section-body">
                        <div class="form-row">
                            <div class="form-group">
                                <label>模型提供商</label>
                                <select class="form-select" id="ai_provider">
                                    <option value="openai">OpenAI</option>
                                    <option value="anthropic">Anthropic (Claude)</option>
                                    <option value="google">Google (Gemini)</option>
                                    <option value="openrouter">OpenRouter</option>
                                    <option value="deepseek">DeepSeek</option>
                                    <option value="moonshot">Moonshot (Kimi)</option>
                                    <option value="siliconflow">SiliconFlow</option>
                                    <option value="aliyun">阿里云 (通义千问)</option>
                                    <option value="azure">Azure OpenAI</option>
                                    <option value="local">本地模型</option>
                                    <option value="custom">自定义</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>模型选择</label>
                                <select class="form-select" id="ai_model" style="margin-bottom: 8px;">
                                    <!-- 动态生成 -->
                                </select>
                                <input type="text" class="form-input" id="ai_customModel" 
                                    placeholder="输入自定义模型名称" style="display: none;">
                            </div>
                        </div>
                        
                        <div class="model-info" id="ai_modelInfo" style="display: none;">
                            <div class="model-badge">
                                <span class="model-name"></span>
                                <span class="model-context"></span>
                                <span class="model-cost"></span>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>上下文窗口</label>
                                <select class="form-select" id="ai_contextWindow" style="margin-bottom: 8px;">
                                    <option value="4096">4K</option>
                                    <option value="8192" selected>8K</option>
                                    <option value="16384">16K</option>
                                    <option value="32768">32K</option>
                                    <option value="64000">64K</option>
                                    <option value="128000">128K</option>
                                    <option value="200000">200K</option>
                                    <option value="1000000">1M (Gemini)</option>
                                    <option value="2000000">2M (Gemini)</option>
                                    <option value="custom">✏️ 自定义</option>
                                </select>
                                <input type="number" class="form-input" id="ai_customContextWindow" 
                                    placeholder="输入自定义上下文长度" style="display: none;" min="1">
                            </div>
                            <div class="form-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="ai_streaming" checked>
                                    <span>启用流式输出</span>
                                </label>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>API 密钥</label>
                                <input type="password" class="form-input" id="ai_apiKey" placeholder="sk-...">
                                <p class="form-hint" id="ai_apiKeyHint">你的 API 密钥，仅在本地使用</p>
                            </div>
                            <div class="form-group">
                                <label>API Base URL</label>
                                <input type="text" class="form-input" id="ai_baseUrl" placeholder="https://api.openai.com/v1">
                                <p class="form-hint" id="ai_baseUrlHint">OpenAI 兼容格式的 API 地址</p>
                            </div>
                        </div>
                        
                        <div class="form-actions" style="margin-top: 10px;">
                            <button class="btn btn-secondary" onclick="aiConfigEditor.testConnection()" id="ai_testConnectionBtn">
                                🔌 测试连接
                            </button>
                            <span id="ai_testConnectionResult" style="margin-left: 12px; font-size: 13px;"></span>
                        </div>
                    </div>
                </div>
                
                <!-- 生成参数 -->
                <div class="config-section" data-section="generation">
                    <div class="config-section-header">
                        <span class="section-icon">🎛️</span>
                        <span>生成参数</span>
                    </div>
                    <div class="config-section-body">
                        <!-- Temperature -->
                        <div class="param-control" data-param="temperature">
                            <div class="param-header">
                                <label>Temperature</label>
                                <span class="param-value" id="ai_tempValue">0.7</span>
                            </div>
                            <div class="param-slider-wrapper">
                                <span class="param-min">保守</span>
                                <input type="range" class="param-slider" id="ai_temperature" 
                                    min="0" max="2" step="0.1" value="0.7">
                                <span class="param-max">创意</span>
                            </div>
                            <div class="param-description" id="ai_tempDesc"></div>
                        </div>
                        
                        <!-- Max Tokens -->
                        <div class="param-control" data-param="maxTokens">
                            <div class="param-header">
                                <label>Max Tokens</label>
                                <span class="param-value" id="ai_tokensValue">2000</span>
                            </div>
                            <div class="param-slider-wrapper">
                                <span class="param-min">短</span>
                                <input type="range" class="param-slider" id="ai_maxTokens" 
                                    min="100" max="8000" step="100" value="2000">
                                <span class="param-max">长</span>
                            </div>
                            <div class="param-description" id="ai_tokensDesc"></div>
                        </div>
                        
                        <!-- Top P -->
                        <div class="param-control" data-param="topP">
                            <div class="param-header">
                                <label>Top P</label>
                                <span class="param-value" id="ai_topPValue">0.9</span>
                            </div>
                            <div class="param-slider-wrapper">
                                <span class="param-min">集中</span>
                                <input type="range" class="param-slider" id="ai_topP" 
                                    min="0" max="1" step="0.05" value="0.9">
                                <span class="param-max">多样</span>
                            </div>
                            <div class="param-description" id="ai_topPDesc"></div>
                        </div>
                        
                        <!-- Frequency Penalty -->
                        <div class="param-control" data-param="frequencyPenalty">
                            <div class="param-header">
                                <label>Frequency Penalty</label>
                                <span class="param-value" id="ai_freqValue">0.0</span>
                            </div>
                            <div class="param-slider-wrapper">
                                <span class="param-min">允许重复</span>
                                <input type="range" class="param-slider" id="ai_frequencyPenalty" 
                                    min="-2" max="2" step="0.1" value="0">
                                <span class="param-max">避免重复</span>
                            </div>
                            <div class="param-description" id="ai_freqDesc"></div>
                        </div>
                        
                        <!-- Presence Penalty -->
                        <div class="param-control" data-param="presencePenalty">
                            <div class="param-header">
                                <label>Presence Penalty</label>
                                <span class="param-value" id="ai_presValue">0.0</span>
                            </div>
                            <div class="param-slider-wrapper">
                                <span class="param-min">允许重复主题</span>
                                <input type="range" class="param-slider" id="ai_presencePenalty" 
                                    min="-2" max="2" step="0.1" value="0">
                                <span class="param-max">新主题</span>
                            </div>
                            <div class="param-description" id="ai_presDesc"></div>
                        </div>
                        
                        <!-- Stop Sequences -->
                        <div class="form-group">
                            <label>停止序列 (Stop Sequences)</label>
                            <div class="stop-sequences-list" id="ai_stopSequences">
                                <!-- 动态生成 -->
                            </div>
                            <button class="btn-text" onclick="aiConfigEditor.addStopSequence()">+ 添加停止词</button>
                        </div>
                    </div>
                </div>
                
                <!-- 思维链设置 -->
                <div class="config-section" data-section="cot">
                    <div class="config-section-header">
                        <span class="section-icon">🧠</span>
                        <span>思维链 (Chain of Thought)</span>
                    </div>
                    <div class="config-section-body">
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="ai_cotEnabled">
                                <span>启用思维链</span>
                                <span class="checkbox-hint">AI会先思考再回答，提高逻辑性</span>
                            </label>
                        </div>
                        
                        <div class="cot-options" id="ai_cotOptions" style="display: none;">
                            <div class="form-group">
                                <label>思考深度</label>
                                <div class="radio-group">
                                    <label class="radio-label">
                                        <input type="radio" name="cotDepth" value="standard" checked>
                                        <span>标准</span>
                                    </label>
                                    <label class="radio-label">
                                        <input type="radio" name="cotDepth" value="deep">
                                        <span>深度</span>
                                    </label>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="ai_showThinking" checked>
                                    <span>显示思考过程</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 安全与过滤 -->
                <div class="config-section" data-section="safety">
                    <div class="config-section-header">
                        <span class="section-icon">🛡️</span>
                        <span>安全与过滤</span>
                    </div>
                    <div class="config-section-body">
                        <div class="form-group">
                            <label>内容过滤级别</label>
                            <div class="filter-levels">
                                <label class="filter-level">
                                    <input type="radio" name="filterLevel" value="none">
                                    <span>无过滤</span>
                                </label>
                                <label class="filter-level">
                                    <input type="radio" name="filterLevel" value="standard" checked>
                                    <span>标准</span>
                                </label>
                                <label class="filter-level">
                                    <input type="radio" name="filterLevel" value="strict">
                                    <span>严格</span>
                                </label>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="ai_autoTruncate" checked>
                                <span>自动截断敏感内容</span>
                            </label>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>最大重试次数</label>
                                <input type="number" class="form-input" id="ai_maxRetries" 
                                    value="3" min="1" max="10" style="width: 100px;">
                            </div>
                            <div class="form-group">
                                <label>超时时间 (毫秒)</label>
                                <input type="number" class="form-input" id="ai_timeout" 
                                    value="30000" min="5000" max="120000" step="5000" style="width: 150px;">
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 参数说明 -->
                <div class="config-help-card">
                    <div class="config-help-header">
                        <span>💡 参数说明</span>
                    </div>
                    <div class="config-help-content" id="ai_paramHelp">
                        <p>将鼠标悬停在参数上查看详细说明</p>
                    </div>
                </div>
            </div>
            
            <!-- 保存预设弹窗 -->
            <div class="preset-modal" id="ai_presetModal" style="display: none;">
                <div class="preset-modal-content">
                    <div class="preset-modal-header">
                        <span>保存预设</span>
                        <button class="btn-icon" onclick="aiConfigEditor.closePresetModal()">×</button>
                    </div>
                    <div class="preset-modal-body">
                        <div class="form-group">
                            <label>预设名称</label>
                            <input type="text" class="form-input" id="ai_presetName" placeholder="我的配置">
                        </div>
                        <div class="form-group">
                            <label>描述</label>
                            <input type="text" class="form-input" id="ai_presetDesc" placeholder="简短描述这个配置的用途">
                        </div>
                    </div>
                    <div class="preset-modal-footer">
                        <button class="btn btn-secondary" onclick="aiConfigEditor.closePresetModal()">取消</button>
                        <button class="btn btn-primary" onclick="aiConfigEditor.confirmSavePreset()">保存</button>
                    </div>
                </div>
            </div>
        `;
        
        this.updateModelOptions();
    }
    
    renderPresetsList() {
        return this.presets.map(preset => `
            <div class="preset-item ${preset.isDefault ? 'default' : ''} ${preset.isBuiltin ? 'builtin' : ''}" 
                 data-preset="${preset.id}">
                <div class="preset-info">
                    <div class="preset-name">${preset.name}</div>
                    <div class="preset-desc">${preset.description}</div>
                </div>
                <div class="preset-actions">
                    <button class="btn-text" onclick="aiConfigEditor.applyPreset('${preset.id}')">应用</button>
                    ${!preset.isBuiltin ? `
                        <button class="btn-icon" onclick="aiConfigEditor.deletePreset('${preset.id}')" title="删除">🗑</button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }
    
    attachEvents() {
        // 提供商改变
        const providerSelect = document.getElementById('ai_provider');
        if (providerSelect) {
            providerSelect.addEventListener('change', (e) => {
                this.updateModelOptions();
                this.collectData();
            });
        }
        
        // 模型改变
        const modelSelect = document.getElementById('ai_model');
        if (modelSelect) {
            modelSelect.addEventListener('change', () => {
                this.toggleCustomModel();
                this.collectData();
            });
        }
        
        // 自定义模型名输入
        const customModelInput = document.getElementById('ai_customModel');
        if (customModelInput) {
            customModelInput.addEventListener('input', () => {
                this.updateModelInfo();
                this.collectData();
            });
        }
        
        // 上下文窗口改变
        const contextSelect = document.getElementById('ai_contextWindow');
        if (contextSelect) {
            contextSelect.addEventListener('change', () => {
                this.toggleCustomContext();
                this.collectData();
            });
        }
        
        // 自定义上下文输入
        const customContextInput = document.getElementById('ai_customContextWindow');
        if (customContextInput) {
            customContextInput.addEventListener('input', () => this.collectData());
        }
        
        // API Key / Base URL
        const apiKeyInput = document.getElementById('ai_apiKey');
        if (apiKeyInput) {
            apiKeyInput.addEventListener('change', () => this.collectData());
        }
        const baseUrlInput = document.getElementById('ai_baseUrl');
        if (baseUrlInput) {
            baseUrlInput.addEventListener('change', () => this.collectData());
        }
        
        // 参数滑块
        const sliders = [
            { id: 'ai_temperature', display: 'ai_tempValue', key: 'temperature' },
            { id: 'ai_maxTokens', display: 'ai_tokensValue', key: 'maxTokens' },
            { id: 'ai_topP', display: 'ai_topPValue', key: 'topP' },
            { id: 'ai_frequencyPenalty', display: 'ai_freqValue', key: 'frequencyPenalty' },
            { id: 'ai_presencePenalty', display: 'ai_presValue', key: 'presencePenalty' }
        ];
        
        sliders.forEach(({ id, display, key }) => {
            const slider = document.getElementById(id);
            if (slider) {
                slider.addEventListener('input', (e) => {
                    const displayEl = document.getElementById(display);
                    if (displayEl) displayEl.textContent = e.target.value;
                    this.collectData();
                    this.updateParamDescription(key);
                });
                
                // 鼠标悬停显示说明
                slider.addEventListener('mouseenter', () => {
                    this.updateParamDescription(key);
                });
            }
        });
        
        // 其他输入
        document.querySelectorAll(`#${this.containerId} input, #${this.containerId} select`).forEach(input => {
            if (!input.id?.startsWith('ai_preset')) {
                input.addEventListener('change', () => this.collectData());
            }
        });
        
        // 思维链开关
        const cotEnabled = document.getElementById('ai_cotEnabled');
        if (cotEnabled) {
            cotEnabled.addEventListener('change', (e) => {
                const cotOptions = document.getElementById('ai_cotOptions');
                if (cotOptions) {
                    cotOptions.style.display = e.target.checked ? 'block' : 'none';
                }
                this.collectData();
            });
        }
    }
    
    updateModelOptions() {
        const provider = document.getElementById('ai_provider')?.value || 'openai';
        const modelSelect = document.getElementById('ai_model');
        const customModelInput = document.getElementById('ai_customModel');
        if (!modelSelect) return;
        
        const models = (this.models[provider] || []).filter(m => m.id !== '__custom__');
        let html = models.map(m => `
            <option value="${m.id}" data-context="${m.context}" data-cost="${m.cost}">${m.name}</option>
        `).join('');
        html += `<option value="__custom__">✏️ 自定义模型...</option>`;
        modelSelect.innerHTML = html;
        
        const isCustomProvider = provider === 'custom';
        if (isCustomProvider && customModelInput) {
            modelSelect.value = '__custom__';
            modelSelect.style.display = 'none';
            customModelInput.style.display = 'block';
        } else if (customModelInput) {
            modelSelect.style.display = 'block';
            customModelInput.style.display = 'none';
        }
        
        this.updateModelInfo();
        this.updateBaseUrlHint(provider);
    }
    
    updateModelInfo() {
        const modelSelect = document.getElementById('ai_model');
        const modelInfo = document.getElementById('ai_modelInfo');
        const customModelInput = document.getElementById('ai_customModel');
        if (!modelSelect || !modelInfo) return;
        
        const isCustom = modelSelect.value === '__custom__';
        if (isCustom && customModelInput?.value) {
            modelInfo.innerHTML = `
                <div class="model-badge">
                    <span class="model-name">${customModelInput.value}</span>
                    <span class="model-context">自定义模型</span>
                </div>
            `;
            modelInfo.style.display = 'block';
            return;
        }
        
        const selected = modelSelect.options[modelSelect.selectedIndex];
        if (selected && !isCustom) {
            const context = selected.dataset.context;
            const cost = selected.dataset.cost;
            
            modelInfo.innerHTML = `
                <div class="model-badge">
                    <span class="model-name">${selected.text}</span>
                    <span class="model-context">上下文: ${context}</span>
                    <span class="model-cost">成本: ${cost}</span>
                </div>
            `;
            modelInfo.style.display = 'block';
        } else {
            modelInfo.style.display = 'none';
        }
    }
    
    toggleCustomModel() {
        const modelSelect = document.getElementById('ai_model');
        const customModelInput = document.getElementById('ai_customModel');
        if (!modelSelect || !customModelInput) return;
        
        if (modelSelect.value === '__custom__') {
            customModelInput.style.display = 'block';
            customModelInput.focus();
        } else {
            customModelInput.style.display = 'none';
        }
        this.updateModelInfo();
    }
    
    toggleCustomContext() {
        const contextSelect = document.getElementById('ai_contextWindow');
        const customContextInput = document.getElementById('ai_customContextWindow');
        if (!contextSelect || !customContextInput) return;
        
        if (contextSelect.value === 'custom') {
            customContextInput.style.display = 'block';
            customContextInput.focus();
        } else {
            customContextInput.style.display = 'none';
        }
    }
    
    updateBaseUrlHint(provider) {
        const baseUrlInput = document.getElementById('ai_baseUrl');
        const baseUrlHint = document.getElementById('ai_baseUrlHint');
        if (!baseUrlInput || !baseUrlHint) return;
        
        const defaultUrls = {
            openai: 'https://api.openai.com/v1',
            anthropic: 'https://api.anthropic.com/v1',
            google: 'https://generativelanguage.googleapis.com/v1beta',
            openrouter: 'https://openrouter.ai/api/v1',
            deepseek: 'https://api.deepseek.com/v1',
            moonshot: 'https://api.moonshot.cn/v1',
            siliconflow: 'https://api.siliconflow.cn/v1',
            aliyun: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
            azure: 'https://<resource>.openai.azure.com/openai/deployments/<deployment>',
            local: 'http://localhost:8000/v1',
            custom: 'https://your-api.com/v1'
        };
        
        const placeholders = {
            openai: 'https://api.openai.com/v1',
            anthropic: 'https://api.anthropic.com/v1',
            google: 'https://generativelanguage.googleapis.com/v1beta',
            openrouter: 'https://openrouter.ai/api/v1',
            deepseek: 'https://api.deepseek.com/v1',
            moonshot: 'https://api.moonshot.cn/v1',
            siliconflow: 'https://api.siliconflow.cn/v1',
            aliyun: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
            azure: 'https://<your-resource>.openai.azure.com',
            local: 'http://localhost:8000/v1',
            custom: 'https://your-api.com/v1'
        };
        
        if (baseUrlInput.value === '' || Object.values(defaultUrls).includes(baseUrlInput.value)) {
            baseUrlInput.placeholder = placeholders[provider] || 'https://api.example.com/v1';
        }
        
        const hints = {
            openai: 'OpenAI 官方或兼容接口',
            anthropic: 'Anthropic 官方接口',
            google: 'Gemini API 地址',
            openrouter: 'OpenRouter 统一接口',
            deepseek: 'DeepSeek 官方接口',
            moonshot: 'Moonshot (Kimi) 官方接口',
            siliconflow: 'SiliconFlow 官方接口',
            aliyun: '阿里云百炼兼容接口',
            azure: 'Azure OpenAI 部署地址',
            local: '本地模型服务地址 (Ollama/vLLM等)',
            custom: '你的自定义 API 地址'
        };
        baseUrlHint.textContent = hints[provider] || 'OpenAI 兼容格式的 API 地址';
    }
    
    updateParamDescription(paramKey) {
        const helpContent = document.getElementById('ai_paramHelp');
        if (!helpContent) return;
        
        const desc = this.paramDescriptions[paramKey];
        if (desc) {
            helpContent.innerHTML = `
                <h4>${desc.title}</h4>
                <p>${desc.desc}</p>
                <div class="param-meta">
                    <span>范围: ${desc.range}</span>
                    <span>推荐: ${desc.recommended}</span>
                </div>
            `;
        }
    }
    
    collectData() {
        const provider = document.getElementById('ai_provider')?.value || 'openai';
        let modelName = document.getElementById('ai_model')?.value || 'gpt-4o';
        const customModelName = document.getElementById('ai_customModel')?.value?.trim() || '';
        
        if (modelName === '__custom__' && customModelName) {
            modelName = customModelName;
        }
        
        const modelInfo = this.models[provider]?.find(m => m.id === modelName);
        
        let contextWindow = parseInt(document.getElementById('ai_contextWindow')?.value) || 0;
        if (document.getElementById('ai_contextWindow')?.value === 'custom') {
            contextWindow = parseInt(document.getElementById('ai_customContextWindow')?.value) || 8192;
        }
        
        this.config.model = {
            provider: provider,
            name: modelName,
            contextWindow: contextWindow || modelInfo?.context || 8192,
            customModelName: customModelName,
            apiKey: this.sanitizeApiKey(document.getElementById('ai_apiKey')?.value || ''),
            baseUrl: this.sanitizeApiKey(document.getElementById('ai_baseUrl')?.value || '')
        };
        
        this.config.generation = {
            temperature: parseFloat(document.getElementById('ai_temperature')?.value) || 0.7,
            maxTokens: parseInt(document.getElementById('ai_maxTokens')?.value) || 2000,
            topP: parseFloat(document.getElementById('ai_topP')?.value) || 0.9,
            frequencyPenalty: parseFloat(document.getElementById('ai_frequencyPenalty')?.value) || 0,
            presencePenalty: parseFloat(document.getElementById('ai_presencePenalty')?.value) || 0,
            stopSequences: this.config.generation?.stopSequences || []
        };
        
        this.config.streaming = {
            enabled: document.getElementById('ai_streaming')?.checked ?? true,
            chunkSize: 10
        };
        
        this.config.chainOfThought = {
            enabled: document.getElementById('ai_cotEnabled')?.checked || false,
            depth: document.querySelector('input[name="cotDepth"]:checked')?.value || 'standard',
            showThinking: document.getElementById('ai_showThinking')?.checked ?? true
        };
        
        this.config.safety = {
            filterLevel: document.querySelector('input[name="filterLevel"]:checked')?.value || 'standard',
            autoTruncate: document.getElementById('ai_autoTruncate')?.checked ?? true
        };
        
        this.config.retry = {
            maxAttempts: parseInt(document.getElementById('ai_maxRetries')?.value) || 3,
            timeout: parseInt(document.getElementById('ai_timeout')?.value) || 30000
        };
        
        this.onChange(this.config);
        return this.config;
    }
    
    loadData(config) {
        const defaults = this.getDefaultConfig();
        
        // 兼容旧配置：endpoint -> baseUrl
        if (config.model?.endpoint && !config.model?.baseUrl) {
            config.model = { ...config.model, baseUrl: config.model.endpoint };
        }
        
        this.config = {
            ...defaults,
            ...config,
            model: { ...defaults.model, ...(config.model || {}) },
            generation: { ...defaults.generation, ...(config.generation || {}) },
            streaming: { ...defaults.streaming, ...(config.streaming || {}) },
            retry: { ...defaults.retry, ...(config.retry || {}) },
            chainOfThought: { ...defaults.chainOfThought, ...(config.chainOfThought || {}) },
            safety: { ...defaults.safety, ...(config.safety || {}) }
        };
        
        // 填充表单
        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value;
        };
        
        const setChecked = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.checked = value;
        };
        
        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };
        
        // 模型设置
        setValue('ai_provider', this.config.model.provider);
        this.updateModelOptions();
        
        const modelSelect = document.getElementById('ai_model');
        const customModelInput = document.getElementById('ai_customModel');
        if (modelSelect) {
            const knownModels = Array.from(modelSelect.options).map(o => o.value);
            if (knownModels.includes(this.config.model.name)) {
                setValue('ai_model', this.config.model.name);
                if (customModelInput) customModelInput.style.display = 'none';
            } else if (this.config.model.name || this.config.model.customModelName) {
                modelSelect.value = '__custom__';
                if (customModelInput) {
                    customModelInput.value = this.config.model.customModelName || this.config.model.name || '';
                    customModelInput.style.display = 'block';
                }
            }
        }
        this.updateModelInfo();
        
        const contextWindow = this.config.model.contextWindow;
        const contextSelect = document.getElementById('ai_contextWindow');
        const customContextInput = document.getElementById('ai_customContextWindow');
        if (contextSelect) {
            const knownContexts = Array.from(contextSelect.options).map(o => o.value);
            if (knownContexts.includes(String(contextWindow))) {
                setValue('ai_contextWindow', contextWindow);
                if (customContextInput) customContextInput.style.display = 'none';
            } else {
                contextSelect.value = 'custom';
                if (customContextInput) {
                    customContextInput.value = contextWindow || '';
                    customContextInput.style.display = 'block';
                }
            }
        }
        
        setValue('ai_apiKey', this.config.model.apiKey || '');
        setValue('ai_baseUrl', this.config.model.baseUrl || '');
        
        // 生成参数
        setValue('ai_temperature', this.config.generation.temperature);
        setText('ai_tempValue', this.config.generation.temperature);
        
        setValue('ai_maxTokens', this.config.generation.maxTokens);
        setText('ai_tokensValue', this.config.generation.maxTokens);
        
        setValue('ai_topP', this.config.generation.topP);
        setText('ai_topPValue', this.config.generation.topP);
        
        setValue('ai_frequencyPenalty', this.config.generation.frequencyPenalty);
        setText('ai_freqValue', this.config.generation.frequencyPenalty);
        
        setValue('ai_presencePenalty', this.config.generation.presencePenalty);
        setText('ai_presValue', this.config.generation.presencePenalty);
        
        // 其他设置
        setChecked('ai_streaming', this.config.streaming.enabled);
        setChecked('ai_cotEnabled', this.config.chainOfThought.enabled);
        setChecked('ai_showThinking', this.config.chainOfThought.showThinking);
        
        // CoT深度
        const cotDepthRadio = document.querySelector(`input[name="cotDepth"][value="${this.config.chainOfThought.depth}"]`);
        if (cotDepthRadio) cotDepthRadio.checked = true;
        
        const cotOptions = document.getElementById('ai_cotOptions');
        if (cotOptions) {
            cotOptions.style.display = this.config.chainOfThought.enabled ? 'block' : 'none';
        }
        
        // 安全设置
        const filterRadio = document.querySelector(`input[name="filterLevel"][value="${this.config.safety.filterLevel}"]`);
        if (filterRadio) filterRadio.checked = true;
        
        setChecked('ai_autoTruncate', this.config.safety.autoTruncate);
        
        setValue('ai_maxRetries', this.config.retry.maxAttempts);
        setValue('ai_timeout', this.config.retry.timeout);
        
        if (!this.config.generation.stopSequences) {
            this.config.generation.stopSequences = [];
        }
        this.renderStopSequences();
    }
    
    // 预设管理
    applyPreset(presetId) {
        const preset = this.presets.find(p => p.id === presetId);
        if (!preset) {
            console.warn('[AIConfigEditor] Preset not found:', presetId);
            return;
        }
        
        if (confirm(`应用预设「${preset.name}」将覆盖当前配置，确定吗？`)) {
            try {
                this.loadData(preset.config);
                showToast(`已应用预设: ${preset.name}`, 'success');
            } catch (err) {
                console.error('[AIConfigEditor] applyPreset failed:', err);
                showToast('应用预设失败: ' + err.message, 'error');
            }
        }
    }
    
    saveCurrentAsPreset() {
        document.getElementById('ai_presetModal').style.display = 'flex';
    }
    
    closePresetModal() {
        document.getElementById('ai_presetModal').style.display = 'none';
        document.getElementById('ai_presetName').value = '';
        document.getElementById('ai_presetDesc').value = '';
    }
    
    confirmSavePreset() {
        const name = document.getElementById('ai_presetName').value.trim();
        const desc = document.getElementById('ai_presetDesc').value.trim();
        
        if (!name) {
            showToast('请输入预设名称', 'error');
            return;
        }
        
        const newPreset = {
            id: 'preset_' + Date.now(),
            name: name,
            description: desc || '用户自定义预设',
            config: JSON.parse(JSON.stringify(this.config)),
            isDefault: false,
            isBuiltin: false
        };
        
        this.presets.push(newPreset);
        this.savePresetsToStorage();
        
        // 刷新列表
        document.getElementById('ai_presetsList').innerHTML = this.renderPresetsList();
        
        this.closePresetModal();
        showToast('预设已保存', 'success');
    }
    
    deletePreset(presetId) {
        if (!confirm('确定要删除这个预设吗？')) return;
        
        this.presets = this.presets.filter(p => p.id !== presetId);
        this.savePresetsToStorage();
        
        document.getElementById('ai_presetsList').innerHTML = this.renderPresetsList();
        showToast('预设已删除', 'success');
    }
    
    savePresetsToStorage() {
        const userPresets = this.presets.filter(p => !p.isBuiltin);
        localStorage.setItem('ai_config_presets', JSON.stringify(userPresets));
    }
    
    exportAllPresets() {
        const dataStr = JSON.stringify(this.presets, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-config-presets-${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        showToast('预设已导出', 'success');
    }
    
    importPreset() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const imported = JSON.parse(event.target.result);
                    
                    if (Array.isArray(imported)) {
                        // 导入预设列表
                        let count = 0;
                        imported.forEach(preset => {
                            if (preset.id && preset.name && preset.config) {
                                preset.isBuiltin = false;
                                preset.id = 'imported_' + Date.now() + '_' + count;
                                this.presets.push(preset);
                                count++;
                            }
                        });
                        
                        this.savePresetsToStorage();
                        document.getElementById('ai_presetsList').innerHTML = this.renderPresetsList();
                        showToast(`成功导入 ${count} 个预设`, 'success');
                    } else if (imported.config) {
                        // 导入单个配置
                        this.loadData(imported.config);
                        showToast('配置已导入', 'success');
                    }
                } catch (err) {
                    showToast('导入失败: ' + err.message, 'error');
                }
            };
            reader.readAsText(file);
        };
        
        input.click();
    }
    
    // 停止序列管理
    addStopSequence(sequence = '') {
        this.config.generation.stopSequences.push(sequence);
        this.renderStopSequences();
    }
    
    removeStopSequence(index) {
        this.config.generation.stopSequences.splice(index, 1);
        this.renderStopSequences();
    }
    
    updateStopSequence(index, value) {
        this.config.generation.stopSequences[index] = value;
    }
    
    renderStopSequences() {
        const container = document.getElementById('ai_stopSequences');
        if (!container) return;
        
        container.innerHTML = this.config.generation.stopSequences.map((seq, i) => `
            <div class="stop-sequence-item">
                <input type="text" value="${this.escapeHtml(seq)}" 
                    onchange="aiConfigEditor.updateStopSequence(${i}, this.value)"
                    placeholder="输入停止词">
                <button class="btn-icon" onclick="aiConfigEditor.removeStopSequence(${i})" title="删除">×</button>
            </div>
        `).join('');
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    sanitizeApiKey(value) {
        if (!value) return '';
        // 移除零宽字符、BOM、全角空格、换行符等不可见字符
        return value
            .replace(/[\u200B-\u200D\uFEFF\u3000]/g, '')
            .replace(/[\n\r\t]/g, '')
            .trim();
    }
    
    async testConnection() {
        const btn = document.getElementById('ai_testConnectionBtn');
        const resultEl = document.getElementById('ai_testConnectionResult');
        if (!btn || !resultEl) return;
        
        const config = this.collectData();
        const apiKey = this.sanitizeApiKey(config.model.apiKey);
        const baseUrl = (config.model.baseUrl || '').replace(/[\u200B-\u200D\uFEFF\u3000\n\r\t]/g, '').trim();
        const modelName = config.model.name;
        
        if (!apiKey) {
            resultEl.innerHTML = '<span style="color: #ff6b6b;">❌ 请先填写 API 密钥</span>';
            return;
        }
        if (!baseUrl) {
            resultEl.innerHTML = '<span style="color: #ff6b6b;">❌ 请先填写 API Base URL</span>';
            return;
        }
        
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '⏳ 测试中...';
        resultEl.innerHTML = '<span style="color: var(--text-secondary);">正在通过后端代理发送测试请求...</span>';
        
        try {
            // 通过后端代理测试，避免浏览器 CORS 限制
            const testUrl = baseUrl.replace(/\/$/, '') + '/chat/completions';
            const response = await fetch(`${API_BASE}/settings/test`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    apiKey: apiKey,
                    apiUrl: testUrl,
                    model: modelName
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                resultEl.innerHTML = '<span style="color: #4ecdc4;">✅ 连接成功！API 可用</span>';
            } else {
                const errMsg = data.message || data.error || '未知错误';
                // 判断是否是模型名错误
                if (errMsg.includes('model') || errMsg.includes('Model')) {
                    resultEl.innerHTML = `<span style="color: #feca57;">⚠️ 模型名称可能不正确: ${this.escapeHtml(errMsg)}</span>`;
                } else {
                    resultEl.innerHTML = `<span style="color: #ff6b6b;">❌ 连接失败: ${this.escapeHtml(errMsg)}</span>`;
                }
            }
        } catch (err) {
            resultEl.innerHTML = `<span style="color: #ff6b6b;">❌ 请求异常: ${this.escapeHtml(err.message)}</span>`;
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
    
    getConfig() {
        return this.collectData();
    }
}

// 全局实例
let aiConfigEditor = null;

// 初始化函数
function initAIConfigEditor(options = {}) {
    aiConfigEditor = new AIConfigEditor(options);
    return aiConfigEditor;
}

// 导出到window
window.AIConfigEditor = AIConfigEditor;
window.initAIConfigEditor = initAIConfigEditor;
window.aiConfigEditor = aiConfigEditor;
