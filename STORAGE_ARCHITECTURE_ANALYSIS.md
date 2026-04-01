# Galgame 项目存储架构分析报告

## 一、执行摘要

经过对三个前端页面（galgame_framework.html、settings.html、world-guide.html）和相关后端代码的深入分析，发现了**严重的存储不一致问题**。项目存在多重数据源、不一致的localStorage key命名、以及混乱的数据优先级策略。

---

## 二、各页面数据来源分析

### 2.1 galgame_framework.html（游戏主界面）

| 数据类型 | 主要来源 | 备用来源 | localStorage Key |
|---------|---------|---------|-----------------|
| 世界配置 | `GET /api/games/${slug}` | - | `galgame_current_world` (仅存储slug) |
| 角色数据 | `GET /api/characters` (带gameId筛选) | localStorage | 无直接存储 |
| 世界书 | `GET /api/games/${gameId}/worldbook` | `wb_global_${gameId}` | `wb_global_${gameId}` |
| 图库 | `GET /api/gallery/${gameId}` | - | 无 |
| 用户设置 | `GET /api/settings` | `user_settings_${gameId}` | `user_settings_${gameId}` |
| 聊天UI配置 | `GET /api/games/${gameId}/chatui` | `chatui_${gameId}` | `chatui_${gameId}` |

**数据加载逻辑**：
- 从URL或localStorage获取world slug
- 调用API加载世界配置
- 初始化世界书系统（优先API，失败回退localStorage）

### 2.2 settings.html（设置中心）

| 数据类型 | 主要来源 | 备用来源 | localStorage Key |
|---------|---------|---------|-----------------|
| 游戏信息 | `GET /api/games/${gameId}/edit` | - | 无 |
| 角色数据 | **localStorage优先** | `GET /api/games/${gameId}/edit` | `game_${gameId}_characters` |
| 世界书 | WorldbookManager | `GET /api/games/${gameId}/worldbook` | `wb_global_${gameId}` |
| 存档数据 | localStorage | - | `galgame_saves`, `galgame_current_save_${gameId}` |
| 用户设置 | localStorage | - | `user_settings_${gameId}` |

**关键问题**：settings.html 使用 localStorage 数据优先于后端数据！

### 2.3 world-guide.html（世界指南）

| 数据类型 | 主要来源 | 备用来源 | localStorage Key |
|---------|---------|---------|-----------------|
| 角色数据 | `GET /api/characters` | 无 | 无 |
| 世界书 | `GET /api/worldbook` | 无 | 无 |
| 世界配置 | 硬编码在HTML中 | - | - |

**关键问题**：
- 直接从全局API加载数据，**不区分游戏ID**
- 没有localStorage缓存机制
- 世界描述是硬编码的

---

## 三、发现的关键问题

### 3.1 问题1：localStorage Key 命名混乱

| 页面 | Key 命名 | 问题 |
|-----|---------|-----|
| galgame_framework | `galgame_current_world` | 存储slug，但其他页面用gameId |
| settings | `game_${gameId}_characters` | 使用下划线分隔 |
| settings | `wb_global_${gameId}` | 世界书使用wb前缀 |
| settings | `user_settings_${gameId}` | 用户设置 |
| world-guide | 无 | 不使用localStorage |

**风险**：Key命名不统一导致数据无法共享和同步。

### 3.2 问题2：数据优先级策略相反

**settings.html**（优先localStorage）：
```javascript
const localChars = JSON.parse(localStorage.getItem(`game_${gameId}_characters`) || '[]');
if (localChars.length > 0) {
    characters = [...localChars, ...backendOnlyChars];
}
```

**galgame_framework.html**（优先API）：
```javascript
try {
    const response = await fetch(`${API_BASE}/games/${gameId}/worldbook`);
    if (response.ok) {
        // 使用API数据
    }
} catch (error) {
    // 网络错误，使用本地存储
}
```

**风险**：两个页面可能显示完全不同的数据！

### 3.3 问题3：API路由使用不一致

| 数据 | galgame_framework | settings | world-guide |
|-----|------------------|----------|-------------|
| 角色 | `/characters?gameId=` | `/games/${id}/edit` 返回 | `/characters` (全局) |
| 世界书 | `/games/${id}/worldbook` | WorldbookManager | `/worldbook` (全局) |

**风险**：world-guide.html 调用全局API不传递gameId，返回所有游戏的数据！

### 3.4 问题4：缺失统一的数据管理层

虽然项目有 StorageService 和 WorldbookManager 类，但：
- world-guide.html 完全不使用这些服务
- settings.html 和 galgame_framework.html 使用方式不一致
- 没有强制的数据同步机制

### 3.5 问题5：世界书双系统并存

代码显示存在两套世界书系统：
- 旧系统：WorldbookManager
- 新系统 2.0：WorldbookLibrary

两者并存但未明确职责边界。

---

## 四、数据流向图

