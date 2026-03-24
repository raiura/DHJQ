# 角色级存档系统整合指南

## 已完成的文件

```
public/js/core/saveTypes.js      # 类型定义
public/js/services/saveManager.js # 核心管理器（新的角色级存档）
```

## 整合策略

世界指南页(world-guide.html)已有存档实现，我们采用**渐进式迁移**：

### 方案A：完全替换（推荐用于新部署）
替换 world-guide.html 的存档逻辑为新 SaveManager

### 方案B：双系统并存（兼容性更好）
新存档使用新格式，旧存档自动迁移

---

## 使用方法

### 1. 引入脚本

在 world-guide.html 的 `<head>` 中加入：

```html
<script src="js/core/saveTypes.js"></script>
<script src="js/services/saveManager.js"></script>
```

### 2. 创建存档（新方式）

```javascript
// 创建新存档
const slot = saveManager.createSlot('陆苍雪线', 'dahuang');

// 存档结构
slot = {
    id: "save_xxx",
    name: "陆苍雪线",
    worldId: "dahuang",
    characters: Map<characterId, CharacterArchive>,  // ← 角色独立档案
    world: WorldState,                                // ← 共享世界状态
    player: PlayerPreferences                         // ← 玩家设置
}
```

### 3. 角色档案操作（核心！）

```javascript
// 首次遇到角色时初始化档案
const char = saveManager.initCharacterArchive('char_lucangxue', {
    id: 'char_lucangxue',
    name: '陆苍雪',
    initialFavor: 0,
    defaultLocation: 'beihan',
    coreMemories: [...],
    initialTopics: ['剑道', '落星剑宗']
});

// 获取角色档案（独立！）
const archive = saveManager.getCharacterArchive('char_lucangxue');
archive.favor;           // 80
archive.memories.core;   // 核心记忆
archive.dialogueLog;     // 完整对话历史

// 和陆苍雪对话不会影响轩辕霓裳的档案！
```

### 4. 在对话中使用

```javascript
// galgame_framework.html

// 初始化时加载存档
await saveManager.loadSlot('save_xxx');

// 切换角色时
async function switchCharacter(characterId) {
    // 获取或创建该角色的独立档案
    let archive = saveManager.getCharacterArchive(characterId);
    if (!archive) {
        const template = await loadCharacterTemplate(characterId);
        archive = saveManager.initCharacterArchive(characterId, template);
    }
    
    // 更新状态为在场
    saveManager.updateCharacterStatus(characterId, {
        isPresent: true,
        mood: 'calm'
    });
    
    // 组装Prompt时使用该角色的独立记忆
    const prompt = buildPromptWithCharacterMemory(archive);
}

// 发送对话
async function onSendMessage(text) {
    const charId = currentCharacterId;
    
    // 记录玩家输入（存入该角色的dialogueLog）
    saveManager.addCharacterDialogue(charId, {
        id: generateId(),
        role: 'player',
        content: text,
        timestamp: Date.now()
    });
    
    // AI回复
    const response = await callLLM(prompt);
    
    // 解析情感
    const { cleanText, emotion } = parseEmotion(response);
    
    // 记录AI回复（存入该角色的dialogueLog）
    saveManager.addCharacterDialogue(charId, {
        id: generateId(),
        role: 'assistant', 
        content: cleanText,
        timestamp: Date.now(),
        emotion: emotion.type,
        emotionLevel: emotion.level
    });
    
    // 更新好感度（仅该角色）
    const favorDelta = calculateFavorDelta(text, cleanText, emotion);
    saveManager.updateCharacterFavor(charId, favorDelta);
    
    // 自动保存（已内置）
}
```

### 5. 经历解锁

```javascript
// 检查并解锁经历
function checkExperienceUnlocks(characterId) {
    const archive = saveManager.getCharacterArchive(characterId);
    
    // 好感度达到70，解锁「雪原共舞」
    if (archive.favor >= 70 && !hasExperience(characterId, 'exp_snow_dance')) {
        saveManager.unlockCharacterExperience(characterId, {
            id: 'exp_snow_dance',
            title: '雪原共舞',
            description: '在暴风雪中与陆苍雪并肩练剑',
            icon: '❄️'
        });
        
        // 显示解锁动画
        showUnlockAnimation('陆苍雪', '雪原共舞');
    }
}
```

---

## 数据结构示例

### 存档槽位 SaveSlot

