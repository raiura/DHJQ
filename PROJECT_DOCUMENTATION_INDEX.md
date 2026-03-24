# 项目文档索引

> 大荒九丘 GalGame - 技术文档中心

---

## 📋 文档概览

本文档索引列出了项目所有的技术文档和报告，帮助开发者快速找到所需信息。

---

## 🆕 架构评估报告 (新)

| 文档 | 描述 | 优先级 |
|------|------|--------|
| **[ARCHITECTURE_ASSESSMENT_REPORT.md](ARCHITECTURE_ASSESSMENT_REPORT.md)** | 完整的项目架构评估报告，包含现状分析、问题识别、改进建议和重构路线图 | ⭐⭐⭐⭐⭐ |
| **[ARCHITECTURE_DIAGRAM.md](ARCHITECTURE_DIAGRAM.md)** | 详细的架构图，包括整体架构、前后端分层、数据流、部署架构等 | ⭐⭐⭐⭐⭐ |
| **[REFACTOR_TASKS.md](REFACTOR_TASKS.md)** | 具体的重构任务清单，包含优先级、工时估算、验收标准 | ⭐⭐⭐⭐⭐ |

---

## 📚 系统架构文档

### 核心架构

| 文档 | 描述 | 适用对象 |
|------|------|----------|
| **[DUAL_SYSTEM_SUMMARY.md](DUAL_SYSTEM_SUMMARY.md)** | 经历/记忆双系统架构总结，说明角色经历和玩家记忆两个独立系统的设计 | 全栈开发者 |
| **[CHAPTER_SAVE_GUIDE.md](CHAPTER_SAVE_GUIDE.md)** | 章节存档系统使用指南，包含API用法、数据结构、示例代码 | 前端开发者 |
| **[ARCHITECTURE_UPDATE.md](ARCHITECTURE_UPDATE.md)** | 架构更新记录，描述最新架构变更 | 全栈开发者 |

### 迁移指南

| 文档 | 描述 | 适用对象 |
|------|------|----------|
| **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** | 通用迁移指南 | 全栈开发者 |
| **[MIGRATION_EXAMPLES.md](MIGRATION_EXAMPLES.md)** | 具体的迁移示例代码 | 前端开发者 |
| **[SAVE_MIGRATION_GUIDE.md](SAVE_MIGRATION_GUIDE.md)** | 存档系统迁移指南 | 前端开发者 |
| **[SAVE_MEMORY_INTEGRATION.md](SAVE_MEMORY_INTEGRATION.md)** | 存档与记忆系统集成指南 | 全栈开发者 |

---

## 🎯 按角色查看文档

### 如果你是：前端开发者

**必读文档：**
1. [ARCHITECTURE_ASSESSMENT_REPORT.md](ARCHITECTURE_ASSESSMENT_REPORT.md) - 了解前端架构问题
2. [REFACTOR_TASKS.md](REFACTOR_TASKS.md) - 查看当前重构任务
3. [CHAPTER_SAVE_GUIDE.md](CHAPTER_SAVE_GUIDE.md) - 学习存档系统API

**参考文档：**
- [MIGRATION_EXAMPLES.md](MIGRATION_EXAMPLES.md) - 代码迁移示例
- [DUAL_SYSTEM_SUMMARY.md](DUAL_SYSTEM_SUMMARY.md) - 理解双系统设计

### 如果你是：后端开发者

**必读文档：**
1. [ARCHITECTURE_ASSESSMENT_REPORT.md](ARCHITECTURE_ASSESSMENT_REPORT.md) - 第2章后端架构分析
2. [ARCHITECTURE_DIAGRAM.md](ARCHITECTURE_DIAGRAM.md) - 后端架构图

**参考文档：**
- backend/models/ - 数据模型定义
- backend/routes/ - API路由

### 如果你是：项目管理者

