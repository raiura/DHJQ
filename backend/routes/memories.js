/**
 * 记忆管理 API 路由
 * 管理三层记忆结构：短期 / 长期 / 核心 + 时间线固化存档
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const MemoryService = require('../services/memoryService');
const Memory = require('../models/memory');
const WorldbookEntry = require('../models/worldbook');
const Logger = require('../utils/logger');
const ResponseUtil = require('../utils/response');

/**
 * 获取游戏的记忆列表
 * GET /api/memories/:gameId
 */
router.get('/:gameId', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { gameId } = req.params;
    const { types = 'short,long,core', limit = 50 } = req.query;
    
    const typeArray = types.split(',');
    const memories = await MemoryService.getMemories(gameId, {
      types: typeArray,
      limit: parseInt(limit)
    });
    
    ResponseUtil.success(res, {
      memories: memories.map(m => ({
        id: m._id,
        type: m.type,
        content: m.content,
        timestamp: m.timestamp,
        turn: m.turn,
        importance: m.importance,
        tags: m.tags,
        isSolidified: m.isSolidified
      })),
      count: memories.length
    });
  } catch (error) {
    Logger.error('获取记忆列表失败:', error);
    ResponseUtil.error(res, '获取记忆列表失败', 500);
  }
});

/**
 * 手动添加记忆
 * POST /api/memories/:gameId
 */
router.post('/:gameId', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { gameId } = req.params;
    const { content, type = 'short', tags = [], importance = 50 } = req.body;
    
    if (!content) {
      return ResponseUtil.error(res, '记忆内容不能为空', 400);
    }
    
    const memory = await Memory.create({
      gameId,
      userId: req.userId,
      type,
      content,
      timestamp: new Date(),
      tags,
      importance,
      status: 'active'
    });
    
    Logger.info(`用户 ${req.userId} 手动添加记忆: ${content.substring(0, 50)}...`);
    
    ResponseUtil.success(res, {
      id: memory._id,
      type: memory.type,
      content: memory.content,
      timestamp: memory.timestamp
    }, '记忆添加成功', 201);
  } catch (error) {
    Logger.error('添加记忆失败:', error);
    ResponseUtil.error(res, '添加记忆失败', 500);
  }
});

/**
 * 删除记忆
 * DELETE /api/memories/:memoryId
 */
router.delete('/:memoryId', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { memoryId } = req.params;
    
    const memory = await Memory.findById(memoryId);
    if (!memory) {
      return ResponseUtil.error(res, '记忆不存在', 404);
    }
    
    await Memory.delete(memoryId);
    
    Logger.info(`用户 ${req.userId} 删除记忆: ${memoryId}`);
    
    ResponseUtil.success(res, null, '记忆删除成功');
  } catch (error) {
    Logger.error('删除记忆失败:', error);
    ResponseUtil.error(res, '删除记忆失败', 500);
  }
});

/**
 * 固化时间线（将核心记忆写入世界书存档）
 * POST /api/memories/:gameId/solidify
 */
router.post('/:gameId/solidify', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { gameId } = req.params;
    const { customContent } = req.body;
    
    // 执行固化
    const result = await MemoryService.solidifyTimeline(gameId);
    
    // 获取或创建存档条目
    let archiveEntry = await WorldbookEntry.getTimelineArchive(gameId);
    
    // 构建存档内容
    const now = new Date();
    const archiveData = {
      timestamp: now.toISOString(),
      gameTime: now.toLocaleString('zh-CN'),
      solidifiedBy: req.userId,
      coreMemoryCount: result.solidifiedCount,
      summary: result.archiveContent.summary,
      details: result.archiveContent.coreMemories
    };
    
    // 如果提供了自定义内容，优先使用
    const finalContent = customContent || JSON.stringify(archiveData, null, 2);
    
    // 更新或创建世界书存档条目
    archiveEntry = await WorldbookEntry.updateTimelineArchive(gameId, finalContent);
    
    Logger.info(`用户 ${req.userId} 固化时间线: ${gameId}, 核心记忆: ${result.solidifiedCount}`);
    
    ResponseUtil.success(res, {
      archiveId: archiveEntry._id,
      solidifiedCount: result.solidifiedCount,
      timestamp: now.toISOString(),
      content: finalContent
    }, '时间线已固化存档');
  } catch (error) {
    Logger.error('固化时间线失败:', error);
    ResponseUtil.error(res, '固化时间线失败: ' + error.message, 500);
  }
});

/**
 * 获取时间线存档
 * GET /api/memories/:gameId/timeline
 */
router.get('/:gameId/timeline', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { gameId } = req.params;
    
    const archiveEntry = await WorldbookEntry.getTimelineArchive(gameId);
    
    if (!archiveEntry) {
      return ResponseUtil.success(res, {
        exists: false,
        content: null,
        timestamp: null
      });
    }
    
    ResponseUtil.success(res, {
      exists: true,
      id: archiveEntry._id,
      content: archiveEntry.content,
      timestamp: archiveEntry.updatedAt,
      name: archiveEntry.name
    });
  } catch (error) {
    Logger.error('获取时间线存档失败:', error);
    ResponseUtil.error(res, '获取时间线存档失败', 500);
  }
});

/**
 * 清空记忆（保留存档）
 * DELETE /api/memories/:gameId/clear
 */
router.delete('/:gameId/clear', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { gameId } = req.params;
    const { keepCore = 'true' } = req.query;
    
    // 构建删除条件
    const query = { gameId };
    if (keepCore === 'true') {
      query.type = { $in: ['short', 'long'] }; // 只删除短期和长期记忆
    }
    
    const result = await Memory.deleteMany(query);
    
    Logger.info(`用户 ${req.userId} 清空记忆: ${gameId}, 删除: ${result.deletedCount}条`);
    
    ResponseUtil.success(res, {
      deletedCount: result.deletedCount,
      keepCore: keepCore === 'true'
    }, '记忆已清空');
  } catch (error) {
    Logger.error('清空记忆失败:', error);
    ResponseUtil.error(res, '清空记忆失败', 500);
  }
});

/**
 * 获取记忆统计
 * GET /api/memories/:gameId/stats
 */
router.get('/:gameId/stats', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { gameId } = req.params;
    
    const allMemories = await Memory.find({ gameId, status: 'active' });
    
    const stats = {
      short: allMemories.filter(m => m.type === 'short').length,
      long: allMemories.filter(m => m.type === 'long').length,
      core: allMemories.filter(m => m.type === 'core').length,
      total: allMemories.length,
      solidified: allMemories.filter(m => m.isSolidified).length
    };
    
    // 检查是否有存档
    const archiveEntry = await WorldbookEntry.getTimelineArchive(gameId);
    stats.hasArchive = !!archiveEntry;
    stats.lastArchiveTime = archiveEntry?.updatedAt || null;
    
    ResponseUtil.success(res, stats);
  } catch (error) {
    Logger.error('获取记忆统计失败:', error);
    ResponseUtil.error(res, '获取记忆统计失败', 500);
  }
});

module.exports = router;
