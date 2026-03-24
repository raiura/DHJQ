# 双系统架构总结

## 已实现的功能

### 1. 章节存档系统 (Chapter Save System)

**文件:**
- `public/js/core/chapterTemplates.js` - 章节模板定义
- `public/js/services/chapterSaveManager.js` - 存档管理器

**核心功能:**
- ✅ 5个章节模板 (ch1-ch5)
- ✅ 基于章节创建存档
- ✅ 玩家覆盖系统 (好感度、经历编辑)
- ✅ 自动保存机制
- ✅ 角色状态计算 (默认 + 覆盖)

**数据结构:**
```javascript
SaveSlot {
    id, name,
    startChapter, currentChapter,
    world: { location, weather, gameTime, flags },
    characters: Map<characterId, CharacterArchive>,
    playerOverrides: { characters: { favor, experiences[], ... } },
    player: PlayerArchive  // 新增
}
```

---

### 2. 经历触发器系统 (Experience Triggers)

**文件:** `public/js/core/experienceTriggers.js`

**触发器类型:**
- ✅ **FAVOR_THRESHOLD** - 好感度突破 (30/60/90)
- ✅ **DIALOGUE_PATTERN** - 对话模式匹配
  - confession (真情流露)
  - apology (和解时刻)
  - conflict (冲突时刻)
  - comfort (温情时刻)
  - teasing (打趣时刻)
- ✅ **LOCATION_TIME** - 特定时空组合
  - snow_night (雪夜)
  - dawn_meeting (黎明之约)
  - rainy_night (雨夜)
- ✅ **PLOT_MILESTONE** - 剧情里程碑

**特性:**
- ✅ 冷却时间机制 (防止频繁触发)
- ✅ 可扩展的触发器配置

---

### 3. 经历生成器 (Experience Generator)

**文件:** `public/js/core/experienceGenerator.js`

**生成方式:**
- ✅ **模板生成** - 基于预定义模板快速生成
- ✅ **AI生成** - 使用大语言模型生成（可选）

**模板库:**
- 好感度突破模板 (30/60/90)
- 对话模式模板
- 时空组合模板
- 剧情里程碑模板

**特性:**
- ✅ 随机选择模板内容
- ✅ 角色名替换
- ✅ AI提示词构建
- ✅ 生成历史记录

---

### 4. 玩家记忆系统 (Player Memory System)

**文件:** `public/js/core/playerMemorySystem.js`

**记忆类型:**
- ✅ CHARACTER_FIRST_MEET - 首次遇见角色
- ✅ IMPORTANT_DIALOGUE - 重要对话
- ✅ PLOT_EVENT - 剧情事件
- ✅ DISCOVERY - 发现/获取信息
- ✅ ACHIEVEMENT - 成就/里程碑
- ✅ PLAYER_FEELING - 玩家感受

**核心功能:**
- ✅ 自动检测（基于关键词和模式）
- ✅ 重复检测（避免短时间内重复）
- ✅ 记忆分层（短期/长期/核心）
- ✅ 引用计数
- ✅ 收藏系统
- ✅ 搜索功能

---

### 5. 对话处理器 (Dialogue Processor)

**文件:** `public/js/services/dialogueProcessor.js`

**整合功能:**
- ✅ 对话前状态快照
- ✅ 触发器检测
- ✅ 经历自动生成
- ✅ 玩家记忆自动检测
- ✅ Prompt构建（包含经历和记忆）

**API:**
```javascript
dialogueProcessor.beforeDialogue(characterId);  // 准备
dialogueProcessor.afterDialogue(snapshot, playerInput, aiReply, options);  // 处理
dialogueProcessor.getPromptData(characterId);  // 获取Prompt数据
dialogueProcessor.buildSystemPrompt(characterId, basePrompt);  // 构建系统提示词
```

---

### 6. UI组件

**文件:**
- `world-guide.html` - 章节选择和存档管理
- `experience-editor.html` - 经历编辑器
- `public/test-dual-system.html` - 双系统演示

**功能:**
- ✅ 章节选择模态框
- ✅ 存档列表显示章节信息
- ✅ 经历查看和编辑
- ✅ 好感度修改
- ✅ 实时演示页面

---

## 数据流

```
玩家发送消息
    ↓
对话前快照 (beforeDialogue)
    ↓
AI生成回复
    ↓
对话后处理 (afterDialogue)
    ├── 检测好感度变化
    ├── 检查触发器 (checkAll)
    │   ├── FAVOR_THRESHOLD
    │   ├── DIALOGUE_PATTERN
    │   ├── LOCATION_TIME
    │   └── PLOT_MILESTONE
    ├── 生成经历 (generate)
    │   ├── 模板生成
    │   └── AI生成（可选）
    ├── 添加到角色档案 (addGeneratedExperience)
    ├── 检测玩家记忆 (autoDetect)
    ├── 添加到玩家档案 (addMemory)
    └── 自动保存
    ↓
构建Prompt (getPromptData)
    ├── 已揭示经历
    ├── 暗示性经历
    └── 玩家记忆
    ↓
下一次对话...
```

---

## 使用示例

### 基本使用

```javascript
// 1. 创建存档
const save = chapterSaveManager.createSlot('我的存档', 'ch1');

// 2. 初始化对话处理器
dialogueProcessor.init();

// 3. 对话流程
async function onPlayerInput(playerInput) {
    const charId = 'char_lucangxue';
    
    // 准备
    const snapshot = dialogueProcessor.beforeDialogue(charId);
    
    // AI生成
    const aiReply = await callAI(playerInput);
    
    // 处理（包含经历生成和记忆检测）
    const results = await dialogueProcessor.afterDialogue(
        snapshot, playerInput, aiReply, { favorDelta: 2 }
    );
    
    // 显示结果
    console.log('生成经历:', results.experiences);
    console.log('添加记忆:', results.memories);
}
```

### Prompt构建

```javascript
// 获取用于AI提示的数据
const data = dialogueProcessor.getPromptData('char_lucangxue');

// 构建完整提示词
const systemPrompt = dialogueProcessor.buildSystemPrompt(
    'char_lucangxue',
    baseCharacterPrompt
);
```

---

## 文件结构

```
public/
├── js/
│   ├── core/
│   │   ├── chapterTemplates.js      # 章节模板
│   │   ├── experienceTriggers.js    # 触发器系统
│   │   ├── experienceGenerator.js   # 经历生成器
│   │   └── playerMemorySystem.js    # 玩家记忆系统
│   └── services/
│       ├── chapterSaveManager.js    # 存档管理器
│       └── dialogueProcessor.js     # 对话处理器
├── test-dual-system.html            # 双系统演示
└── ...
world-guide.html                      # 主入口（章节选择）
experience-editor.html                # 经历编辑器
```

---

## 后续扩展

1. **从AI回复解析好感度变化** - 使用正则或AI判断
2. **经历揭示检测** - 在AI回复中检测经历提及
3. **更多触发器类型** - 物品获得、任务完成等
4. **经历图像生成** - 为重要经历生成图片
5. **时间线视图** - 可视化展示经历时序
6. **玩家记忆关联** - 多角色关联的记忆

---

## 完整指南

详细使用说明参见: `CHAPTER_SAVE_GUIDE.md`
