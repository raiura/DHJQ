# 大荒九丘 - AI互动小说平台 架构文档

## 1. 项目概览

大荒九丘是一个基于Web的AI互动小说平台，允许用户创建、分享和体验互动小说。平台提供了完整的游戏管理、角色管理、世界书管理、对话系统等功能，支持用户创建自定义的游戏世界和角色。

### 核心功能
- 用户认证与授权
- 游戏管理（创建、编辑、发布、删除）
- 角色管理（创建、编辑、配置）
- 世界书管理（世界设定、条目管理）
- 对话系统（AI对话、情感系统）
- 画廊系统（CG管理、触发系统）
- 体验系统（记忆、经历）

## 2. 技术栈

### 2.1 前端技术
- **HTML5/CSS3/JavaScript**: 基础前端技术
- **原生JavaScript**: 客户端逻辑
- **CSS3**: 响应式布局和样式
- **localStorage**: 客户端数据存储

### 2.2 后端技术
- **Node.js**: 运行环境
- **Express.js**: Web框架
- **MongoDB**: 数据库（可选）
- **内存存储**: 轻量级数据存储（默认）
- **JWT**: 认证令牌
- **bcryptjs**: 密码加密
- **cors**: 跨域支持
- **dotenv**: 环境变量管理
- **joi**: 数据验证

## 3. 系统架构

### 3.1 架构图

```
┌─────────────────────┐
│     前端应用        │
├─────────────────────┤
│  HTML/CSS/JavaScript │
│  - 游戏界面         │
│  - 管理界面         │
│  - 用户界面         │
└────────────┬────────┘
             │ API调用
┌────────────▼────────┐
│     后端服务        │
├─────────────────────┤
│  Express.js         │
│  - 路由管理         │
│  - 中间件           │
│  - 业务逻辑         │
└────────────┬────────┘
             │ 数据存储
┌────────────▼────────┐
│     数据层          │
├─────────────────────┤
│  - MongoDB (可选)   │
│  - 内存存储 (默认)   │
└─────────────────────┘
```

### 3.2 模块划分

#### 前端模块
- **核心模块** (`public/js/core/`): API调用、认证、工具函数
- **游戏模块** (`public/js/game/`): 游戏运行时、对话系统、情感系统
- **设置模块** (`public/js/settings/`): 游戏编辑、角色编辑、世界书管理
- **服务模块** (`public/js/services/`): 存储服务、对话服务、记忆服务
- **组件模块** (`public/js/components/`): 角色卡片、模态框、提示框

#### 后端模块
- **路由模块** (`backend/routes/`): API路由定义
- **模型模块** (`backend/models/`): 数据模型定义
- **中间件** (`backend/middleware/`): 认证、错误处理、验证
- **服务模块** (`backend/services/`): 对话服务、体验服务、记忆服务
- **工具模块** (`backend/utils/`): 响应工具、日志工具、内存存储
- **配置模块** (`backend/config/`): 系统配置

## 4. 核心功能模块

### 4.1 用户认证系统
- **注册/登录**：用户注册和登录功能
- **JWT认证**：基于JSON Web Token的认证机制
- **权限控制**：基于角色的权限管理
- **密码加密**：使用bcryptjs进行密码加密

### 4.2 游戏管理系统
- **游戏创建**：创建新的游戏世界
- **游戏编辑**：编辑游戏的基本信息、世界设定
- **游戏发布**：将游戏从草稿状态发布为公开状态
- **游戏列表**：获取游戏列表，支持分页、搜索、筛选
- **游戏详情**：获取游戏的详细信息

### 4.3 角色管理系统
- **角色创建**：创建游戏角色
- **角色编辑**：编辑角色的基本信息、对话提示
- **角色管理**：管理游戏中的角色

### 4.4 世界书系统
- **世界设定**：管理游戏世界的设定信息
- **条目管理**：创建和管理世界书条目
- **关键词匹配**：基于关键词的世界书条目匹配

### 4.5 对话系统
- **AI对话**：与角色进行AI对话
- **情感系统**：角色情感状态管理
- **记忆系统**：对话记忆管理

