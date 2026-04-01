/**
 * 提示词编辑器 2.0
 * 参考 SillyTavern 的提示词架构
 * 支持分层提示词：System/Character/Scenario/Examples/Jailbreak
 */

class PromptEditor {
    constructor(options = {}) {
        this.containerId = options.containerId || 'promptEditorContainer';
        this.gameId = options.gameId;
        this.onChange = options.onChange || (() => {});
        this.onSave = options.onSave || (() => {});
        
        // 默认配置
        this.config = this.getDefaultConfig();
        
        // 变量定义
        this.variables = {
            '{{user}}': '玩家名称',
            '{{char}}': '角色名称',
            '{{scene}}': '当前场景',
            '{{time}}': '当前时间',
            '{{date}}': '当前日期',
            '{{lore}}': '世界书内容',
            '{{history}}': '对话历史',
            '{{summary}}': '记忆摘要'
        };
        
        // 快速插入模板
        this.quickTemplates = {
            style: [
                { label: '古风', text: '使用古雅、诗意的文风，多用典故和修辞。' },
                { label: '现代', text: '使用现代、简洁的文风，语言自然流畅。' },
                { label: '暗黑', text: '使用阴暗、沉重的文风，营造压抑氛围。' },
                { label: '轻松', text: '使用轻松、幽默的文风，对话活泼有趣。' }
            ],
            personality: [
                { label: '温柔', text: '性格温柔善良，说话轻声细语，善解人意。' },
                { label: '傲娇', text: '性格傲娇，嘴上不饶人但内心关心对方。' },
                { label: '高冷', text: '性格高冷孤傲，话不多但每句都有分量。' },
                { label: '活泼', text: '性格活泼开朗，充满活力，爱笑爱闹。' }
            ],
            world: [
                { label: '修仙', text: '这是一个弱肉强食的修仙世界，强者为尊。' },
                { label: '现代', text: '这是现代社会，科技发达，生活便利。' },
                { label: '异世界', text: '这是一个魔法与剑的异世界，种族林立。' },
                { label: '末世', text: '这是末日后的废土世界，资源匮乏，危机四伏。' }
            ],
            behavior: [
                { label: '沉浸', text: '始终保持角色扮演，绝不跳出角色或提及自己是AI。' },
                { label: '主动', text: '主动推进剧情，提出行动建议或发起对话。' },
                { label: '细腻', text: '描写细腻，注重环境渲染和人物心理刻画。' },
                { label: '互动', text: '经常询问玩家的想法，保持互动性。' }
            ]
        };
        
        this.init();
    }
    
    getDefaultConfig() {
        return {
            version: '2.0',
            systemPrompt: {
                content: '',
                enabled: true,
                position: 'before'
            },
            character: {
                name: '',
                personality: '',
                appearance: '',
                speechStyle: '',
                background: '',
                traits: []
            },
            scenario: {
                description: '',
                opening: '',
                context: ''
            },
            examples: [],
            jailbreak: {
                content: '',
                enabled: false,
                strength: 0.5
            },
            variables: {
                userName: '玩家',
                customVars: {}
            }
        };
    }
    
    init() {
        this.render();
        this.attachEvents();
        this.updatePreview();
    }
    
