const express = require('express');
const router = express.Router();
const DialogueService = require('../services/dialogueService');
const ResponseUtil = require('../utils/response');
const Logger = require('../utils/logger');

// 使用统一的模型加载
const { Dialogue, useMemoryStore } = require('../models');
if (useMemoryStore) {
  Logger.warn('对话模块使用内存存储模式');
}

/**
 * @POST /api/dialogue
 * 生成AI对话响应
 */
router.post('/', async (req, res) => {
  try {
    const { message, characterId } = req.body;
    // 从认证中间件获取用户ID
    const userId = req.userId;
    
    if (!message || !message.trim()) {
      return ResponseUtil.error(res, '消息内容不能为空', 400);
    }
    
    // 传递 userId 以加载用户角色设定
    const response = await DialogueService.generateResponse(message, characterId, userId);
    ResponseUtil.success(res, response);
  } catch (error) {
    Logger.error('对话生成失败:', error);
    ResponseUtil.error(res, '对话生成失败: ' + error.message, 500);
  }
});

/**
 * @GET /api/dialogue/history
 * 获取对话历史
 */
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    let history;
    if (useMemoryStore) {
      // 内存存储模式
      history = await Dialogue.find({}, { sort: { createdAt: -1 }, limit });
    } else {
      // MongoDB 模式
      history = await Dialogue.find()
        .populate('characterId', 'name')
        .sort({ createdAt: -1 })
        .limit(limit);
    }
    
    ResponseUtil.success(res, history);
  } catch (error) {
    Logger.error('获取对话历史失败:', error);
    ResponseUtil.error(res, '获取对话历史失败', 500);
  }
});

module.exports = router;