### 4.6 画廊系统
- **CG管理**：管理游戏中的CG图片
- **触发系统**：基于场景、情感、动作的CG触发
- **显示系统**：CG的显示方式和动画效果

### 4.7 体验系统
- **记忆管理**：管理用户的游戏记忆
- **经历系统**：管理用户的游戏经历
- **触发引擎**：基于记忆和经历的事件触发

## 5. 数据流

### 5.1 用户认证流程
1. 用户提交登录信息
2. 后端验证用户名和密码
3. 生成JWT令牌
4. 前端存储令牌到localStorage
5. 后续请求携带令牌进行认证

### 5.2 游戏创建流程
1. 用户填写游戏信息
2. 前端发送创建请求
3. 后端验证数据
4. 创建游戏记录
5. 为游戏创建默认角色
6. 返回游戏信息

### 5.3 对话流程
1. 用户发送对话内容
2. 前端处理并发送到后端
3. 后端处理对话，生成回复
4. 更新角色情感状态
5. 存储对话记忆
6. 返回对话结果和更新的状态

### 5.4 世界书匹配流程
1. 对话中提取关键词
2. 匹配世界书条目
3. 将匹配的条目信息添加到对话上下文
4. 生成更符合世界设定的回复

## 6. 数据模型

### 6.1 用户模型 (`User`)
- `_id`: 用户ID
- `username`: 用户名
- `password`: 密码（加密）
- `nickname`: 昵称
- `role`: 角色（user/admin）
- `createdAt`: 创建时间
- `updatedAt`: 更新时间
- `lastLoginAt`: 最后登录时间

### 6.2 游戏模型 (`Game`)
- `_id`: 游戏ID
- `title`: 游戏标题
- `subtitle`: 游戏副标题
- `slug`: 游戏标识
- `cover`: 封面图片
- `background`: 背景图片
- `description`: 游戏描述
- `worldSetting`: 世界设定
- `genre`: 游戏类型
- `tags`: 标签
- `creator`: 创建者ID
- `creatorName`: 创建者名称
- `config`: 游戏配置
- `status`: 状态（draft/published）
- `visibility`: 可见性（public/private）
- `stats`: 统计信息
- `createdAt`: 创建时间
- `updatedAt`: 更新时间
- `publishedAt`: 发布时间

### 6.3 角色模型 (`Character`)
- `_id`: 角色ID
- `gameId`: 游戏ID
- `name`: 角色名称
- `color`: 角色颜色
- `prompt`: 角色提示
- `enabled`: 是否启用
- `createdAt`: 创建时间
- `updatedAt`: 更新时间

### 6.4 世界书条目模型 (`WorldbookEntry`)
- `_id`: 条目ID
- `name`: 条目名称
- `keys`: 关键词
- `content`: 内容
- `group`: 分组
- `priority`: 优先级
- `enabled`: 是否启用

### 6.5 对话模型 (`Dialogue`)
- `_id`: 对话ID
- `gameId`: 游戏ID
- `userId`: 用户ID
- `characterId`: 角色ID
- `content`: 对话内容
- `response`: 回复内容
- `emotion`: 情感状态
- `context`: 上下文信息
- `createdAt`: 创建时间

### 6.6 记忆模型 (`Memory`)
- `_id`: 记忆ID
- `gameId`: 游戏ID
- `userId`: 用户ID
- `content`: 记忆内容
- `importance`: 重要性
- `createdAt`: 创建时间

### 6.7 体验模型 (`Experience`)
- `_id`: 体验ID
- `gameId`: 游戏ID
- `userId`: 用户ID
- `title`: 体验标题
- `description`: 体验描述
- `memories`: 相关记忆
- `createdAt`: 创建时间

### 6.8 画廊模型 (`Gallery`)
- `_id`: 画廊ID
- `gameId`: 游戏ID
- `name`: 图片名称
- `url`: 图片URL
- `type`: 图片类型
- `triggerSystem`: 触发系统
- `display`: 显示配置
- `constraints`: 约束条件

## 7. API接口