    render() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`[PromptEditor] Container #${this.containerId} not found`);
            return;
        }
        
        container.innerHTML = `
            <div class="prompt-editor">
                <!-- 使用指南 -->
                <div class="prompt-guide-card">
                    <div class="prompt-guide-header" onclick="this.parentElement.classList.toggle('expanded')">
                        <span>📖 使用指南</span>
                        <span class="toggle-icon">▼</span>
                    </div>
                    <div class="prompt-guide-content">
                        <div class="variables-grid">
                            ${Object.entries(this.variables).map(([key, desc]) => `
                                <div class="variable-tag" data-var="${key}" title="点击插入">
                                    <code>${key}</code>
                                    <span>${desc}</span>
                                </div>
                            `).join('')}
                        </div>
                        <div class="guide-examples">
                            <p>💡 <strong>提示：</strong>使用变量可以让提示词更灵活，系统会自动替换为对应内容</p>
                        </div>
                    </div>
                </div>
                
                <!-- 前提示词 -->
                <div class="prompt-section" data-section="system">
                    <div class="prompt-section-header">
                        <div class="section-title">
                            <span class="section-icon">🔧</span>
                            <span>前提示词 (System Prompt)</span>
                            <label class="toggle-switch">
                                <input type="checkbox" id="pe_systemEnabled" checked>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        <div class="section-actions">
                            <button class="btn-icon" title="预览" onclick="promptEditor.togglePreview('system')">👁</button>
                            <button class="btn-icon" title="测试" onclick="promptEditor.testPrompt('system')">▶</button>
                        </div>
                    </div>
                    <div class="prompt-section-body">
                        <textarea class="prompt-textarea" id="pe_systemContent" rows="4" 
                            placeholder="定义AI的基础行为和规则，设置世界观、文风、格式要求...&#10;&#10;示例：&#10;你是一个角色扮演AI，扮演修仙世界的角色。&#10;请使用古雅的文风，多用典故和修辞。&#10;始终保持角色扮演，不要跳出角色。"></textarea>
                        <div class="quick-insert-bar">
                            <span>快速插入:</span>
                            ${this.quickTemplates.style.map(t => `<button class="quick-tag" data-template="${t.text}">${t.label}</button>`).join('')}
                            <button class="quick-tag more" onclick="promptEditor.showMoreTemplates('style')">+更多</button>
                        </div>
                    </div>
                </div>
                
                <!-- 角色定义 -->
                <div class="prompt-section" data-section="character">
                    <div class="prompt-section-header">
                        <div class="section-title">
                            <span class="section-icon">👤</span>
                            <span>角色定义</span>
                        </div>
                    </div>
                    <div class="prompt-section-body">
                        <div class="form-row">
                            <div class="form-group">
                                <label>姓名</label>
                                <input type="text" id="pe_charName" class="form-input" placeholder="角色名称">
                            </div>
                            <div class="form-group">
                                <label>性格标签</label>
                                <input type="text" id="pe_charTraits" class="form-input" placeholder="温柔,善良,傲娇...">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>性格描述</label>
                            <textarea id="pe_charPersonality" class="prompt-textarea" rows="2" 
                                placeholder="详细描述角色的性格特点、行为模式..."></textarea>
                            <div class="quick-insert-bar">
                                ${this.quickTemplates.personality.slice(0, 3).map(t => `<button class="quick-tag" data-template="${t.text}">${t.label}</button>`).join('')}
                                <button class="quick-tag more" onclick="promptEditor.showMoreTemplates('personality')">+更多</button>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>外貌描述</label>
                            <textarea id="pe_charAppearance" class="prompt-textarea" rows="2" 
                                placeholder="描述角色的外貌特征、穿着打扮..."></textarea>
                        </div>
                        <div class="form-group">
                            <label>说话风格</label>
                            <textarea id="pe_charSpeech" class="prompt-textarea" rows="2" 
                                placeholder="描述角色的说话方式、常用语、语气特点..."></textarea>
                        </div>
                        <div class="form-group">
                            <label>背景故事</label>
                            <textarea id="pe_charBackground" class="prompt-textarea" rows="3" 
                                placeholder="角色的身世背景、经历、目标..."></textarea>
                        </div>
                    </div>
                </div>
                
                <!-- 场景设定 -->
                <div class="prompt-section" data-section="scenario">
                    <div class="prompt-section-header">
                        <div class="section-title">
                            <span class="section-icon">🎮</span>
                            <span>场景设定</span>
                        </div>
                    </div>
                    <div class="prompt-section-body">
                        <div class="form-group">
                            <label>场景描述</label>
                            <textarea id="pe_scenarioDesc" class="prompt-textarea" rows="3" 
                                placeholder="描述当前场景、环境、氛围..."></textarea>
                            <div class="quick-insert-bar">
                                ${this.quickTemplates.world.slice(0, 3).map(t => `<button class="quick-tag" data-template="${t.text}">${t.label}</button>`).join('')}
                                <button class="quick-tag more" onclick="promptEditor.showMoreTemplates('world')">+更多</button>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>初始开场</label>
                            <textarea id="pe_scenarioOpening" class="prompt-textarea" rows="2" 
                                placeholder="对话开始时的开场白..."></textarea>
                        </div>
                        <div class="form-group">
                            <label>额外上下文</label>
                            <textarea id="pe_scenarioContext" class="prompt-textarea" rows="2" 
                                placeholder="其他需要AI知道的背景信息..."></textarea>
                        </div>
                    </div>
                </div>
                
                <!-- 示例对话 -->
                <div class="prompt-section" data-section="examples">
                    <div class="prompt-section-header">
                        <div class="section-title">
                            <span class="section-icon">📝</span>
                            <span>示例对话</span>
                        </div>
                        <div class="section-actions">
                            <button class="btn-text" onclick="promptEditor.addExample()">+ 添加示例</button>
                        </div>
                    </div>
                    <div class="prompt-section-body">
                        <div class="examples-list" id="pe_examplesList">
                            <!-- 动态生成 -->
                        </div>
                        <div class="examples-hint">
                            💡 示例对话帮助AI理解角色风格和互动方式。使用 <code>&lt;START&gt;</code> 标记开头
                        </div>
                    </div>
                </div>
                
                <!-- 后提示词 -->
                <div class="prompt-section" data-section="jailbreak">
                    <div class="prompt-section-header">
                        <div class="section-title">
                            <span class="section-icon">💭</span>
                            <span>后提示词 (Jailbreak)</span>
                            <label class="toggle-switch">
                                <input type="checkbox" id="pe_jailbreakEnabled">
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                    <div class="prompt-section-body">
                        <textarea id="pe_jailbreakContent" class="prompt-textarea" rows="3" 
                            placeholder="对话历史后的补充指令，用于强化角色扮演...&#10;&#10;示例：&#10;记住始终保持角色扮演，不要跳出角色。&#10;不要直接描述玩家的想法和行为。&#10;主动推进剧情发展，不要重复对话。"
                            disabled></textarea>
                        <div class="jailbreak-strength">
                            <span>强度:</span>
                            <input type="range" id="pe_jailbreakStrength" min="0" max="100" value="50" disabled>
                            <span id="pe_strengthValue">温和</span>
                        </div>
                    </div>
                </div>
                
                <!-- 实时预览 -->
                <div class="prompt-preview-card">
                    <div class="prompt-preview-header">
                        <span>👀 实时预览</span>
                        <span class="token-count" id="pe_tokenCount">约 0 tokens</span>
                    </div>
                    <div class="prompt-preview-content" id="pe_previewContent">
                        <div class="preview-placeholder">配置提示词后，这里会显示最终发送给AI的完整提示词...</div>
                    </div>
                </div>
            </div>
            
            <!-- 更多模板弹窗 -->
            <div class="template-modal" id="pe_templateModal" style="display: none;">
                <div class="template-modal-content">
                    <div class="template-modal-header">
                        <span id="pe_modalTitle">选择模板</span>
                        <button class="btn-icon" onclick="promptEditor.closeTemplateModal()">×</button>
                    </div>
                    <div class="template-list" id="pe_templateList"></div>
                </div>
            </div>
        `;
    }
    
    attachEvents() {
        // 输入监听
        const inputs = document.querySelectorAll(`#${this.containerId} textarea, #${this.containerId} input`);
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.collectData();
                this.updatePreview();
                this.onChange(this.config);
            });
        });
        
        // 快速插入
        document.querySelectorAll(`#${this.containerId} .quick-tag[data-template]`).forEach(btn => {
            btn.addEventListener('click', (e) => {
                const template = e.target.dataset.template;
                const textarea = e.target.closest('.prompt-section-body').querySelector('textarea');
                if (textarea) {
                    this.insertAtCursor(textarea, template);
                }
            });
        });
        
        // 变量插入
        document.querySelectorAll(`#${this.containerId} .variable-tag`).forEach(tag => {
            tag.addEventListener('click', (e) => {
                const variable = e.currentTarget.dataset.var;
                const activeTextarea = document.querySelector(`#${this.containerId} textarea:focus`);
                if (activeTextarea) {
                    this.insertAtCursor(activeTextarea, variable);
                } else {
                    // 默认插入到前提示词
                    const systemTextarea = document.getElementById('pe_systemContent');
                    if (systemTextarea) {
                        this.insertAtCursor(systemTextarea, variable);
                    }
                }
            });
        });
        
        // Jailbreak 开关
        const jailbreakToggle = document.getElementById('pe_jailbreakEnabled');
        if (jailbreakToggle) {
            jailbreakToggle.addEventListener('change', (e) => {
                const content = document.getElementById('pe_jailbreakContent');
                const strength = document.getElementById('pe_jailbreakStrength');
                if (content) content.disabled = !e.target.checked;
                if (strength) strength.disabled = !e.target.checked;
                this.collectData();
                this.updatePreview();
            });
        }
        
        // Jailbreak 强度
        const strengthSlider = document.getElementById('pe_jailbreakStrength');
        if (strengthSlider) {
            strengthSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                const label = value < 33 ? '温和' : value < 66 ? '中等' : '严格';
                document.getElementById('pe_strengthValue').textContent = label;
                this.collectData();
            });
        }
    }
    
    collectData() {
        this.config.systemPrompt.content = document.getElementById('pe_systemContent')?.value || '';
        this.config.systemPrompt.enabled = document.getElementById('pe_systemEnabled')?.checked ?? true;
        
        this.config.character.name = document.getElementById('pe_charName')?.value || '';
        this.config.character.traits = document.getElementById('pe_charTraits')?.value?.split(',').map(s => s.trim()).filter(Boolean) || [];
        this.config.character.personality = document.getElementById('pe_charPersonality')?.value || '';
        this.config.character.appearance = document.getElementById('pe_charAppearance')?.value || '';
        this.config.character.speechStyle = document.getElementById('pe_charSpeech')?.value || '';
        this.config.character.background = document.getElementById('pe_charBackground')?.value || '';
        
        this.config.scenario.description = document.getElementById('pe_scenarioDesc')?.value || '';
        this.config.scenario.opening = document.getElementById('pe_scenarioOpening')?.value || '';
        this.config.scenario.context = document.getElementById('pe_scenarioContext')?.value || '';
        
        this.config.jailbreak.content = document.getElementById('pe_jailbreakContent')?.value || '';
        this.config.jailbreak.enabled = document.getElementById('pe_jailbreakEnabled')?.checked || false;
        this.config.jailbreak.strength = (document.getElementById('pe_jailbreakStrength')?.value || 50) / 100;
        
        return this.config;
    }
    
    loadData(config) {
        this.config = { ...this.getDefaultConfig(), ...config };
        
        // 填充表单
        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value || '';
        };
        
        const setChecked = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.checked = value ?? true;
        };
        
        setValue('pe_systemContent', this.config.systemPrompt.content);
        setChecked('pe_systemEnabled', this.config.systemPrompt.enabled);
        
        setValue('pe_charName', this.config.character.name);
        setValue('pe_charTraits', this.config.character.traits?.join(', '));
        setValue('pe_charPersonality', this.config.character.personality);
        setValue('pe_charAppearance', this.config.character.appearance);
        setValue('pe_charSpeech', this.config.character.speechStyle);
        setValue('pe_charBackground', this.config.character.background);
        
        setValue('pe_scenarioDesc', this.config.scenario.description);
        setValue('pe_scenarioOpening', this.config.scenario.opening);
        setValue('pe_scenarioContext', this.config.scenario.context);
        
        setValue('pe_jailbreakContent', this.config.jailbreak.content);
        setChecked('pe_jailbreakEnabled', this.config.jailbreak.enabled);
        
        const strength = Math.round((this.config.jailbreak.strength || 0.5) * 100);
        setValue('pe_jailbreakStrength', strength);
        document.getElementById('pe_strengthValue').textContent = strength < 33 ? '温和' : strength < 66 ? '中等' : '严格';
        
        this.renderExamples();
        this.updatePreview();
    }
    
    addExample(user = '', char = '') {
        this.config.examples.push({ user: user || '', char: char || '' });
        this.renderExamples();
    }
    
    removeExample(index) {
        this.config.examples.splice(index, 1);
        this.renderExamples();
        this.updatePreview();
    }
    
    renderExamples() {
        const container = document.getElementById('pe_examplesList');
        if (!container) return;
        
        container.innerHTML = this.config.examples.map((ex, i) => `
            <div class="example-item">
                <div class="example-inputs">
                    <div class="example-user">
                        <label>{{user}}:</label>
                        <input type="text" value="${this.escapeHtml(ex.user)}" 
                            onchange="promptEditor.updateExample(${i}, 'user', this.value)">
                    </div>
                    <div class="example-char">
                        <label>{{char}}:</label>
                        <input type="text" value="${this.escapeHtml(ex.char)}" 
                            onchange="promptEditor.updateExample(${i}, 'char', this.value)">
                    </div>
                </div>
                <button class="btn-icon delete" onclick="promptEditor.removeExample(${i})" title="删除">×</button>
            </div>
        `).join('');
    }
    
    updateExample(index, field, value) {
        if (this.config.examples[index]) {
            this.config.examples[index][field] = value;
            this.updatePreview();
        }
    }
    
    updatePreview() {
        const previewContent = document.getElementById('pe_previewContent');
        const tokenCount = document.getElementById('pe_tokenCount');
        if (!previewContent) return;
        
        const finalPrompt = this.buildFinalPrompt();
        
        if (!finalPrompt.system && !finalPrompt.character && !finalPrompt.scenario && !finalPrompt.examples) {
            previewContent.innerHTML = '<div class="preview-placeholder">配置提示词后，这里会显示最终发送给AI的完整提示词...</div>';
            if (tokenCount) tokenCount.textContent = '约 0 tokens';
            return;
        }
        
        const sections = [];
        if (finalPrompt.system) {
            sections.push(`<div class="preview-section"><div class="preview-label">[System]</div><div class="preview-text">${this.escapeHtml(finalPrompt.system)}</div></div>`);
        }
        if (finalPrompt.character) {
            sections.push(`<div class="preview-section"><div class="preview-label">[Character]</div><div class="preview-text">${this.escapeHtml(finalPrompt.character)}</div></div>`);
        }
        if (finalPrompt.scenario) {
            sections.push(`<div class="preview-section"><div class="preview-label">[Scenario]</div><div class="preview-text">${this.escapeHtml(finalPrompt.scenario)}</div></div>`);
        }
        if (finalPrompt.examples) {
            sections.push(`<div class="preview-section"><div class="preview-label">[Examples]</div><div class="preview-text">${this.escapeHtml(finalPrompt.examples)}</div></div>`);
        }
        if (finalPrompt.jailbreak) {
            sections.push(`<div class="preview-section jailbreak"><div class="preview-label">[Jailbreak]</div><div class="preview-text">${this.escapeHtml(finalPrompt.jailbreak)}</div></div>`);
        }
        
        previewContent.innerHTML = sections.join('');
        
        // Token估算 (简单计算：中文字符 + 英文单词)
        const fullText = Object.values(finalPrompt).join(' ');
        const chineseCount = (fullText.match(/[\u4e00-\u9fa5]/g) || []).length;
        const englishCount = (fullText.match(/[a-zA-Z]+/g) || []).length;
        const estimatedTokens = Math.ceil(chineseCount * 1.5 + englishCount * 0.5);
        
        if (tokenCount) {
            tokenCount.textContent = `约 ${estimatedTokens} tokens`;
        }
    }
    
    buildFinalPrompt() {
        const parts = {
            system: '',
            character: '',
            scenario: '',
            examples: '',
            jailbreak: ''
        };
        
        // System Prompt
        if (this.config.systemPrompt.enabled && this.config.systemPrompt.content) {
            parts.system = this.replaceVariables(this.config.systemPrompt.content);
        }
        
        // Character
        const char = this.config.character;
        if (char.name || char.personality || char.appearance || char.speechStyle || char.background) {
            const charParts = [];
            if (char.name) charParts.push(`名字: ${char.name}`);
            if (char.traits?.length) charParts.push(`性格: ${char.traits.join('、')}`);
            if (char.personality) charParts.push(`性格描述: ${char.personality}`);
            if (char.appearance) charParts.push(`外貌: ${char.appearance}`);
            if (char.speechStyle) charParts.push(`说话风格: ${char.speechStyle}`);
            if (char.background) charParts.push(`背景: ${char.background}`);
            parts.character = charParts.join('\n');
        }
        
        // Scenario
        const scen = this.config.scenario;
        if (scen.description || scen.opening || scen.context) {
            const scenParts = [];
            if (scen.description) scenParts.push(`场景: ${scen.description}`);
            if (scen.context) scenParts.push(`背景: ${scen.context}`);
            if (scen.opening) scenParts.push(`开场: ${scen.opening}`);
            parts.scenario = scenParts.join('\n');
        }
        
        // Examples
        if (this.config.examples?.length > 0) {
            const exampleLines = ['<START>'];
            this.config.examples.forEach(ex => {
                if (ex.user) exampleLines.push(`{{user}}: ${ex.user}`);
                if (ex.char) exampleLines.push(`{{char}}: ${ex.char}`);
            });
            parts.examples = exampleLines.join('\n');
        }
        
        // Jailbreak
        if (this.config.jailbreak.enabled && this.config.jailbreak.content) {
            parts.jailbreak = this.replaceVariables(this.config.jailbreak.content);
        }
        
        return parts;
    }
    
    replaceVariables(text) {
        const userName = this.config.variables?.userName || '玩家';
        const charName = this.config.character?.name || '角色';
        
        return text
            .replace(/\{\{user\}\}/g, userName)
            .replace(/\{\{char\}\}/g, charName)
            .replace(/\{\{scene\}\}/g, this.config.scenario?.description || '')
            .replace(/\{\{time\}\}/g, new Date().toLocaleTimeString())
            .replace(/\{\{date\}\}/g, new Date().toLocaleDateString());
    }
    
    insertAtCursor(textarea, text) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = textarea.value;
        
        textarea.value = value.substring(0, start) + text + value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + text.length;
        textarea.focus();
        
        // 触发输入事件
        textarea.dispatchEvent(new Event('input'));
    }
    
    showMoreTemplates(category) {
        const modal = document.getElementById('pe_templateModal');
        const title = document.getElementById('pe_modalTitle');
        const list = document.getElementById('pe_templateList');
        
        const categoryNames = {
            style: '文风模板',
            personality: '性格模板',
            world: '世界观模板',
            behavior: '行为模板'
        };
        
        title.textContent = categoryNames[category] || '选择模板';
        
        const templates = this.quickTemplates[category] || [];
        list.innerHTML = templates.map(t => `
            <div class="template-item" onclick="promptEditor.insertTemplate('${category}', '${this.escapeHtml(t.text)}')">
                <div class="template-name">${t.label}</div>
                <div class="template-preview">${this.escapeHtml(t.text.substring(0, 50))}...</div>
            </div>
        `).join('');
        
        modal.style.display = 'flex';
    }
    
    insertTemplate(category, text) {
        this.closeTemplateModal();
        
        // 找到当前活动的文本框或默认文本框
        const activeTextarea = document.querySelector(`#${this.containerId} textarea:focus`);
        if (activeTextarea) {
            this.insertAtCursor(activeTextarea, text);
        }
    }
    
    closeTemplateModal() {
        document.getElementById('pe_templateModal').style.display = 'none';
    }
    
    togglePreview(section) {
        // 展开/折叠预览
        const previewCard = document.querySelector('.prompt-preview-card');
        if (previewCard) {
            previewCard.scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    testPrompt(section) {
        // 测试提示词效果
        const finalPrompt = this.buildFinalPrompt();
        console.log('[PromptEditor] Testing prompt:', finalPrompt);
        
        // 可以在这里添加实际的AI测试调用
        showToast('提示词测试功能开发中...', 'info');
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    getConfig() {
        return this.collectData();
    }
    
    // 静态模板方法
    static getTemplates() {
        return {
            xianxia: {
                name: '修仙世界',
                system: '你是一个角色扮演AI，扮演修仙世界的角色。请使用古雅、诗意的文风，多用典故和修辞。世界设定为弱肉强食的修仙界，强者为尊，弱肉强食。',
                scenario: '场景: 修仙世界，灵气充沛，宗门林立。这是一个实力为尊的世界。'
            },
            modern: {
                name: '现代都市',
                system: '你是一个角色扮演AI，扮演现代都市背景的角色。使用自然、现代的文风，语言贴近生活。',
                scenario: '场景: 现代都市，高楼林立，科技发达。这是一个平凡而又充满可能的世界。'
            },
            fantasy: {
                name: '异世界',
                system: '你是一个角色扮演AI，扮演异世界背景的角色。可以包含魔法、剑与冒险的元素。',
                scenario: '场景: 剑与魔法的异世界，种族林立，冒险不断。'
            }
        };
    }
    
    loadTemplate(templateKey) {
        const templates = PromptEditor.getTemplates();
        const template = templates[templateKey];
        if (!template) return;
        
        if (confirm(`加载「${template.name}」模板将覆盖当前设置，确定吗？`)) {
            this.config.systemPrompt.content = template.system;
            this.config.scenario.description = template.scenario;
            this.loadData(this.config);
            showToast(`已加载 ${template.name} 模板`, 'success');
        }
    }
}

// 全局实例
let promptEditor = null;

// 初始化函数
function initPromptEditor(options = {}) {
    promptEditor = new PromptEditor(options);
    return promptEditor;
}

// 导出到window
window.PromptEditor = PromptEditor;
window.initPromptEditor = initPromptEditor;
window.promptEditor = promptEditor;
