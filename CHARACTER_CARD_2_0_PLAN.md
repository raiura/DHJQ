# 📇 角色卡 2.0 升级计划

> **核心设计理念**：一本书 = 一个超级角色卡  
> **升级方式**：渐进式，不修改现有大HTML文件  
> **参考借鉴**：SillyTavern Character Card 设计理念

---

## 一、当前问题分析

### 1.1 现有角色卡结构
```
Character {
  // 基础信息
  name, color, image, imageFit,
  
  // 设定字段（分散）
  appearance, personality, physique, background, special,
  
  // 世界书式管理
  keys, enabled, priority,
  
  // 情感状态
  favor, trust, mood
}
```

### 1.2 核心痛点

| 痛点 | 说明 | 影响 |
|------|------|------|
| 角色与世界书割裂 | 角色触发关键词和世界书独立管理 | AI难以判断何时激活角色 |
| 提示词构建简单 | 只有前置+主提示词两层 | 缺乏层次感，Token控制弱 |
| 无角色深度注入 | 不能像SillyTavern的Character's Note那样深度插入 | 角色性格在长篇对话中漂移 |
| 缺乏角色专属世界书 | 角色相关设定散落在全局世界书 | 维护困难，容易遗漏 |
| 无Example Dialogues | 缺少Few-shot示例对话 | AI学习角色语气效果差 |

### 1.3 与SillyTavern的差距

```
SillyTavern Character Card:
├─ Name
├─ Description (角色主描述)
├─ Personality (性格摘要)
├─ Scenario (场景设定)
├─ First Message (开场白)
├─ Example Dialogues (示例对话)
├─ Creator's Notes (创作者备注)
├─ Character's Note (深度注入提示词)
├─ Post-History Instructions (历史后指令)
├─ Main Prompt Override (主提示词覆盖)
├─ World Info (角色专属世界书)
└─ Tags (标签分类)

你的当前角色卡:
├─ name
├─ appearance (≈Description的一部分)
├─ personality (≈Personality)
├─ background (≈Scenario的一部分)
├─ keys (触发关键词)
└─ prompt (合并后的提示词)
```

---

## 二、角色卡 2.0 新架构

### 2.1 核心理念：角色即世界

将角色从"世界中的一个NPC"提升为"世界的一个切片"：
- 每个角色自带「微世界书」
- 角色与世界书深度联动
- 多层次提示词注入

### 2.2 新数据结构

```typescript
interface CharacterCardV2 {
  // ========== 基础信息 ==========
  id: string;
  name: string;
  version: string;           // 角色卡版本
  
  // ========== 视觉设计 ==========
  visual: {
    avatar: string;          // 头像
    cover: string;           // 封面图（SillyTavern风格）
    emotionCGs: {            // 情感立绘映射
      calm: string;
      happy: string;
      angry: string;
      sad: string;
      shy: string;
      surprise: string;
      serious: string;
      hurt: string;
    };
    color: string;           // 主题色
  };
  
  // ========== 核心设定（SillyTavern风格） ==========
  core: {
    description: string;     // 角色主描述（外貌+身份+背景）
    personality: string;     // 性格特点（简洁关键词+详细描述）
    scenario: string;        // 场景/处境
    firstMessage: string;    // 开场白
    
    // 增强：与世界的关联
    worldConnection: {
      faction: string;       // 所属势力
      location: string;      // 常驻地点
      relationships: [{      // 与其他角色关系
        targetCharId: string;
        relationType: string; // 师徒/仇敌/恋人等
        description: string;
      }];
    };
  };
  
  // ========== 示例对话（Few-shot） ==========
  examples: {
    dialogues: [{            // 示例对话
      user: string;
      character: string;
      annotation?: string;   // 标注说明
    }];
    style: string;           // 语气风格说明
  };
  
  // ========== 深度注入系统（SillyTavern风格） ==========
  injection: {
    characterNote: {         // Character's Note 等价物
      content: string;
      depth: number;         // 注入深度（0=最后，4=第4条前）
      frequency: number;     // 频率（每N条消息）
      role: 'system' | 'user' | 'assistant';
    };
    postHistory: string;     // Post-History Instructions
    mainPromptOverride: string; // 覆盖主提示词（可选）
  };
  
  // ========== 角色专属世界书 ==========
  lorebook: {
    entries: [{              // 角色相关世界书条目
      id: string;
      name: string;
      keys: string[];
      content: string;
      priority: number;
      insertPosition: 'system' | 'character' | 'user';
    }];
    // 自动从主世界书关联
    linkedGlobalEntries: string[]; // 关联的全局条目ID
  };
  
  // ========== 触发与激活 ==========
  activation: {
    keys: string[];          // 触发关键词
    priority: number;
    enabled: boolean;
    // 新增：智能触发条件
    conditions: [{
      type: 'location' | 'time' | 'relation' | 'manual';
      value: string;
    }];
    // 新增：角色登场控制
    entrance: {
      autoTrigger: boolean;  // 是否自动登场
      triggerMessage: string; // 登场时的开场白
      requiredContext: string[]; // 需要的前置条件
    };
  };
  
  // ========== 情感与关系系统（保留并增强） ==========
  relationship: {
    favor: number;           // 好感度 0-100
    trust: number;           // 信任度 0-100
    mood: string;            // 当前心情
    // 新增：动态态度
    attitude: {
      current: string;       // 当前态度标签
      history: [{            // 态度变化历史
        timestamp: Date;
        event: string;
        change: number;
      }];
    };
    // 新增：记忆关联
    sharedMemories: string[]; // 与玩家共享的记忆ID
  };
  
  // ========== 创作者元数据 ==========
  meta: {
    author: string;
    createdAt: Date;
    updatedAt: Date;
    tags: string[];
    description: string;     // 创作者备注
    version: string;
    // 导出支持
    exportFormat: 'dahuang-v2' | 'sillytavern-png' | 'json';
  };
}
```

