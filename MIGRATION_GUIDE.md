# 前端重构迁移指南

## 概述

本次重构将原有的单体HTML+JS代码拆分为模块化的架构，提高代码复用性和可维护性。

## 新架构概览

```
public/
├── css/
│   ├── base.css              # CSS变量、工具类、重置样式
│   └── components.css        # 可复用组件样式
├── js/
│   ├── core/                 # 核心模块
│   │   ├── api.js            # API请求封装
│   │   ├── auth.js           # 认证管理
│   │   ├── store.js          # 本地存储封装
│   │   └── utils.js          # 工具函数
│   ├── components/           # UI组件
│   │   ├── Toast.js          # 消息提示
│   │   ├── Modal.js          # 弹窗组件
│   │   ├── CharacterCard.js  # 角色卡片
│   │   └── MemoryList.js     # 记忆列表
│   ├── services/             # 业务服务
│   │   ├── characterService.js
│   │   ├── memoryService.js
│   │   └── dialogueService.js
│   ├── app.js                # 应用入口
│   └── loader.js             # 模块加载器
└── galgame_framework_v2.html # 重构后示例页面
```

## 快速开始

### 方式一：使用模块加载器（推荐）

```html
<!DOCTYPE html>
<html>
<head>
    <title>我的页面</title>
    <script src="js/loader.js"></script>
</head>
<body>
    <script>
        // 加载所需模块
        Loader.load(['app']).then(() => {
            // 模块加载完成，开始编写业务代码
            console.log('All modules loaded!');
        });
    </script>
</body>
</html>
```

### 方式二：手动引入模块

```html
<!-- 核心模块 -->
<script src="js/core/api.js"></script>
<script src="js/core/auth.js"></script>
<script src="js/core/store.js"></script>
<script src="js/core/utils.js"></script>

<!-- 组件 -->
<script src="js/components/Toast.js"></script>
<script src="js/components/Modal.js"></script>

<!-- 服务 -->
<script src="js/services/characterService.js"></script>

<!-- 样式 -->
<link rel="stylesheet" href="css/base.css">
<link rel="stylesheet" href="css/components.css">
```

## API变更对照

### 1. API请求

**旧代码：**
```javascript
const API_BASE = 'http://localhost:3000/api';
async function fetchCharacters() {
    const response = await fetch(`${API_BASE}/characters`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    return await response.json();
}
```

**新代码：**
```javascript
// 使用API模块
const characters = await API.get('/characters');

// 或使用服务层
const characters = await CharacterService.getAll();
```

### 2. 消息提示

**旧代码：**
```javascript
function showToast(message, type = 'info') {
    // 每个页面都复制这段代码
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
showToast('操作成功', 'success');
```

**新代码：**
```javascript
// 使用Toast组件
Toast.success('操作成功');
Toast.error('操作失败');
Toast.warning('警告信息');
Toast.info('普通消息');

// 自定义配置
Toast.show({
    type: 'SUCCESS',
    message: '自定义消息',
    duration: 5000,
    onClose: () => console.log('Toast closed')
});
```

### 3. 弹窗

**旧代码：**
```javascript
// 每个页面写一堆DOM操作
function showModal(content) {
    // ... 大量代码
}
```

**新代码：**
```javascript
// 确认对话框
const confirmed = await Modal.confirm({
    message: '确定要删除吗？',
    iconType: 'warning'
});

if (confirmed) {
    // 执行删除
}

// 信息提示
await Modal.info('操作完成');

// 自定义弹窗
await Modal.open({
    title: '自定义标题',
    content: '内容',
    size: 'large',
    footerButtons: [
        { text: '取消', type: 'default' },
        { text: '确认', type: 'primary', onClick: () => {} }
    ]
});
```

### 4. 本地存储

**旧代码：**
```javascript
// 到处重复的localStorage操作
localStorage.setItem('user', JSON.stringify(user));
const user = JSON.parse(localStorage.getItem('user'));
```

**新代码：**
```javascript
// 使用Store模块
Store.set('user', user);
const user = Store.get('user');

// 带过期时间
Store.setWithExpiry('tempData', data, 60000); // 1分钟后过期

// 命名空间存储
AppStores.favor.set('characters', favorData);
AppStores.settings.set('theme', 'dark');
```

### 5. 角色数据获取

**旧代码：**
```javascript
async function loadCharacters() {
    const response = await fetch('http://localhost:3000/api/characters');
    const data = await response.json();
    // 手动合并好感度数据
    const favorData = JSON.parse(localStorage.getItem('galgame_character_favor') || '{}');
    return data.map(char => ({...char, ...favorData[char._id]}));
}
```

**新代码：**
```javascript
// 使用CharacterService
const characters = await CharacterService.getAll();

// 自动处理：
// - API错误重试
// - 本地好感度合并
// - 缓存管理
```

### 6. DOM操作

**旧代码：**
```javascript
document.querySelector('.my-class').addEventListener('click', fn);
const el = document.createElement('div');
el.className = 'test';
el.textContent = 'text';
```

