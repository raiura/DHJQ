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
// 注意：V2路由必须在旧版之前加载，否则会被旧版的 /:gameId 模式匹配
app.use('/api/gallery/v2', authMiddleware.optionalAuth, require('./routes/gallery-v2'));
app.use('/api/gallery', authMiddleware.optionalAuth, require('./routes/gallery'));
app.use('/api/characters', authMiddleware.optionalAuth, require('./routes/characters'));
app.use('/api/worldbook', authMiddleware.optionalAuth, require('./routes/worldbook'));
app.use('/api/settings', authMiddleware.optionalAuth, require('./routes/settings'));

// 3. 需要认证的路由（强制 verifyToken）
app.use('/api/user-characters', authMiddleware.verifyToken, require('./routes/userCharacters'));
app.use('/api/dialogue', authMiddleware.verifyToken, require('./routes/dialogue'));
app.use('/api/memories', authMiddleware.verifyToken, require('./routes/memories'));
app.use('/api/experiences', authMiddleware.verifyToken, require('./routes/experiences'));

// 检查是否为测试环境
const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID;

// 初始化默认游戏（异步，不阻塞启动）
if (!isTestEnvironment) {
  setTimeout(() => {
    if (gamesRouter.initDefaultGames) {
      gamesRouter.initDefaultGames();
    }
  }, 1000);

  // 初始化管理员账号
  setTimeout(async () => {
    try {
      const { User, useMemoryStore } = require('./models');
      if (useMemoryStore && User.initAdminUser) {
        await User.initAdminUser();
      }
    } catch (error) {
      Logger.error('初始化管理员账号失败:', error);
    }
  }, 1500);

  // 初始化Gallery V2测试数据（仅内存模式）
  setTimeout(async () => {
    try {
      const GalleryV2 = require('./models/gallery-v2');
      const memoryStore = require('./utils/memoryStore');
      
      // 检查是否已有数据
      const existing = await GalleryV2.find({});
      if (existing.length === 0) {
        Logger.info('[Gallery V2] 初始化测试数据...');
        
        const testGameId = 'demo_game_001';
        const testCGs = [
          {
            gameId: testGameId,
            name: '雪地战斗-拔剑',
            url: 'https://images.unsplash.com/photo-1514539079130-25950c84af65?w=800',
            type: 'character_extended',
            triggerSystem: {
              mode: 'tag_match',
              conditions: {
                sceneKeywords: ['雪地', '战斗', '剑'],
                emotions: ['愤怒', '专注'],
                actions: ['拔剑']
              },
              priority: 800,
              probability: 1.0
            },
            display: {
              mode: 'character_center',
              animation: { enter: 'zoom', duration: 500 },
              zIndex: 10
            }
          },
          {
            gameId: testGameId,
            name: '温泉放松',
            url: 'https://images.unsplash.com/photo-1575425186775-b8de9a427e67?w=800',
            type: 'character_extended',
            triggerSystem: {
              mode: 'tag_match',
              conditions: {
                sceneKeywords: ['温泉', '放松'],
                emotions: ['开心', '放松']
              },
              priority: 600,
              probability: 1.0
            },
            display: {
              mode: 'character_center',
              animation: { enter: 'fade', duration: 800 },
              zIndex: 10
            }
          },
          {
            gameId: testGameId,
            name: '星空浪漫',
            url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=800',
            type: 'character_extended',
            triggerSystem: {
              mode: 'tag_match',
              conditions: {
                sceneKeywords: ['星空', '浪漫'],
                emotions: ['害羞', '爱恋'],
                relationshipStates: ['热恋']
              },
              priority: 900,
              probability: 0.9
            },
            constraints: {
              prerequisites: { minFavor: 70 }
            },
            display: {
              mode: 'character_center',
              animation: { enter: 'fade', duration: 1000 },
              zIndex: 10
            }
          }
        ];
        
        for (const cg of testCGs) {
          await GalleryV2.create(cg);
        }
        
        Logger.info(`[Gallery V2] 已创建 ${testCGs.length} 个测试CG，GameId: ${testGameId}`);
        Logger.info('[Gallery V2] 测试接口: GET /api/gallery/v2?gameId=demo_game_001');
        Logger.info('[Gallery V2] 测试匹配: POST /api/gallery/v2/match');
      }
    } catch (error) {
      Logger.error('初始化Gallery V2测试数据失败:', error);
    }
  }, 2000);
}

// 404 处理
app.use(errorHandler.notFound);

// 全局错误处理
app.use(errorHandler.global);

// 导出app供测试使用
if (isTestEnvironment) {
  module.exports = app;
  // 测试环境中不启动服务器
  Logger.info('测试环境：服务器已准备就绪，等待测试调用');
} else {
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
}
