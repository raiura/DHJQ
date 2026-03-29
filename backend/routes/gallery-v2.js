/**
 * Gallery V2.0 Routes
 * 世界角色CG自由拓展系统 API
 */

const express = require('express');
const router = express.Router();
const GalleryV2 = require('../models/gallery-v2');
const ResponseUtil = require('../utils/response');
const Logger = require('../utils/logger');
const authMiddleware = require('../middleware/auth');

// ===== 智能匹配接口（核心）- 必须在 /:id 之前定义 =====

/**
 * POST /api/gallery/v2/match
 * 智能匹配CG（核心API）
 */
router.post('/match', authMiddleware.optionalAuth, async (req, res) => {
  try {
    const { gameId, characterId, context, options = {} } = req.body;

    if (!gameId) {
      return ResponseUtil.error(res, 'gameId 不能为空', 400);
    }

    const {
      scene = '',
      emotion = '',
      action = '',
      relationshipState = {},
      currentCG = null
    } = context || {};

    // 构建查询条件
    let query = { gameId };

    // 获取所有候选CG
    let candidates = await GalleryV2.find(query);

    // 如果指定了角色，也获取该角色的专属CG
    if (characterId) {
      const charCGs = await GalleryV2.find({ gameId, characterId });
      // 合并并去重
      const existingIds = new Set(candidates.map(c => c._id));
      charCGs.forEach(cg => {
        if (!existingIds.has(cg._id)) candidates.push(cg);
      });
    }

    // 如果没有候选CG，返回空结果
    if (candidates.length === 0) {
      return ResponseUtil.success(res, {
        matches: [],
        suggestedSwitch: false,
        reason: '没有可用的CG'
      });
    }

    // 计算匹配分数
    const scoredMatches = candidates.map(cg => {
      // 检查约束条件
      const constraintCheck = cg.checkConstraints ? cg.checkConstraints(relationshipState) : { allowed: true };

      if (!constraintCheck.allowed) {
        return {
          ...cg,
          matchScore: 0,
          blocked: true,
          blockReason: constraintCheck.reason
        };
      }

      // 计算匹配分数
      const matchResult = cg.calculateMatchScore ? cg.calculateMatchScore({
        scene,
        emotion,
        action,
        relationshipState
      }) : { score: 0, details: [], probability: 1 };

      return {
        ...cg,
        matchScore: matchResult.score,
        matchDetails: matchResult.details,
        probability: matchResult.probability
      };
    });

    // 过滤掉被阻止的，并按分数排序
    const validMatches = scoredMatches
      .filter(m => !m.blocked && m.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);

    // 应用概率过滤
    const probabilisticMatches = validMatches.filter(m => {
      if (m.probability >= 1) return true;
      return Math.random() < m.probability;
    });

    // 确定是否建议切换
    const topMatch = probabilisticMatches[0];
    let suggestedSwitch = false;
    let confidence = 0;

    if (topMatch) {
      // 如果匹配度足够高，且不是当前CG，建议切换
      confidence = Math.min(topMatch.matchScore / 10, 1); // 归一化到0-1
      suggestedSwitch = confidence > 0.5 && topMatch._id !== currentCG;

      // 增加使用次数统计
      if (GalleryV2.findByIdAndUpdate) {
        GalleryV2.findByIdAndUpdate(topMatch._id, {
          $inc: { 'meta.usageCount': 1 }
        }).catch(() => {});
      }
    }

    ResponseUtil.success(res, {
      matches: probabilisticMatches.slice(0, options.maxResults || 3),
      topMatch: topMatch || null,
      suggestedSwitch,
      confidence: Math.round(confidence * 100) / 100,
      context: { scene, emotion, action },
      totalCandidates: candidates.length,
      validMatches: validMatches.length
    });

  } catch (error) {
    Logger.error('CG匹配失败:', error);
    ResponseUtil.error(res, 'CG匹配失败', 500);
  }
});

/**
 * POST /api/gallery/v2/test-match
 * 测试CG匹配效果（供settings界面使用）
 */
router.post('/test-match', authMiddleware.optionalAuth, async (req, res) => {
  try {
    const { gameId, testScenes, characterId } = req.body;

    if (!gameId || !testScenes || !Array.isArray(testScenes)) {
      return ResponseUtil.error(res, '参数错误', 400);
    }

    // 获取所有CG
    let query = { gameId };
    if (characterId) query.characterId = characterId;

    const allCGs = await GalleryV2.find(query);

    // 对每个测试场景进行匹配
    const results = testScenes.map(scene => {
      const matches = allCGs.map(cg => {
        const result = cg.calculateMatchScore ? cg.calculateMatchScore({
          scene,
          emotion: '',
          action: ''
        }) : { score: 0, details: [] };

        return {
          id: cg._id,
          name: cg.name,
          score: result.score,
          details: result.details,
          url: cg.url
        };
      }).sort((a, b) => b.score - a.score);

      return {
        scene,
        topMatches: matches.slice(0, 3),
        allMatches: matches.length
      };
    });

    ResponseUtil.success(res, {
      testScenes: results,
      totalCGs: allCGs.length
    }, '测试完成');

  } catch (error) {
    Logger.error('CG匹配测试失败:', error);
    ResponseUtil.error(res, '测试失败', 500);
  }
});

