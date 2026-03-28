# 📘 角色卡 2.0 集成指南

> **重要提示**：本升级方案采用渐进式集成策略，不修改现有大HTML文件，确保系统稳定性。

---

## 一、已创建的新模块

### 1.1 核心模块文件

```
public/js/core/
├── characterCardV2.js           # ✅ 角色卡V2数据模型 + V1迁移工具
└── enhancedPromptBuilder.js     # ✅ 增强提示词构建器

public/js/services/
└── characterWorldbookBridge.js  # ✅ 角色-世界书联动引擎

character-editor-v2.html         # ✅ 独立的新版角色编辑器
```

### 1.2 模块功能概览

| 模块 | 功能 | 状态 |
|------|------|------|
| `characterCardV2.js` | V2数据结构、V1↔V2迁移、适配器 | ✅ 完成 |
| `enhancedPromptBuilder.js` | CharacterNote、PostHistory、ExampleDialogues | ✅ 完成 |
| `characterWorldbookBridge.js` | 自动关联、智能触发、多角色联动 | ✅ 完成 |
| `character-editor-v2.html` | 完整的V2编辑器UI | ✅ 完成 |

---

## 二、快速开始

### 2.1 测试新版编辑器

直接访问独立编辑器：
```
http://你的域名/character-editor-v2.html
```

功能：
- 创建全新V2角色
- 从V1导入并升级
- 导出V2 JSON

### 2.2 在现有页面中使用V2模块

在不修改大HTML的前提下，通过动态导入使用：

```javascript
// 在需要的地方动态导入
async function useCharacterV2(characterId) {
  // 导入模块
  const { CharacterCardAdapter } = await import('./public/js/core/characterCardV2.js');
  const { EnhancedPromptBuilder } = await import('./public/js/core/enhancedPromptBuilder.js');
  
  // 获取角色（自动处理V1/V2）
  const adapter = new CharacterCardAdapter();
  const character = await adapter.getCharacter(characterId);
  
  // 构建增强提示词
  const builder = new EnhancedPromptBuilder();
  const prompt = builder.buildForCharacter(character, {
    worldName: '坏空之纪',
    location: '北寒落星丘'
  });
  
  return prompt;
}
```

---

## 三、渐进式集成路线图

### 阶段1：并行运行（Week 1-2）

**目标**：新旧系统并存，验证V2稳定性

**操作步骤**：

1. **部署新模块**
   ```bash
   # 将新文件复制到对应目录
   cp character-editor-v2.html /var/www/html/
   cp public/js/core/characterCardV2.js /var/www/html/public/js/core/
   cp public/js/core/enhancedPromptBuilder.js /var/www/html/public/js/core/
   cp public/js/services/characterWorldbookBridge.js /var/www/html/public/js/services/
   ```

2. **添加跳转到新版编辑器**
   
   在现有settings.html的角色列表页面，添加一个按钮：
   ```javascript
   // 在settings.html的character列表渲染处添加
   function renderCharacterActions(character) {
     return `
       <button onclick="editCharacter('${character.id}')">编辑</button>
       <button onclick="window.open('character-editor-v2.html?id=${character.id}', '_blank')">
         🆕 用V2编辑器打开
       </button>
     `;
   }
   ```

3. **双轨存储**
   - 旧编辑器保存 → V1格式（不变）
   - 新编辑器保存 → V2格式（新collection/table）

### 阶段2：API适配（Week 3-4）

**目标**：后端API支持V2格式

**后端修改**（增量添加，不影响现有接口）：

```javascript
// backend/routes/characters.js

// 新增V2路由
router.get('/v2/:id', async (req, res) => {
  const character = await Character.findById(req.params.id);
  
  // 检测版本
  if (character.version && character.version.startsWith('2.')) {
    // 已经是V2，直接返回
    res.json({ success: true, data: character });
  } else {
    // V1数据，返回时标记
    res.json({ 
      success: true, 
      data: character,
      meta: { version: 'v1', canUpgrade: true }
    });
  }
});

router.post('/v2', async (req, res) => {
  // V2创建逻辑
  const v2Data = {
    ...req.body,
    version: '2.0.0',
    format: 'character-card-v2'
  };
  const character = await Character.create(v2Data);
  res.json({ success: true, data: character });
});

router.put('/v2/:id', async (req, res) => {
  // V2更新逻辑
  const updates = {
    ...req.body,
    'meta.updatedAt': new Date()
  };
  const character = await Character.findByIdAndUpdate(
    req.params.id, 
    updates,
    { new: true }
  );
  res.json({ success: true, data: character });
});
```