```
后端API (MongoDB/内存)
    |
    |-- GET /api/characters (全局)
    |-- GET /api/worldbook (全局)
    |-- GET /api/games/:id/worldbook (游戏特定)
    |-- GET /api/games/:id/edit
    |
    v
+-----------------------------------+     +-----------------------------------+
|   galgame_framework.html          |     |   settings.html                   |
|   - 优先API，回退localStorage     |     |   - 优先localStorage，API后备     |
|   - 使用 wb_global_${gameId}     |     |   - 使用 wb_global_${gameId}     |
+-----------------------------------+     +-----------------------------------+
                    |                                    |
                    | 数据可能不一致！                    | 数据可能不一致！
                    v                                    v
+-----------------------------------+     +-----------------------------------+
|   world-guide.html                |     |   用户看到不同内容                |
|   - 直接调用全局API               |     |   - 角色列表不一致                |
|   - 无localStorage                |     |   - 世界书内容不同                |
+-----------------------------------+     +-----------------------------------+
```

---

## 五、建议的统一方案

### 5.1 短期修复方案

#### 修复1：统一localStorage Key命名

```javascript
// 建议的统一命名规范
const STORAGE_KEYS = {
    // 全局
    TOKEN: 'galgame_token',
    USER: 'galgame_user',
    CURRENT_WORLD: 'galgame_current_world',
    SAVES: 'galgame_saves',
    
    // 游戏特定 (使用统一前缀)
    CHARACTERS: (gameId) => `galgame_${gameId}_characters`,
    WORLDBOOK: (gameId) => `galgame_${gameId}_worldbook`,
    SETTINGS: (gameId) => `galgame_${gameId}_settings`,
    CURRENT_SAVE: (gameId) => `galgame_${gameId}_current_save`,
    CHAT_UI: (gameId) => `galgame_${gameId}_chatui`
};
```

#### 修复2：统一数据优先级策略

所有页面采用 **API优先，本地缓存为辅** 的策略：

```javascript
// 统一的数据加载函数
async function loadData(key, apiEndpoint, gameId) {
    const storageKey = STORAGE_KEYS[key](gameId);
    
    // 1. 先尝试从API获取最新数据
    try {
        const response = await fetch(`${API_BASE}${apiEndpoint}`);
        if (response.ok) {
            const data = await response.json();
            // 更新本地缓存
            localStorage.setItem(storageKey, JSON.stringify(data));
            return { data, source: 'api' };
        }
    } catch (error) {
        console.warn(`API获取失败，使用本地缓存: ${key}`);
    }
    
    // 2. 回退到本地缓存
    const cached = localStorage.getItem(storageKey);
    if (cached) {
        return { data: JSON.parse(cached), source: 'cache' };
    }
    
    return { data: null, source: 'none' };
}
```

#### 修复3：修复world-guide.html

```javascript
// 修改loadCharacters和loadWorldbook函数，添加gameId过滤
async function loadCharacters() {
    const gameId = getGameIdFromUrl();
    const response = await fetch(`${API_BASE}/characters?gameId=${gameId}`, {
        headers: getAuthHeaders()
    });
    // ...
}

async function loadWorldbook() {
    const gameId = getGameIdFromUrl();
    const response = await fetch(`${API_BASE}/games/${gameId}/worldbook`, {
        headers: getAuthHeaders()
    });
    // ...
}
```

### 5.2 中长期重构方案

#### 方案1：强制使用StorageService

```javascript
// 在所有页面中使用统一的StorageService
const storage = getStorageService({ gameId });

// 读取数据
const { data, source } = await storage.get('characters');

// 保存数据
await storage.set('characters', characters);
```

#### 方案2：引入数据同步机制

```javascript
// 统一的同步机制
class DataSyncManager {
    async sync(gameId) {
        // 1. 从API获取最新数据
        // 2. 与本地数据对比
        // 3. 提示用户冲突
        // 4. 统一保存
    }
    
    async save(gameId, key, data) {
        // 1. 保存到API
        // 2. 成功后更新本地缓存
        // 3. 广播更新事件给其他页面
    }
}
```

#### 方案3：状态管理库

考虑引入轻量级状态管理：
- Pinia (Vue) 或 Zustand (React) - 如果迁移到框架
- 或自定义的 EventBus + 统一Store

---

## 六、实施优先级

| 优先级 | 修复项 | 影响 | 工作量 |
|-------|-------|-----|-------|
| P0 | 修复world-guide.html API调用 | 高 | 低 |
| P0 | 统一settings.html数据优先级 | 高 | 低 |
| P1 | 统一localStorage Key命名 | 中 | 中 |
| P1 | 创建统一数据加载函数 | 中 | 中 |
| P2 | 迁移到StorageService | 中 | 高 |
| P2 | 添加数据同步机制 | 低 | 高 |

---

## 七、总结

项目当前存在严重的存储架构问题：

1. **三个页面可能显示完全不同的数据**
2. **localStorage Key命名混乱，无法共享数据**
3. **数据优先级策略相反，导致数据覆盖风险**
4. **world-guide.html调用全局API，数据隔离失效**

建议立即实施P0级别的修复，确保数据一致性。
