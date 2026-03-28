# Character Card V2.0 全线升级指南

## 🎯 升级目标
- 统一使用V2格式，删除V1/V2双模式维护
- 在settings.html中直接集成V2编辑器
- 保证现有数据平滑迁移
- 简化架构，减少bug隐患

---

## 📁 文件变更清单

### 1. 后端模型（已更新）
| 文件 | 变更 | 说明 |
|------|------|------|
| `backend/models/character.js` | ✅ 重写 | 统一V2结构，V1字段移入`_legacy` |
| `backend/routes/characters.js` | ✅ 重写 | 统一V2 API，自动迁移旧数据 |
| `backend/scripts/migrate-v1-to-v2.js` | ✅ 新增 | 数据迁移脚本 |

### 2. 前端编辑器（已更新）
| 文件 | 变更 | 说明 |
|------|------|------|
| `settings.html` | ✅ 扩展 | 模态框添加标签页和V2字段 |
| `public/js/settings/character-v2-editor.js` | ✅ 新增 | V2编辑器功能 |

### 3. 游戏运行时（已更新）
| 文件 | 变更 | 说明 |
|------|------|------|
| `galgame_framework.html` | ✅ 修改 | 添加V2运行时模块引用 |
| `public/js/game/character-v2-runtime.js` | ✅ 新增 | 统一V2提示词构建 |

### 4. 数据迁移
```bash
# 预览迁移
node backend/scripts/migrate-v1-to-v2.js --dry-run

# 实际迁移
node backend/scripts/migrate-v1-to-v2.js

# 迁移特定游戏
node backend/scripts/migrate-v1-to-v2.js --game-id=xxx
```

---

## 🏗️ 新数据架构

```javascript
// 统一的V2角色结构
{
  name: "角色名称",
  
  visual: {
    avatar: "头像URL",
    cover: "封面图",
    color: "#8a6d3b",
    emotionCGs: { calm: "", happy: "", ... }
  },
  
  core: {
    description: "综合描述（替代appearance+physique+special）",
    personality: "性格",
    scenario: "处境/背景",
    firstMessage: "开场白",
    worldConnection: { faction: "", location: "" }
  },
  
  activation: {
    keys: ["关键词"],
    priority: 100,
    enabled: true
  },
  
  examples: {
    style: "说话风格描述",
    dialogues: [{ user: "", character: "", annotation: "" }]
  },
  
  lorebook: {
    entries: [{ name: "", keys: [], content: "", priority: 100 }],
    linkMode: "MANUAL", // MANUAL/SUGGESTED/AUTO/DISABLED
    linkedEntryIds: []
  },
  
  injection: {
    characterNote: { content: "", depth: 0, frequency: 1, role: "system" },
    postHistory: { content: "", enabled: false }
  },
  
  relationship: {
    favor: 50, trust: 50, mood: "平静"
  },
  
  meta: {
    version: "2.0.0",
    createdAt: "",
    updatedAt: ""
  },
  
  // 旧数据保留（只读）
  _legacy: { appearance: "", personality: "", ... }
}
```

---

## 🎮 Settings.html 新界面

角色编辑器现在有4个标签页：

```
┌─────────────────────────────────────────────────────┐
│  [基础设定]  [示例对话]  [世界书]  [深度注入]         │
└─────────────────────────────────────────────────────┘
```

### 1. 基础设定
- 综合描述（自由填写，替代原来的外貌/体质/特殊分开）
- 性格特点
- 身世背景
- 开场白
- 所属势力/当前位置

### 2. 示例对话
- 说话风格描述
- 多组示例对话（用户/角色/标注）

### 3. 世界书
- **关联模式选择**：
  - MANUAL(手动) - 完全控制
  - SUGGESTED(建议) - 系统推荐，你确认
  - AUTO(自动) - 自动关联
  - DISABLED(禁用) - 不关联
- 角色专属知识条目

### 4. 深度注入
- Character Note（角色笔记）
  - 内容/深度/频率/角色
- Post-History Instructions（后置指令）

---

## 🔌 API变更

### 统一端点
```
GET    /api/characters          # 列表（自动返回V2格式）
GET    /api/characters/:id      # 详情（自动迁移旧数据）
POST   /api/characters          # 创建（接收V2格式）
PUT    /api/characters/:id      # 更新（接收V2格式）
DELETE /api/characters/:id      # 删除
POST   /api/characters/batch    # 批量操作
POST   /api/characters/import   # 导入（支持SillyTavern）
GET    /api/characters/:id/export # 导出
POST   /api/characters/:id/lorebook/link # 关联世界书
```

### 向后兼容
- API自动检测数据格式
- V1数据自动迁移到V2后返回
- `_legacy`字段保留原始数据

