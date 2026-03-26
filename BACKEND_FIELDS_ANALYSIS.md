# 后端完整字段分析

## 一、角色模型 (Character) - backend/models/character.js

### 基础字段
| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| name | String | required | 角色名称 |
| color | String | '#999999' | 代表色 |
| image | String | '' | 头像URL |
| imageFit | String | 'cover' | 图片填充方式 cover/contain |
| prompt | String | required | AI提示词 |

### 详细设定字段
| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| appearance | String | '' | 外貌特征 |
| personality | String | '' | 性格特点 |
| physique | String | '' | 体质/修为 |
| background | String | '' | 身世背景 |
| special | String | '' | 特殊能力/秘密 |

### 触发与管理字段
| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| keys | [String] | [] | 触发关键词列表 |
| enabled | Boolean | true | 是否启用 |
| priority | Number | 100 | 优先级 0-1000 |
| gameId | String | null | 所属游戏ID |

### 情感系统字段
| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| favor | Number | 50 | 好感度 0-100 |
| trust | Number | 50 | 信任度 0-100 |
| stats | Object | {mood, encounters, dialogueTurns} | 状态统计 |

### 时间字段
| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| createdAt | Date | Date.now | 创建时间 |
| updatedAt | Date | Date.now | 更新时间 |

---

## 二、角色经历模型 (Experience) - backend/services/experienceService.js

### 经历字段
| 字段名 | 类型 | 说明 |
|--------|------|------|
| characterId | String | 关联角色ID |
| gameId | String | 关联游戏ID |
| title | String | 经历标题 |
| summary | String | 经历摘要 |
| type | String | 类型: daily/important/secret |
| gameDate | String | 游戏内日期 |
| sourceMemoryIds | [String] | 来源记忆ID |
| affinityAtCreation | Number | 创建时好感度 |
| tags | [String] | 标签 |
| isImportant | Boolean | 是否重要 |
| isSecret | Boolean | 是否秘密 |
| isUnlocked | Boolean | 是否解锁 |
| isRevealed | Boolean | 是否已揭示 |
| isNew | Boolean | 是否新经历 |
| emotionalImpact | String | 情感影响描述 |

---

## 三、世界书模型 (WorldbookEntry) - backend/models/worldbook.js

### 基础字段
| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| name | String | required | 条目名称 |
| keys | [String] | required | 触发关键词 |
| content | String | required | 条目内容 |
| enabled | Boolean | true | 是否启用 |

### 匹配控制字段
| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| matchType | String | 'contains' | 匹配类型: contains/exact/prefix/suffix/regex |
| caseSensitive | Boolean | false | 是否区分大小写 |
| priority | Number | 100 | 优先级 0-1000 |

### 插入控制字段
| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| insertPosition | String | 'system' | 插入位置: system/character/user/example |
| depth | Number | 0 | 插入深度 |
| excludeKeys | [String] | [] | 排除关键词 |
| constant | Boolean | false | 是否恒常触发 |

### 分组字段
| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| group | String | 'default' | 所属分组 |
| color | String | '' | 分组颜色 |
| comment | String | '' | 备注 |

---

## 四、前端缺失功能分析

### 角色编辑器缺失字段 (settings.html)
- ❌ imageFit (图片填充方式)
- ❌ favor (好感度) 
- ❌ trust (信任度)
- ❌ stats (状态统计)
- ❌ 经历管理

### 世界书编辑器缺失字段 (settings.html)
- ❌ matchType 选择器不完善
- ❌ caseSensitive 开关
- ❌ depth 输入
- ❌ excludeKeys 排除关键词
- ❌ constant 恒常触发开关
- ❌ comment 备注

### 游戏体验页面已有但设置页缺失 (galgame_framework.html)
- ❌ 好感度等级系统 (热恋/友好/中立/冷淡/敌对)
- ❌ 信任度等级系统 (托付/信任/中立/怀疑/防备)
- ❌ 心情系统 (平静/开心/低落/生气/紧张/好奇)
- ❌ 角色经历档案
- ❌ 角色统计 (相遇次数/对话轮数)
