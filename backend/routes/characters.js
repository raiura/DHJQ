const express = require('express');
const router = express.Router();
const ResponseUtil = require('../utils/response');
const Logger = require('../utils/logger');
const config = require('../config');

// 使用统一的模型加载
const { Character, Experience, useMemoryStore } = require('../models');
if (useMemoryStore) {
  Logger.warn('角色模块使用内存存储模式');
}

/**
 * @GET /api/characters
 * 获取所有角色
 * Query: gameId - 指定游戏ID，返回该游戏的角色+全局角色
 */
router.get('/', async (req, res) => {
  try {
    const { gameId } = req.query;
    let query = {};
    
    if (gameId) {
      // 返回指定游戏的角色 + 全局角色
      query = { $or: [{ gameId }, { gameId: null }] };
    }
    
    let characters = await Character.find(query, { sort: { createdAt: -1 } });
    
    // 如果没有角色且没有指定gameId，初始化全局默认角色
    if ((!characters || characters.length === 0) && !gameId) {
      Logger.info('数据库中没有角色，初始化默认角色...');
      
      const defaultCharacters = config.defaults.characters.map(char => ({
        ...char,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      await Character.insertMany(defaultCharacters);
      characters = await Character.find(query, { sort: { createdAt: -1 } });
      
      return ResponseUtil.success(res, characters, '获取成功（已初始化默认角色）');
    }
    
    ResponseUtil.success(res, characters);
  } catch (error) {
    Logger.error('获取角色失败:', error);
    // 降级返回默认角色
    ResponseUtil.success(res, config.defaults.characters, '获取成功（使用默认数据）');
  }
});

/**
 * @GET /api/characters/:id/experiences
 * 获取角色经历（必须在 /:id 之前定义）
 */
router.get('/:id/experiences', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 10, revealed } = req.query;
    
    // 检查角色是否存在
    const character = await Character.findById(id);
    if (!character) {
      return ResponseUtil.error(res, '角色不存在', 404);
    }
    
    // 构建查询条件
    let query = { characterId: id };
    if (revealed !== undefined) {
      query.revealed = revealed === 'true';
    }
    
    // 获取经历，按重要性和创建时间排序
    const experiences = await Experience.find(query, {
      sort: { importance: -1, createdAt: -1 },
      limit: parseInt(limit)
    });
    
    Logger.info(`获取角色 ${character.name} 的经历: ${experiences.length} 条`);
    
    ResponseUtil.success(res, experiences);
  } catch (error) {
    Logger.error('获取角色经历失败:', error);
    ResponseUtil.error(res, '获取角色经历失败', 500);
  }
});

/**
 * @GET /api/characters/:id
 * 获取单个角色
 */
router.get('/:id', async (req, res) => {
  try {
    const character = await Character.findById(req.params.id);
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
 * @POST /api/characters
 * 创建新角色
 */
router.post('/', async (req, res) => {
  try {
    const { name, color, image, imageFit, prompt, gameId, appearance, personality, physique, background, special, enabled, keys, priority, favor, trust, stats } = req.body;
    
    if (!name || !prompt) {
      return ResponseUtil.error(res, '角色名称和提示词不能为空', 400);
    }
    
    const character = await Character.create({
      name,
      color: color || '#999999',
      image: image || '',
      imageFit: imageFit || 'cover',
      prompt,
      appearance: appearance || '',
      personality: personality || '',
      physique: physique || '',
      background: background || '',
      special: special || '',
      enabled: enabled !== undefined ? enabled : true,  // 默认启用
      keys: keys || [],
      priority: priority || 100,
      favor: favor !== undefined ? favor : 50,  // 默认50
      trust: trust !== undefined ? trust : 50,  // 默认50
      stats: stats || { mood: '平静', encounters: 0, dialogueTurns: 0 },
      gameId: gameId || null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    Logger.info(`创建新角色: ${name}${gameId ? ` (游戏ID: ${gameId})` : ''}, 好感度: ${favor}, 信任度: ${trust}`);
    
    ResponseUtil.success(res, character, '角色创建成功', 201);
  } catch (error) {
    Logger.error('创建角色失败:', error);
    ResponseUtil.error(res, '创建角色失败', 500);
  }
});

/**
 * @PUT /api/characters/:id
 * 更新角色
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, color, image, imageFit, prompt, appearance, personality, physique, background, special, enabled, priority, keys, favor, trust, stats } = req.body;
    
    const updateData = { 
      name, 
      color, 
      image,
      imageFit,
      prompt,
      appearance,
      personality,
      physique,
      background,
      special,
      enabled,
      priority,
      keys,
      updatedAt: new Date()
    };
    
    // 只有当值存在时才更新这些字段
    if (favor !== undefined) updateData.favor = favor;
    if (trust !== undefined) updateData.trust = trust;
    if (stats !== undefined) updateData.stats = stats;
    
    const character = await Character.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    if (!character) {
      return ResponseUtil.error(res, '角色不存在', 404);
    }
    
    Logger.info(`更新角色: ${character.name}, enabled: ${character.enabled}, favor: ${favor}, trust: ${trust}`);
    ResponseUtil.success(res, character, '角色更新成功');
  } catch (error) {
    Logger.error('更新角色失败:', error);
    ResponseUtil.error(res, '更新角色失败', 500);
  }
});

/**
 * @DELETE /api/characters/:id
 * 删除角色
 */
router.delete('/:id', async (req, res) => {
  try {
    const character = await Character.findByIdAndDelete(req.params.id);
    
    if (!character) {
      return ResponseUtil.error(res, '角色不存在', 404);
    }
    
    Logger.info(`删除角色: ${character.name}`);
    ResponseUtil.success(res, null, '角色删除成功');
  } catch (error) {
    Logger.error('删除角色失败:', error);
    ResponseUtil.error(res, '删除角色失败', 500);
  }
});

/**
 * @POST /api/characters/fix-images
 * 修复角色图片地址（将失效的外部图片替换为SVG占位图）
 */
router.post('/fix-images', async (req, res) => {
  try {
    const characters = await Character.find({});
    const fixedChars = [];
    
    for (const char of characters) {
      // 检查图片地址是否失效（非data:开头且非空）
      if (char.image && !char.image.startsWith('data:')) {
        // 生成默认SVG占位图
        const defaultSvg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='400'%3E%3Crect fill='${char.color || '%23999'}' width='300' height='400'/%3E%3Ctext x='50%25' y='50%25' fill='%23fff' font-family='Microsoft YaHei' font-size='20' text-anchor='middle'%3E${encodeURIComponent(char.name)}%3C/text%3E%3C/svg%3E`;
        
        await Character.findByIdAndUpdate(char._id, {
          ...char,
          image: defaultSvg,
          updatedAt: new Date()
        });
        
        fixedChars.push({ id: char._id, name: char.name, oldImage: char.image.substring(0, 50) + '...' });
        Logger.info(`修复角色图片: ${char.name}`);
      }
    }
    
    ResponseUtil.success(res, { 
      fixed: fixedChars.length, 
      characters: fixedChars 
    }, `已修复 ${fixedChars.length} 个角色的图片地址`);
  } catch (error) {
    Logger.error('修复角色图片失败:', error);
    ResponseUtil.error(res, '修复失败', 500);
  }
});

module.exports = router;
