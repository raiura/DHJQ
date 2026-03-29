# 图库架构 V2.0 - 世界角色CG自由拓展系统

## 🎯 设计理念

```
世界角色基础CG（8表情） ←→ 图库拓展CG（无限自定义）
         ↓                           ↓
    默认立绘系统              特殊场景CG系统
   （平静/开心/生气...）    （战斗/接吻/亲密/受伤...）
         ↘                  ↙
            AI动态调用层
         （提示词驱动匹配）
```

**核心思想**：图库不是独立的图片仓库，而是世界角色的**动态CG拓展层**

---

## 🏗️ 数据架构

### 1. 拓展的Gallery模型

```javascript
// backend/models/gallery.js
{
  // ===== 基础关联 =====
  gameId: String,              // 所属游戏
  characterId: String,         // 关联角色ID（可选，不填则是通用CG）
  characterName: String,       // 角色名称（冗余，方便查询）
  
  // ===== 图片信息 =====
  name: String,                // CG名称（如："雪地战斗-拔剑"）
  url: String,                 // 图片URL
  thumbnail: String,           // 缩略图（可选）
  
  // ===== CG分类体系 =====
  type: Enum[
    'background',              // 背景图（场景）
    'character_default',       // 角色默认立绘（8表情）
    'character_extended',      // 角色拓展CG（自定义）
    'scene_event',             // 场景事件CG（多人互动）
    'special_action'           // 特殊动作CG（战斗/亲密等）
  ],
  
  // ===== 提示词驱动系统（核心）=====
  triggerSystem: {
    // 触发模式
    mode: Enum[
      'tag_match',             // 标签匹配（传统方式）
      'prompt_similarity',     // 提示词语义相似度
      'ai_intent_recognition'  // AI意图识别（高级）
    ],
    
    // 触发条件（多维度）
    conditions: {
      // 1. 场景描述关键词
      sceneKeywords: [String],     // 如：["雪地", "战斗", "拔剑"]
      
      // 2. 情绪状态匹配
      emotions: [String],          // 如：["愤怒", "决绝", "专注"]
      
      // 3. 动作类型
      actions: [String],           // 如：["拔剑", "攻击", "格挡"]
      
      // 4. 关系状态（与玩家）
      relationshipStates: [String], // 如：["敌对", "热恋", "亲密"]
      
      // 5. 特殊标记
      specialTags: [String]        // 如：["R18", "血腥", "浪漫"]
    },
    
    // 触发权重（用于排序）
    priority: Number,            // 0-1000，越高越优先
    
    // 触发概率（用于随机 variation）
    probability: Number          // 0-1，触发几率
  },
  
  // ===== 显示控制 =====
  display: {
    // 显示模式
    mode: Enum[
      'fullscreen',              // 全屏（背景/大场景）
      'character_left',          // 角色左侧
      'character_right',         // 角色右侧
      'character_center',        // 角色中央
      'overlay',                 // 叠加层（特效）
      'split_screen'             // 分屏（双人场景）
    ],
    
    // 动画效果
    animation: {
      enter: String,             // 进入动画（fade/slide/zoom）
      exit: String,              // 退出动画
      duration: Number           // 持续时间(ms)
    },
    
    // 层级控制
    zIndex: Number               // 图层顺序
  },
  
  // ===== 条件约束 =====
  constraints: {
    // 触发前提条件
    prerequisites: {
      minFavor: Number,          // 最低好感度
      maxFavor: Number,          // 最高好感度
      requiredTags: [String],    // 必须有的标签
      forbiddenTags: [String]    // 禁止有的标签
    },
    
    // 冷却时间
    cooldown: {
      enabled: Boolean,
      duration: Number,          // 冷却时长(秒)
      global: Boolean            // 是否全局冷却（所有CG共用）
    }
  },
  
  // ===== 元数据 =====
  meta: {
    description: String,         // CG描述（给AI看的）
    creator: String,             // 创建者
    version: String,             // 版本
    createdAt: Date,
    updatedAt: Date,
    usageCount: Number           // 使用次数统计
  }
}
```

### 2. 角色CG状态机