### 阶段3：提示词系统升级（Week 5-6）

**目标**：对话系统使用增强提示词构建器

**修改点**：

```javascript
// 在galgame_framework.html的对话处理中

// 旧代码（保留）
async function handleChatMessageOld(message) {
  const prompt = buildSimplePrompt(message, character);
  const response = await callAI(prompt);
  return response;
}

// 新代码（新增，可切换）
async function handleChatMessageV2(message) {
  const { EnhancedPromptBuilder } = await import('./public/js/core/enhancedPromptBuilder.js');
  const { CharacterWorldbookBridge } = await import('./public/js/services/characterWorldbookBridge.js');
  
  // 获取角色（自动迁移）
  const adapter = new CharacterCardAdapter();
  const character = await adapter.getCharacter(currentCharacterId);
  
  // 获取激活的世界书内容
  const bridge = new CharacterWorldbookBridge({ 
    worldbookEngine: window.worldbookEngine 
  });
  const worldbookContent = bridge.getActivatedWorldbookContent(character, {
    text: message,
    location: currentLocation
  });
  
  // 构建增强提示词
  const builder = new EnhancedPromptBuilder({
    characterName: character.name,
    worldName: currentWorld?.title,
    location: currentLocation
  });
  
  const promptResult = builder.buildForCharacter(character, {
    worldSetting: currentWorld?.worldSetting,
    isNewChat: messageHistory.length === 0
  });
  
  // 添加世界书内容到system
  promptResult.system += '\n\n' + formatWorldbookContent(worldbookContent);
  
  // 调用AI
  const response = await callAI(promptResult);
  
  // 处理CharacterNote注入（用于后续轮次）
  if (character.injection?.characterNote?.content) {
    scheduleCharacterNoteInjection(character);
  }
  
  return response;
}

// 全局切换开关
const USE_V2_PROMPT = localStorage.getItem('use_v2_prompt') === 'true';

async function handleChatMessage(message) {
  if (USE_V2_PROMPT) {
    return handleChatMessageV2(message);
  } else {
    return handleChatMessageOld(message);
  }
}
```

### 阶段4：数据迁移（Week 7-8）

**目标**：批量迁移V1角色到V2

**迁移工具**：

```javascript
// 在character-editor-v2.html中添加批量迁移功能

async function batchMigrateCharacters() {
  // 获取所有V1角色
  const response = await fetch(`${API_BASE}/characters`);
  const characters = await response.json();
  
  const results = {
    success: [],
    failed: []
  };
  
  for (const char of characters.data) {
    try {
      // 检测版本
      if (char.version && char.version.startsWith('2.')) {
        continue; // 已经是V2
      }
      
      // 迁移
      const v2Data = CharacterMigrationTool.migrateV1ToV2(char);
      
      // 初始化世界书
      const bridge = new CharacterWorldbookBridge({
        worldbookEngine: window.worldbookEngine
      });
      await bridge.initializeCharacterLorebook(v2Data);
      
      // 保存为V2
      const adapter = new CharacterCardAdapter();
      await adapter.saveCharacter(v2Data, { targetVersion: 'v2' });
      
      results.success.push(char.name);
    } catch (error) {
      results.failed.push({ name: char.name, error: error.message });
    }
  }
  
  console.log('迁移完成:', results);
  return results;
}
```

### 阶段5：完全切换（Week 9+）

**目标**：默认使用V2，V1只读

**操作**：
1. 设置 `USE_V2_PROMPT = true` 为默认
2. 旧编辑器设为只读模式
3. 提示用户升级到V2

---

## 四、与现有系统的兼容性

### 4.1 向后兼容保证

