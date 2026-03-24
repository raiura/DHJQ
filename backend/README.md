# GalGame 后端 API 文档

## 项目改进总结

### 1. 架构优化

#### 新增模块
- `config/` - 统一配置管理
- `middleware/` - 中间件（认证、错误处理）
- `utils/` - 工具函数（日志、响应格式）

#### 依赖更新
```json
{
  "bcryptjs": "^2.4.3",      // 密码加密
  "jsonwebtoken": "^9.0.2"   // JWT 认证
}
```

### 2. API 端点

#### 认证相关
```
POST   /api/auth/register     # 用户注册
POST   /api/auth/login        # 用户登录
GET    /api/auth/me           # 获取当前用户
```

#### 游戏相关
```
GET    /api/characters        # 获取角色列表
POST   /api/characters        # 创建角色
PUT    /api/characters/:id    # 更新角色
DELETE /api/characters/:id    # 删除角色

POST   /api/dialogue          # 生成AI对话
GET    /api/dialogue/history  # 获取对话历史

GET    /api/worldbook         # 获取世界书
PUT    /api/worldbook         # 更新世界书

GET    /api/settings          # 获取AI设置
PUT    /api/settings          # 更新AI设置
POST   /api/settings/test     # 测试AI连接

GET    /health                # 健康检查
```

### 3. 统一响应格式

#### 成功响应
```json
{
  "success": true,
  "message": "操作成功",
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 错误响应
```json
{
  "success": false,
  "message": "错误信息",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 4. 认证方式

所有需要认证的 API 需要在请求头中携带 JWT Token：

```
Authorization: Bearer <token>
```

Token 在登录/注册成功后返回，需要在前端保存到 localStorage。

### 5. 运行步骤

1. 安装依赖
```bash
cd backend
npm install
```

2. 配置环境变量（.env）
```env
MONGODB_URI=mongodb://localhost:27017/galgame
API_KEY=your-api-key
API_URL=https://api.siliconflow.cn/v1/chat/completions
MODEL=Pro/deepseek-ai/DeepSeek-V3.2
JWT_SECRET=your-secret-key
```

3. 启动服务器
```bash
npm run dev   # 开发模式
npm start     # 生产模式
```

### 6. 代码改进点

1. **配置集中管理** - 所有配置在 `config/index.js` 中统一管理
2. **统一响应格式** - 使用 `ResponseUtil` 统一 API 响应
3. **日志系统** - 使用 `Logger` 替代 console.log，支持分级日志
4. **错误处理** - 全局错误处理中间件，自动处理常见错误
5. **JWT 认证** - 完整的用户认证系统
6. **代码重构** - 减少重复代码，更好的错误降级处理
