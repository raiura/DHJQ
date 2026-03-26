# 大荒九丘工程架构完整分析

## 一、整体架构概览

```
┌─────────────────────────────────────────────────────────────────────┐
│                         大荒九丘 GalGame 平台                        │
├─────────────────────────────────────────────────────────────────────┤
│  前端 (Static HTML/JS)          ◄────HTTP────►     后端 (Node.js)   │
│  端口: 80 (Live Server)                             端口: 3000       │
│                                                                      │
│  ┌─────────────────┐                    ┌─────────────────┐        │
│  │ 纯前端架构      │                    │ Express +       │        │
│  │ - HTML/CSS/JS   │◄──────────────────►│ MongoDB/Memory  │        │
│  │ - LocalStorage  │    RESTful API     │ - JWT认证       │        │
│  │ - 模块化加载    │                    │ - 双模式存储    │        │
│  └─────────────────┘                    └─────────────────┘        │
└─────────────────────────────────────────────────────────────────────┘
```

## 二、后端架构详解 (backend/)

### 2.1 核心文件
```
backend/
├── server.js              # Express 服务器入口
├── package.json           # 依赖: express, mongoose, jsonwebtoken等
├── config/index.js        # 配置管理 (数据库、JWT密钥等)
├── .env                   # 环境变量
│
├── routes/                # 路由层 (10个模块)
│   ├── auth.js            # 认证路由 (/api/auth)
│   ├── games.js           # 游戏路由 (/api/games)
│   ├── characters.js      # 角色路由 (/api/characters)
│   ├── worldbook.js       # 世界书路由 (/api/worldbook)
│   ├── dialogue.js        # 对话路由 (/api/dialogue)
│   ├── memories.js        # 记忆路由 (/api/memories)
│   ├── gallery.js         # 图库路由 (/api/gallery)
│   ├── settings.js        # 设置路由 (/api/settings)
│   ├── userCharacters.js  # 用户角色 (/api/user-characters)
│   └── experiences.js     # 经历路由 (/api/experiences)
│
├── models/                # 数据模型层
│   ├── user.js            # 用户模型
│   ├── game.js            # 游戏模型
│   ├── character.js       # 角色模型
│   ├── worldbook.js       # 世界书模型
│   ├── memory.js          # 记忆模型
│   ├── dialogue.js        # 对话模型
│   └── ...
│
├── middleware/            # 中间件
│   ├── auth.js            # JWT认证 (optionalAuth/verifyToken)
│   ├── errorHandler.js    # 错误处理
│   └── validator.js       # 请求验证
│
├── services/              # 业务逻辑层
│   └── (预留扩展)
│
└── utils/                 # 工具函数
    ├── logger.js          # 日志系统
    └── memoryStore.js     # 内存存储 (MongoDB失败时使用)
```

### 2.2 双模式存储设计
```
┌─────────────────────────────────────────────┐
│              存储层                          │
├──────────────────┬──────────────────────────┤
│   MongoDB        │      Memory Store        │
│   (生产环境)     │      (开发/离线)         │
├──────────────────┼──────────────────────────┤
│ • 持久化存储     │ • 内存存储               │
│ • 自动重连       │ • 服务器重启丢失         │
│ • 复杂查询       │ • 适合开发测试           │
└──────────────────┴──────────────────────────┘
          │                    │
          └────────┬───────────┘
                   ▼
            ┌─────────────┐
            │  models层   │
            │  自动切换   │
            └─────────────┘
```

### 2.3 路由认证级别
```
1. 完全公开 (无需认证)
   └── /api/auth/*

2. 混合路由 (optionalAuth - 内部判断)
   ├── /api/games/*
   ├── /api/characters/*
   ├── /api/worldbook/*
   ├── /api/gallery/*
   └── /api/settings/*

3. 需要认证 (verifyToken - 强制)
   ├── /api/dialogue/*
   ├── /api/memories/*
   ├── /api/user-characters/*
   └── /api/experiences/*
```

## 三、前端架构详解

### 3.1 页面结构
```
┌─────────────────────────────────────────────────────────────────────┐
│                           前端页面                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  核心页面                                                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │
│  │ index.html   │ │ world-guide  │ │ settings     │ │ game.html  │ │
│  │ 首页/入口    │ │ 世界指南     │ │ 设置中心     │ │ 游戏主界面 │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘ │
│                                                                      │
│  辅助页面                                                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │
│  │ login.html   │ │ game-editor  │ │ user-char    │ │ user-sett  │ │
│  │ 登录注册     │ │ 章节编辑器   │ │ 用户角色     │ │ 用户设置   │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 前端模块组织 (public/js/)
```
public/js/
│
├── core/                          # 核心引擎
│   ├── worldbookEngine.js         # 世界书匹配引擎 (SillyTavern风格)
│   ├── promptBuilder.js           # 提示词构建器 (分层架构)
│   └── (可扩展: stateManager.js, eventBus.js等)
│
├── services/                      # 服务层
│   ├── worldbookManager.js        # 世界书管理
│   └── (可扩展: characterService.js, dialogueService.js等)
│
├── game/                          # 游戏页面逻辑
│   └── game-main.js               # galgame_framework.html 主逻辑
│
└── settings/                      # 设置页面逻辑
    └── settings-main.js           # settings.html 主逻辑