### 7.1 认证接口
- `POST /api/auth/register`: 用户注册
- `POST /api/auth/login`: 用户登录
- `GET /api/auth/me`: 获取当前用户信息

### 7.2 游戏接口
- `GET /api/games`: 获取游戏列表
- `GET /api/games/my`: 获取我的游戏
- `GET /api/games/:slug`: 获取游戏详情
- `GET /api/games/featured/list`: 获取推荐游戏
- `GET /api/games/genres/all`: 获取游戏分类
- `POST /api/games`: 创建游戏
- `PUT /api/games/:id`: 更新游戏
- `GET /api/games/:id/edit`: 获取游戏编辑详情
- `POST /api/games/:id/publish`: 发布游戏
- `POST /api/games/:id/unpublish`: 下架游戏
- `DELETE /api/games/:id`: 删除游戏
- `POST /api/games/:id/fork`: 复制游戏
- `POST /api/games/:id/like`: 点赞游戏

### 7.3 角色接口
- `GET /api/characters`: 获取角色列表
- `GET /api/characters/:id`: 获取角色详情
- `POST /api/characters`: 创建角色
- `PUT /api/characters/:id`: 更新角色
- `DELETE /api/characters/:id`: 删除角色

### 7.4 世界书接口
- `GET /api/worldbook`: 获取世界书条目
- `POST /api/worldbook`: 创建世界书条目
- `PUT /api/worldbook/:id`: 更新世界书条目
- `DELETE /api/worldbook/:id`: 删除世界书条目

### 7.5 对话接口
- `POST /api/dialogue`: 发送对话
- `GET /api/dialogue/history`: 获取对话历史

### 7.6 记忆接口
- `GET /api/memories`: 获取记忆列表
- `POST /api/memories`: 创建记忆
- `PUT /api/memories/:id`: 更新记忆
- `DELETE /api/memories/:id`: 删除记忆

### 7.7 体验接口
- `GET /api/experiences`: 获取体验列表
- `POST /api/experiences`: 创建体验
- `PUT /api/experiences/:id`: 更新体验
- `DELETE /api/experiences/:id`: 删除体验

### 7.8 画廊接口
- `GET /api/gallery`: 获取画廊列表
- `POST /api/gallery`: 创建画廊条目
- `PUT /api/gallery/:id`: 更新画廊条目
- `DELETE /api/gallery/:id`: 删除画廊条目
- `POST /api/gallery/match`: 匹配画廊条目

## 8. 安全措施

### 8.1 认证安全
- 使用JWT进行身份验证
- 密码加密存储
- 令牌过期机制
- 认证中间件保护敏感接口

### 8.2 数据安全
- 输入验证和 sanitization
- 防止SQL注入
- 防止XSS攻击
- 敏感数据加密

### 8.3 访问控制
- 基于角色的权限管理
- 资源所有权验证
- 防止未授权访问

## 9. 部署与运维

### 9.1 环境配置
- 使用dotenv管理环境变量
- 支持开发和生产环境
- 数据库连接配置

### 9.2 启动方式
- `npm start`: 启动生产服务器
- `npm run dev`: 启动开发服务器（使用nodemon）

### 9.3 数据存储
- 支持MongoDB和内存存储两种模式
- 内存存储模式适合开发和测试
- MongoDB模式适合生产环境

## 10. 扩展与维护

### 10.1 扩展性
- 模块化设计
- 插件系统
- API版本控制

### 10.2 维护性
- 详细的日志系统
- 错误处理机制
- 健康检查接口
- 数据备份与恢复

## 11. 总结

大荒九丘是一个功能完整、架构清晰的AI互动小说平台，采用前后端分离的架构设计，支持用户创建、分享和体验互动小说。平台使用现代Web技术栈，具有良好的扩展性和维护性。

系统的核心功能包括用户认证、游戏管理、角色管理、世界书管理、对话系统、画廊系统和体验系统，为用户提供了完整的互动小说创作和体验环境。

通过本架构文档，开发人员可以了解系统的整体结构和设计理念，便于后续的开发和维护工作。