**必读文档：**
1. [ARCHITECTURE_ASSESSMENT_REPORT.md](ARCHITECTURE_ASSESSMENT_REPORT.md) - 执行摘要和重构路线图
2. [REFACTOR_TASKS.md](REFACTOR_TASKS.md) - 任务分配和进度追踪

### 如果你是：新加入的开发者

**入门路径：**
1. [ARCHITECTURE_DIAGRAM.md](ARCHITECTURE_DIAGRAM.md) - 了解整体架构
2. [DUAL_SYSTEM_SUMMARY.md](DUAL_SYSTEM_SUMMARY.md) - 理解核心概念
3. [CHAPTER_SAVE_GUIDE.md](CHAPTER_SAVE_GUIDE.md) - 学习关键API

---

## 📊 文档统计

```
总文档数: 11
├── 架构评估报告: 3 (新)
├── 系统架构文档: 3
└── 迁移指南文档: 4
```

---

## 🔍 快速查找

### 按主题查找

| 主题 | 相关文档 |
|------|----------|
| **存档系统** | CHAPTER_SAVE_GUIDE.md, SAVE_MIGRATION_GUIDE.md |
| **经历系统** | DUAL_SYSTEM_SUMMARY.md, CHAPTER_SAVE_GUIDE.md |
| **记忆系统** | DUAL_SYSTEM_SUMMARY.md, SAVE_MEMORY_INTEGRATION.md |
| **重构任务** | REFACTOR_TASKS.md, ARCHITECTURE_ASSESSMENT_REPORT.md |
| **架构图** | ARCHITECTURE_DIAGRAM.md |
| **代码示例** | MIGRATION_EXAMPLES.md, CHAPTER_SAVE_GUIDE.md |

### 按问题查找

| 问题 | 查看文档 |
|------|----------|
| 如何创建章节存档？ | CHAPTER_SAVE_GUIDE.md 第2章 |
| 如何生成角色经历？ | CHAPTER_SAVE_GUIDE.md 第3章 |
| 如何添加玩家记忆？ | CHAPTER_SAVE_GUIDE.md 第4章 |
| 架构有什么问题？ | ARCHITECTURE_ASSESSMENT_REPORT.md 第3章 |
| 如何参与重构？ | REFACTOR_TASKS.md |
| 系统如何交互？ | ARCHITECTURE_DIAGRAM.md |

---

## 📅 文档更新计划

| 日期 | 更新内容 | 负责人 |
|------|----------|--------|
| 每周一 | REFACTOR_TASKS.md 进度更新 | 技术负责人 |
| 每月1日 | ARCHITECTURE_ASSESSMENT_REPORT.md 评审 | 架构师 |
| 按需 | 各技术文档更新 | 相关开发者 |

---

## 💡 文档使用建议

### 开始新项目时
1. 先阅读 [ARCHITECTURE_DIAGRAM.md](ARCHITECTURE_DIAGRAM.md) 了解整体架构
2. 查看 [DUAL_SYSTEM_SUMMARY.md](DUAL_SYSTEM_SUMMARY.md) 理解核心概念
3. 参考 [CHAPTER_SAVE_GUIDE.md](CHAPTER_SAVE_GUIDE.md) 使用关键API

### 进行重构时
1. 查看 [REFACTOR_TASKS.md](REFACTOR_TASKS.md) 了解当前任务
2. 参考 [MIGRATION_EXAMPLES.md](MIGRATION_EXAMPLES.md) 获取代码示例
3. 阅读 [ARCHITECTURE_ASSESSMENT_REPORT.md](ARCHITECTURE_ASSESSMENT_REPORT.md) 了解设计意图

### 遇到问题时
1. 查看本文档索引找到相关文档
2. 在对应文档中搜索关键词
3. 查看 [ARCHITECTURE_DIAGRAM.md](ARCHITECTURE_DIAGRAM.md) 理解数据流

---

## 📞 文档维护

如有文档相关问题或建议，请联系：
- 技术负责人
- 项目维护者

---

**最后更新**: 2026-03-19  
**文档版本**: v1.0
