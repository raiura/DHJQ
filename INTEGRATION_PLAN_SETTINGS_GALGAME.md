# 角色卡2.0集成方案：settings.html + galgame_framework.html

## 概述
本方案描述如何将角色卡2.0系统集成到现有的 `settings.html` 和 `galgame_framework.html` 中，同时保持向后兼容。

---

## 一、冲突分析

### 1.1 settings.html 现有角色数据结构（V1）

```javascript
// 当前 saveCharacter() 构建的数据结构
const charV1 = {
  _id: 'char_xxx',
  name: '陆苍雪',
  color: '#8a6d3b',
  image: 'url',
  avatar: 'url',
  imageFit: 'cover',
  keys: ['陆苍雪', '大师姐'],
  priority: 100,
  favor: 50,
  trust: 50,
  stats: { mood: '平静', encounters: 0, dialogueTurns: 0 },
  // 设定字段
  appearance: '外貌描述',
  personality: '性格描述',
  background: '背景描述',
  physique: '体质描述',
  special: '特殊能力',
  // 生成的prompt
  prompt: '【角色名称】陆苍雪\n【外貌】...',
  enabled: true,
  updatedAt: 'ISO日期'
};
```

### 1.2 角色卡2.0数据结构（V2）

```javascript
const charV2 = {
  id: 'char_xxx',
  name: '陆苍雪',
  version: '2.0.0',
  visual: {
    avatar: 'url',
    cover: 'url',
    emotionCGs: { calm: 'url', happy: 'url', ... },
    color: '#8a6d3b'
  },
  core: {
    description: '完整描述',
    personality: '性格',
    scenario: '场景',
    firstMessage: '开场白',
    worldConnection: {
      faction: '落星剑宗',
      location: '北寒落星丘',
      relationships: []
    }
  },
  examples: {
    dialogues: [{ user: '...', character: '...', annotation: '...' }],
    style: '语气风格'
  },
  injection: {
    characterNote: { content: '', depth: 0, frequency: 1, role: 'system' },
    postHistory: '',
    mainPromptOverride: ''
  },
  lorebook: {
    entries: [],
    linkedGlobalEntries: []
  },
  activation: {
    keys: ['陆苍雪', '大师姐'],
    priority: 100,
    enabled: true,
    conditions: [],
    entrance: { autoTrigger: false, triggerMessage: '' }
  },
  relationship: {
    favor: 50,
    trust: 50,
    mood: '平静',
    attitude: { current: '中立', history: [] },
    sharedMemories: []
  },
  meta: { author: '', tags: [], ... }
};
```

### 1.3 冲突点清单

| 位置 | 冲突描述 | 严重程度 |
|------|---------|---------|
| settings.html:723 | saveCharacter() 构建V1格式 | 🔴 高 |
| settings.html:795 | buildCharacterPrompt() 简单字符串拼接 | 🟡 中 |
| settings.html:900-1036 | 角色模态框缺少V2字段 | 🟡 中 |
| galgame_framework.html:2984 | generateAIResponse() 使用简单提示词 | 🔴 高 |
| galgame_framework.html:3022 | 调用后端API时未使用增强提示词 | 🔴 高 |
| backend/models/character.js | 模型schema需要扩展 | 🟡 中 |

---

## 二、集成策略

### 2.1 核心原则

1. **向后兼容**：V1角色继续正常工作
2. **渐进升级**：逐步迁移到V2
3. **最小侵入**：尽量不改现有大文件的核心逻辑
4. **动态加载**：新功能通过动态导入加载

