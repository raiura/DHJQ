# 存档与记忆系统整合方案

## 存储键名规范

```javascript
// 原来的（全局）
galgame_memories                    // ❌ 所有存档共享
galgame_character_favor            // ❌ 所有存档共享

// 新的（按存档隔离）
galgame_save_${saveId}_memories           // ✅ 存档级记忆
galgame_save_${saveId}_favor              // ✅ 存档级好感度
galgame_save_${saveId}_stats              // ✅ 存档级统计
galgame_save_${saveId}_config             // ✅ 存档级配置（记忆深度等）
```

## 数据结构设计

### 单个存档的数据结构
```javascript
{
    id: "save_xxx",
    name: "存档1",
    world: "dahuang",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-02T12:00:00Z",
    
    // 对话历史（原来的 messages）
    messages: [
        { role: 'user', content: '...', timestamp: '...' },
        { role: 'assistant', content: '...', timestamp: '...', emotion: 'happy' }
    ],
    
    // 三层记忆系统
    memories: {
        short: [...],   // 短期记忆（最近N轮）
        long: [...],    // 长期记忆（自动摘要）
        core: [...]     // 核心记忆（重要事件）
    },
    
    // 角色好感度（按角色ID存储）
    favor: {
        "char_001": { favor: 80, trust: 75, lastInteract: "..." },
        "char_002": { favor: 45, trust: 30, lastInteract: "..." }
    },
    
    // AI配置（用户视图的那些设置）
    config: {
        memoryDepth: 10,        // 记忆深度
        coreMemorySlots: 5,     // 核心记忆槽位
        autoSummarize: true,    // 自动总结
        temperature: 0.7,       // AI温度
        maxTokens: 2000         // 最大token
    },
    
    // 经历档案
    experiences: [
        { id: "exp_001", type: "DIALOGUE_PATTERN", description: "...", unlockedAt: "..." }
    ],
    
    // 剧情进度标记
    progress: {
        currentChapter: "第三章",
        unlockedEvents: ["event_001", "event_002"],
        completedRoutes: ["route_lu"]
    }
}
```

## 页面职责划分

### world-guide.html（入口页）
- 选择故事（书）
- 管理存档（新建/复制/删除/加载）
- 每个存档显示：名称、对话数、最后时间、简短预览

### galgame_framework.html（游戏页）
- 加载时读取 `saveId` 参数
- 从 localStorage 加载该存档的完整数据
- 对话时自动保存到对应存档
- 记忆系统操作（短期→长期→核心）只影响当前存档

### settings.html（设置页）
**需要修改：**
- 用户视图：编辑的是「当前存档」的配置
- 管理员视图：查看所有存档的列表（可以删除/清空某个存档的记忆）
- 不再直接操作全局记忆，而是操作 `galgame_save_${saveId}_xxx`

## API变更

### 保存对话记忆
```javascript
// 原来是
POST /memories
{ characterId, content, type }

// 现在是（添加 saveId）
POST /memories
{ saveId, characterId, content, type }
```

### 读取角色记忆
```javascript
// 原来是
GET /memories/character/${characterId}

// 现在是
GET /memories/save/${saveId}/character/${characterId}
```

## 迁移策略

1. **保留旧数据**：现有记忆作为"默认存档"迁移
2. **新存档独立**：新建存档时从空数据开始
3. **复制存档**：复制时同时复制所有关联数据（记忆、好感度、配置）

## UI调整

### settings.html 用户视图
```
当前存档：[存档1 - 与陆苍雪的旅程] [切换存档]

对话记忆控制
├─ 记忆深度：10轮 [当前存档专属]
├─ 核心记忆保留：5条 [当前存档专属]
└─ 智能总结：开启 [当前存档专属]
```

### settings.html 管理员视图
```
存档列表
├─ [存档1] 清空记忆 | 查看统计 | 删除
├─ [存档2] 清空记忆 | 查看统计 | 删除
└─ [存档3] 清空记忆 | 查看统计 | 删除

全局设置（影响所有新存档）
├─ 默认记忆深度
├─ 最大存档数
└─ 自动保存间隔
```

## 实现优先级

1. 修改存储键名，让记忆按存档隔离
2. 修改 galgame_framework.html，支持 saveId 参数
3. 修改 settings.html，让它编辑当前存档的配置
4. 添加存档切换时自动保存/加载机制
