# 世界书系统 2.0 架构指南

## 概述

世界书系统 2.0 实现了 SillyTavern 风格的多书本管理架构，支持同时激活多本世界书，提供更灵活的组织和触发机制。

## 核心概念

### 1. 世界书 (WorldBook)
一本完整的世界书，包含元数据和条目列表。

```javascript
const book = new WorldBook({
    name: '青云国设定',
    description: '包含青云国的地理、历史、人物设定',
    author: '作者名',
    entries: [...]
});
```

**属性：**
- `id` - 唯一标识符
- `name` - 书名
- `description` - 描述
- `author` - 作者
- `enabled` - 是否启用
- `entries` - 条目数组
- `groups` - 分组定义

### 2. 世界书图书馆 (WorldbookLibrary)
管理多本世界书，处理激活/停用和条目合并。

```javascript
const library = new WorldbookLibrary({ gameId: 'xxx' });

// 创建新书
const book = library.createBook({ name: '新书' });

// 激活/停用书本
library.activateBook(bookId);
library.deactivateBook(bookId);

// 获取所有激活的条目
const entries = library.getAllActiveEntries();

// 触发检测
const triggered = library.detectTriggers(userMessage, context);
```

### 3. 世界书管理器 UI (WorldbookManagerUI)
提供 SillyTavern 风格的管理界面。

```javascript
const ui = new WorldbookManagerUI(container, {
    library: worldbookLibrary,
    onEntrySelect: (entry) => { /* 打开编辑器 */ },
    onBookSelect: (book) => { /* 书本切换 */ }
});
```

## 数据结构

### 条目 (Entry)
```javascript
{
    id: 'entry_xxx',
    bookId: 'wb_xxx',      // 所属书本
    name: '条目名称',
    keys: ['关键词1', '关键词2'],
    excludeKeys: ['排除词'],
    content: '条目内容',
    priority: 100,         // 0-1000
    insertPosition: 'character', // system/character/user/example
    group: '分组名',
    matchType: 'contains', // contains/exact/prefix/suffix/regex
    constant: false,       // 是否始终触发
    enabled: true          // 是否启用
}
```

### 世界书存储格式
```javascript
{
    version: '2.0',
    gameId: 'xxx',
    exportedAt: '2026-01-15T10:30:00Z',
    books: [
        {
            id: 'wb_xxx',
            name: '书名',
            description: '描述',
            entries: [...],
            groups: { ... },
            enabled: true,
            ...
        }
    ],
    activeBookIds: ['wb_xxx', 'wb_yyy']
}
```

## 迁移指南

### 从旧系统迁移

新系统会自动从旧格式迁移数据：

1. 首次加载时，系统会检查旧的世界书数据
2. 将旧条目迁移到新创建的默认世界书中
3. 旧数据会被删除以避免重复

### 手动导入 SillyTavern Lorebook

```javascript
// Lorebook 格式
const lorebook = {
    name: 'Lorebook Name',
    description: 'Description',
    entries: [
        {
            uid: 1,
            key: ['keyword1', 'keyword2'],
            keysecondary: [],
            comment: 'Entry Name',
            content: 'Entry content...',
            constant: false,
            order: 100,
            position: 1,
            disable: false
        }
    ]
};

// 导入
const book = library.importBook(lorebook, 'lorebook', { isUserBook: true });
```

## 使用场景

### 场景1：多世界管理
```javascript
// 创建多本世界书
const geoBook = library.createBook({ name: '地理设定' });
const charBook = library.createBook({ name: '人物设定' });
const histBook = library.createBook({ name: '历史事件' });

// 同时激活
library.activateBook(geoBook.id);
library.activateBook(charBook.id);
library.activateBook(histBook.id);

// 用户消息会触发所有激活书本中的条目
```

### 场景2：模组/扩展
```javascript
// 主世界书
const mainBook = library.createBook({ name: '主线设定', isGlobal: true });

// 玩家自制扩展
const modBook = library.createBook({ name: '我的扩展', isUserBook: true });

// 可以独立开关
library.deactivateBook(mainBook.id);
library.activateBook(modBook.id);
```

### 场景3：版本控制
```javascript
// 创建新版世界书
const v1 = library.createBook({ name: '设定 V1' });
const v2 = library.createBook({ name: '设定 V2' });

// 复制条目
v1.entries.forEach(e => v2.addEntry(e));

// 测试新版本
library.activateBook(v2.id);
```

## 与游戏集成

### 游戏中使用
```javascript
// 初始化
const library = new WorldbookLibrary({ gameId });

// 发送消息时检测触发
function onUserMessage(text) {
    const context = {
        userName: currentUser.name,
        characterName: currentCharacter.name,
        recentMessages: lastMessages
    };
    
    const triggered = library.detectTriggers(text, context);
    
    // 构建提示词
    const builder = new PromptBuilder(config);
    builder.addWorldbook(triggered);
    const prompt = builder.build();
    
    // 发送给 AI
    sendToAI(prompt);
}
```

## 性能优化

1. **缓存机制** - Engine 实例会缓存，直到书本状态改变
2. **延迟加载** - 条目只在需要时加载到内存
3. **增量更新** - 条目更新只影响相关书本

## 最佳实践

1. **合理分组** - 使用分组来组织条目，便于管理
2. **设置优先级** - 重要条目设置更高优先级
3. **使用排除关键词** - 避免不必要的触发
4. **定期导出备份** - 使用导出功能备份世界书
5. **测试触发** - 使用测试功能验证关键词设置

## API 参考

### WorldBook 方法
- `addEntry(data)` - 添加条目
- `updateEntry(id, updates)` - 更新条目
- `deleteEntry(id)` - 删除条目
- `getEnabledEntries()` - 获取启用的条目
- `exportToLorebook()` - 导出为 SillyTavern 格式

### WorldbookLibrary 方法
- `createBook(options)` - 创建新书
- `deleteBook(id)` - 删除书本
- `activateBook(id)` - 激活书本
- `deactivateBook(id)` - 停用书本
- `getAllActiveEntries()` - 获取所有激活条目
- `detectTriggers(text, context)` - 检测触发
- `importBook(data, format)` - 导入书本
- `exportBook(id, format)` - 导出书本
- `exportLibrary()` - 导出整个图书馆

## 注意事项

1. 新旧系统同时存在，旧系统用于向后兼容
2. 新系统的书本存储在独立的 localStorage 键中
3. 迁移是一次性的，旧数据会被删除
4. 激活多本书时，条目按优先级排序，不区分来源书本
