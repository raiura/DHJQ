const express = require('express');
const router = express.Router();
const { UserCharacter } = require('../models');
const ResponseUtil = require('../utils/response');
const Logger = require('../utils/logger');

/**
 * 获取当前用户的所有角色
 * GET /api/user-characters
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.userId; // 从认证中间件获取
    
    const characters = await UserCharacter.find({ userId });
    
    ResponseUtil.success(res, characters);
  } catch (error) {
    Logger.error('获取用户角色失败:', error);
    ResponseUtil.error(res, '获取角色列表失败', 500);
  }
});

/**
 * 获取当前激活的角色
 * GET /api/user-characters/active
 */
router.get('/active', async (req, res) => {
  try {
    const userId = req.userId;
    
    const all = await UserCharacter.find({ userId });
    let character = all.find(c => c.isActive) || all[0];
    
    if (!character) {
      return ResponseUtil.error(res, '尚未创建角色', 404);
    }
    
    ResponseUtil.success(res, character);
  } catch (error) {
    Logger.error('获取激活角色失败:', error);
    ResponseUtil.error(res, '获取角色失败', 500);
  }
});

/**
 * 获取单个角色详情
 * GET /api/user-characters/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = req.userId;
    const character = await UserCharacter.findOne({ 
      _id: req.params.id, 
      userId 
    });
    
    if (!character) {
      return ResponseUtil.error(res, '角色不存在', 404);
    }
    
    ResponseUtil.success(res, character);
  } catch (error) {
    Logger.error('获取角色详情失败:', error);
    ResponseUtil.error(res, '获取角色详情失败', 500);
  }
});

/**
 * 创建新角色
 * POST /api/user-characters
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.userId;
    const {
      name,
      title,
      gender,
      age,
      race,
      origin,
      location,
      cultivation,
      spiritRoot,
      cultivationMethod,
      appearance,
      personality,
      background,
      goal,
      items,
      abilities,
      relationships,
      avatar,
      color,
      prompt
    } = req.body;
    
    // 验证必填项
    if (!name) {
      return ResponseUtil.error(res, '角色名称不能为空', 400);
    }
    
    // 如果设置为激活，先将其他角色设为非激活
    if (req.body.isActive) {
      await UserCharacter.updateMany(
        { userId },
        { isActive: false }
      );
    }
    
    const character = await UserCharacter.create({
      userId,
      name,
      title,
      gender,
      age,
      race,
      origin,
      location,
      cultivation,
      spiritRoot,
      cultivationMethod,
      appearance,
      personality,
      background,
      goal,
      items,
      abilities,
      relationships,
      avatar,
      color: color || '#4CAF50',
      prompt,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true
    });
    
    Logger.info(`用户 ${userId} 创建了新角色: ${name}`);
    ResponseUtil.success(res, character, '角色创建成功', 201);
  } catch (error) {
    Logger.error('创建角色失败:', error);
    ResponseUtil.error(res, '创建角色失败: ' + error.message, 500);
  }
});

/**
 * 更新角色
 * PUT /api/user-characters/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const userId = req.userId;
    
    // 如果设置为激活，先将其他角色设为非激活
    if (req.body.isActive) {
      await UserCharacter.updateMany(
        { userId, _id: { $ne: req.params.id } },
        { isActive: false }
      );
    }
    
    const character = await UserCharacter.findOneAndUpdate(
      { _id: req.params.id, userId },
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!character) {
      return ResponseUtil.error(res, '角色不存在', 404);
    }
    
    Logger.info(`用户 ${userId} 更新了角色: ${character.name}`);
    ResponseUtil.success(res, character, '角色更新成功');
  } catch (error) {
    Logger.error('更新角色失败:', error);
    ResponseUtil.error(res, '更新角色失败: ' + error.message, 500);
  }
});

/**
 * 删除角色
 * DELETE /api/user-characters/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.userId;
    
    const character = await UserCharacter.findOneAndDelete({
      _id: req.params.id,
      userId
    });
    
    if (!character) {
      return ResponseUtil.error(res, '角色不存在', 404);
    }
    
    Logger.info(`用户 ${userId} 删除了角色: ${character.name}`);
    ResponseUtil.success(res, null, '角色删除成功');
  } catch (error) {
    Logger.error('删除角色失败:', error);
    ResponseUtil.error(res, '删除角色失败', 500);
  }
});

/**
 * 设置激活角色
 * POST /api/user-characters/:id/activate
 */
router.post('/:id/activate', async (req, res) => {
  try {
    const userId = req.userId;
    
    // 先将所有角色设为非激活
    await UserCharacter.updateMany(
      { userId },
      { isActive: false }
    );
    
    // 设置指定角色为激活
    const character = await UserCharacter.findOneAndUpdate(
      { _id: req.params.id, userId },
      { isActive: true, updatedAt: new Date() },
      { new: true }
    );
    
    if (!character) {
      return ResponseUtil.error(res, '角色不存在', 404);
    }
    
    ResponseUtil.success(res, character, '已切换至该角色');
  } catch (error) {
    Logger.error('激活角色失败:', error);
    ResponseUtil.error(res, '激活角色失败', 500);
  }
});

/**
 * 获取角色Prompt（用于AI对话）
 * GET /api/user-characters/:id/prompt
 */
router.get('/:id/prompt', async (req, res) => {
  try {
    const userId = req.userId;
    const character = await UserCharacter.findOne({
      _id: req.params.id,
      userId
    });
    
    if (!character) {
      return ResponseUtil.error(res, '角色不存在', 404);
    }
    
    // 增加使用次数
    character.usageCount += 1;
    await character.save();
    
    const prompt = character.generatePrompt();
    ResponseUtil.success(res, { prompt, character });
  } catch (error) {
    Logger.error('获取角色Prompt失败:', error);
    ResponseUtil.error(res, '获取角色设定失败', 500);
  }
});

/**
 * 生成角色Prompt（不保存）
 * POST /api/user-characters/preview
 */
router.post('/preview', async (req, res) => {
  try {
    // 创建临时角色对象用于生成Prompt
    const tempCharacter = new UserCharacter(req.body);
    const prompt = tempCharacter.generatePrompt();
    
    ResponseUtil.success(res, { prompt });
  } catch (error) {
    Logger.error('预览角色Prompt失败:', error);
    ResponseUtil.error(res, '生成预览失败', 500);
  }
});

module.exports = router;
