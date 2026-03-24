# 章节存档系统与双系统架构指南

## 概述

本文档介绍章节存档系统（Chapter Save System）和完整的经历/记忆双系统架构。

---

## 一、双系统架构

### 1.1 系统组成

```
存档 (SaveSlot)
├── id, name
├── startChapter / currentChapter
├── world: { location, weather, gameTime, flags }
├── characters: Map<characterId, CharacterArchive>
│   └── experiences[] (自动生成)
├── playerOverrides: { characters: { favor, experiences[], ... } }
└── player: PlayerArchive
    ├── memories[] (玩家视角)
    ├── shortTerm[], longTerm[], core[] (分层)
    ├── bookmarks[] (收藏)
    └── tags[] (标签)
```

### 1.2 两个独立系统

| 系统 | 存储位置 | 生成方式 | 用途 |
|------|---------|---------|------|
| **角色经历 (Experience)** | `save.characters[charId].experiences` | AI/模板自动生成 | NPC视角的往事 |
| **玩家记忆 (Memory)** | `save.player.memories` | 自动检测/手动添加 | 玩家视角的重要事件 |

---

## 二、章节存档管理器

### 2.1 基本用法

```javascript
// 创建新存档（从章节模板）
const save = chapterSaveManager.createSlot('我的存档', 'ch1');

// 加载存档
chapterSaveManager.loadSlot(save.id);

// 自动保存（修改后5秒自动保存）
chapterSaveManager.setFavorOverride('char_lucangxue', 35);
// 5秒后自动保存到 localStorage
```

### 2.2 角色状态获取

```javascript
// 获取角色状态（默认 + 玩家覆盖）
const char = chapterSaveManager.getCharacterState('char_lucangxue');
// 返回: { favor, trust, location, mood, experiences[], ... }
```

### 2.3 玩家覆盖（可编辑部分）

```javascript
// 修改好感度
chapterSaveManager.setFavorOverride('char_lucangxue', 50);

// 添加经历
chapterSaveManager.addExperience('char_lucangxue', {
    title: '自定义经历',
    description: '玩家手动添加的经历'
});

// 编辑经历（不会删除原始数据）
chapterSaveManager.editExperience('char_lucangxue', expId, {
    customDescription: '修改后的描述'
});

// 重置为默认值
chapterSaveManager.resetToDefault('char_lucangxue');
```

### 2.4 世界状态

```javascript
// 获取世界状态
const world = chapterSaveManager.getWorldState();

// 更新
chapterSaveManager.updateWorld({
    location: '藏书阁',
    weather: 'rain'
});

// 设置剧情标记
chapterSaveManager.setFlag('ch1_completed', true);
```

---

## 三、经历自动生成系统

### 3.1 触发器引擎

```javascript
// 创建触发上下文
const context = {
    characterId: 'char_lucangxue',
    character: chapterSaveManager.getCharacterState('char_lucangxue'),
    previousFavor: 25,  // 修改前的好感度
    playerInput: '我爱你',
    aiReply: '你...说什么傻话...',
    save: chapterSaveManager.getCurrentSlot(),
    newlySetFlags: ['confession_scene']
};

// 检查所有触发器
const triggers = experienceTriggerEngine.checkAll(context);
```

### 3.2 触发器类型

#### 好感度突破 (FAVOR_THRESHOLD)
当好感度突破 30/60/90 时触发。

```javascript
const trigger = experienceTriggerEngine.check('FAVOR_THRESHOLD', context);
// 返回: { type: 'FAVOR_THRESHOLD', data: { threshold: 30, ... } }
```

#### 对话模式 (DIALOGUE_PATTERN)
匹配关键词触发。

```javascript
// 匹配关键词: 喜欢, 在意, 心动, 在一起, 陪伴
const trigger = experienceTriggerEngine.check('DIALOGUE_PATTERN', context);
// 返回: { type: 'DIALOGUE_PATTERN', data: { patternName: 'confession', ... } }
```

支持的对话模式:
- `confession` - 真情流露
- `apology` - 和解时刻
- `conflict` - 冲突时刻
- `comfort` - 温情时刻
- `teasing` - 打趣时刻

#### 地点时间 (LOCATION_TIME)
特定时空组合触发。

```javascript
// 示例: 雪夜在阳台
const trigger = experienceTriggerEngine.check('LOCATION_TIME', context);
// 返回: { type: 'LOCATION_TIME', data: { comboName: 'snow_night', ... } }
```