---

## 三、吸取SillyTavern的设计理念

### 3.1 Character's Note → 角色深度注入

**SillyTavern设计**：
- 可在指定深度注入提示词
- 用于强化角色特定状态或性格

**我们的实现**：`injection.characterNote`
```javascript
// 示例：角色受伤状态的深度注入
{
  content: "【状态提醒】{{char}}当前身受重伤，行动受限，呼吸急促，说话时伴随着痛苦的喘息。",
  depth: 0,        // 始终在最后
  frequency: 1,    // 每条消息都注入
  role: "system"
}
```

### 3.2 Post-History Instructions → 历史后指令

**SillyTavern设计**：
- 在对话历史之后注入
- 用于指导AI下一步如何回应

**我们的实现**：`injection.postHistory`
```javascript
// 示例：引导AI主动行动
"请记住：{{char}}是一个主动的角色，会主动提出建议、提出问题或采取行动推动剧情发展，而不是被动等待玩家指示。"
```

### 3.3 Example Dialogues → 示例对话系统

**SillyTavern设计**：
- 提供Few-shot学习材料
- 帮助AI掌握角色语气和说话方式

**我们的实现**：`examples.dialogues`
```javascript
[
  {
    user: "你好，请问这是哪里？",
    character: "（轻摇折扇，嘴角微扬）此处乃北寒落星丘，外人称之为'雪剑之巅'。看你面生，可是来寻仙问道的？",
    annotation: "展示角色的优雅气质和主动询问"
  }
]
```

### 3.4 World Info → 角色专属世界书

**SillyTavern设计**：
- 角色可以自带World Info
- 随角色卡片一起导入导出

**我们的实现**：`lorebook.entries`
- 角色创建时自动生成基础条目
- 可与全局世界书联动

---

## 四、角色-世界书联动机制

### 4.1 自动关联策略

```
当创建/编辑角色时：
1. 提取角色关键词 → 搜索全局世界书
2. 匹配到的条目 → 加入 linkedGlobalEntries
3. 角色相关新设定 → 创建为 lorebook.entries

当对话进行时：
1. 检测触发关键词
2. 激活对应角色
3. 同时激活角色的 lorebook.entries
4. 合并全局世界书 linkedGlobalEntries
```

### 4.2 联动示例

```javascript
// 角色：落星剑宗大师姐
{
  name: "陆苍雪",
  keys: ["陆苍雪", "大师姐", "苍雪"],
  
  // 自动从全局世界书关联
  linkedGlobalEntries: [
    "wb_north_cold",      // 北寒落星丘地理
    "wb_luoxing_sect",    // 落星剑宗介绍
    "wb_ice_cultivation"  // 冰系功法
  ],
  
  // 角色专属条目
  lorebook: {
    entries: [
      {
        name: "陆苍雪的寒霜剑",
        keys: ["寒霜剑", "佩剑"],
        content: "陆苍雪的佩剑名为'寒霜'，剑身通体晶莹，挥动时有雪花飘落...",
        priority: 200  // 高于普通条目
      }
    ]
  }
}
```

---

## 五、增强提示词构建器

### 5.1 新分层架构

```
System Layer (最底层)
├─ 世界观基础设定
├─ 角色卡 mainPromptOverride (如有)
└─ 角色 linkedGlobalEntries (system位置)

Character Layer
├─ 角色 description
├─ 角色 personality
├─ 角色 scenario
├─ 角色 lorebook.entries (character位置)
└─ Example Dialogues

Dynamic Layer
├─ 角色 relationship 状态
├─ 角色 injection.characterNote (动态插入)
└─ 当前激活的角色专属条目

User Layer
├─ 用户前置提示词
└─ 用户自定义设定

History Layer
├─ 对话历史
└─ 角色 injection.postHistory (历史后)
```

