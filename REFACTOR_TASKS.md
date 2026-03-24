# 架构重构任务追踪

> 根据 `ARCHITECTURE_ASSESSMENT_REPORT.md` 生成的具体任务清单

---

## 任务看板

### 🔴 P0 - 立即执行 (本周内)

- [ ] **TASK-001**: 迁移 galgame_framework.html 到新架构
  - [ ] 提取内嵌CSS到 `public/css/game.css`
  - [ ] 提取内嵌JS业务逻辑到新模块
  - [ ] 使用 Loader 加载依赖
  - [ ] 测试核心对话流程
  - 预计: 2-3天
  - 负责人: 前端开发

- [ ] **TASK-002**: 创建统一CSS文件
  - [ ] 创建 `public/css/base.css` (重置+变量+工具类)
  - [ ] 创建 `public/css/components.css` (Toast/Modal/Card)
  - [ ] 创建 `public/css/layout.css` (布局系统)
  - 预计: 半天
  - 负责人: 前端开发

- [ ] **TASK-003**: 清理废弃文件
  - [ ] 删除 `galgame_framework - 副本.html`
  - [ ] 删除 `galgame_framework copy.html`
  - [ ] 确认无其他备份文件
  - 预计: 1小时
  - 负责人: 维护

---

### 🟡 P1 - 短期执行 (1-2周)

- [ ] **TASK-004**: 迁移 settings.html 到新架构
  - [ ] 分析页面功能模块
  - [ ] 提取通用CSS
  - [ ] 重构为模块化结构
  - [ ] 测试所有设置项
  - 预计: 3-4天
  - 负责人: 前端开发

- [ ] **TASK-005**: 统一后端路由认证
  - [ ] 审查所有路由文件的认证方式
  - [ ] 统一使用 `authMiddleware.verifyToken`
  - [ ] 更新路由注册逻辑
  - [ ] 测试所有受保护端点
  - 预计: 1天
  - 负责人: 后端开发

- [ ] **TASK-006**: 添加API参数验证
  - [ ] 选择验证库 (Joi/Zod)
  - [ ] 创建 `middleware/validator.js`
  - [ ] 为核心路由添加验证
  - [ ] 添加验证错误处理
  - 预计: 2天
  - 负责人: 后端开发

- [ ] **TASK-007**: 完善 Loader 模块定义
  - [ ] 为所有新模块注册 Loader
  - [ ] 定义模块依赖关系
  - [ ] 添加预加载策略
  - [ ] 测试模块加载顺序
  - 预计: 1天
  - 负责人: 前端开发

---

### 🟢 P2 - 中期优化 (1个月内)

- [ ] **TASK-008**: 后端添加 Controllers 层
  - [ ] 创建 `backend/controllers/` 目录
  - [ ] 迁移 games 路由逻辑
  - [ ] 迁移 characters 路由逻辑
  - [ ] 迁移 dialogue 路由逻辑
  - [ ] 更新单元测试
  - 预计: 3天
  - 负责人: 后端开发

- [ ] **TASK-009**: 添加 JSDoc 类型注释
  - [ ] 为核心模块添加类型注释
  - [ ] 为服务层添加类型注释
  - [ ] 配置 IDE 类型提示
  - [ ] 添加类型检查脚本
  - 预计: 2天
  - 负责人: 前端开发

- [ ] **TASK-010**: 添加单元测试
  - [ ] 选择测试框架 (Jest/Vitest)
  - [ ] 测试 `utils.js` 函数
  - [ ] 测试核心服务方法
  - [ ] 配置 CI 测试流程
  - 预计: 2天
  - 负责人: 测试/前端

- [ ] **TASK-011**: 前端性能优化
  - [ ] 实现图片懒加载
  - [ ] 添加路由懒加载
  - [ ] 优化首屏渲染
  - [ ] 性能基准测试
  - 预计: 2天
  - 负责人: 前端开发

---

### 🔵 P3 - 长期规划 (3个月内)

