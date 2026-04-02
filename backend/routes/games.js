const express = require('express');
const router = express.Router();
const Game = require('../models/game');
const Character = require('../models/character');
const { WorldbookEntry } = require('../models');
const ResponseUtil = require('../utils/response');
const Logger = require('../utils/logger');
const config = require('../config');
const authMiddleware = require('../middleware/auth');

/**
 * 获取游戏列表
 * GET /api/games
 */
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      genre, 
      tag, 
      search,
      sort = 'newest' // newest, popular, rating
    } = req.query;
    
    const query = { 
      status: 'published',
      visibility: 'public'
    };
    
    if (genre) query.genre = genre;
    if (tag) query.tags = { $in: [tag] };
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    // 排序
    let sortOption = {};
    switch (sort) {
      case 'popular':
        sortOption = { 'stats.plays': -1 };
        break;
      case 'rating':
        sortOption = { 'stats.rating': -1 };
        break;
      case 'newest':
      default:
        sortOption = { createdAt: -1 };
    }
    
    const games = await Game.find(query)
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('-worldSetting'); // 不返回详细设定
    
    const total = await Game.countDocuments(query);
    
    ResponseUtil.paginate(res, games, {
      page: parseInt(page),
      pageSize: parseInt(limit),
      total
    });
  } catch (error) {
    Logger.error('获取游戏列表失败:', error);
    ResponseUtil.error(res, '获取游戏列表失败', 500);
  }
});

/**
 * 获取我的游戏（需要认证）
 * GET /api/games/my
 */
router.get('/my', authMiddleware.verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { status } = req.query;
    
    const query = { creator: userId };
    if (status) query.status = status;
    
    const games = await Game.find(query)
      .sort({ updatedAt: -1 });
    
    ResponseUtil.success(res, games);
  } catch (error) {
    Logger.error('获取我的游戏失败:', error);
    ResponseUtil.error(res, '获取我的游戏失败', 500);
  }
});

/**
 * 获取游戏详情
 * GET /api/games/:slug
 */
router.get('/:slug', async (req, res) => {
  try {
    // 先查找游戏（不限制状态，让创建者可以访问草稿）
    const game = await Game.findOne({ slug: req.params.slug });
    
    if (!game) {
      return ResponseUtil.error(res, '游戏不存在', 404);
    }
    
    // 如果游戏是草稿状态，只有创建者可以访问
    if (game.status === 'draft') {
      const authHeader = req.headers.authorization;
      let isCreator = false;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const jwt = require('jsonwebtoken');
          const config = require('../config');
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, config.jwt.secret);
          isCreator = decoded.userId === game.creator;
        } catch (e) {
          // Token 无效，视为非创建者
        }
      }
      
      if (!isCreator) {
        return ResponseUtil.error(res, '游戏尚未发布', 403);
      }
    }
    
    // 增加播放次数（仅已发布游戏）
    if (game.status === 'published' && game.incrementPlays) {
      await game.incrementPlays();
    }
    
    ResponseUtil.success(res, game);
  } catch (error) {
    Logger.error('获取游戏详情失败:', error);
    ResponseUtil.error(res, '获取游戏详情失败', 500);
  }
});

/**
 * 获取推荐游戏
 * GET /api/games/featured/list
 */
router.get('/featured/list', async (req, res) => {
  try {
    // 获取热门游戏
    const popular = await Game.find({ 
      status: 'published',
      visibility: 'public'
    })
      .sort({ 'stats.plays': -1 })
      .limit(6)
      .select('-worldSetting');
    
    // 获取最新游戏
    const newest = await Game.find({ 
      status: 'published',
      visibility: 'public'
    })
      .sort({ createdAt: -1 })
      .limit(6)
      .select('-worldSetting');
    
    // 获取高分游戏
    const topRated = await Game.find({ 
      status: 'published',
      visibility: 'public',
      'stats.rating': { $gt: 0 }
    })
      .sort({ 'stats.rating': -1 })
      .limit(6)
      .select('-worldSetting');
    
    ResponseUtil.success(res, {
      popular,
      newest,
      topRated
    });
  } catch (error) {
    Logger.error('获取推荐游戏失败:', error);
    ResponseUtil.error(res, '获取推荐游戏失败', 500);
  }
});

/**
 * 获取游戏分类
 * GET /api/games/genres/all
 */