**新代码：**
```javascript
// DOM工具
DOM.$('.my-class').addEventListener('click', fn);

// 创建元素
const el = DOM.create('div', {
    className: 'test',
    dataset: { id: '123' }
}, 'text');

// 安全的HTML转义
DOM.insertHTML(container, 'beforeend', DOM.escape(userInput));

// 事件委托
DOM.delegate(container, '.item', 'click', (e) => {
    console.log('Item clicked:', e.target);
});
```

### 7. 数据处理

**旧代码：**
```javascript
// 深拷贝
const copy = JSON.parse(JSON.stringify(obj));

// 数组去重
const unique = [...new Set(arr)];
```

**新代码：**
```javascript
// Data工具
const copy = Data.clone(obj);  // 更好的深拷贝
const unique = Data.unique(arr, 'id');  // 按字段去重
const grouped = Data.groupBy(arr, 'category');
const paginated = Data.paginate(arr, 1, 10);

// 合并对象
const merged = Data.merge(obj1, obj2, obj3);
```

### 8. 格式化

**旧代码：**
```javascript
// 到处重复的格式化函数
function formatDate(date) {
    // ...
}
```

**新代码：**
```javascript
// Format工具
Format.date(new Date(), 'YYYY-MM-DD HH:mm');
Format.number(1234567);  // "1,234,567"
Format.truncate(longText, 100);
Format.fileSize(1024 * 1024);  // "1 MB"
```

## 组件使用示例

### 角色卡片

```javascript
// 创建单个卡片
const card = new CharacterCard(character, {
    size: 'medium',
    showFavor: true,
    showTrust: true,
    onClick: (char) => console.log('Clicked:', char.name)
});
document.body.appendChild(card.getElement());

// 批量创建
const list = CharacterCard.createList(characters, {
    size: 'small',
    onClick: handleCharacterClick
});
document.getElementById('container').appendChild(list);
```

### 记忆列表

```javascript
const memoryList = new MemoryList({
    container: document.getElementById('memoryContainer'),
    memories: memories,
    type: 'all',  // all, short, long, core, experience
    showFilters: true,
    showPagination: true,
    pageSize: 10,
    onMemoryClick: (memory) => {
        console.log('Memory clicked:', memory);
    }
});

// 动态更新数据
memoryList.setData(newMemories);

// 添加单条记忆
memoryList.addMemory(newMemory);
```

## 工具函数

### 防抖/节流

```javascript
// 防抖（搜索输入）
const debouncedSearch = Fn.debounce((query) => {
    searchAPI(query);
}, 300);

// 节流（滚动事件）
const throttledScroll = Fn.throttle(() => {
    handleScroll();
}, 100);

// 重试
const result = await Fn.retry(async () => {
    return await riskyOperation();
}, 3, 1000);  // 重试3次，间隔1秒

// 睡眠
await Fn.sleep(1000);  // 等待1秒
```

### 颜色处理

```javascript
// 调整亮度
const lighter = Color.lighten('#667eea', 20);  // 变亮20%
const darker = Color.lighten('#667eea', -20);  // 变暗20%

// 转RGB
const rgb = Color.hexToRgb('#667eea');
// { r: 102, g: 126, b: 234 }
```

### 验证

```javascript
Validate.email('test@example.com');  // true
Validate.phone('13800138000');  // true
Validate.url('https://example.com');  // true
Validate.isEmpty('');  // true
```

## 认证管理

```javascript
// 检查登录状态
if (Auth.isLoggedIn()) {
    // 已登录
}

// 获取当前用户
const user = Auth.getUser();

// 检查角色
if (Auth.isAdmin()) {
    // 管理员功能
}

// 保护页面
Auth.guard('/login.html');  // 未登录则跳转

// 订阅状态变化
Auth.subscribe((state) => {
    console.log('Auth state changed:', state);
});
```

## 错误处理

```javascript
// 全局错误处理
App.handleError(error, { context: 'userAction' });

// 服务层自动处理
try {
    await CharacterService.update(id, data);
} catch (error) {
    // 错误已被Toast提示，此处可做额外处理
    console.error('Update failed:', error);
}
```

## 迁移检查清单

- [ ] 删除重复的 `API_BASE` 定义
- [ ] 删除重复的 `getAuthHeaders` 函数
- [ ] 删除重复的 Toast 实现
- [ ] 删除重复的 Modal 实现
- [ ] 替换原生 fetch 为 API 模块
- [ ] 替换 localStorage 直接操作为 Store 模块
- [ ] 替换字符串拼接为 DOM 工具
- [ ] 添加 JSDoc 注释到业务函数
- [ ] 将业务逻辑迁移到 Service 层
- [ ] 使用组件替换内联渲染代码

## 最佳实践

1. **优先使用服务层**：不要直接调用 `API.get()`，使用 `CharacterService.getAll()`
2. **使用组件**：不要手写 DOM，使用 `CharacterCard`、`MemoryList` 等组件
3. **错误处理**：使用 `App.handleError()` 统一处理错误
4. **存储管理**：使用 `AppStores` 命名空间避免键名冲突
5. **代码复用**：将通用逻辑提取到 `utils.js` 或使用现有工具

## 调试技巧

```javascript
// 查看已加载模块
console.log(Loader.getLoadedModules());

// 检查存储使用情况
console.log(`Storage: ${(Store.size() / 1024).toFixed(2)} KB`);

// 查看本地记忆统计
console.log(MemoryService.getLocalStats());
```