### 2.2 集成架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        集成架构图                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐      ┌──────────────────┐                │
│  │  settings.html   │      │ galgame_framework │                │
│  │  (现有，不改核心) │      │   (现有，不改核心) │                │
│  └────────┬─────────┘      └────────┬─────────┘                │
│           │                         │                          │
│           ▼                         ▼                          │
│  ┌──────────────────┐      ┌──────────────────┐                │
│  │  适配器层         │      │  适配器层         │                │
│  │  CharacterCardV2 │◄────►│  CharacterCardV2 │                │
│  │  .CharacterCard  │      │  .CharacterCard  │                │
│  │  Adapter         │      │  Adapter         │                │
│  └────────┬─────────┘      └────────┬─────────┘                │
│           │                         │                          │
│           └───────────┬─────────────┘                          │
│                       ▼                                        │
│  ┌──────────────────────────────────────┐                     │
│  │      角色卡2.0核心模块                │                     │
│  │  ┌──────────────┐  ┌──────────────┐ │                     │
│  │  │characterCard │  │enhancedPrompt│ │                     │
│  │  │V2.js         │  │Builder.js    │ │                     │
│  │  └──────────────┘  └──────────────┘ │                     │
│  │  ┌──────────────┐                   │                     │
│  │  │characterWorld│                   │                     │
│  │  │bookBridge.js │                   │                     │
│  │  └──────────────┘                   │                     │
│  └──────────────────────────────────────┘                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 三、具体集成步骤

### 步骤1：后端模型扩展（backend/models/character.js）

**需要添加的字段**：

```javascript
const characterSchemaDefinition = {
  // ... 现有字段 ...
  
  // V2新增字段
  version: {
    type: String,
    default: '1.0' // 默认V1
  },
  format: {
    type: String,
    enum: ['v1', 'v2', 'mixed'],
    default: 'v1'
  },
  
  // V2完整数据（JSON存储）
  v2Data: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  
  // 兼容性：保留V1字段供旧代码使用
  // 当V2数据存在时，V1字段由V2数据派生
};
```

**保存时的逻辑**：

```javascript
// 保存前钩子
characterSchema.pre('save', function(next) {
  if (this.v2Data) {
    this.version = this.v2Data.version || '2.0';
    this.format = 'v2';
    // 同步关键字段到V1格式，保持兼容
    this.name = this.v2Data.name;
    this.image = this.v2Data.visual?.avatar;
    this.color = this.v2Data.visual?.color;
    this.keys = this.v2Data.activation?.keys;
    this.priority = this.v2Data.activation?.priority;
    // 合并prompt
    this.prompt = buildPromptFromV2(this.v2Data);
  }
  next();
});
```

### 步骤2：settings.html 集成

**在settings.html头部添加新模块加载**：

```html
<!-- 在原有脚本之后添加 -->
<script src="public/js/core/characterCardV2.js"></script>
<script src="public/js/core/enhancedPromptBuilder.js"></script>
<script src="public/js/services/characterWorldbookBridge.js"></script>
```

**修改 saveCharacter() 函数**（settings-main.js:723）：

```javascript
function saveCharacter() {
  // 收集V1字段（保持不变，用于兼容）
  const v1Char = collectV1Fields();
  
  // 检查是否有V2增强字段（通过隐藏input或其他方式）
  const hasV2Fields = document.getElementById('v2_firstMessage') !== null;
  
  if (hasV2Fields) {
    // 构建V2数据
    const v2Char = buildV2Character();
    // 保存V2格式
    saveCharacterV2(v2Char);
  } else {
    // 原有V1保存逻辑
    saveCharacterV1(v1Char);
  }
}

// 新增：构建V2角色
function buildV2Character() {
  const { createCharacterCardV2 } = window.CharacterCardV2;
  
  const char = createCharacterCardV2({
    name: document.getElementById('charName')?.value,
    visual: {
      avatar: document.getElementById('charAvatar')?.value,
      color: document.getElementById('charColor')?.value
    },
    core: {
      description: combineFields(
        document.getElementById('charAppearance')?.value,
        document.getElementById('charBackground')?.value
      ),
      personality: document.getElementById('charPersonality')?.value,
      firstMessage: document.getElementById('v2_firstMessage')?.value // 新增字段
    },
    activation: {
      keys: parseKeys(document.getElementById('charKeys')?.value),
      priority: parseInt(document.getElementById('charPriority')?.value) || 100
    },
    relationship: {
      favor: parseInt(document.getElementById('charFavor')?.value) || 50,
      trust: parseInt(document.getElementById('charTrust')?.value) || 50,
      mood: document.getElementById('charMood')?.value || '平静'
    }
  });
  
  return char;
}

// 新增：保存V2角色
async function saveCharacterV2(character) {
  try {
    const response = await fetch(`${API_BASE}/characters/v2`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(character)
    });
    
    if (!response.ok) throw new Error('保存失败');
    
    showToast('角色已保存 (V2格式)', 'success');
    renderCharacterList();
    closeCharacterModal();
  } catch (error) {
    console.error('保存V2角色失败:', error);
    showToast('保存失败: ' + error.message, 'error');
  }
}
```

