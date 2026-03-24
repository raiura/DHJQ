const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const config = require('./config');
const Logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const memoryStore = require('./utils/memoryStore');

// 创建 Express 应用
const app = express();

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 请求日志中间件
app.use((req, res, next) => {
  Logger.info(`${req.method} ${req.path}`, {
    query: req.query,
    ip: req.ip
  });
  next();
});

// 连接数据库（异步，不阻塞服务器启动）
let mongoConnected = false;

mongoose.connect(config.database.uri, {
  serverSelectionTimeoutMS: 5000 // 5秒超时
}).then(() => {
  mongoConnected = true;
  Logger.info('MongoDB 连接成功');
}).catch(err => {
  mongoConnected = false;
  Logger.error('MongoDB 连接失败:', err.message);
  Logger.warn('='.repeat(60));
  Logger.warn('服务器将以内存存储模式运行');
  Logger.warn('所有数据将在服务器重启后丢失');
  Logger.warn('='.repeat(60));
});

// 监听连接事件
mongoose.connection.on('connected', () => {
  mongoConnected = true;
  Logger.info('MongoDB 已连接');
});

mongoose.connection.on('error', (err) => {
  mongoConnected = false;
  Logger.error('MongoDB 连接错误:', err.message);
});

mongoose.connection.on('disconnected', () => {
  mongoConnected = false;
  Logger.warn('MongoDB 已断开连接');
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: require('./package.json').version,
    environment: config.server.env,
    database: mongoConnected ? 'mongodb' : 'memory'
  });
});

// 认证中间件
const authMiddleware = require('./middleware/auth');

// ============================================
// 路由注册（按认证级别分组）
// ============================================

// 1. 完全公开路由（无需认证）
app.use('/api/auth', require('./routes/auth'));

// 2. 混合路由（公开+私有，使用 optionalAuth）
// 这些路由内部根据 req.userId 是否存在来判断用户是否登录
const gamesRouter = require('./routes/games');
app.use('/api/games', authMiddleware.optionalAuth, gamesRouter);
app.use('/api/gallery', authMiddleware.optionalAuth, require('./routes/gallery'));
app.use('/api/characters', authMiddleware.optionalAuth, require('./routes/characters'));
app.use('/api/worldbook', authMiddleware.optionalAuth, require('./routes/worldbook'));
app.use('/api/settings', authMiddleware.optionalAuth, require('./routes/settings'));

// 3. 需要认证的路由（强制 verifyToken）
app.use('/api/user-characters', authMiddleware.verifyToken, require('./routes/userCharacters'));
app.use('/api/dialogue', authMiddleware.verifyToken, require('./routes/dialogue'));
app.use('/api/memories', authMiddleware.verifyToken, require('./routes/memories'));
app.use('/api/experiences', authMiddleware.verifyToken, require('./routes/experiences'));

// 初始化默认游戏（异步，不阻塞启动）
setTimeout(() => {
  if (gamesRouter.initDefaultGames) {
    gamesRouter.initDefaultGames();
  }
}, 1000);

// 初始化管理员账号
setTimeout(async () => {
  const { User, useMemoryStore } = require('./models');
  if (useMemoryStore && User.initAdminUser) {
    await User.initAdminUser();
  }
}, 1500);

// 404 处理
app.use(errorHandler.notFound);

// 全局错误处理
app.use(errorHandler.global);

// 启动服务器
const PORT = config.server.port;
app.listen(PORT, () => {
  Logger.info('='.repeat(60));
  Logger.info('GalGame 后端服务器已启动');
  Logger.info('端口:', PORT);
  Logger.info('环境:', config.server.env);
  Logger.info('API地址:', `http://localhost:${PORT}`);
  Logger.info('数据存储:', mongoConnected ? 'MongoDB' : '内存（重启后丢失）');
  Logger.info('='.repeat(60));
});

module.exports = app;