```
V1角色数据 ──┬─► V2读取 ──► 自动迁移 ──► 内存中为V2格式
             │
             └─► V1编辑器 ──► 保存为V1 ──► 不影响

V2角色数据 ──┬─► V2读取 ──► 正常工作
             │
             └─► V1编辑器 ──► 显示降级提示 ──► 建议使用V2编辑器
```

### 4.2 数据格式识别

```javascript
function detectCharacterVersion(data) {
  if (data.version && data.version.startsWith('2.')) {
    return 'v2';
  }
  if (data.core || data.visual || data.lorebook) {
    return 'v2'; // 可能是V2但没有version字段
  }
  if (data.appearance !== undefined || data.prompt !== undefined) {
    return 'v1';
  }
  return 'unknown';
}
```

---

## 五、关键功能使用示例

### 5.1 创建带专属世界书的角色

```javascript
const { createCharacterCardV2 } = await import('./public/js/core/characterCardV2.js');
const { CharacterWorldbookBridge } = await import('./public/js/services/characterWorldbookBridge.js');

// 创建角色
const character = createCharacterCardV2({
  name: '陆苍雪',
  core: {
    description: '落星剑宗大师姐...',
    worldConnection: {
      faction: '落星剑宗',
      location: '北寒落星丘'
    }
  }
});

// 初始化世界书（自动创建基础条目和关联）
const bridge = new CharacterWorldbookBridge({
  worldbookEngine: window.worldbookEngine
});
await bridge.initializeCharacterLorebook(character);

// 手动添加专属条目
bridge.createLorebookEntry(character, {
  name: '寒霜剑',
  keys: ['寒霜剑', '佩剑'],
  content: '陆苍雪的佩剑，通体晶莹...',
  priority: 150
});

// 保存
const adapter = new CharacterCardAdapter();
await adapter.saveCharacter(character);
```

### 5.2 使用CharacterNote动态注入

```javascript
// 在角色中配置
character.injection.characterNote = {
  content: "【状态提醒】{{char}}当前身受重伤，行动受限",
  depth: 0,        // 始终在最后
  frequency: 1,    // 每条消息都注入
  role: 'system'
};

// 在对话循环中使用
const injector = new CharacterNoteInjector();

async function onNewMessage(character, messages) {
  // 检查是否需要注入
  if (injector.shouldInject(character.injection.characterNote)) {
    // 注入到消息列表
    const newMessages = injector.inject(
      messages, 
      character.injection.characterNote,
      character.name
    );
    return newMessages;
  }
  return messages;
}
```

### 5.3 多角色联动场景

```javascript
const bridge = new CharacterWorldbookBridge();

// 场景中多个角色
const characters = [char1, char2, char3];

// 处理玩家输入
const result = bridge.processMultiCharacterInteraction(characters, {
  text: '我要去落星剑宗找大师姐',
  location: '北寒落星丘',
  faction: '落星剑宗'
});

// result.activatedCharacters - 应该激活的角色
// result.characterRelationships - 角色间关系
// result.combinedPrompt - 合并的提示词片段
```

---

## 六、常见问题

### Q1: 我可以继续使用旧编辑器吗？
**可以**。新旧系统并行存在，旧编辑器创建的角色仍是V1格式，会被自动迁移。

### Q2: V2角色可以在旧游戏中使用吗？
**可以**。`CharacterCardAdapter`会自动降级V2数据为V1兼容格式。

### Q3: 如何回滚到V1？
如果V2出现问题：
1. 设置 `USE_V2_PROMPT = false`
2. V2创建的角色仍可读取，但会降级到V1功能

### Q4: 升级会影响已有存档吗？
**不会**。存档数据格式不变，只是角色定义升级到V2。

### Q5: SillyTavern导入导出呢？
计划中的功能：
```javascript
// PNG元数据嵌入（需要额外库）
await adapter.exportToSillyTavernPNG(character);
const character = await adapter.importFromSillyTavernPNG(pngFile);
```

---

## 七、下一步行动清单

- [ ] 部署新模块到测试环境
- [ ] 使用character-editor-v2.html创建测试角色
- [ ] 验证V1→V2迁移流程
- [ ] 在测试对话中验证增强提示词
- [ ] 收集反馈并调整
- [ ] 计划逐步切换到V2

---

*文档版本：1.0*  
*最后更新：2026-03-28*
