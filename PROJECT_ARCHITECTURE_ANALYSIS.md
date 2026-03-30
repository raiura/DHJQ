# 风月 (FengYue) 项目架构分析报告

> AI驱动的GAL游戏框架 / 视觉小说平台  
> 生成日期: 2026-03-19

---

## 📋 目录

1. [项目概览](#项目概览)
2. [技术栈](#技术栈)
3. [架构总览](#架构总览)
4. [前端架构](#前端架构)
5. [后端架构](#后端架构)
6. [核心功能模块](#核心功能模块)
7. [优势分析](#优势分析)
8. [劣势分析](#劣势分析)
9. [冲突点与问题](#冲突点与问题)
10. [技术债务](#技术债务)
11. [改进建议](#改进建议)

---

## 项目概览

**风月** 是一个AI驱动的视觉小说/GAL游戏平台，核心特色包括：
- AI对话生成（支持多模型）
- 角色关系与情感系统
- SillyTavern风格的世界书知识库
- 三层记忆架构（短期→长期→核心）
- 多存档管理

**项目规模**:  
- 前端: 19个HTML入口 + 38个JS文件  
- 后端: 11个路由 + 13个模型 + 6个服务  
- 代码量: ~15,000行JavaScript

---

## 技术栈

### 前端
| 技术 | 用途 | 评价 |
|------|------|------|
| 纯HTML/CSS/JS | 核心框架 | ⭐⭐⭐ 简单但缺乏现代化工具 |
| LocalStorage | 本地存储 | ⭐⭐⭐ 适合简单数据，容量有限 |
| 自研Loader | 模块加载 | ⭐⭐⭐⭐ 轻量级依赖管理 |
| Fetch API | HTTP请求 | ⭐⭐⭐⭐ 标准API |

### 后端
| 技术 | 用途 | 评价 |
|------|------|------|
| Node.js + Express | Web服务 | ⭐⭐⭐⭐ 成熟稳定 |
| MongoDB + Mongoose | 数据库 | ⭐⭐⭐⭐ 文档型适合游戏数据 |
| JWT | 认证 | ⭐⭐⭐⭐ 标准方案 |
| Joi | 参数校验 | ⭐⭐⭐⭐ 声明式校验 |

---

## 架构总览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           风月 GalGame 平台                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────┐      ┌─────────────────────────────┐   │
│  │         前端 (Browser)          │      │      后端 (Node.js)         │   │
│  │  ┌─────────────────────────┐   │      │  ┌─────────────────────┐   │   │
│  │  │   HTML 入口 (19个)      │   │      │  │   Express Server    │   │   │
│  │  │   - settings.html       │   │◄────►│  │   - 路由 (11)       │   │   │
│  │  │   - galgame_framework   │   │      │  │   - 中间件 (5)      │   │   │
│  │  │   - index.html          │   │      │  │   - 认证 (JWT)      │   │   │
│  │  └─────────────────────────┘   │      │  └─────────────────────┘   │   │
│  │                                │      │                            │   │
│  │  ┌─────────────────────────┐   │      │  ┌─────────────────────┐   │   │
│  │  │   JavaScript 模块       │   │      │  │   数据层            │   │   │
│  │  │   - core/ (15)          │   │      │  │   - MongoDB模型(13) │   │   │
│  │  │   - services/ (8)       │   │      │  │   - 内存存储(降级)  │   │   │
│  │  │   - components/ (5)     │   │      │  │   - 双模式自动切换  │   │   │
│  │  │   - game/ (3)           │   │      │  └─────────────────────┘   │   │
│  │  │   - settings/ (3)       │   │      │                            │   │
│  │  └─────────────────────────┘   │      │  ┌─────────────────────┐   │   │
│  │                                │      │  │   业务服务 (6)      │   │   │
│  │  ┌─────────────────────────┐   │      │  │   - MemoryService   │   │   │
│  │  │   存储策略              │   │      │  │   - DialogueService │   │   │
│  │  │   - LocalStorage        │   │      │  │   - WorldbookSvc    │   │   │
│  │  │   - API + 降级方案      │   │      │  │   - ExperienceSvc   │   │   │
│  │  └─────────────────────────┘   │      │  └─────────────────────┘   │   │
│  └─────────────────────────────────┘      └─────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 前端架构

### 目录结构

```
public/
├── js/
│   ├── core/              # 核心引擎 (15文件)
│   │   ├── api.js         # API封装
│   │   ├── auth.js        # 认证
│   │   ├── promptBuilder.js    # 提示词构建
│   │   ├── worldbookEngine.js  # 世界书引擎
│   │   ├── worldBook.js        # 世界书类 (v2.0)
│   │   ├── worldbookLibrary.js # 世界书库 (v2.0)
│   │   └── ...
│   │
│   ├── services/          # 业务服务 (8文件)
│   │   ├── memoryService.js      # 记忆服务
│   │   ├── worldbookManager.js   # 世界书管理
│   │   ├── characterService.js
│   │   └── ...
│   │
│   ├── components/        # UI组件 (5文件)
│   │   └── worldbookManagerUI.js # 世界书管理UI
│   │
│   ├── game/              # 游戏逻辑 (3文件)
│   │   └── game-main.js   # 主游戏逻辑 (~3200行)
│   │
│   ├── settings/          # 设置页 (3文件)
│   │   └── settings-main.js      # 设置主逻辑 (~3100行)
│   │
│   └── loader.js          # 模块加载器
│
└── css/                   # 样式文件
    ├── settings.css
    ├── settings-world-guide.css
    └── settings-character-editor.css
```

### 前端特点

| 特性 | 状态 | 说明 |
|------|------|------|
| 模块系统 | ✅ | 自研Loader支持依赖管理 |
| 组件化 | ⚠️ | 部分组件化，大文件仍需拆分 |
| 类型安全 | ❌ | 无TypeScript |
| 测试 | ❌ | 无单元测试 |
| 构建工具 | ❌ | 无打包工具，原生开发 |

---

## 后端架构

### 目录结构

```
backend/
├── server.js              # 入口 (~200行)
├── package.json           # 依赖管理
├── config/                # 配置
│   └── index.js
├── middleware/            # 中间件 (5文件)
│   ├── auth.js            # JWT认证
│   ├── errorHandler.js    # 错误处理
│   └── ...
├── routes/                # 路由 (11文件)
│   ├── auth.js            # 认证路由
│   ├── games.js           # 游戏路由
│   ├── memories.js        # 记忆路由
│   ├── worldbook.js       # 世界书路由
│   └── ...
├── models/                # 模型 (13文件)
│   ├── index.js           # 模型统一入口+双模式
│   ├── memory.js          # 记忆模型
│   ├── worldbook.js       # 世界书模型
│   ├── character.js       # 角色模型
│   └── ...
├── services/              # 业务服务 (6文件)
│   ├── memoryService.js   # 记忆服务 (~415行)
│   ├── dialogueService.js # 对话服务
│   └── ...
└── utils/                 # 工具
    ├── memoryStore.js     # 内存存储
    ├── logger.js          # 日志
    └── response.js        # 响应封装
```

### 后端特点

| 特性 | 状态 | 说明 |
|------|------|------|
| 双模式存储 | ✅ | MongoDB/内存自动切换 |
| RESTful API | ✅ | 标准REST设计 |
| JWT认证 | ✅ | Token-based认证 |
| 参数校验 | ✅ | Joi验证 |
| 日志系统 | ✅ | 分级日志 |
| 错误处理 | ✅ | 统一错误处理 |

---

## 核心功能模块

### 1. 世界书系统 (Worldbook) ⭐⭐⭐⭐⭐

**架构版本**: 2.0 (SillyTavern风格)

```
┌──────────────────────────────────────────────────────────┐
│                   WorldbookLibrary                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  WorldBook 1 │  │  WorldBook 2 │  │  WorldBook 3 │   │
│  │  (地理设定)   │  │  (人物设定)   │  │  (历史事件)   │   │
│  │  ✓ 激活      │  │  ✓ 激活      │  │    未激活     │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                           │
│  WorldbookEngine (触发检测)                               │
│  ├─ 5种匹配类型: contains/exact/prefix/suffix/regex      │
│  ├─ 优先级排序 (0-1000)                                   │
│  └─ LRU缓存                                               │
└──────────────────────────────────────────────────────────┘
```

**核心文件**:
- `public/js/core/worldbookEngine.js` - 匹配引擎
- `public/js/core/worldBook.js` - 世界书类
- `public/js/core/worldbookLibrary.js` - 图书馆管理
- `public/js/components/worldbookManagerUI.js` - UI组件

**评价**: 架构完善，支持多书本同时激活，SillyTavern兼容。

---

### 2. 记忆系统 (Memory) ⭐⭐⭐⭐⭐

**三层记忆架构**:

```
短期记忆 (short) ──► 长期记忆 (long) ──► 核心记忆 (core) ──► 世界书存档
     │                    │                    │
  6条触发             12条触发              手动固化
  自动合并            状态收敛              永久保存
```

**合并逻辑**:
1. **短期→长期**: 6条短期记忆自动合并为1条长期记忆（去重+时序）
2. **长期→核心**: 12条长期记忆或包含高重要性(≥80)内容时合并
3. **固化存档**: 手动触发，核心记忆写入世界书

**核心文件**:
- `backend/services/memoryService.js` - 后端服务
- `backend/models/memory.js` - 数据模型
- `backend/routes/memories.js` - API路由
- `public/js/services/memoryService.js` - 前端服务

**评价**: 创新的三层架构，模拟人类记忆衰减机制。

---

### 3. 角色系统 (Character) ⭐⭐⭐⭐

**数据版本**: V2 (完整版)

```typescript
interface CharacterV2 {
  // 基础信息
  name: string;
  color: string;
  avatar: string;
  
  // 角色设定
  appearance: string;      // 外貌
  personality: string;     // 性格
  background: string;      // 背景
  physique: string;        // 体质
  special: string;         // 特殊设定
  
  // 情感状态
  favor: number;           // 好感度 (0-100)
  trust: number;           // 信任度 (0-100)
  mood: string;            // 当前心情
  
  // 统计
  stats: {
    encounters: number;
    dialogueTurns: number;
  }
}
```

**评价**: 字段完整，支持8种情绪CG，向后兼容V1。

---

### 4. AI对话系统 ⭐⭐⭐⭐

**提示词架构** (PromptBuilder):

```
System Layer      # 系统提示词
       ↓
Character Layer   # 角色定义
       ↓
Worldbook Layer   # 世界书注入 (动态)
       ↓
User Layer        # 用户自定义
       ↓
Example Layer     # 示例对话
       ↓
Scenario Layer    # 当前场景
```

**变量替换**:
- `{{user}}` - 用户名
- `{{char}}` - 角色名
- `{{world}}` - 世界名
- `{{time}}` - 当前时间

---

## 优势分析

### ✅ 架构设计优势

| # | 优势 | 说明 |
|---|------|------|
| 1 | **双模式存储** | MongoDB失败时自动切换到内存存储，保证开发体验和可用性 |
| 2 | **三层记忆架构** | 短期/长期/核心的自动合并，模拟真实记忆机制 |
| 3 | **世界书系统** | SillyTavern兼容，支持多书本同时激活 |
| 4 | **向后兼容** | V1到V2的完整迁移机制，数据不丢失 |
| 5 | **模块化设计** | 自研Loader实现依赖管理，代码组织清晰 |
| 6 | **降级策略** | API失败时自动降级到LocalStorage |
| 7 | **文档完善** | 20+架构和设计文档 |

### ✅ 代码质量优势

| # | 优势 | 说明 |
|---|------|------|
| 1 | **统一错误处理** | 后端统一错误处理和响应格式 |
| 2 | **日志分级** | info/warn/error/debug 分级日志 |
| 3 | **参数校验** | Joi参数校验，防御式编程 |
| 4 | **注释完整** | 关键函数和类都有JSDoc注释 |
| 5 | **命名规范** | 驼峰命名，语义清晰 |

---

## 劣势分析

### ⚠️ 架构设计劣势

| # | 劣势 | 影响 | 建议 |
|---|------|------|------|
| 1 | **单HTML文件过大** | `galgame_framework.html` 232KB | 拆分为模板片段 |
| 2 | **前端无框架** | 纯原生开发，组件复用受限 | 引入Vue/React |
| 3 | **缺乏类型系统** | 无TypeScript，类型安全靠约定 | 迁移到TS |
| 4 | **无构建工具** | 无打包优化，代码未压缩 | 添加Vite/Webpack |
| 5 | **缺少测试** | 无单元测试，回归成本高 | 添加Jest/Vitest |
| 6 | **存储冗余** | LocalStorage + MongoDB双写 | 统一数据流 |

### ⚠️ 代码质量问题

| # | 问题 | 位置 | 影响 |
|---|------|------|------|
| 1 | **文件过大** | `game-main.js` 3200+行 | 维护困难 |
| 2 | **重复代码** | 多个服务中相似API调用 | DRY原则 |
| 3 | **全局变量** | 大量`window.xxx`暴露 | 命名空间污染 |
| 4 | **回调地狱** | 部分老旧代码 | 可读性差 |

---

## 冲突点与问题

### 🔴 严重冲突

#### 1. 世界书系统版本冲突

**问题描述**: 新旧世界书系统并存，数据模型不一致

```
旧系统: worldbookManager.js
   ├── globalWorldbook: { entries: [], groups: {} }
   └── userWorldbooks: Map<saveId, { entries: [] }>

新系统: worldbookLibrary.js
   ├── books: Map<bookId, WorldBook>
   └── activeBookIds: Set<bookId>
```

**冲突点**:
- 旧系统使用单本世界书，新系统支持多本
- 数据存储位置不同（`wb_global_*` vs `wblibrary_*`）
- 两套API同时存在，容易混淆

**解决方案**: 已完成数据迁移，旧系统保留作降级方案。

---

#### 2. 存储策略冲突

**问题描述**: 前后端存储策略不统一

```
前端: LocalStorage (主要) ──► API (辅助)
后端: MongoDB (主要) ──► Memory Store (降级)
```

**冲突点**:
- 数据同步问题：前端LocalStorage与后端数据可能不一致
- 数据丢失风险：LocalStorage容量限制(5MB)
- 多端同步困难：无法实现跨设备数据同步

**建议**: 统一以API为主，LocalStorage仅作离线缓存。

---

#### 3. 角色数据格式冲突

**问题描述**: V1和V2角色格式并存

```javascript
// V1 格式 (旧)
{ name, color, prompt, avatar }

// V2 格式 (新)
{ name, color, avatar, appearance, personality, 
  background, physique, special, favor, trust, mood }
```

**冲突点**:
- 部分页面仍使用V1字段
- 迁移逻辑复杂
- 历史数据兼容问题

---

### 🟡 中等问题

#### 4. 模块依赖混乱

**问题描述**: 模块加载顺序敏感，循环依赖风险

```
settings.html 加载顺序:
1. loader.js
2. worldbookEngine.js
3. worldBook.js
4. worldbookLibrary.js
5. worldbookManager.js  (旧)
6. memoryService.js      (新)
7. worldbookManagerUI.js
8. settings-main.js      (依赖以上全部)
```

**问题**: 顺序错误会导致`ReferenceError`。

---

#### 5. API路由版本管理缺失

**问题描述**: 部分路由有V2版本，但无统一版本策略

```
/api/gallery       # 旧版
/api/gallery/v2    # V2版
/api/characters    # 混合
```

**建议**: 统一使用 `/api/v1/xxx`, `/api/v2/xxx` 前缀。

---

## 技术债务

### 债务清单

| 优先级 | 债务项 | 严重程度 | 预估工作量 | 解决方案 |
|--------|--------|----------|------------|----------|
| 🔴 高 | 单HTML文件过大 | 维护困难 | 1周 | 组件化拆分 |
| 🔴 高 | 缺少单元测试 | 回归成本高 | 2周 | 添加Jest测试 |
| 🟡 中 | 重复CSS代码 | 样式不一致 | 3天 | 使用CSS预处理器 |
| 🟡 中 | 缺少API文档 | 协作困难 | 1周 | 添加Swagger |
| 🟢 低 | 无前端构建工具 | 性能损失 | 1周 | 添加Vite |
| 🟢 低 | 未使用TypeScript | 类型风险 | 1月 | 逐步迁移TS |

---

## 改进建议

### 短期 (1-2周)

1. **拆分大文件**
   - 将 `game-main.js` 拆分为模块
   - 将 `settings.html` 提取公共组件

2. **统一存储策略**
   - 明确API为主，LocalStorage为辅
   - 添加数据同步机制

3. **修复已知Bug**
   - 世界书版本冲突
   - 模块加载顺序问题

### 中期 (1-2月)

1. **引入前端框架**
   - 迁移到 Vue 3 或 React
   - 组件化重构UI

2. **添加类型安全**
   - 引入 TypeScript
   - 定义数据接口

3. **完善测试**
   - 单元测试覆盖核心逻辑
   - E2E测试覆盖主流程

4. **API文档化**
   - 添加 Swagger/OpenAPI
   - 自动生成文档

### 长期 (3月+)

1. **架构升级**
   - 考虑微服务架构
   - 实时协作 (WebSocket)

2. **性能优化**
   - 前端代码分割
   - 服务端渲染 (SSR)

3. **DevOps**
   - CI/CD流水线
   - 自动化部署

---

## 总结

### 整体评分: ⭐⭐⭐⭐ (4/5)

**优势**:
- ✅ 双模式存储设计优秀
- ✅ 三层记忆架构创新
- ✅ 世界书系统完善
- ✅ 向后兼容考虑周全
- ✅ 文档完善

**劣势**:
- ⚠️ 前端技术栈陈旧
- ⚠️ 代码量过大，需拆分
- ⚠️ 缺少测试覆盖
- ⚠️ 存储策略不统一

**建议优先级**:
1. 🔴 拆分大文件，提升可维护性
2. 🔴 添加单元测试
3. 🟡 引入前端框架
4. 🟡 迁移到TypeScript
5. 🟢 微服务架构改造

---

*报告生成时间: 2026-03-19*  
*分析工具: Kimi Code CLI + 人工审核*