/**
 * GET /api/gallery/v2/character/:characterId
 * 获取角色的所有CG（基础8表情 + 图库拓展）
 */
router.get('/character/:characterId', authMiddleware.optionalAuth, async (req, res) => {
  try {
    const { gameId } = req.query;
    const { characterId } = req.params;

    if (!gameId) {
      return ResponseUtil.error(res, 'gameId 不能为空', 400);
    }

    // 获取该角色的所有CG
    const characterCGs = await GalleryV2.find({
      gameId,
      characterId
    });

    // 获取通用CG
    const genericCGs = await GalleryV2.find({
      gameId,
      characterId: null,
      type: { $in: ['background', 'scene_event'] }
    });

    ResponseUtil.success(res, {
      characterCGs,
      genericCGs,
      characterTotal: characterCGs.length,
      genericTotal: genericCGs.length
    });

  } catch (error) {
    Logger.error('获取角色CG失败:', error);
    ResponseUtil.error(res, '获取角色CG失败', 500);
  }
});

// ===== CRUD 基础接口 =====

/**
 * GET /api/gallery/v2
 * 获取图库列表（支持筛选）
 */
router.get('/', authMiddleware.optionalAuth, async (req, res) => {
  try {
    const { gameId, characterId, type, tag } = req.query;

    if (!gameId) {
      return ResponseUtil.error(res, 'gameId 不能为空', 400);
    }

    let query = { gameId };
    if (characterId !== undefined) query.characterId = characterId || null;
    if (type) query.type = type;

    const images = await GalleryV2.find(query, { sort: { 'meta.createdAt': -1 } });

    ResponseUtil.success(res, {
      images,
      count: images.length,
      filters: { gameId, characterId, type }
    });
  } catch (error) {
    Logger.error('获取图库V2失败:', error);
    ResponseUtil.error(res, '获取图库失败', 500);
  }
});

/**
 * POST /api/gallery/v2
 * 添加CG到图库
 */
router.post('/', authMiddleware.verifyToken, async (req, res) => {
  try {
    const data = req.body;

    if (!data.gameId || !data.name || !data.url) {
      return ResponseUtil.error(res, 'gameId、name、url 不能为空', 400);
    }

    const image = await GalleryV2.create({
      ...data,
      meta: {
        ...data.meta,
        creator: req.userId || 'unknown',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    Logger.info(`添加CG到图库V2: ${data.name} (${data.type || 'character_extended'})`);
    ResponseUtil.success(res, image, 'CG添加成功', 201);
  } catch (error) {
    Logger.error('添加CG失败:', error);
    ResponseUtil.error(res, '添加CG失败', 500);
  }
});

/**
 * GET /api/gallery/v2/:id
 * 获取单个CG详情
 */
router.get('/:id', authMiddleware.optionalAuth, async (req, res) => {
  try {
    const image = await GalleryV2.findById(req.params.id);

    if (!image) {
      return ResponseUtil.error(res, 'CG不存在', 404);
    }

    ResponseUtil.success(res, image);
  } catch (error) {
    Logger.error('获取CG详情失败:', error);
    ResponseUtil.error(res, '获取CG详情失败', 500);
  }
});

/**
 * PUT /api/gallery/v2/:id
 * 更新CG
 */
router.put('/:id', authMiddleware.verifyToken, async (req, res) => {
  try {
    const data = req.body;

    const image = await GalleryV2.findByIdAndUpdate(req.params.id, {
      ...data,
      'meta.updatedAt': new Date()
    });

    if (!image) {
      return ResponseUtil.error(res, 'CG不存在', 404);
    }

    Logger.info(`更新CG: ${image.name}`);
    ResponseUtil.success(res, image, 'CG更新成功');
  } catch (error) {
    Logger.error('更新CG失败:', error);
    ResponseUtil.error(res, '更新CG失败', 500);
  }
});

/**
 * DELETE /api/gallery/v2/:id
 * 删除CG
 */
router.delete('/:id', authMiddleware.verifyToken, async (req, res) => {
  try {
    const image = await GalleryV2.findByIdAndDelete(req.params.id);

    if (!image) {
      return ResponseUtil.error(res, 'CG不存在', 404);
    }

    Logger.info(`删除CG: ${image.name}`);
    ResponseUtil.success(res, null, 'CG删除成功');
  } catch (error) {
    Logger.error('删除CG失败:', error);
    ResponseUtil.error(res, '删除CG失败', 500);
  }
});

/**
 * POST /api/gallery/v2/:id/increment-usage
 * 增加CG使用次数
 */
router.post('/:id/increment-usage', authMiddleware.optionalAuth, async (req, res) => {
  try {
    const image = await GalleryV2.findById(req.params.id);

    if (!image) {
      return ResponseUtil.error(res, 'CG不存在', 404);
    }

    image.meta.usageCount = (image.meta.usageCount || 0) + 1;
    await GalleryV2.findByIdAndUpdate(req.params.id, image);

    ResponseUtil.success(res, { usageCount: image.meta.usageCount });
  } catch (error) {
    Logger.error('增加使用次数失败:', error);
    ResponseUtil.error(res, '操作失败', 500);
  }
});

module.exports = router;