---

## 🎲 游戏运行时

### 提示词构建流程
```javascript
1. 系统基础（世界观）
2. 角色核心（描述/性格/处境/势力/位置）
3. 关系状态（好感/信任/心情）
4. 说话风格
5. 激活的世界书条目（根据关键词匹配）
6. Character Note注入（按频率/深度）
7. Post-History追加
```

### 世界书激活逻辑
```javascript
// 根据用户消息和位置匹配关键词
const activeEntries = character.lorebook.entries
  .filter(e => e.enabled && e.keys.some(k => text.includes(k)))
  .sort((a, b) => b.priority - a.priority)
  .slice(0, 5);
```

---

## 🚀 部署步骤

### 1. 备份数据
```bash
# MongoDB备份
mongodump --db galgame --out backup/

# 或导出JSON
node -e "
const fs = require('fs');
const data = require('./backend/models/character').find();
fs.writeFileSync('characters-backup.json', JSON.stringify(data));
"
```

### 2. 更新代码
```bash
# 文件已更新，重启服务
git pull
npm restart
```

### 3. 数据迁移
```bash
# 预览
node backend/scripts/migrate-v1-to-v2.js --dry-run

# 执行
node backend/scripts/migrate-v1-to-v2.js
```

### 4. 验证
- 打开settings.html，检查角色是否正常显示
- 编辑一个角色，确认V2字段可用
- 在galgame中测试对话

---

## ⚠️ 注意事项

### 数据兼容性
1. **V1数据自动迁移**：API读取时自动转换，原始数据保留在`_legacy`
2. **localStorage数据**：前端自动迁移，首次加载时转换
3. **导出/导入**：支持SillyTavern格式导入导出

### 字段映射
| V1字段 | V2字段 | 说明 |
|--------|--------|------|
| appearance | core.description | 合并到综合描述 |
| physique | core.description | 合并到综合描述 |
| special | core.description | 合并到综合描述 |
| background | core.scenario | 重命名 |
| image | visual.avatar | 重命名 |
| avatar | visual.avatar | 统一 |
| keys | activation.keys | 重命名 |
| priority | activation.priority | 重命名 |
| favor | relationship.favor | 重命名 |
| trust | relationship.trust | 重命名 |
| mood | relationship.mood | 重命名 |

### 世界书关联模式
- **MANUAL**（默认）：需要用户显式选择关联条目
- **SUGGESTED**：系统分析推荐，用户确认后生效
- **AUTO**：匹配度>0.6自动关联
- **DISABLED**：完全禁用世界书

---

## 🧹 清理V1代码（可选）

### 可删除的文件
```
backend/routes/character-v2-routes.js  # 已合并到characters.js
SETTINGS_INTEGRATION_V2.js             # 不再需要
GALGAME_INTEGRATION_V2.js              # 不再需要
character-editor-v2.html               # 已集成到settings.html
public/css/character-editor-v2-isolated.css  # 使用settings.css
```

### 保留的文件
```
public/js/core/characterCardV2.js      # 核心数据模型（可选）
public/js/core/enhancedPromptBuilder.js # 高级提示词功能（可选）
public/js/services/characterWorldbookBridge.js # 世界书桥接（可选）
```

---

## 📊 升级检查清单

- [ ] 后端模型已更新
- [ ] 后端路由已更新
- [ ] 数据迁移脚本已测试
- [ ] settings.html已扩展V2编辑器
- [ ] galgame_framework.html已引用运行时
- [ ] 现有角色数据已迁移
- [ ] 新角色可以正常创建/编辑
- [ ] 游戏对话正常运行
- [ ] 世界书联动正常工作
- [ ] Character Note注入正常
- [ ] SillyTavern导入导出正常

---

## 🐛 故障排查

### 问题1: 角色数据丢失
**解决**: 检查`_legacy`字段，数据应该在那里。重新运行迁移脚本。

### 问题2: 编辑器字段不显示
**解决**: 清除浏览器缓存，检查`character-v2-editor.js`是否正确加载。

### 问题3: 世界书不激活
**解决**: 检查关联模式和关键词匹配。使用`linkMode: MANUAL`测试。

### 问题4: 提示词构建异常
**解决**: 检查浏览器控制台错误，确认`character-v2-runtime.js`已加载。

---

## ✨ 新特性亮点

1. **自由编辑**：综合描述替代原来分散的字段
2. **示例对话**：AI更好地学习角色说话方式
3. **灵活联动**：4种世界书关联模式
4. **深度注入**：Character Note按频率自动注入
5. **向后兼容**：旧数据自动迁移，零感知升级

---

**升级状态**: 全部就绪 ✅
**建议操作**: 先备份数据，然后按部署步骤执行