### 5.2 Token预算智能分配

```javascript
const tokenBudget = {
  system: 800,      // 世界观 + 全局世界书
  character: 1000,  // 角色主设定 + 专属世界书
  examples: 600,    // 示例对话
  dynamic: 400,     // 动态状态 + CharacterNote
  user: 300,        // 用户设定
  history: 2000,    // 对话历史
  postHistory: 200  // 历史后指令
};
```

---

## 六、实施计划（不动大HTML）

### 6.1 第一阶段：基础模块（Week 1-2）

**新增文件**：
```
public/js/
├── core/
│   └── characterCardV2.js      # 新角色卡数据模型
├── services/
│   ├── characterCardBuilder.js # 角色卡构建器
│   └── characterWorldbookBridge.js # 角色-世界书桥接
└── components/
    └── characterCardEditorV2.js # 新编辑器UI（独立）
```

**功能**：
- 新的数据模型定义
- 与老数据的兼容性转换
- 基础API封装

### 6.2 第二阶段：提示词增强（Week 3-4）

**新增文件**：
```
public/js/
├── core/
│   └── enhancedPromptBuilder.js # 增强提示词构建器
└── services/
    └── characterInjectionEngine.js # 深度注入引擎
```

**功能**：
- CharacterNote注入
- PostHistory注入
- Example Dialogues格式化

### 6.3 第三阶段：联动系统（Week 5-6）

**新增文件**：
```
public/js/
└── services/
    └── characterWorldbookLinker.js # 自动关联引擎
```

**功能**：
- 关键词匹配算法
- 自动关联推荐
- 联动状态管理

### 6.4 第四阶段：独立编辑器（Week 7-8）

**新增页面**：
```
character-editor-v2.html    # 独立的新版角色编辑器
```

**特点**：
- 完整的功能实现
- 与老编辑器并行存在
- 可逐步迁移数据

---

## 七、数据迁移策略

### 7.1 自动转换机制

```javascript
// v1 → v2 自动转换
function migrateCharacterV1ToV2(v1Data) {
  return {
    ...v2Template,
    core: {
      description: combine(v1Data.appearance, v1Data.background),
      personality: v1Data.personality,
      scenario: "", // 需要手动补充
      firstMessage: "", // 需要手动补充
    },
    visual: {
      avatar: v1Data.image,
      color: v1Data.color,
      // 其他字段使用默认值
    },
    activation: {
      keys: v1Data.keys,
      priority: v1Data.priority,
      enabled: v1Data.enabled,
    },
    relationship: {
      favor: v1Data.favor || 50,
      trust: v1Data.trust || 50,
      mood: v1Data.mood || "平静",
    },
    // 标记为迁移数据
    _migrated: true,
    _migrationVersion: "2.0"
  };
}
```

### 7.2 渐进式切换

1. **阶段1**：新角色使用V2格式，旧角色保持V1
2. **阶段2**：提供V1→V2转换工具
3. **阶段3**：默认使用V2，V1只读
4. **阶段4**：完全迁移到V2

---

## 八、与现有系统的兼容

### 8.1 不修改的文件

- ❌ `settings.html` - 保持现状
- ❌ `galgame_framework.html` - 保持现状
- ❌ `backend/models/character.js` - 保持现状（通过转换层兼容）

### 8.2 新增的集成点

```javascript
// 在需要的地方插入适配器
const { CharacterCardAdapter } = await import('./characterCardV2.js');

// 使用适配器获取数据（自动处理v1/v2）
const characterData = await CharacterCardAdapter.getCharacter(id);

// 构建提示词（自动选择构建器版本）
const prompt = await CharacterCardAdapter.buildPrompt(characterData, options);
```

---

## 九、预期效果

### 9.1 角色表现提升

| 维度 | 当前 | 升级后 |
|------|------|--------|
| 角色一致性 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 语气模仿 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 情境感知 | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| 长期记忆 | ⭐⭐ | ⭐⭐⭐⭐ |
| 多角色互动 | ⭐⭐ | ⭐⭐⭐⭐ |

### 9.2 创作者体验

- ✅ 角色设定更结构化
- ✅ 与世界书联动更智能
- ✅ 提示词控制更精细
- ✅ 导入导出更灵活（支持SillyTavern格式）

---

## 十、下一步行动

1. **确认方案** - 讨论并确定本方案
2. **开始实施** - 按照阶段计划开发
3. **并行测试** - 在独立编辑器中测试
4. **逐步迁移** - 待稳定后整合到主流程

---

*文档版本：1.0*  
*创建日期：2026-03-28*  
*状态：待评审*