**添加V2编辑器入口**：

在角色列表页面添加"使用V2编辑器"按钮：

```javascript
// 在renderCharacterList中修改角色卡片渲染
function renderCharacterCard(character) {
  return `
    <div class="character-card">
      <!-- 原有内容 -->
      <div class="character-actions">
        <button onclick="editCharacter('${character._id}')">编辑</button>
        <button onclick="window.open('character-editor-v2.html?id=${character._id}', '_blank')">
          🆕 V2编辑器
        </button>
      </div>
    </div>
  `;
}
```

### 步骤3：galgame_framework.html 集成

**添加模块加载**（在head或body底部）：

```html
<!-- 在原有脚本后添加 -->
<script src="public/js/core/characterCardV2.js"></script>
<script src="public/js/core/enhancedPromptBuilder.js"></script>
<script src="public/js/services/characterWorldbookBridge.js"></script>
```

**修改 generateAIResponse() 函数**：

```javascript
async function generateAIResponse(userMessage) {
  // ... 现有代码 ...
  
  // ========== 新增：V2角色卡支持 ==========
  let characterV2 = null;
  let enhancedPrompt = null;
  
  // 尝试加载V2格式角色
  try {
    const { CharacterCardAdapter } = window.CharacterCardV2;
    const adapter = new CharacterCardAdapter();
    characterV2 = await adapter.getCharacter(currentCharacterId);
    
    if (characterV2 && characterV2.version?.startsWith('2.')) {
      console.log('[CharacterV2] 使用V2角色卡格式');
      
      // 使用增强提示词构建器
      const { EnhancedPromptBuilder } = window.EnhancedPromptBuilder;
      const builder = new EnhancedPromptBuilder({
        userName: window.currentUserCharacter?.name || '用户',
        characterName: characterV2.name,
        worldName: currentWorld?.title
      });
      
      enhancedPrompt = builder.buildForCharacter(characterV2, {
        worldSetting: currentWorld?.worldSetting,
        isNewChat: chatHistory.length === 0,
        location: currentLocation
      });
      
      // 获取角色专属世界书
      const { CharacterWorldbookBridge } = window.CharacterWorldbookBridge;
      const bridge = new CharacterWorldbookBridge({
        worldbookEngine: worldbookManager?.getEngine?.()
      });
      
      const charWorldbook = bridge.getActivatedWorldbookContent(characterV2, {
        text: userMessage,
        location: currentLocation
      });
      
      // 合并到提示词
      enhancedPrompt.system += '\n\n' + formatCharWorldbook(charWorldbook);
    }
  } catch (error) {
    console.log('[CharacterV2] V2加载失败，回退到V1:', error.message);
  }
  
  // ========== 调用API ==========
  const response = await fetch(`${API_BASE}/dialogue`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      message: userMessage,
      characterId: currentCharacterId,
      userSettings: {
        // 优先使用增强提示词
        systemPrompt: enhancedPrompt?.system || fullSystemPrompt,
        examples: enhancedPrompt?.messages || [],
        postHistory: enhancedPrompt?.postHistory || '',
        promptAddon: getUserPromptAddon(),
        worldbookEntries: allWorldbookEntries,
        temperature: userSettings.ai.temperature,
        // 标记使用V2格式
        useV2Format: !!enhancedPrompt
      }
    })
  });
  
  // ... 后续处理 ...
}
```

### 步骤4：后端API适配

**修改 dialogue.js 路由**：

```javascript
router.post('/', async (req, res) => {
  const { message, characterId, userSettings } = req.body;
  
  try {
    // 获取角色
    const character = await Character.findById(characterId);
    
    // 构建提示词
    let prompt;
    if (userSettings.useV2Format && character.v2Data) {
      // 使用V2格式构建
      prompt = buildV2Prompt(character.v2Data, userSettings);
    } else {
      // 使用V1格式（原有逻辑）
      prompt = buildV1Prompt(character, userSettings);
    }
    
    // 调用AI
    const aiResponse = await callAI(prompt, userSettings);
    
    res.json({ success: true, data: aiResponse });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function buildV2Prompt(v2Data, userSettings) {
  const { EnhancedPromptBuilder } = require('../utils/promptBuilder');
  
  const builder = new EnhancedPromptBuilder();
  const result = builder.buildForCharacter(v2Data, {
    worldSetting: userSettings.worldSetting
  });
  
  // 合并用户设置
  return {
    system: result.system + '\n\n' + (userSettings.systemPrompt || ''),
    messages: result.messages,
    postHistory: result.postHistory,
    examples: userSettings.examples || result.examples
  };
}
```