```javascript
// 角色当前CG状态
characterCGState = {
  // 基础立绘（8表情）
  baseEmotion: 'calm',         // 当前基础表情
  
  // 拓展CG覆盖
  extendedCG: {
    active: Boolean,           // 是否激活拓展CG
    galleryId: String,         // 当前使用的图库CG ID
    overlay: Boolean,          // 是否叠加在基础立绘上
    blendMode: String          // 混合模式（opacity/add/multiply）
  },
  
  // 动态CG栈（支持多层叠加）
  cgStack: [
    { id: 'gallery_xxx', layer: 'background', opacity: 1.0 },
    { id: 'gallery_yyy', layer: 'character', opacity: 0.8 },
    { id: 'gallery_zzz', layer: 'overlay', opacity: 0.5 }
  ]
}
```

---

## 🔌 API接口设计

### 图库管理接口

```javascript
// 1. 添加CG到图库
POST /api/gallery/v2
{
  gameId: "game_xxx",
  characterId: "char_xxx",     // 可选，绑定角色
  name: "雪地战斗-拔剑",
  url: "https://...",
  type: "character_extended",
  triggerSystem: {
    mode: "prompt_similarity",
    conditions: {
      sceneKeywords: ["雪地", "战斗", "剑"],
      emotions: ["愤怒", "专注"],
      actions: ["拔剑", "攻击"],
      relationshipStates: ["敌对"],
      specialTags: ["战斗场景"]
    },
    priority: 800,
    probability: 0.9
  },
  display: {
    mode: "character_center",
    animation: { enter: "zoom", duration: 500 },
    zIndex: 10
  }
}

// 2. 智能匹配CG（核心接口）
POST /api/gallery/v2/match
{
  gameId: "game_xxx",
  characterId: "char_xxx",     // 指定角色（可选）
  context: {
    scene: "雪地里，她拔出长剑，眼神中充满愤怒",
    dialogue: "你背叛了我！",
    characterEmotion: "angry",
    relationshipState: { favor: 20, mood: "愤怒" },
    currentCG: "gallery_yyy"   // 当前CG，用于避免重复
  },
  options: {
    matchMode: "smart",         // smart/tag/prompt
    maxResults: 3,              // 返回最匹配的N个
    includeBaseEmotion: true    // 是否包含基础表情作为备选
  }
}

// 返回
{
  success: true,
  matches: [
    {
      id: "gallery_xxx",
      name: "雪地战斗-拔剑",
      url: "https://...",
      matchScore: 0.95,         // 匹配度
      matchReasons: [           // 匹配原因（给AI解释）
        "场景关键词匹配: 雪地",
        "情绪匹配: 愤怒",
        "动作匹配: 拔剑"
      ],
      display: { ... },
      isExtendedCG: true        // 标记是拓展CG还是基础表情
    }
  ],
  suggestedSwitch: true,        // 建议是否切换
  confidence: 0.92              // 整体置信度
}

// 3. 获取角色的CG库
GET /api/gallery/v2/character/:characterId
// 返回该角色的所有可用CG（基础8表情 + 图库拓展）

// 4. CG触发测试
POST /api/gallery/v2/test-trigger
{
  galleryId: "gallery_xxx",
  testScenes: [
    "雪地里，她拔出长剑",
    "室内，两人相拥而吻",
    "战场上，身受重伤"
  ]
}
// 返回每个场景的匹配度
```

---

## 🎮 前后端交互流程

### 场景1：AI对话中自动匹配并切换CG

```
用户输入: "我拔出剑，指向她"
         ↓
galgame_framework.js
├─ generateAIResponse()
│  ├─ 构建提示词（包含当前CG状态）
│  └─ 调用AI API
│      ↓
│  AI返回: "她眼神一冷，也拔出剑，雪花在她周围飞舞"
│      ↓
├─ autoSwitchCG(aiResponse)
│  ├─ 解析AI响应中的场景描述
│  ├─ POST /api/gallery/v2/match
│  │   {
│  │     characterId: "char_xxx",
│  │     context: {
│  │       scene: "她拔出剑，雪花飞舞",
│  │       emotion: "angry",
│  │       action: "拔剑"
│  │     }
│  │   }
│  │   ↓
│  │ 后端匹配算法
│  │ ├─ 1. 提取关键词：["拔剑", "雪花", "冷"]
│  │ ├─ 2. 匹配图库triggerSystem
│  │ ├─ 3. 计算matchScore
│  │ └─ 4. 返回最佳匹配："雪地战斗-拔剑"
│  │   ↓
│  ├─ 判断是否切换
│  │   └─ matchScore > 0.7 且 不是当前CG
│  ├─ switchCG(matchedCG)
│  │   ├─ 淡出当前CG
│  │   ├─ 加载新CG URL
│  │   ├─ 应用display.animation.enter
│  │   └─ 淡入新CG
│  └─ 更新characterCGState
│      └─ 记录当前CG到对话历史
↓
显示新CG + AI回复
```

