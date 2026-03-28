# Character Card V2.0 集成步骤指南

## 📋 概述

本文档描述如何将角色卡V2.0系统集成到现有的 `settings.html` 和 `galgame_framework.html`，支持手动/自动世界书联动切换。

**设计理念**: 使用非侵入式补丁，保持现有代码稳定的同时启用V2功能。

---

## 🗂️ 文件清单

### 核心模块（已创建）
1. `public/js/core/characterCardV2.js` - V2数据模型与适配器
2. `public/js/core/enhancedPromptBuilder.js` - 增强提示词构建器
3. `public/js/services/characterWorldbookBridge.js` - 世界书桥接（支持4种联动模式）

### 集成文件（本次创建）
4. `SETTINGS_INTEGRATION_V2.js` - settings.html集成补丁
5. `GALGAME_INTEGRATION_V2.js` - galgame_framework.html集成补丁
6. `backend/models/character-v2-extension.js` - 后端模型扩展
7. `backend/routes/character-v2-routes.js` - V2专用API路由
8. `public/css/character-editor-v2-isolated.css` - 隔离样式

### 独立编辑器
9. `character-editor-v2.html` - 完整V2编辑器（已测试可用）

---

## 🔧 集成步骤

### 第一步：后端扩展（5分钟）

#### 1.1 更新模型
文件: `backend/models/character.js`

已自动添加以下字段到 `characterSchemaDefinition`：

```javascript
format: { type: String, default: 'v1', enum: ['v1', 'v2'] },
version: { type: String, default: '1.0' },
v2Data: { type: mongoose.Schema.Types.Mixed, default: null },
linkedWorldbookEntries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Worldbook' }],
worldbookLinkMode: { type: String, default: 'manual', enum: ['manual', 'auto', 'disabled'] },
characterNote: { type: String, default: '' },
characterNoteDepth: { type: Number, default: 0 },
postHistoryInstructions: { type: String, default: '' }
```

**状态**: ✅ 已完成

#### 1.2 添加V2路由
文件: `backend/app.js`

在路由注册部分添加：

```javascript
// V2角色卡路由
app.use('/api/characters/v2', require('./routes/character-v2-routes'));
```

**状态**: ⏳ 待手动添加

---

### 第二步：Settings.html集成（10分钟）

#### 2.1 复制集成文件
```bash
cp SETTINGS_INTEGRATION_V2.js public/js/settings/
```

#### 2.2 添加脚本引用
在 `settings.html` 底部（`</body>`前）添加：

```html
<!-- Character Card V2.0 Integration -->
<script src="public/js/core/characterCardV2.js"></script>
<script src="public/js/core/enhancedPromptBuilder.js"></script>
<script src="public/js/services/characterWorldbookBridge.js"></script>
<script src="public/js/settings/SETTINGS_INTEGRATION_V2.js"></script>
```

#### 2.3 可选：添加V2编辑器按钮
在角色列表页面添加V2编辑器入口：

```html
<!-- 添加到settings.html的角色列表区域 -->
<div class="page-actions">
    <button class="btn btn-secondary" onclick="openV2Editor()">
        🆕 V2编辑器
    </button>
    <!-- 其他按钮 -->
</div>
```

**集成效果**:
- ✅ V1角色继续使用原有编辑/保存逻辑
- ✅ V2角色自动路由到新的保存流程
- ✅ 角色卡片显示V2徽章和V2编辑按钮
- ✅ 点击V2按钮打开独立V2编辑器

---

### 第三步：Galgame_Framework.html集成（10分钟）

#### 3.1 复制集成文件
```bash
cp GALGAME_INTEGRATION_V2.js public/js/game/
```

#### 3.2 添加脚本引用
在 `galgame_framework.html` 底部添加：

```html
<!-- Character Card V2.0 Game Integration -->
<script src="public/js/core/characterCardV2.js"></script>
<script src="public/js/core/enhancedPromptBuilder.js"></script>
<script src="public/js/services/characterWorldbookBridge.js"></script>
<script src="public/js/game/GALGAME_INTEGRATION_V2.js"></script>
```

#### 3.3 启用V2（可选）
V2默认禁用，通过以下方式启用：

**方式1 - 控制台启用**:
```javascript
CharacterV2Control.enable()  // 启用
CharacterV2Control.disable() // 禁用
CharacterV2Control.status()  // 查看状态
```

**方式2 - LocalStorage**:
```javascript
localStorage.setItem('use_character_v2', 'true')
```

**集成效果**:
- ✅ V2角色自动使用增强提示词构建
- ✅ 支持手动/自动世界书联动
- ✅ CharacterNote深度注入
- ✅ 失败自动回退到V1

---

