/**
 * 角色经历档案 API 路由
 * 管理角色与玩家的重要时刻
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const ExperienceService = require('../services/experienceService');
const ExperienceMemoryBridge = require('../services/experienceMemoryBridge');
const Logger = require('../utils/logger');
const ResponseUtil = require('../utils/response');

/**
 * 获取角色经历档案
 * GET /api/experiences/:characterId
 */
router.get('/:characterId', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { characterId } = req.params;
    const { includeLocked = 'false', limit = 50 } = req.query;
    
    const result = await ExperienceService.getCharacterArchive(characterId, {
      includeLocked: includeLocked === 'true',
      limit: parseInt(limit)
    });
    
    if (!result.success) {
      return ResponseUtil.error(res, result.error, 500);
    }
    
    ResponseUtil.success(res, {
      characterId: result.data.characterId,
      experiences: result.data.experiences.map(exp => ({
        id: exp.id || exp._id,
        title: exp.title,
        summary: exp.summary,
        type: exp.type,
        gameDate: exp.gameDate,
        isUnlocked: exp.isUnlocked,
        isRevealed: exp.isRevealed,
        isNew: exp.isNew,
        isImportant: exp.isImportant,
        isSecret: exp.isSecret,
        emotionalImpact: exp.emotionalImpact,
        affinityAtCreation: exp.affinityAtCreation,
        tags: exp.tags,
        createdAt: exp.createdAt
      })),
      stats: result.data.stats
    });
  } catch (error) {
    Logger.error('获取角色经历档案失败:', error);
    ResponseUtil.error(res, '获取经历档案失败', 500);
  }
});

/**
 * 获取角色完整档案（记忆+经历）
 * GET /api/experiences/:characterId/full
 */
router.get('/:characterId/full', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { characterId } = req.params;
    const { gameId } = req.query;
    
    if (!gameId) {
      return ResponseUtil.error(res, '缺少gameId参数', 400);
    }
    
    const archive = await ExperienceMemoryBridge.getFullCharacterArchive(characterId, gameId);
    
    if (!archive) {
      return ResponseUtil.error(res, '获取完整档案失败', 500);
    }
    
    ResponseUtil.success(res, archive);
  } catch (error) {
    Logger.error('获取完整档案失败:', error);
    ResponseUtil.error(res, '获取完整档案失败', 500);
  }
});

/**
 * 手动创建经历（作者/管理员）
 * POST /api/experiences/:characterId
 */
router.post('/:characterId', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { characterId } = req.params;
    const {
      gameId,
      title,
      summary,
      type = 'daily',
      gameDate,
      sourceMemoryIds = [],
      affinityAtCreation = 0,
      tags = [],
      isImportant = false,
      isSecret = false
    } = req.body;
    
    if (!gameId || !title || !summary) {
      return ResponseUtil.error(res, '缺少必要参数', 400);
    }
    
    const result = await ExperienceService.createExperience({
      characterId,
      gameId,
      title,
      summary,
      type,
      gameDate,
      sourceMemoryIds,
      affinityAtCreation,
      tags,
      isImportant,
      isSecret
    });
    
    if (!result.success) {
      return ResponseUtil.error(res, result.error, 500);
    }
    
    Logger.info(`用户 ${req.userId} 手动创建经历: ${result.data.id}`);
    
    ResponseUtil.success(res, {
      id: result.data.id,
      title: result.data.title,
      type: result.data.type,
      createdAt: result.data.createdAt
    }, '经历创建成功', 201);
  } catch (error) {
    Logger.error('创建经历失败:', error);
    ResponseUtil.error(res, '创建经历失败', 500);
  }
});

/**
 * 标记经历为已揭示
 * PUT /api/experiences/:experienceId/reveal
 */
router.put('/:experienceId/reveal', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { experienceId } = req.params;
    const { dialogueId } = req.body;
    
    const result = await ExperienceService.markRevealed(experienceId, dialogueId || `dlg_${Date.now()}`);
    
    if (!result.success) {
      return ResponseUtil.error(res, result.error, 404);
    }
    
    Logger.info(`经历已揭示: ${experienceId}`);
    
    ResponseUtil.success(res, {
      id: result.data.id,
      isRevealed: result.data.isRevealed,
      revealedAt: result.data.revealedAt
    }, '经历已标记为揭示');
  } catch (error) {
    Logger.error('标记经历揭示失败:', error);
    ResponseUtil.error(res, '标记失败', 500);
  }
});

/**
 * 检测对话中的经历提及
 * POST /api/experiences/detect-mentions
 */
router.post('/detect-mentions', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { dialogueText, characterId } = req.body;
    
    if (!dialogueText || !characterId) {
      return ResponseUtil.error(res, '缺少必要参数', 400);
    }
    
    const mentioned = await ExperienceService.detectMentionedExperiences(dialogueText, characterId);
    
    ResponseUtil.success(res, {
      mentioned: mentioned.map(exp => ({
        id: exp.id || exp._id,
        title: exp.title,
        type: exp.type
      })),
      count: mentioned.length
    });
  } catch (error) {
    Logger.error('检测经历提及失败:', error);
    ResponseUtil.error(res, '检测失败', 500);
  }
});

/**
 * 初始化角色经历档案
 * POST /api/experiences/:characterId/init
 */
router.post('/:characterId/init', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { characterId } = req.params;
    const { gameId } = req.body;
    
    if (!gameId) {
      return ResponseUtil.error(res, '缺少gameId参数', 400);
    }
    
    const result = await ExperienceService.initCharacterArchive(characterId, gameId);
    
    if (!result.success) {
      return ResponseUtil.error(res, result.error, 500);
    }
    
    Logger.info(`用户 ${req.userId} 初始化角色档案: ${characterId}`);
    
    ResponseUtil.success(res, null, '角色档案初始化成功');
  } catch (error) {
    Logger.error('初始化角色档案失败:', error);
    ResponseUtil.error(res, '初始化失败', 500);
  }
});

/**
 * 清除新标记
 * POST /api/experiences/:characterId/clear-new
 */
router.post('/:characterId/clear-new', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { characterId } = req.params;
    
    const result = await ExperienceService.clearNewMarks(characterId);
    
    if (!result.success) {
      return ResponseUtil.error(res, result.error, 500);
    }
    
    ResponseUtil.success(res, null, '新标记已清除');
  } catch (error) {
    Logger.error('清除新标记失败:', error);
    ResponseUtil.error(res, '清除失败', 500);
  }
});

module.exports = router;