### 场景2：特殊CG触发（R18/战斗等）

```
场景：与角色好感度达到80，选择"亲吻她"
         ↓
galgame_framework.js
├─ 检测到特殊动作关键词
├─ POST /api/gallery/v2/match
│   {
│     context: {
│       scene: "两人靠近，即将接吻",
│       relationshipState: { favor: 80, trust: 75 },
│       specialTags: ["亲密", "R18"]  // 需要用户设置开启
│     }
│   }
│   ↓
│ 后端检查constraints.prerequisites
│ ├─ minFavor: 80 ✓
│ ├─ specialTags包含"R18" ✓
│ └─ 冷却检查 ✓
│   ↓
│ 返回："接吻场景-温柔" CG
↓
切换CG并显示亲密场景
```

### 场景3：CG叠加效果（战斗特效）

```
场景：战斗中的特殊技能释放
         ↓
基础立绘：角色愤怒表情
    +
拓展CG：拔剑动作（半透叠加）
    +
特效层：剑气特效（overlay模式）
    ↓
三层叠加显示
```

---

## 🤖 AI提示词集成

### 给AI的CG系统提示词

```
【CG系统说明】
你拥有访问角色CG库的权限。在回复时，你可以：

1. **基础表情切换**
   - 8种默认情绪：calm/happy/angry/sad/shy/surprise/serious/hurt
   - 在回复开头标记：[emotion:happy]

2. **拓展CG调用**
   - 特殊场景CG：[cg:snow_battle_draw_sword]
   - 触发条件符合时自动建议切换

3. **CG叠加**
   - 基础表情 + 特效CG：[emotion:angry] + [cg_overlay:blood_effect]

【CG匹配规则】
- 战斗场景 → 优先匹配战斗类CG
- 亲密互动（好感>70）→ 可触发R18 CG（如用户开启）
- 特殊地点 → 匹配场景背景CG
- 情绪强烈时 → 优先匹配对应情绪CG

【当前CG状态】
角色：{characterName}
当前CG：{currentCGName}
上次切换：{timeSinceLastSwitch}s前（避免频繁切换）

请根据场景自然触发CG变化，不要过于频繁。
```

### AI返回格式

```
[cg_trigger:snow_battle]
她眼神一冷，长剑出鞘，雪花在她周围飞舞。

[cg_trigger:none]
只是普通对话，不触发CG

[cg_stack:base=angry,overlay=blood_effect]
受伤叠加特效
```

---

## 📁 文件架构

```
backend/
├── models/
│   └── gallery.js                 # V2 Gallery模型
├── routes/
│   ├── gallery.js                 # 基础CRUD
│   └── gallery-v2.js              # V2智能匹配API
├── services/
│   ├── cgMatcher.js               # CG匹配算法
│   ├── cgTriggerEngine.js         # 触发引擎
│   └── promptSimilarity.js        # 提示词语义相似度
└── utils/
    └── cgConstraintChecker.js     # 约束检查（好感度/冷却等）

public/js/
├── services/
│   └── cgManager.js               # 前端CG管理器
├── components/
│   └── cgSwitcher.js              # CG切换动画组件
└── core/
    └── cgStateMachine.js          # CG状态机

settings.html
└─ 图库管理V2界面（标签化编辑器）

galgame_framework.html
└─ CG系统集成（autoSwitchCG等）
```

---

## 🎨 Settings.html 图库管理界面（V2设计）