---

## 四、字段映射表

### V1 → V2 字段映射

| V1字段 | V2路径 | 转换规则 |
|--------|--------|---------|
| name | core.name | 直接复制 |
| image/avatar | visual.avatar | 直接复制 |
| color | visual.color | 直接复制 |
| appearance | core.description | 组合为描述 |
| personality | core.personality | 直接复制 |
| background | core.scenario | 转为场景 |
| physique | core.description | 追加到描述 |
| special | core.description | 追加到描述 |
| keys | activation.keys | 直接复制 |
| priority | activation.priority | 直接复制 |
| favor | relationship.favor | 直接复制 |
| trust | relationship.trust | 直接复制 |
| mood | relationship.mood | 直接复制 |
| prompt | - | 动态生成 |

### V2 新增字段（V1没有）

| V2字段 | 说明 | 默认值 |
|--------|------|--------|
| visual.cover | 封面图 | '' |
| visual.emotionCGs | 情感立绘 | {} |
| core.firstMessage | 开场白 | '' |
| core.worldConnection | 世界关联 | {} |
| examples.dialogues | 示例对话 | [] |
| examples.style | 语气风格 | '' |
| injection.characterNote | 深度注入 | {} |
| injection.postHistory | 历史后指令 | '' |
| lorebook.entries | 专属世界书 | [] |
| lorebook.linkedGlobalEntries | 关联全局条目 | [] |

---

## 五、风险评估与回滚方案

### 5.1 风险点

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| V2数据格式不兼容 | 低 | 高 | 保留V1字段，双格式存储 |
| 提示词构建失败 | 中 | 高 | try-catch包裹，失败回退V1 |
| 世界书联动异常 | 中 | 中 | 添加开关，可禁用联动 |
| 性能下降 | 低 | 中 | 缓存机制，避免重复构建 |

### 5.2 回滚方案

**紧急回滚（5分钟内）**：

```javascript
// 在galgame_framework.html添加全局开关
const USE_CHARACTER_V2 = false; // 设置为false立即回退到V1

async function generateAIResponse(userMessage) {
  if (!USE_CHARACTER_V2) {
    // 完全使用原有逻辑
    return generateAIResponseV1(userMessage);
  }
  // V2逻辑...
}
```

**数据回滚**：
- V2数据存储在 `v2Data` 字段，不影响V1字段
- 删除 `v2Data` 即可恢复纯V1状态

---

## 六、测试清单

### 6.1 功能测试

- [ ] V1角色创建正常
- [ ] V1角色编辑正常
- [ ] V1角色对话正常
- [ ] V2角色创建正常
- [ ] V2角色编辑正常
- [ ] V2角色对话正常
- [ ] V1→V2迁移正常
- [ ] V2→V1降级正常
- [ ] 混合场景（V1+V2角色同存）

### 6.2 兼容性测试

- [ ] 旧存档加载正常
- [ ] 旧API调用正常
- [ ] 提示词预览正常
- [ ] 世界书联动正常

---

## 七、实施时间表

| 阶段 | 任务 | 预计时间 |
|------|------|---------|
 1 | 后端模型扩展 | 2小时 |
| 2 | settings.html集成 | 4小时 |
| 3 | galgame_framework.html集成 | 4小时 |
| 4 | 测试与调试 | 4小时 |
| 5 | 文档更新 | 2小时 |

**总计：约2天工作量**

---

## 八、最终建议

1. **先部署独立V2编辑器**（character-editor-v2.html），让用户试用
2. **收集反馈**后再考虑深度集成到大文件中
3. **保持V1作为默认**，V2作为可选增强
4. **监控错误日志**，确保回退机制正常工作

---

*文档版本：1.0*  
*创建日期：2026-03-28*
