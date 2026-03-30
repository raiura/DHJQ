# 风月项目存储策略统一指南

> 解决前后端存储不一致问题，统一数据流

---

## 当前问题

### 存储策略混乱

| 层级 | 当前策略 | 问题 |
|------|----------|------|
| 前端 | LocalStorage 为主 | 容量限制(5MB)，多端不同步 |
| 后端 | MongoDB/Memory 双模式 | 数据不一致风险 |
| 缓存 | 无统一策略 | 重复请求，性能差 |

### 具体问题

1. **数据不一致** - 前端LocalStorage与后端数据可能不同步
2. **中文乱码** - 文件编码问题导致中文显示异常
3. **数据丢失** - LocalStorage容量限制，大数据无法存储
4. **多端同步** - 无法实现跨设备数据同步

---

## 统一存储策略

### 原则

```
┌─────────────────────────────────────────────────────────────┐
│                     存储优先级金字塔                          │
│                                                             │
│                    ┌─────────────┐                          │
│                    │   API后端   │  ← 唯一真相源            │
│                    │  (MongoDB)  │                          │
│                    └──────┬──────┘                          │
│                           │                                 │
│              ┌────────────┼────────────┐                    │
│              ▼            ▼            ▼                    │
│        ┌─────────┐  ┌─────────┐  ┌─────────┐               │
│        │内存缓存 │  │LocalStorage│  │IndexedDB│               │
│        │(运行期) │  │(简单数据) │  │(大数据) │               │
│        └─────────┘  └─────────┘  └─────────┘               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 策略矩阵

| 数据类型 | 主存储 | 备份 | 缓存策略 | 同步频率 |
|----------|--------|------|----------|----------|
| 用户认证 | API | LocalStorage | 内存 | 实时 |
| 游戏配置 | API | LocalStorage | 内存 | 启动时 |
| 世界书 | API | LocalStorage | 内存 | 编辑后 |
| 记忆 | API | IndexedDB | 内存 | 实时 |
| 对话历史 | API | IndexedDB | 内存 | 每轮 |
| 用户设置 | LocalStorage | - | 内存 | 即时 |

---

## 编码规范

### 文件编码

**强制使用 UTF-8 with BOM 保存所有中文文件**

```javascript
// 正确的文件头应该有 BOM 标记
// EF BB BF (UTF-8 BOM)

// 读取文件时指定编码
const content = fs.readFileSync('file.js', 'utf8');
```

### 写入文件的正确方式

```javascript
// Node.js 写入中文文件
const fs = require('fs');

// 方法1: 使用 UTF-8 with BOM
function writeFileWithBOM(filepath, content) {
    const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
    const contentBuffer = Buffer.from(content, 'utf8');
    fs.writeFileSync(filepath, Buffer.concat([bom, contentBuffer]));
}

// 方法2: 使用 Promise 和 async/await
async function writeFileSafe(filepath, content) {
    try {
        await fs.promises.writeFile(filepath, content, { encoding: 'utf8' });
        console.log('文件写入成功:', filepath);
    } catch (err) {
        console.error('文件写入失败:', err);
    }
}
```

### 前端存储编码

```javascript
// LocalStorage 存储中文
function setStorage(key, value) {
    try {
        const json = JSON.stringify(value);
        localStorage.setItem(key, json);
    } catch (e) {
        console.error('存储失败:', e);
    }
}

function getStorage(key) {
    try {
        const json = localStorage.getItem(key);
        return json ? JSON.parse(json) : null;
    } catch (e) {
        console.error('读取失败:', e);
        return null;
    }
}
```

---

## 模块拆分后的文件结构

### 游戏模块 (game/modules/)

```
public/js/game/
├── modules/
│   ├── game-config.js              # 配置和常量
│   ├── game-api.js                 # API 调用
│   ├── game-emotion.js             # 情感系统
│   ├── game-worldbook-integration.js  # 世界书集成
│   ├── game-dialogue.js            # 对话系统
│   └── index.js                    # 模块入口
├── game-main.js                    # 主逻辑（精简）
└── ...
```

### 设置模块 (settings/modules/)

```
public/js/settings/
├── modules/
│   ├── settings-config.js          # 配置和状态
│   ├── settings-utils.js           # 工具函数
│   ├── settings-worldbook.js       # 世界书管理
│   ├── settings-memory.js          # 记忆管理
│   └── index.js                    # 模块入口
├── settings-main.js                # 主逻辑（精简）
└── ...
```

---

## API 优先策略

### 数据流

```
用户操作 ──► API请求 ──► 后端处理 ──► 数据库
                │
                ▼
            成功后 ──► 更新本地缓存 ──► 更新UI
```

### 降级策略

```javascript
// API 调用封装（带降级）
async function apiCallWithFallback(apiFn, localFallback) {
    try {
        const result = await apiFn();
        // 成功后更新本地缓存
        updateLocalCache(result);
        return { success: true, data: result, source: 'api' };
    } catch (error) {
        console.warn('API调用失败，使用本地数据:', error);
        const localData = localFallback();
        return { success: false, data: localData, source: 'local', error };
    }
}
```

---

## 实施步骤

### 阶段1: 编码规范 (已完成)
- [x] 所有新模块文件使用 UTF-8 编码
- [x] 添加 BOM 标记确保中文正确
- [x] 验证文件读取和写入

### 阶段2: 模块拆分 (已完成)
- [x] 拆分 game-main.js 为模块
- [x] 拆分 settings-main.js 为模块
- [x] 更新 HTML 加载顺序

### 阶段3: 存储统一 (进行中)
- [ ] 统一 API 调用封装
- [ ] 实现本地缓存层
- [ ] 添加数据同步机制

### 阶段4: 测试验证
- [ ] 测试中文显示
- [ ] 测试数据一致性
- [ ] 测试降级策略

---

## 检查清单

### 开发前检查
- [ ] 编辑器编码设置为 UTF-8
- [ ] 文件头部有 BOM 标记
- [ ] 中文注释正常显示

### 开发后检查
- [ ] 文件能正常打开无乱码
- [ ] 浏览器控制台无编码错误
- [ ] LocalStorage 中文正常

### 部署前检查
- [ ] 所有文件编码一致
- [ ] 备份原始文件
- [ ] 测试环境验证通过

---

## 常见问题

### Q: 中文显示乱码怎么办？
A: 检查文件编码是否为 UTF-8 with BOM，重新保存文件。

### Q: LocalStorage 满了怎么办？
A: 迁移到 IndexedDB，或压缩数据。

### Q: 前后端数据不一致？
A: 实施 API 优先策略，本地仅作缓存。

---

**最后更新**: 2026-03-30
