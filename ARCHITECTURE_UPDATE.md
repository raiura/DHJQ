# 存档与记忆系统整合完成

## 架构变化

### 原来的设计（冲突）
```
settings.html 记忆管理
├── 全局记忆：game_memories (所有存档共享)
├── 全局配置：user_ai_config (所有存档共享)
└── 全局好感度：galgame_character_favor (所有存档共享)

world-guide.html 存档系统
├── 存档1：只有基本消息
├── 存档2：只有基本消息
└── 存档3：只有基本消息

问题：切换存档时，记忆/好感度/配置没有切换，所有存档共享一套数据
```

### 新的设计（已修复）
```
每个存档完全独立：

存档1
├── messages: 对话历史
├── memories: {short, long, core}  ← 三层记忆
├── favor: {char1: {...}, char2: {...}}  ← 角色好感度
├── config: {memoryDepth, temperature, ...}  ← AI配置
├── experiences: [...]  ← 经历档案
└── progress: {chapter, events, ...}  ← 剧情进度

存档2（完全独立的一套数据）
├── messages
├── memories
├── favor
├── config
├── experiences
└── progress

存档3...
```

## 修改内容

### 1. world-guide.html
- ✅ 存档数据结构扩展，包含完整的记忆系统
- ✅ 新建存档时自动创建空的记忆结构
- ✅ 存档列表显示消息数量

### 2. settings.html
- ✅ 添加侧边栏"当前存档"选择器（用户视图）
- ✅ 修改用户个人设置加载逻辑：从存档读取
- ✅ 修改用户个人设置保存逻辑：保存到存档
- ✅ 修改AI配置加载逻辑：存档配置 > 全局默认
- ✅ 修改AI配置保存逻辑：同时保存到存档和全局
- ✅ 修改记忆管理：从当前存档读取三层记忆
- ✅ 未选择存档时显示提示，引导用户创建存档

## 存储键名变化

### 原来的键名（全局）
```javascript
game_memories           // 所有存档共享的记忆
galgame_character_favor // 所有存档共享的好感度
user_ai_config          // 所有存档共享的AI配置
```

### 新的键名（按存档隔离）
```javascript
galgame_saves = {
    "dahuang": [  // 每个故事（书）有自己的存档列表
        {
            id: "save_xxx",
            name: "存档1",
            memories: {short, long, core},  // ← 存档级记忆
            favor: {...},                    // ← 存档级好感度
            config: {...},                   // ← 存档级配置
            ...
        }
    ]
}
galgame_current_save = "save_xxx"  // 当前选中的存档ID
```

## 使用流程

### 玩家视角

1. **进入世界指南**（如《大荒九丘》）
2. 看到三个按钮：
   - 📚 切换故事（换到其他书，如《红楼梦》）
   - ▶️ 继续游戏（继续当前故事的最新存档）
   - 💾 存档管理

3. **点击"💾 存档管理"**
   - 看到当前故事的所有存档
   - 可以：新建存档、复制存档、删除存档、加载存档
   - 每个存档完全独立，互不影响

4. **进入 settings.html 用户视图**
   - 侧边栏显示"当前存档"选择器
   - AI配置、记忆管理都是针对**当前选中存档**的
   - 切换存档后，所有设置自动切换

### 开发者视角

```javascript
// 获取当前存档数据
const save = getCurrentSaveData();

// 存档结构
save = {
    id: "save_xxx",
    name: "我的存档",
    world: "dahuang",
    messages: [...],           // 对话历史
    memories: {                // 三层记忆系统
        short: [...],          // 短期记忆
        long: [...],           // 长期记忆
        core: [...]            // 核心记忆
    },
    favor: {                   // 角色好感度
        "char_001": { favor: 80, trust: 75 },
        "char_002": { favor: 45, trust: 30 }
    },
    config: {                  // 存档专属AI配置
        memoryDepth: 10,
        coreMemorySlots: 5,
        autoSummarize: true,
        temperature: 0.7,
        maxTokens: 2000,
        model: 'deepseek-chat'
    },
    experiences: [...],        // 经历档案
    progress: {...},           // 剧情进度
    createdAt: "...",
    updatedAt: "..."
}
```

## 后续需要修改的地方

### galgame_framework.html（游戏页面）
需要修改来支持存档系统：

1. **页面加载时**：
   ```javascript
   const urlParams = new URLSearchParams(window.location.search);
   const saveId = urlParams.get('save');
   const save = getSaveById(saveId);
   // 加载 save.messages 作为对话历史
   // 加载 save.memories 作为记忆系统
   // 加载 save.favor 作为角色好感度
   ```

2. **发送对话时**：
   ```javascript
   // 将新消息添加到 save.messages
   // 更新 save.memories（短期→长期→核心）
   // 更新 save.favor（根据AI回复）
   // 保存回 localStorage
   ```

3. **自动保存**：
   ```javascript
   // 每轮对话后自动保存存档
   updateSaveData({
       messages: currentMessages,
       memories: currentMemories,
       favor: currentFavor,
       updatedAt: new Date().toISOString()
   });
   ```

## 数据迁移

现有数据（全局记忆）可以作为"默认存档"迁移：

```javascript
// 迁移脚本（在控制台运行一次）
const oldMemories = JSON.parse(localStorage.getItem('game_memories') || '[]');
const oldFavor = JSON.parse(localStorage.getItem('galgame_character_favor') || '{}');
const oldConfig = JSON.parse(localStorage.getItem('user_ai_config') || '{}');

// 创建默认存档
const defaultSave = {
    id: 'save_default_' + Date.now(),
    name: '默认存档（迁移）',
    world: 'dahuang',
    messages: [],
    memories: {
        short: oldMemories.filter(m => m.type === 'short'),
        long: oldMemories.filter(m => m.type === 'long'),
        core: oldMemories.filter(m => m.type === 'core')
    },
    favor: oldFavor,
    config: oldConfig,
    // ...
};

// 保存
saveSavesList([defaultSave]);
localStorage.setItem(CURRENT_SAVE_KEY, defaultSave.id);
```