router.get('/genres/all', async (req, res) => {
  try {
    const genres = await Game.distinct('genre', { status: 'published' });
    const tags = await Game.distinct('tags', { status: 'published' });
    
    ResponseUtil.success(res, {
      genres: genres.filter(g => g),
      tags: tags.filter(t => t).slice(0, 50) // 限制标签数量
    });
  } catch (error) {
    Logger.error('获取分类失败:', error);
    ResponseUtil.error(res, '获取分类失败', 500);
  }
});

/**
 * 创建游戏（需要认证）
 * POST /api/games
 */
router.post('/', authMiddleware.verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const userName = req.username;
    
    const {
      title,
      subtitle,
      slug,
      cover,
      background,
      description,
      worldSetting,
      genre,
      tags,
      config
    } = req.body;
    
    // 验证必填项
    if (!title || !slug) {
      return ResponseUtil.error(res, '标题和标识不能为空', 400);
    }
    
    // 检查 slug 是否已存在
    const existing = await Game.findOne({ slug });
    if (existing) {
      return ResponseUtil.error(res, '游戏标识已存在', 409);
    }
    
    // 构建默认配置
    const defaultConfig = {
      openingMessage: `欢迎来到《${title}》！${subtitle || ''}`,
      themeColor: '#8a6d3b',
      allowCustomCharacter: true,
      enableWorldbook: true,
      ...(config || {})
    };

    const game = await Game.create({
      title,
      subtitle,
      slug,
      cover,
      background,
      description,
      worldSetting,
      genre: genre || '其他',
      tags: tags || [],
      creator: userId,
      creatorName: userName,
      config: defaultConfig,
      status: 'draft',
      visibility: 'public'
    });
    
    // 为新世界创建默认角色
    await createDefaultCharactersForGame(game._id);
    
    Logger.info(`用户 ${userId} 创建了新游戏: ${title}`);
    ResponseUtil.success(res, game, '游戏创建成功', 201);
  } catch (error) {
    Logger.error('创建游戏失败:', error);
    ResponseUtil.error(res, '创建游戏失败: ' + error.message, 500);
  }
});

/**
 * 更新游戏（需要认证）
 * PUT /api/games/:id
 */
router.put('/:id', authMiddleware.verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const userRole = req.userRole;
    
    // 先查找游戏
    const game = await Game.findById(req.params.id);
    if (!game) {
      return ResponseUtil.error(res, '游戏不存在', 404);
    }
    
    // 检查权限（创建者、管理员，或系统创建的游戏）
    const isCreator = game.creator && game.creator === userId;
    const isAdmin = userRole === 'admin';
    const isSystemGame = !game.creator || game.creatorName === '系统';
    
    // 系统创建的游戏允许所有登录用户编辑（用于测试），否则只有创建者或管理员可编辑
    if (!isCreator && !isAdmin && !isSystemGame) {
      return ResponseUtil.error(res, '无权限编辑此游戏（作者才能编辑）', 403);
    }
    
    // 更新字段
    const updateFields = ['title', 'subtitle', 'cover', 'background', 
                         'description', 'worldSetting', 'genre', 'tags', 
                         'config', 'status', 'visibility'];
    
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        game[field] = req.body[field];
      }
    });
    
    game.version += 1;
    await game.save();
    
    Logger.info(`用户 ${userId} 更新了游戏: ${game.title}`);
    ResponseUtil.success(res, game, '游戏更新成功');
  } catch (error) {
    Logger.error('更新游戏失败:', error);
    ResponseUtil.error(res, '更新游戏失败', 500);
  }
});

/**
 * 获取我的单个游戏详情（用于编辑）
 * GET /api/games/:id/edit
 */
router.get('/:id/edit', authMiddleware.verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    const game = await Game.findById(req.params.id);
    if (!game) {
      return ResponseUtil.error(res, '游戏不存在', 404);
    }
    
    // 检查权限（创建者、管理员，或系统创建的游戏）
    const isCreator = game.creator && game.creator === userId;
    const isAdmin = req.userRole === 'admin';
    const isSystemGame = !game.creator || game.creatorName === '系统';
    
    // 系统创建的游戏允许所有登录用户编辑（用于测试），否则只有创建者或管理员可编辑
    if (!isCreator && !isAdmin && !isSystemGame) {
      return ResponseUtil.error(res, '无权限编辑此游戏（作者才能编辑）', 403);
    }
    
    // 获取该游戏的角色
    const characters = await Character.find({ gameId: game._id });
    
    ResponseUtil.success(res, { game, characters });
  } catch (error) {
    Logger.error('获取游戏编辑详情失败:', error);
    ResponseUtil.error(res, '获取游戏编辑详情失败', 500);
  }
});