- [ ] **TASK-012**: TypeScript 迁移评估
  - [ ] 评估迁移成本
  - [ ] 制定迁移计划
  - [ ] 团队培训
  - 预计: 调研阶段
  - 负责人: 技术负责人

- [ ] **TASK-013**: 构建工具引入
  - [ ] 评估 Vite/保持现状
  - [ ] 配置开发环境
  - [ ] 配置生产构建
  - 预计: 调研阶段
  - 负责人: 前端开发

- [ ] **TASK-014**: PWA 支持
  - [ ] 添加 Service Worker
  - [ ] 实现离线缓存
  - [ ] 添加 Web App Manifest
  - 预计: 3天
  - 负责人: 前端开发

---

## 详细任务说明

### TASK-001: 迁移 galgame_framework.html

**目标**: 将 227KB 的单体文件重构为模块化架构

**步骤**:
```
1. 分析现有代码结构
   ├── 内嵌CSS (~1500行)
   ├── HTML结构 (~500行)
   └── 内嵌JS (~2500行)

2. 提取CSS
   ├── 复制到 public/css/game.css
   └── 移除内嵌<style>

3. 提取JS
   ├── 通用工具 → public/js/core/utils.js
   ├── API调用 → public/js/core/api.js
   ├── 业务逻辑 → public/js/app/gameApp.js
   └── 入口代码保留在HTML中 (<200行)

4. 使用Loader加载
   <script>
   Loader.load(['core', 'components', 'game']).then(() => {
       GameApp.init();
   });
   </script>
```

**验收标准**:
- [ ] 文件大小 < 30KB
- [ ] 对话功能正常
- [ ] 存档功能正常
- [ ] 情感系统正常
- [ ] 无控制台错误

---

### TASK-002: 创建统一CSS文件

**目标**: 消除CSS重复，利用浏览器缓存

**文件结构**:
```
public/css/
├── base.css           # 基础重置、CSS变量
├── components.css     # 通用组件样式
├── layout.css         # 布局系统
├── game.css          # 游戏页面专属
└── settings.css      # 设置页面专属
```

**base.css 示例**:
```css
:root {
    --primary: #8a6d3b;
    --primary-light: #d4a574;
    --bg-dark: #1a1a2e;
    --text: #e8e8e8;
    /* ... */
}

/* 重置样式 */
* { margin: 0; padding: 0; box-sizing: border-box; }

/* 工具类 */
.flex { display: flex; }
.center { justify-content: center; align-items: center; }
.hidden { display: none !important; }
```

---

### TASK-005: 统一后端路由认证

**问题**: 认证逻辑分散在多处

**server.js 当前状态**:
```javascript
// 方式1: 统一加认证
app.use('/api/user-characters', authMiddleware.verifyToken, require('./routes/userCharacters'));

// 方式2: 路由内部处理
app.use('/api/games', gamesRouter);  // 认证在路由文件内
```

**解决方案**:
```javascript
// 统一在路由文件内处理
// routes/games.js
const auth = require('../middleware/auth');

router.get('/', auth.verifyToken, gameController.list);
router.get('/public', gameController.listPublic);  // 公开接口无需认证
```

---

## 进度追踪

| 周次 | 计划任务 | 完成状态 | 备注 |
|------|----------|----------|------|
| W1 | TASK-001, 002, 003 | 🔄 进行中 | - |
| W2 | TASK-004 | ⏳ 待开始 | - |
| W3 | TASK-005, 006 | ⏳ 待开始 | - |
| W4 | TASK-007, 008 | ⏳ 待开始 | - |

---

## 风险与应对

| 风险 | 影响 | 概率 | 应对措施 |
|------|------|------|----------|
| 重构引入Bug | 高 | 中 | 完整功能测试后再合并 |
| 进度延误 | 中 | 中 | 分阶段交付，优先核心功能 |
| 团队协作冲突 | 中 | 低 | 使用feature分支，代码审查 |
| 旧代码依赖 | 高 | 高 | 保留备份，逐步替换 |

---

**最后更新**: 2026-03-19  
**下次更新**: 每周一  
**负责人**: 技术负责人
