# 世界书系统改造报告

## 一、问题分析

### 1.1 原有实现的问题
- **前端（galgame_framework.html）**：只使用了简单的 `userSettings.worldbook.entries` 过滤（旧版简单实现）
- **后端（dialogueService.js）**：有完整的世界书匹配系统，但前端没有利用
- **数据流断裂**：settings.html 中设置的世界书数据无法传递到游戏页面

### 1.2 后端世界书系统架构
```
WorldbookEntry 模型
├── matches(text) 方法 - 检测触发
├── 支持 5 种匹配类型：contains/exact/prefix/suffix/regex
├── 优先级排序
└── 深度控制

dialogueService
├── getMatchingWorldbookEntries() - 获取匹配条目
├── formatWorldbookContent() - 格式化内容
└── buildPrompt() - 整合到 AI 提示词
```

## 二、改造内容

### 2.1 galgame_framework.html 改造

#### 新增：世界书系统初始化
```javascript
// 世界书管理器实例
let worldbookManager = null;

// 初始化世界书系统
async function initWorldbookSystem() {
    const gameId = currentWorld?._id || currentWorld?.id;
    
    // 创建管理器
    worldbookManager = new WorldbookManager({ gameId });
    
    // 从 settings 的 localStorage 加载世界书数据
    const localWbKey = `wb_global_${gameId}`;
    const localWbData = localStorage.getItem(localWbKey);
    
    if (localWbData) {
        worldbookManager.globalWorldbook = JSON.parse(localWbData);
    }
}
```

#### 改造：AI 回复生成
```javascript
async function generateAIResponse(userMessage) {
    // 新版世界书系统
    let worldbookEntries = [];
    if (worldbookManager) {
        const context = {
            userName: window.currentUserCharacter?.name,
            characterName: currentCharacter?.name,
            recentMessages: chatHistory.slice(-5).map(h => h.text)
        };
        worldbookEntries = worldbookManager.detectTriggers(userMessage, context);
    }
    
    // 合并新旧世界书条目
    const allWorldbookEntries = [
        ...worldbookEntries.map(e => `[${e.name}] ${e.content}`),
        // 旧版用户个人世界书（兼容）
        ...userSettings.worldbook.entries
            .filter(e => userMessage.includes(e.keyword))
            .map(e => `[${e.keyword}] ${e.content}`)
    ].join('\n');
    
    // 发送到后端 API
    await fetch(`${API_BASE}/dialogue`, {
        body: JSON.stringify({
            message: userMessage,
            userSettings: {
                worldbookEntries: allWorldbookEntries,
                // ...
            }
        })
    });
}
```

### 2.2 数据流整合

```
settings.html
├── 编辑世界书条目
├── 保存到 localStorage: wb_global_${gameId}
└── 同时保存到后端 API

galgame_framework.html
├── 从 localStorage 读取 wb_global_${gameId}
├── 初始化 WorldbookManager
├── 使用 worldbookEngine.detectTriggers()
└── 触发结果发送到后端

后端 dialogueService
├── 接收 worldbookEntries
├── 再次检测匹配（双重保险）
├── 格式化世界书内容
└── 整合到 AI 提示词
```

## 三、功能特性

### 3.1 支持的世界书特性
| 特性 | 说明 |
|------|------|
| 5种匹配类型 | contains/exact/prefix/suffix/regex |
| 优先级排序 | 高优先级条目优先触发 |
| 分组管理 | 按分组组织条目 |
| 插入位置 | system/character/user/example |
| 恒常触发 | constant 字段支持 |
| 排除关键词 | excludeKeys 排除特定内容 |
| 大小写敏感 | caseSensitive 控制 |

### 3.2 前后端双重检测
- **前端检测**：使用 worldbookEngine.js 实时检测，提供即时反馈
- **后端检测**：dialogueService 再次检测，确保准确性
- **合并策略**：前端触发结果 + 后端检测结果合并

## 四、修改的文件

| 文件 | 修改内容 |
|------|----------|
| `galgame_framework.html` | 添加世界书初始化、改造对话生成函数 |
| `settings-world-guide.css` | 修复角色卡片图片显示（高度360px，object-fit: contain） |
| `settings-main.js` | 角色编辑器添加好感度/信任度/心情字段 |

## 五、使用方式

### 5.1 在 settings.html 中设置世界书
1. 打开 `settings.html?id=游戏ID`
2. 点击 "📚 世界书清单"
3. 添加/编辑世界书条目
4. 设置关键词、匹配类型、优先级、插入位置
5. 保存后会自动保存到 localStorage 和后端

### 5.2 在 galgame_framework.html 中触发
1. 打开游戏页面
2. 世界书系统会自动初始化
3. 发送包含关键词的消息
4. 系统会自动检测触发的世界书条目
5. 触发内容会发送到后端，整合到 AI 提示词中

## 六、调试信息

在浏览器控制台可以看到：
```
[Worldbook] 初始化世界书系统...
[Worldbook] 从 localStorage 加载世界书数据
[Worldbook] 世界书系统初始化完成: { globalEntries: X, userEntries: Y }
[Worldbook] 触发的条目: Z
```

## 七、注意事项

1. **数据同步**：settings.html 和 galgame_framework.html 通过 localStorage 同步世界书数据
2. **后端备份**：世界书数据同时保存到后端 API，作为备份
3. **兼容性**：保留旧版用户个人世界书功能，与新系统共存
4. **性能**：使用 LRU 缓存优化世界书检测性能