/**
 * 发布游戏（需要认证）
 * POST /api/games/:id/publish
 */
router.post('/:id/publish', authMiddleware.verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    const game = await Game.findById(req.params.id);
    if (!game) {
      return ResponseUtil.error(res, '游戏不存在', 404);
    }
    
    // 检查权限
    if (game.creator !== userId && req.userRole !== 'admin') {
      return ResponseUtil.error(res, '无权限发布此游戏', 403);
    }
    
    // 验证必要字段
    if (!game.title || !game.description) {
      return ResponseUtil.error(res, '游戏标题和简介不能为空', 400);
    }
    
    const updatedGame = await Game.findByIdAndUpdate(req.params.id, {
      status: 'published',
      visibility: 'public',
      publishedAt: new Date(),
      updatedAt: new Date()
    });
    
    Logger.info(`用户 ${userId} 发布了游戏: ${game.title}`);
    ResponseUtil.success(res, updatedGame, '游戏发布成功');
  } catch (error) {
    Logger.error('发布游戏失败:', error);
    ResponseUtil.error(res, '发布游戏失败', 500);
  }
});

/**
 * 下架游戏（需要认证）
 * POST /api/games/:id/unpublish
 */
router.post('/:id/unpublish', authMiddleware.verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    const game = await Game.findById(req.params.id);
    if (!game) {
      return ResponseUtil.error(res, '游戏不存在', 404);
    }
    
    // 检查权限
    if (game.creator !== userId && req.userRole !== 'admin') {
      return ResponseUtil.error(res, '无权限下架此游戏', 403);
    }
    
    const updatedGame = await Game.findByIdAndUpdate(req.params.id, {
      status: 'draft',
      updatedAt: new Date()
    });
    
    Logger.info(`用户 ${userId} 下架了游戏: ${game.title}`);
    ResponseUtil.success(res, updatedGame, '游戏已下架');
  } catch (error) {
    Logger.error('下架游戏失败:', error);
    ResponseUtil.error(res, '下架游戏失败', 500);
  }
});

/**
 * 删除游戏（需要认证）
 * DELETE /api/games/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.userId;
    
    const game = await Game.findOneAndDelete({ 
      _id: req.params.id, 
      creator: userId 
    });
    
    if (!game) {
      return ResponseUtil.error(res, '游戏不存在或无权限', 404);
    }
    
    Logger.info(`用户 ${userId} 删除了游戏: ${game.title}`);
    ResponseUtil.success(res, null, '游戏删除成功');
  } catch (error) {
    Logger.error('删除游戏失败:', error);
    ResponseUtil.error(res, '删除游戏失败', 500);
  }
});

/**
 * Fork 游戏（需要认证）
 * POST /api/games/:id/fork
 */
router.post('/:id/fork', async (req, res) => {
  try {
    const userId = req.userId;
    const userName = req.username;
    
    const originalGame = await Game.findById(req.params.id);
    if (!originalGame) {
      return ResponseUtil.error(res, '原游戏不存在', 404);
    }
    
    // 创建副本
    const newSlug = `${originalGame.slug}-copy-${Date.now()}`;
    const newGame = await Game.create({
      title: `${originalGame.title} (副本)`,
      subtitle: originalGame.subtitle,
      slug: newSlug,
      cover: originalGame.cover,
      background: originalGame.background,
      description: originalGame.description,
      worldSetting: originalGame.worldSetting,
      genre: originalGame.genre,
      tags: originalGame.tags,
      creator: userId,
      creatorName: userName,
      config: originalGame.config,
      parentGame: originalGame._id,
      status: 'draft'
    });
    
    Logger.info(`用户 ${userId} Fork 了游戏: ${originalGame.title}`);
    ResponseUtil.success(res, newGame, '游戏复制成功', 201);
  } catch (error) {
    Logger.error('Fork 游戏失败:', error);
    ResponseUtil.error(res, '复制游戏失败', 500);
  }
});

/**
 * 点赞游戏（需要认证）
 * POST /api/games/:id/like
 */