```
┌─────────────────────────────────────────────────────────────┐
│ 🖼️ 图库管理 V2.0                              [+ 添加CG]   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📂 分类筛选: [全部] [背景] [角色基础] [角色拓展] [场景事件] │
│                                                              │
│  🔍 提示词搜索: [____________________] [智能匹配测试]        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 关联角色: [林婉 ▼]  [x 清除关联]                      │   │
│  │                                                      │   │
│  │ CG名称: [雪地战斗-拔剑________________]              │   │
│  │                                                      │   │
│  │ 图片URL: [https://...______________] [📤上传]        │   │
│  │                                                      │   │
│  │ ┌────────────────────────────────────────────────┐  │   │
│  │ │ 🎯 触发条件配置                                  │  │   │
│  │ ├────────────────────────────────────────────────┤  │   │
│  │ │ 触发模式: [智能匹配 ▼]                           │  │   │
│  │ │                                                  │  │   │
│  │ │ 场景关键词: [雪地,战斗,剑____]                   │  │   │
│  │ │ 情绪标签:   [愤怒,专注____]                      │  │   │
│  │ │ 动作标签:   [拔剑,攻击____]                      │  │   │
│  │ │ 关系状态:   [敌对,竞争____]                      │  │   │
│  │ │ 特殊标记:   [☑️战斗 ☐R18 ☐血腥 ☐浪漫]           │  │   │
│  │ │                                                  │  │   │
│  │ │ 优先级: [800____] (0-1000)                       │  │   │
│  │ │ 触发概率: [90%___]                               │  │   │
│  │ └────────────────────────────────────────────────┘  │   │
│  │                                                      │   │
│  │ ┌────────────────────────────────────────────────┐  │   │
│  │ │ 🎬 显示设置                                      │  │   │
│  │ ├────────────────────────────────────────────────┤  │   │
│  │ │ 显示位置: [角色中央 ▼]                           │  │   │
│  │ │ 进入动画: [Zoom放大 ▼] 持续时间: [500ms]         │  │   │
│  │ │ 图层顺序: [10____]                               │  │   │
│  │ │ [☑️ 可与基础立绘叠加显示]                        │  │   │
│  │ └────────────────────────────────────────────────┘  │   │
│  │                                                      │   │
│  │ ┌────────────────────────────────────────────────┐  │   │
│  │ │ 🔒 约束条件                                      │  │   │
│  │ ├────────────────────────────────────────────────┤  │   │
│  │ │ 好感度范围: [0] - [100]                          │  │   │
│  │ │ 冷却时间: [30] 秒 [☑️ 全局冷却]                  │  │   │
│  │ │ 禁止标签: [安全区,日常____]                      │  │   │
│  │ └────────────────────────────────────────────────┘  │   │
│  │                                                      │   │
│  │ [测试匹配效果] [💾 保存CG]                           │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  📊 已配置CG列表:                                            │
│  ┌─────────────┬───────────┬────────┬──────────┬─────────┐ │
│  │ 预览        │ 名称      │ 关联角色│ 触发条件 │ 操作    │ │
│  ├─────────────┼───────────┼────────┼──────────┼─────────┤ │
│  │ [🖼️]        │ 雪地拔剑  │ 林婉   │ 战斗场景 │ [编辑]  │ │
│  │ [🖼️]        │ 温泉亲密  │ 林婉   │ R18/好感 │ [编辑]  │ │
│  └─────────────┴───────────┴────────┴──────────┴─────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔮 高级功能（可选）

### 1. AI自动标签生成
上传CG图片后，AI自动分析并建议标签：
- 场景分析："检测到雪地场景、战斗姿态"
- 情绪识别："角色表情为愤怒/专注"
- 动作检测："检测到拔剑动作"

### 2. CG Variation系统
同一CG的多张变体：
```javascript
{
  name: "雪地战斗-拔剑",
  variations: [
    { id: "v1", url: "...", weight: 0.7 },  // 默认版本
    { id: "v2", url: "...", weight: 0.3 }   // 稀有版本（带特效）
  ],
  randomize: true  // 随机选择变体
}
```

### 3. CG剧情锁
某些CG只在特定剧情节点后解锁：
```javascript
constraints: {
  storyProgress: {
    chapter: 3,           // 第3章后解锁
    scene: "告白事件",    // 或完成特定场景
    flags: ["flag_xxx"]   // 或拥有特定flag
  }
}
```

---

## ✅ 实现优先级

| 优先级 | 功能 | 工作量 |
|-------|------|--------|
| P0 | 后端Gallery V2模型 + 基础CRUD API | 2h |
| P0 | 智能匹配算法（关键词+权重） | 2h |
| P0 | 前端CG自动切换集成 | 2h |
| P1 | Settings图库管理界面V2 | 3h |
| P1 | 约束检查（好感度/冷却） | 1h |
| P2 | 提示词语义相似度匹配 | 2h |
| P2 | CG叠加显示系统 | 2h |
| P3 | AI自动标签生成 | 2h |
| P3 | Variation随机系统 | 1h |

**总计：约15-17小时开发时间**

需要我优先实现哪个部分？建议先做 **P0基础框架**，让系统能跑起来，再逐步添加高级功能。