```json
{
  "id": "save_001",
  "name": "陆苍雪真爱线",
  "worldId": "dahuang",
  "createdAt": 1710854400000,
  "lastModified": 1710931200000,
  
  "characters": {
    "char_lucangxue": {
      "characterId": "char_lucangxue",
      "templateId": "template_lucangxue",
      "favor": 85,
      "trust": 70,
      "intimacy": 60,
      
      "status": {
        "mood": "concerned",
        "location": "ice_dragon_vein",
        "activity": "guarding",
        "isPresent": true,
        "lastMet": 1710931200000
      },
      
      "memories": {
        "shortTerm": [
          {"id": "msg_100", "content": "...", "timestamp": 1710931200000}
        ],
        "longTerm": [
          {"id": "long_1", "summary": "初遇对话摘要", "importance": 4}
        ],
        "core": [
          {"id": "core_1", "content": "玩家知道陆苍雪的剑伤秘密", "promotedAt": 1710900000000}
        ],
        "experiences": [
          {
            "id": "exp_001",
            "title": "雪原初遇",
            "unlockedAt": 1710854400000,
            "isRevealed": true
          },
          {
            "id": "exp_007", 
            "title": "龙脉共舞",
            "unlockedAt": 1710931200000,
            "isRevealed": false  // 还没在UI展示过
          }
        ]
      },
      
      "dialogueLog": [
        {"id": "msg_1", "role": "assistant", "content": "哼...", "timestamp": 1710854400000},
        {"id": "msg_2", "role": "player", "content": "你好", "timestamp": 1710854410000},
        // ... 完整的独立对话历史
      ],
      
      "unlocked": {
        "secrets": ["lcx_sword_injury", "lcx_past_master"],
        "scenes": ["cg_lcx_001", "cg_lcx_003"],
        "topics": ["剑道", "落星剑宗", "雪原", "剑伤"],
        "endings": []
      }
    },
    
    "char_xuanyuannishang": {
      "favor": 30,  // 和陆苍雪完全独立！
      "trust": 20,
      "memories": { /* 独立的记忆系统 */ },
      "dialogueLog": [ /* 独立的对话历史 */ ]
    }
  },
  
  "world": {
    "gameTime": {"year": 2026, "month": 3, "day": 19, "hour": 20, "minute": 8},
    "weather": "snow",
    "locations": {
      "sect_master_hall": {"unlocked": true, "visitedCount": 5},
      "ice_dragon_vein": {"unlocked": true, "visitedCount": 2}
    },
    "plot": {
      "currentChapter": "ch3",
      "currentScene": "snow_plain_doubt",
      "flags": {"met_lucangxue": true, "ch3_started": true}
    }
  },
  
  "player": {
    "ai": {"temperature": 0.8, "maxTokens": 2000, "memoryDepth": 10},
    "ui": {"theme": "dark", "fontSize": 16},
    "game": {"autoSave": true, "autoSaveInterval": 5}
  }
}
```

---

## 迁移旧存档

如果有旧存档需要迁移：

```javascript
// 迁移工具
function migrateOldSave(oldSave) {
    // 创建新的角色级存档结构
    const newSave = saveManager.createSlot(
        oldSave.name + ' (迁移)',
        oldSave.world
    );
    
    // 假设旧存档只有单角色数据
    const characterId = detectMainCharacter(oldSave);
    
    // 迁移对话历史
    const char = saveManager.initCharacterArchive(characterId, {
        id: characterId,
        name: '角色名',
        initialFavor: oldSave.favor?.[characterId]?.favor || 0,
        // ...
    });
    
    // 迁移记忆
    if (oldSave.memories) {
        char.memories.shortTerm = oldSave.memories.short || [];
        char.memories.longTerm = oldSave.memories.long || [];
        char.memories.core = oldSave.memories.core || [];
    }
    
    // 迁移对话历史
    if (oldSave.messages) {
        char.dialogueLog = oldSave.messages;
    }
    
    // 立即保存
    saveManager.saveNow();
    
    return newSave;
}
```

---

## 下一步任务

### Phase 1: 基础整合（今天）
- [x] SaveManager 类型定义
- [x] SaveManager 类实现
- [ ] 修改 world-guide.html 引入新脚本
- [ ] 修改存档列表显示（显示角色关系预览）

### Phase 2: 游戏页集成（明天）
- [ ] 修改 galgame_framework.html
  - 支持 `?save=xxx` URL参数
  - `initFromURL()` 加载存档
  - `switchCharacter()` 切换角色档案
  - `onPlayerInput()` 使用角色独立记忆

### Phase 3: 经历系统（后天）
- [ ] 实现 `checkExperienceUnlocks()`
- [ ] UI显示解锁的经历
- [ ] 经历解锁动画

### Phase 4: Settings 集成
- [ ] 显示当前存档的角色列表
- [ ] 支持查看/编辑各角色的好感度
- [ ] 支持查看角色经历

需要我现在继续实现哪个部分？