router.post('/:id/like', async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return ResponseUtil.error(res, '游戏不存在', 404);
    }
    
    game.stats.likes += 1;
    await game.save();
    
    ResponseUtil.success(res, { likes: game.stats.likes }, '点赞成功');
  } catch (error) {
    Logger.error('点赞失败:', error);
    ResponseUtil.error(res, '点赞失败', 500);
  }
});

/**
 * 初始化默认游戏
 * 在系统启动时自动创建"大荒九丘"作为示例
 */
async function initDefaultGames() {
  try {
    // 检查是否已存在默认游戏
    const existing = await Game.findOne({ slug: 'dahuang-jiuqiu' });
    if (existing) {
      Logger.info('默认游戏已存在，跳过初始化');
      return;
    }

    const defaultGame = await Game.create({
      title: '大荒九丘',
      subtitle: '坏空之纪 · 修仙末世',
      slug: 'dahuang-jiuqiu',
      cover: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'500\'%3E%3Cdefs%3E%3ClinearGradient id=\'g\' x1=\'0%25\' y1=\'0%25\' x2=\'100%25\' y2=\'100%25\'%3E%3Cstop offset=\'0%25\' stop-color=\'%231a1a2e\'/%3E%3Cstop offset=\'50%25\' stop-color=\'%2316213e\'/%3E%3Cstop offset=\'100%25\' stop-color=\'%230f3460\'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill=\'url(%23g)\' width=\'400\' height=\'500\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' fill=\'%238a6d3b\' font-family=\'Microsoft YaHei\' font-size=\'24\' text-anchor=\'middle\'%3E大荒九丘%3C/text%3E%3C/svg%3E',
      background: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'1920\' height=\'1080\'%3E%3Cdefs%3E%3ClinearGradient id=\'g\' x1=\'0%25\' y1=\'0%25\' x2=\'100%25\' y2=\'100%25\'%3E%3Cstop offset=\'0%25\' stop-color=\'%231a1a2e\'/%3E%3Cstop offset=\'50%25\' stop-color=\'%2316213e\'/%3E%3Cstop offset=\'100%25\' stop-color=\'%230f3460\'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill=\'url(%23g)\' width=\'1920\' height=\'1080\'/%3E%3C/svg%3E',
      description: '这是一个灵气稀薄、充满劫灰的修仙末世。天地间的灵气混杂了"劫灰"，修行异常艰难且危险。九块漂浮在虚空中的巨大浮陆组成了这个世界，你将在这里开始你的修仙之旅。',
      worldSetting: `【世界名称】大荒九丘
【时代背景】坏空之纪

这是一个灵气稀薄、充满劫灰的修仙末世。天地间的灵气混杂了"劫灰"，修行异常艰难且危险。

【九大浮陆】
1. 中天轩辕丘 - 皇权中心，轩辕皇族统治
2. 北寒落星丘 - 主角所在地，落星剑宗
3. 西极极乐丘 - 魔道大本营
4. 南荒妖灵丘 - 妖族聚居地
5. 东海散仙丘 - 散修联盟

【修行境界】
练气 → 筑基 → 金丹 → 元婴 → 化神 → 反虚 → 真仙 → 金仙

【核心设定】
- 灵气熵增：灵气混杂劫灰，修行困难
- 飞升断绝：仙界壁障阻隔，真仙被困
- 人吃人的世界：修士成为他人的修炼资源`,
      genre: '修仙',
      tags: ['修仙', '末世', '暗黑', '剧情丰富'],
      creator: null, // 系统创建
      creatorName: '系统',
      config: {
        openingMessage: '欢迎来到大荒九丘。这是一个灵气稀薄、充满劫灰的修仙末世。九块浮陆漂浮在虚空中，弱水天河分隔彼此。你站在北寒落星丘的风雪中，前方是未知的命运...',
        themeColor: '#8a6d3b',
        allowCustomCharacter: true,
        enableWorldbook: true
      },
      status: 'published',
      visibility: 'public',
      stats: {
        plays: 999,
        likes: 88,
        favorites: 66
      }
    });

    Logger.info('默认游戏初始化成功:', defaultGame.title);

    // 创建默认角色并关联到该游戏
    await initDefaultCharacters(defaultGame._id);
    
    // 创建默认世界书条目
    await initDefaultWorldbookEntries();
    
  } catch (error) {
    Logger.error('初始化默认游戏失败:', error);
  }
}