```

### 3.3 世界书系统 2.0 (已重构)
```
┌─────────────────────────────────────────────────────────────────────┐
│                          世界书系统 2.0                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  WorldbookEngine (core/)                                            │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ • detectTriggers(text, context) - 关键词匹配                     ││
│  │ • buildInjection(entries) - 按位置分组                          ││
│  │ • LRU缓存优化                                                   ││
│  │ • 5种匹配类型: contains/exact/prefix/suffix/regex               ││
│  └─────────────────────────────────────────────────────────────────┘│
│                              │                                       │
│  WorldbookManager (services/) │                                       │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ • Global Worldbook (作者设定)                                   ││
│  │ • User Worldbook (玩家自定义)                                   ││
│  │ • localStorage 持久化                                           ││
│  │ • 存档隔离                                                      ││
│  └─────────────────────────────────────────────────────────────────┘│
│                              │                                       │
│                              ▼                                       │
│  PromptBuilder (core/)                                              │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ 分层提示词架构:                                                  ││
│  │ System → Character → Worldbook → User → Example → Scenario      ││
│  │ • Token预算管理                                                 ││
│  │ • 变量替换 {{user}}/{{char}}/{{world}}/{{time}}                 ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## 四、数据流分析

### 4.1 对话完整流程
```
用户输入
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 前端 (galgame_framework.html)                                        │
│                                                                      │
│  1. worldbookManager.detectTriggers(userMessage)                     │
│     └── 匹配关键词 → 触发世界书条目                                  │
│                                                                      │
│  2. promptBuilder.build()                                            │
│     └── 合并: System + Character + Worldbook + ...                  │
│                                                                      │
│  3. fetch('/api/dialogue', {...})                                    │
│     └── 发送: message + systemPrompt + worldbookEntries             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
    │
    ▼
后端 (dialogue.js)
    │
    ├── 1. 验证认证 (JWT)
    ├── 2. 调用 AI API (OpenAI/Claude等)
    ├── 3. 解析 AI 响应
    ├── 4. 触发经历生成 (可选)
    └── 5. 返回结构化数据
    │
    ▼
前端接收响应
    │
    ├── 1. 解析内容 (对话/旁白/场景/内心独白)
    ├── 2. 更新对话显示
    ├── 3. 保存到记忆系统
    └── 4. 触发情感系统更新
```

### 4.2 存档系统
```
┌─────────────────────────────────────────────────────────────────────┐
│                         双存档系统                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  存档类型 1: 世界级 (World Save)                                     │
│  ├── 存储位置: backend/data/memory_store.json                        │
│  ├── 内容: 游戏设置、角色、世界书                                    │
│  └── 管理: settings.html                                             │
│                                                                      │
│  存档类型 2: 用户级 (User Save Slot)                                 │
│  ├── 存储位置: localStorage (browser)                                │
│  ├── 内容: 对话历史、个人记忆、用户角色                              │
│  └── 管理: galgame_framework.html                                    │
│                                                                      │
│  数据同步:                                                           │
│  settings.html ──► backend API ──► galgame_framework.html           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## 五、关键设计对比

### 5.1 world-guide.html vs settings.html

| 特性 | world-guide.html | settings.html |
|------|------------------|---------------|
| **定位** | 玩家视角的世界指南 | 作者视角的设置中心 |
| **设计风格** | 精美卡片、地图可视化 | 简洁列表、表单编辑 |
| **角色展示** | 大卡片、图文混排 | 小卡片、列表布局 |
| **地理展示** | 九宫格地图 | 无 (需整合) |
| **世界观** | 完整叙事展示 | 编辑表单 |
| **交互** | 浏览为主 | 编辑为主 |

### 5.2 当前存在的问题

1. **设计割裂**: world-guide.html 设计精美，但 settings.html 相对简陋
2. **数据同步**: 两个页面展示相同数据，但渲染方式不同
3. **功能重复**: 角色/世界书在两个页面都有，但体验不一致
4. **前端路由**: 纯HTML页面，无前端路由，页面跳转体验不佳

## 六、优化建议

### 6.1 短期优化 (已完成)
- ✅ 世界书系统 2.0 重构
- ✅ 提示词分层架构
- ✅ 角色显示修复

### 6.2 中期优化 (推荐)
1. **整合 world-guide 设计到 settings**
   - 角色展示采用 world-guide 卡片样式
   - 添加地理可视化组件
   - 统一配色和视觉风格

2. **数据层统一**
   - 创建共享的 CharacterService
   - 统一的世界书数据源

3. **组件化**
   - 提取 CharacterCard 组件
   - 提取 WorldMap 组件
   - 提取 WorldbookEntry 组件

### 6.3 长期优化 (可选)
1. **前端框架化**
   - 迁移到 Vue/React
   - 引入前端路由 (Vue Router/React Router)
   - 状态管理 (Pinia/Redux)

2. **PWA 支持**
   - Service Worker
   - 离线访问

3. **实时协作**
   - WebSocket 支持
   - 多用户实时编辑

## 七、文件清单

### 7.1 核心文件 (按重要性排序)
```
1. backend/server.js           # 后端入口
2. galgame_framework.html      # 游戏主界面
3. settings.html               # 设置中心
4. world-guide.html            # 世界指南
5. public/js/core/worldbookEngine.js    # 世界书引擎
6. public/js/core/promptBuilder.js      # 提示词构建器
7. public/js/services/worldbookManager.js # 世界书管理
8. backend/routes/dialogue.js  # 对话路由
9. backend/models/game.js      # 游戏模型
10. public/js/game/game-main.js # 游戏逻辑
```

### 7.2 配置文件
```
backend/.env                   # 环境变量
backend/config/index.js        # 配置中心
package.json                   # 前端依赖
backend/package.json           # 后端依赖
```