支持的特殊时刻:
- `snow_night` - 雪夜
- `dawn_meeting` - 黎明之约
- `rainy_night` - 雨夜

#### 剧情里程碑 (PLOT_MILESTONE)
剧情标记设置时触发。

```javascript
const trigger = experienceTriggerEngine.check('PLOT_MILESTONE', context);
// 返回: { type: 'PLOT_MILESTONE', data: { flag: 'first_battle_together', ... } }
```

### 3.3 经历生成器

```javascript
// 使用模板生成
experienceGenerator.setUseAI(false);
const experience = experienceGenerator.generate(trigger, context);

// 使用AI生成
experienceGenerator.setUseAI(true);
experienceGenerator.setAIConfig({
    model: 'deepseek-chat',
    temperature: 0.7
});
const experience = await experienceGenerator.generate(trigger, context);
```

### 3.4 保存生成的经历

```javascript
// 生成并保存到角色档案
const expId = chapterSaveManager.addGeneratedExperience(
    'char_lucangxue', 
    experience
);

// 标记经历为已揭示（AI在对话中提及）
chapterSaveManager.revealExperience(
    'char_lucangxue', 
    expId, 
    'dialogue_12345'
);
```

### 3.5 用于AI提示词

```javascript
// 获取已揭示的经历
const char = chapterSaveManager.getCharacterState('char_lucangxue');
const revealedExps = char.experiences.filter(e => e.isRevealed);

// 获取未揭示但高冲击的经历（用于暗示）
const hints = chapterSaveManager.getUnrevealedHighImpactExperiences(
    'char_lucangxue', 
    7  // 最小冲击值
);
```

---

## 四、玩家记忆系统

### 4.1 自动检测

```javascript
const context = {
    save: chapterSaveManager.getCurrentSlot(),
    characterId: 'char_lucangxue',
    playerInput: '第一次遇见你时...',
    aiReply: '那时你...',
    newlySetFlags: []
};

// 自动检测并返回新记忆列表
const newMemories = playerMemorySystem.autoDetect(context);

// 添加到存档
newMemories.forEach(memory => {
    playerMemorySystem.addMemory(save, memory);
});
```

### 4.2 手动添加记忆

```javascript
const pmId = playerMemorySystem.addMemory(save, {
    type: 'PLOT_EVENT',
    title: '击败魔教教主',
    description: '经过一番激战，终于击败了魔教教主。',
    relatedCharacters: ['char_lucangxue'],
    relatedLocation: '魔教总坛',
    importance: 9,
    isCore: true
});
```

### 4.3 获取记忆用于Prompt

```javascript
// 获取玩家记忆
const memories = playerMemorySystem.getMemoriesForPrompt(save, 5, {
    characterId: 'char_lucangxue'  // 过滤特定角色相关
});

// 引用计数（追踪哪些记忆被经常使用）
playerMemorySystem.referenceMemory(save, pmId);
```

### 4.4 记忆管理

```javascript
// 收藏/取消收藏
const isBookmarked = playerMemorySystem.toggleBookmark(save, pmId);

// 搜索记忆
const results = playerMemorySystem.search(save, '第一次');
```

---

## 五、整合流程：对话循环

```javascript
async function onDialogueSubmit(playerInput, aiReply, characterId) {
    const save = chapterSaveManager.getCurrentSlot();
    const character = chapterSaveManager.getCharacterState(characterId);
    const previousFavor = character.favor;
    
    // 1. 更新好感度（由AI判断）
    const favorDelta = await analyzeFavorChange(playerInput, aiReply);
    chapterSaveManager.setFavorOverride(characterId, character.favor + favorDelta);
    
    // 2. 检查触发器
    const context = {
        characterId,
        character: chapterSaveManager.getCharacterState(characterId),
        previousFavor,
        playerInput,
        aiReply,
        save,
        newlySetFlags: []  // 如果设置了新标记
    };
    
    const triggers = experienceTriggerEngine.checkAll(context);
    
    // 3. 生成经历
    for (const trigger of triggers) {
        const experience = await experienceGenerator.generate(trigger, context);
        chapterSaveManager.addGeneratedExperience(characterId, experience);
    }
    
    // 4. 检测玩家记忆
    const newMemories = playerMemorySystem.autoDetect(context);
    newMemories.forEach(memory => {
        playerMemorySystem.addMemory(save, memory);
    });
    
    // 5. 构建Prompt（包含经历和记忆）
    const prompt = buildPrompt(characterId, save);
}

function buildPrompt(characterId, save) {
    const char = chapterSaveManager.getCharacterState(characterId);
    
    // 已揭示的经历
    const revealedExps = char.experiences.filter(e => e.isRevealed);
    
    // 未揭示但高冲击的经历（用于暗示）
    const hintExps = chapterSaveManager.getUnrevealedHighImpactExperiences(characterId, 7);
    
    // 玩家相关记忆
    const memories = playerMemorySystem.getMemoriesForPrompt(save, 5, { characterId });
    
    return `