/**
 * 初始化默认角色
 * 为大荒九丘创建三个默认角色
 */
async function initDefaultCharacters(gameId) {
  try {
    // 检查是否已有该游戏的角色
    const existingChars = await Character.find({ gameId });
    if (existingChars && existingChars.length > 0) {
      Logger.info('默认角色已存在，跳过初始化');
      return;
    }

    const defaultCharacters = config.defaults.characters.map(char => ({
      ...char,
      gameId: gameId,  // 关联到游戏
      createdAt: new Date()
    }));

    const createdChars = await Character.insertMany(defaultCharacters);
    Logger.info(`为游戏 ${gameId} 创建了 ${createdChars.length} 个默认角色`);
  } catch (error) {
    Logger.error('初始化默认角色失败:', error);
  }
}

/**
 * 初始化默认世界书条目
 * 为大荒九丘创建世界设定条目
 */
async function initDefaultWorldbookEntries() {
  try {
    // 检查是否已有世界书条目
    const existingEntries = await WorldbookEntry.find({});
    if (existingEntries && existingEntries.length > 0) {
      Logger.info('默认世界书条目已存在，跳过初始化');
      return;
    }

    const defaultEntries = [
      {
        name: '坏空之纪',
        keys: ['坏空', '劫灰', '末世', '灵气', '熵增'],
        content: '这是一个灵气稀薄、充满劫灰的修仙末世。天地间的灵气混杂了"劫灰"，修行异常艰难且危险。飞升之路已经断绝，真仙以上的存在被困在仙界，无法降临。修士们为了资源相互厮杀，是一个真正"人吃人"的世界。',
        group: '世界观',
        priority: 100,
        enabled: true
      },
      {
        name: '大荒九丘',
        keys: ['大荒', '九丘', '浮陆', '弱水天河'],
        content: '大荒九丘由九块漂浮在虚空中的巨大浮陆组成，被"弱水天河"分隔。包括：中天轩辕丘（皇权中心）、北寒落星丘（落星剑宗）、西极极乐丘（魔道大本营）、南荒妖灵丘（妖族聚居地）、东海散仙丘（散修联盟）等。',
        group: '地理',
        priority: 95,
        enabled: true
      },
      {
        name: '落星谷',
        keys: ['落星谷', '落星', '山谷', '北寒'],
        content: '落星谷是北寒落星丘的圣地，终年被冰雪覆盖。这里是主角陆苍雪修炼的地方，谷中埋藏着一条正在死去的"冰龙脉"，散发出精纯的冰系灵气。',
        group: '地理',
        priority: 90,
        enabled: true
      },
      {
        name: '轩辕皇族',
        keys: ['轩辕', '皇族', '神朝', '皇帝', '传送阵'],
        content: '轩辕皇族统治中天轩辕丘，掌握着通往其他八丘的传送阵。他们维持着脆弱的平衡，但也因垄断资源而备受争议。皇族血脉中流淌着上古真龙之力。',
        group: '势力',
        priority: 85,
        enabled: true
      },
      {
        name: '落星剑宗',
        keys: ['落星剑宗', '剑宗', '北寒'],
        content: '北寒落星丘的正道领袖门派，以剑修为主。宗门建立在死去的冰龙脉之上，擅长冰系剑法。当代宗主是一位化神期大能。',
        group: '势力',
        priority: 85,
        enabled: true
      },
      {
        name: '修行境界',
        keys: ['练气', '筑基', '金丹', '元婴', '化神', '反虚', '真仙', '金仙', '境界'],
        content: '【修行境界】练气 → 筑基 → 金丹 → 元婴 → 化神 → 反虚 → 真仙 → 金仙。由于坏空之纪的影响，化神以上突破极为困难，真仙以上更是被困仙界无法降临。',
        group: '设定',
        priority: 80,
        enabled: true
      }
    ];

    const createdEntries = await WorldbookEntry.insertMany(defaultEntries);
    Logger.info(`创建了 ${createdEntries.length} 个默认世界书条目`);
  } catch (error) {
    Logger.error('初始化默认世界书条目失败:', error);
  }
}

/**
 * 为新创建的游戏创建默认角色
 */
