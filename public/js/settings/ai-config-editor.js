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
                name: 'gpt-4',
                contextWindow: 8192,
                endpoint: ''
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
                { id: 'gpt-4', name: 'GPT-4', context: 8192, cost: '高' },
                { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', context: 128000, cost: '高' },
                { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', context: 16385, cost: '低' },
                { id: 'gpt-4o', name: 'GPT-4o', context: 128000, cost: '中' }
            ],
            anthropic: [
                { id: 'claude-3-opus', name: 'Claude 3 Opus', context: 200000, cost: '高' },
                { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', context: 200000, cost: '中' },
                { id: 'claude-3-haiku', name: 'Claude 3 Haiku', context: 200000, cost: '低' }
            ],
            local: [
                { id: 'local-llm', name: '本地模型', context: 4096, cost: '免费' }
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
                                    <option value="local">本地模型</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>模型选择</label>
                                <select class="form-select" id="ai_model">
                                    <!-- 动态生成 -->
                                </select>
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
                                <select class="form-select" id="ai_contextWindow">
                                    <option value="4096">4K</option>
                                    <option value="8192" selected>8K</option>
                                    <option value="16384">16K</option>
                                    <option value="32768">32K</option>
                                    <option value="128000">128K</option>
                                    <option value="200000">200K</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="ai_streaming" checked>
                                    <span>启用流式输出</span>
                                </label>
                            </div>
                        </div>
                        
                        <div class="form-group api-endpoint" id="ai_endpointGroup" style="display: none;">
                            <label>API 端点</label>
                            <input type="text" class="form-input" id="ai_endpoint" 
                                placeholder="http://localhost:8000/v1/chat/completions">
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
                this.toggleEndpointInput(e.target.value);
                this.collectData();
            });
        }
        
        // 模型改变
        const modelSelect = document.getElementById('ai_model');
        if (modelSelect) {
            modelSelect.addEventListener('change', () => {
                this.updateModelInfo();
                this.collectData();
            });
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
                    document.getElementById(display).textContent = e.target.value;
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
                document.getElementById('ai_cotOptions').style.display = e.target.checked ? 'block' : 'none';
                this.collectData();
            });
        }
    }
    
    updateModelOptions() {
        const provider = document.getElementById('ai_provider')?.value || 'openai';
        const modelSelect = document.getElementById('ai_model');
        if (!modelSelect) return;
        
        const models = this.models[provider] || [];
        modelSelect.innerHTML = models.map(m => `
            <option value="${m.id}" data-context="${m.context}" data-cost="${m.cost}">${m.name}</option>
        `).join('');
        
        this.updateModelInfo();
    }
    
    updateModelInfo() {
        const modelSelect = document.getElementById('ai_model');
        const modelInfo = document.getElementById('ai_modelInfo');
        if (!modelSelect || !modelInfo) return;
        
        const selected = modelSelect.options[modelSelect.selectedIndex];
        if (selected) {
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
        }
    }
    
    toggleEndpointInput(provider) {
        const endpointGroup = document.getElementById('ai_endpointGroup');
        if (endpointGroup) {
            endpointGroup.style.display = provider === 'local' ? 'block' : 'none';
        }
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
        const modelName = document.getElementById('ai_model')?.value || 'gpt-4';
        
        const modelInfo = this.models[provider]?.find(m => m.id === modelName);
        
        this.config.model = {
            provider: provider,
            name: modelName,
            contextWindow: parseInt(document.getElementById('ai_contextWindow')?.value) || modelInfo?.context || 8192,
            endpoint: document.getElementById('ai_endpoint')?.value || ''
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
        this.config = { ...this.getDefaultConfig(), ...config };
        
        // 填充表单
        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value;
        };
        
        const setChecked = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.checked = value;
        };
        
        // 模型设置
        setValue('ai_provider', this.config.model.provider);
        this.updateModelOptions();
        setValue('ai_model', this.config.model.name);
        this.updateModelInfo();
        setValue('ai_contextWindow', this.config.model.contextWindow);
        setValue('ai_endpoint', this.config.model.endpoint || '');
        this.toggleEndpointInput(this.config.model.provider);
        
        // 生成参数
        setValue('ai_temperature', this.config.generation.temperature);
        document.getElementById('ai_tempValue').textContent = this.config.generation.temperature;
        
        setValue('ai_maxTokens', this.config.generation.maxTokens);
        document.getElementById('ai_tokensValue').textContent = this.config.generation.maxTokens;
        
        setValue('ai_topP', this.config.generation.topP);
        document.getElementById('ai_topPValue').textContent = this.config.generation.topP;
        
        setValue('ai_frequencyPenalty', this.config.generation.frequencyPenalty);
        document.getElementById('ai_freqValue').textContent = this.config.generation.frequencyPenalty;
        
        setValue('ai_presencePenalty', this.config.generation.presencePenalty);
        document.getElementById('ai_presValue').textContent = this.config.generation.presencePenalty;
        
        // 其他设置
        setChecked('ai_streaming', this.config.streaming.enabled);
        setChecked('ai_cotEnabled', this.config.chainOfThought.enabled);
        setChecked('ai_showThinking', this.config.chainOfThought.showThinking);
        
        // CoT深度
        const cotDepthRadio = document.querySelector(`input[name="cotDepth"][value="${this.config.chainOfThought.depth}"]`);
        if (cotDepthRadio) cotDepthRadio.checked = true;
        
        document.getElementById('ai_cotOptions').style.display = 
            this.config.chainOfThought.enabled ? 'block' : 'none';
        
        // 安全设置
        const filterRadio = document.querySelector(`input[name="filterLevel"][value="${this.config.safety.filterLevel}"]`);
        if (filterRadio) filterRadio.checked = true;
        
        setChecked('ai_autoTruncate', this.config.safety.autoTruncate);
        
        setValue('ai_maxRetries', this.config.retry.maxAttempts);
        setValue('ai_timeout', this.config.retry.timeout);
        
        this.renderStopSequences();
    }
    
    // 预设管理
    applyPreset(presetId) {
        const preset = this.presets.find(p => p.id === presetId);
        if (!preset) return;
        
        if (confirm(`应用预设「${preset.name}」将覆盖当前配置，确定吗？`)) {
            this.loadData(preset.config);
            showToast(`已应用预设: ${preset.name}`, 'success');
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