### 第四步：世界书联动配置

在 `character-editor-v2.html` 的"世界书关联"标签页，可选择4种联动模式：

| 模式 | 描述 | 适用场景 |
|------|------|----------|
| **MANUAL** (手动) | 用户完全手动选择要关联的世界书条目 | 精确控制，避免bug |
| **SUGGESTED** (建议) | 系统分析并显示建议，用户确认后关联 | 平衡效率与控制 |
| **AUTO** (自动) | 系统自动关联匹配度>0.6的条目 | 快速设置 |
| **DISABLED** (禁用) | 不关联任何世界书条目 | 完全隔离 |

**配置存储**:
```javascript
character.v2Data.lorebook._linkMode = 'MANUAL' // 或 'SUGGESTED'/'AUTO'/'DISABLED'
```

---

## 📊 数据流架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端 (Browser)                            │
├─────────────────────────────────────────────────────────────────┤
│  settings.html          │  galgame_framework.html               │
│  ├─ V1编辑器 (原)       │  ├─ V1角色 → 原prompt构建              │
│  ├─ V2编辑器入口        │  └─ V2角色 → EnhancedPromptBuilder     │
│  └─ 集成补丁            │         ├─ CharacterNote注入           │
│                         │         ├─ PostHistory指令             │
│  character-editor-v2.html│         └─ 世界书桥接                  │
│  └─ 完整V2编辑器         │              ├─ MANUAL模式             │
│     ├─ 基础信息          │              ├─ AUTO模式               │
│     ├─ 示例对话          │              └─ 相关性评分              │
│     ├─ 世界书联动        │                                         │
│     └─ 深度注入          │                                         │
└─────────────────────────┴─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                        后端 (Node.js)                            │
├─────────────────────────────────────────────────────────────────┤
│  /api/characters/v2/*                                            │
│  ├─ POST / - 创建/更新V2角色                                     │
│  ├─ GET /:id - 获取V2角色（支持v1-compat降级）                   │
│  ├─ POST /:id/migrate - V1→V2迁移                              │
│  └─ POST /:id/worldbook/link - 关联世界书条目                    │
│                                                                  │
│  Character模型                                                   │
│  ├─ v1字段（兼容）: name, appearance, personality...            │
│  └─ v2字段（新增）: format, version, v2Data{...}                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 V1/V2双向兼容

### V1角色使用V1编辑器
- 保持原有数据结构不变
- 无需任何迁移
- 保存到V1字段

### V1角色升级到V2
- 在V2编辑器中打开
- 自动迁移：V1字段 → V2嵌套结构
- 保存时同时更新V1字段（兼容性）和v2Data字段

### V2角色降级到V1
- API调用：`GET /api/characters/v2/:id?format=v1-compat`
- 自动提取V2字段到V1扁平结构
- 标记为降级版本

---

## 🐛 故障排查

### 问题1: V2集成文件加载失败
```bash
# 检查文件路径
ls public/js/settings/SETTINGS_INTEGRATION_V2.js
ls public/js/game/GALGAME_INTEGRATION_V2.js

# 检查核心模块
ls public/js/core/characterCardV2.js
ls public/js/core/enhancedPromptBuilder.js
ls public/js/services/characterWorldbookBridge.js
```

### 问题2: V2保存失败
1. 检查后端是否添加V2路由
2. 检查数据库连接状态
3. 查看浏览器控制台错误信息
4. 检查 `character-v2-routes.js` 是否正确加载

### 问题3: 世界书联动不生效
1. 确认联动模式设置正确
2. 检查世界书条目关键词匹配
3. 在V2编辑器中查看"关联建议"面板
4. 使用调试模式：`CharacterV2Control.debug(true)`

### 问题4: 样式冲突
V2编辑器使用完全隔离的CSS类名（`v2-*`前缀），通常不会冲突。如有问题：
1. 检查是否正确加载 `character-editor-v2-isolated.css`
2. 确保编辑器在独立的iframe或新窗口打开

---

## 🎯 下一步建议

1. **测试V2编辑器**
   ```bash
   # 直接在浏览器打开
   open character-editor-v2.html
   ```

2. **灰度发布**
   - 先在小范围启用V2
   - 使用 `localStorage.setItem('use_character_v2', 'true')` 控制

3. **逐步迁移**
   - 新角色默认使用V2
   - 旧角色按需迁移

4. **监控与反馈**
   - 关注控制台错误
   - 收集用户反馈
   - 逐步优化自动联动算法

---

## 📞 技术支持

如有问题，请检查：
1. 所有集成文件是否正确复制到对应目录
2. 后端路由是否正确添加
3. 浏览器控制台是否有错误信息
4. 数据库中角色数据的format和version字段