async function createDefaultCharactersForGame(gameId) {
  try {
    const defaultCharacters = [
      {
        name: '向导',
        color: '#FF69B4',
        prompt: '这是一个友好的向导角色，会帮助玩家了解这个世界。',
        enabled: true
      },
      {
        name: '伙伴',
        color: '#87CEFA', 
        prompt: '这是一个陪伴玩家的伙伴角色，会随玩家一起冒险。',
        enabled: true
      },
      {
        name: '导师',
        color: '#FF4500',
        prompt: '这是一个睿智的导师角色，会在关键时刻给予指导。',
        enabled: true
      }
    ].map(char => ({
      ...char,
      gameId: gameId,
      createdAt: new Date()
    }));

    await Character.insertMany(defaultCharacters);
    Logger.info(`为新游戏 ${gameId} 创建了 ${defaultCharacters.length} 个默认角色`);
  } catch (error) {
    Logger.error('为新游戏创建默认角色失败:', error);
  }
}

// 获取游戏聊天界面配置
router.get('/:id/chatui', async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return ResponseUtil.error(res, '游戏不存在', 404);
    }
    
    ResponseUtil.success(res, game.chatUIConfig || null);
  } catch (error) {
    Logger.error('获取聊天界面配置失败:', error);
    ResponseUtil.error(res, '获取配置失败', 500);
  }
});

// 更新游戏聊天界面配置
router.put('/:id/chatui', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { html, css, js } = req.body;
    
    const game = await Game.findById(req.params.id);
    if (!game) {
      return ResponseUtil.error(res, '游戏不存在', 404);
    }
    
    // 权限检查：只有作者或管理员可以修改
    const userId = req.userId;
    if (game.creator !== userId && req.userRole !== 'admin') {
      return ResponseUtil.error(res, '无权限修改此游戏', 403);
    }
    
    // 更新配置
    game.chatUIConfig = {
      html,
      css,
      js,
      updatedAt: new Date()
    };
    
    await Game.save(game);
    
    Logger.info(`更新游戏 ${req.params.id} 聊天界面配置`);
    ResponseUtil.success(res, game.chatUIConfig, '配置已保存');
  } catch (error) {
    Logger.error('保存聊天界面配置失败:', error);
    ResponseUtil.error(res, '保存配置失败', 500);
  }
});

// 修复游戏图片地址（将失效的外部图片替换为SVG占位图）
router.post('/fix-images', async (req, res) => {
  try {
    const games = await Game.find({});
    const fixedGames = [];
    
    // 默认的SVG占位图
    const defaultCover = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'500\'%3E%3Cdefs%3E%3ClinearGradient id=\'g\' x1=\'0%25\' y1=\'0%25\' x2=\'100%25\' y2=\'100%25\'%3E%3Cstop offset=\'0%25\' stop-color=\'%231a1a2e\'/%3E%3Cstop offset=\'50%25\' stop-color=\'%2316213e\'/%3E%3Cstop offset=\'100%25\' stop-color=\'%230f3460\'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill=\'url(%23g)\' width=\'400\' height=\'500\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' fill=\'%238a6d3b\' font-family=\'Microsoft YaHei\' font-size=\'24\' text-anchor=\'middle\'%3E游戏封面%3C/text%3E%3C/svg%3E';
    const defaultBackground = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'1920\' height=\'1080\'%3E%3Cdefs%3E%3ClinearGradient id=\'g\' x1=\'0%25\' y1=\'0%25\' x2=\'100%25\' y2=\'100%25\'%3E%3Cstop offset=\'0%25\' stop-color=\'%231a1a2e\'/%3E%3Cstop offset=\'50%25\' stop-color=\'%2316213e\'/%3E%3Cstop offset=\'100%25\' stop-color=\'%230f3460\'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill=\'url(%23g)\' width=\'1920\' height=\'1080\'/%3E%3C/svg%3E';
    
    for (const game of games) {
      let needsUpdate = false;
      const updates = {};
      
      // 检查封面图片
      if (game.cover && !game.cover.startsWith('data:')) {
        updates.cover = defaultCover;
        needsUpdate = true;
      }
      
      // 检查背景图片
      if (game.background && !game.background.startsWith('data:')) {
        updates.background = defaultBackground;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await Game.findByIdAndUpdate(game._id, {
          ...updates,
          updatedAt: new Date()
        });
        
        fixedGames.push({ 
          id: game._id, 
          title: game.title, 
          oldCover: game.cover ? game.cover.substring(0, 50) + '...' : 'none',
          oldBackground: game.background ? game.background.substring(0, 50) + '...' : 'none'
        });
        Logger.info(`修复游戏图片: ${game.title}`);
      }
    }
    
    ResponseUtil.success(res, { 
      fixed: fixedGames.length, 
      games: fixedGames 
    }, `已修复 ${fixedGames.length} 个游戏的图片地址`);
  } catch (error) {
    Logger.error('修复游戏图片失败:', error);
    ResponseUtil.error(res, '修复失败', 500);
  }
});