角色背景：${char.background}

已知的经历（角色会在对话中自然提及）：
${revealedExps.map(e => `- ${e.title}: ${e.description}`).join('\n')}

未完全透露但影响角色行为的经历（暗示用，不要直接提及标题）：
${hintExps.map(e => `- ${e.description}`).join('\n')}

玩家记忆中的相关事件：
${memories.map(m => `- ${m.title}`).join('\n')}
`;
}
```

---

## 六、完整示例

参见 `experience-editor.html` 获取完整的UI实现示例。

---

## 七、章节模板配置

```javascript
// chapterTemplates.js
const ChapterTemplates = {
    'ch1': {
        id: 'ch1',
        name: '第一章 宗门试炼',
        unlockTime: { year: 2026, month: 3, day: 1, hour: 8, minute: 0 },
        defaultWorld: {
            location: '落星剑宗广场',
            weather: 'sunny',
            gameTime: { year: 2026, month: 3, day: 1, hour: 8, minute: 0 },
            flags: { 'ch1_started': true }
        },
        defaultCharacters: {
            'char_lucangxue': {
                favor: 0,
                trust: 10,
                location: '比武台',
                mood: 'serious',
                experiences: [
                    { id: 'exp_default_1', title: '初识', ... }
                ],
                secrets: []
            }
        }
    }
};
```

---

## 八、技术细节

### 8.1 数据结构对比

**角色经历 (ExperienceEntry):**
```javascript
{
    id: 'exp_char_lucangxue_1234567890_1',
    generatedAt: 1234567890,
    gameTime: { year, month, day, hour, minute },
    triggerType: 'FAVOR_THRESHOLD',
    triggerData: { threshold: 30, ... },
    title: '初识好感',
    description: '...',
    fullContext: '...',
    emotionalImpact: 5,
    favorDelta: 2,
    isRevealed: false,
    playerEdits: { customTitle: '', ... }
}
```

**玩家记忆 (PlayerMemoryEntry):**
```javascript
{
    id: 'pm_1234567890_abc12',
    type: 'CHARACTER_FIRST_MEET',
    createdAt: 1234567890,
    gameTime: { year, month, day, hour, minute },
    title: '初见陆沧雪',
    description: '...',
    relatedCharacters: ['char_lucangxue'],
    relatedLocation: '落星剑宗广场',
    importance: 7,
    isCore: true,
    referencedCount: 5,
    playerNote: ''
}
```

### 8.2 存储策略

- **localStorage**: 存档数据
- **内存**: 当前加载的存档
- **自动保存**: 修改后5秒自动保存
- **手动保存**: `chapterSaveManager.saveNow()`

---

## 九、扩展指南

### 9.1 添加新触发器

```javascript
// 在 experienceTriggers.js 中添加
TriggerConfigs.MY_CUSTOM = {
    check: (context) => {
        if (/* 你的条件 */) {
            return {
                type: 'MY_CUSTOM',
                data: { /* 你的数据 */ }
            };
        }
        return null;
    }
};
```

### 9.2 添加新模板

```javascript
// 在 experienceGenerator.js 中添加
ExperienceTemplates.myCategory = {
    myEvent: {
        titles: ['标题1', '标题2'],
        descriptions: ['描述1', '描述2'],
        emotionalImpacts: [5, 6, 7],
        favorDeltas: [0, 1, 2]
    }
};
```

---

## 十、调试工具

```javascript
// 查看所有存档
const saves = chapterSaveManager.listSaves();
console.table(saves.map(s => ({ id: s.id, name: s.name, chapter: s.currentChapter })));

// 查看角色经历
const char = chapterSaveManager.getCharacterState('char_lucangxue');
console.log('经历:', char.experiences);

// 查看玩家记忆
const memories = playerMemorySystem.getMemoriesForPrompt(save, 10);
console.log('记忆:', memories);

// 生成历史
console.log('生成历史:', experienceGenerator.getGenerationHistory());
```