/**
 * 获取游戏的世界书条目
 * GET /api/games/:id/worldbook
 */
router.get('/:id/worldbook', authMiddleware.optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 检查游戏是否存在
    const game = await Game.findById(id);
    if (!game) {
      return ResponseUtil.error(res, '游戏不存在', 404);
    }
    
    // 获取游戏的世界书条目（包括没有gameId的全局条目）
    const entries = await WorldbookEntry.find({ $or: [{ gameId: id }, { gameId: null }, { gameId: { $exists: false } }] })
      .sort({ priority: -1, createdAt: -1 });
    
    ResponseUtil.success(res, {
      gameId: id,
      entries: entries,
      count: entries.length
    });
  } catch (error) {
    Logger.error('获取游戏世界书失败:', error);
    ResponseUtil.error(res, '获取世界书失败', 500);
  }
});

/**
 * 保存游戏的世界书（全局条目）
 * PUT /api/games/:id/worldbook
 */
router.put('/:id/worldbook', authMiddleware.optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { entries } = req.body;
    
    // 检查游戏是否存在
    let game = await Game.findById(id);
    
    // 检查权限（内存存储模式下跳过权限检查）
    const useMemoryStore = true; // 内存存储模式
    
    // 内存存储模式下，即使game不存在也允许操作
    if (!game && useMemoryStore) {
      console.log('[Worldbook] Memory store mode: game not found, but proceeding with worldbook save');
    } else if (!game) {
      return ResponseUtil.error(res, '游戏不存在', 404);
    }
    
    // 权限检查（仅在非内存存储模式下）
    if (!useMemoryStore && game && game.creator && game.creator !== userId && req.userRole !== 'admin') {
      return ResponseUtil.error(res, '无权限编辑此游戏的世界书', 403);
    }
    
    // 批量更新/创建世界书条目，并删除不在列表中的条目
    const results = [];
    const entryIds = [];
    
    for (const entry of entries || []) {
      const entryData = {
        ...entry,
        gameId: id,
        isGlobal: true
      };
      
      try {
        if (entry._id && !entry._id.toString().startsWith('wb_')) {
          // 更新现有条目
          const updated = await WorldbookEntry.findByIdAndUpdate(entry._id, {
            ...entryData,
            updatedAt: new Date()
          });
          if (updated) {
            results.push(updated);
            entryIds.push(entry._id.toString());
          }
        } else {
          // 创建新条目
          const created = await WorldbookEntry.create(entryData);
          results.push(created);
          entryIds.push(created._id.toString());
        }
      } catch (err) {
        Logger.error('保存世界书条目失败:', err);
      }
    }
    
    // 删除不在传入列表中的条目
    if (entryIds.length > 0) {
      const deleted = await WorldbookEntry.deleteMany({
        gameId: id,
        _id: { $nin: entryIds }
      });
      if (deleted.deletedCount > 0) {
        Logger.info(`删除了 ${deleted.deletedCount} 个不在列表中的世界书条目`);
      }
    } else {
      // 如果传入的条目为空，删除所有该游戏的世界书条目
      const deleted = await WorldbookEntry.deleteMany({ gameId: id });
      if (deleted.deletedCount > 0) {
        Logger.info(`清空了游戏 ${game.title} 的所有世界书条目: ${deleted.deletedCount} 条`);
      }
    }
    
    Logger.info(`用户 ${userId} 保存了游戏 ${game.title} 的世界书: ${results.length} 条`);
    ResponseUtil.success(res, {
      gameId: id,
      entries: results,
      count: results.length
    }, '世界书保存成功');
  } catch (error) {
    Logger.error('保存游戏世界书失败:', error);
    ResponseUtil.error(res, '保存世界书失败', 500);
  }
});

// 导出路由和初始化函数
module.exports = router;
module.exports.initDefaultGames = initDefaultGames;
