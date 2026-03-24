const express = require('express');
const router = express.Router();
const Gallery = require('../models/gallery');
const ResponseUtil = require('../utils/response');
const Logger = require('../utils/logger');
const authMiddleware = require('../middleware/auth');

/**
 * 兼容性支持：添加图片到图库（不带 gameId 的旧版本）
 * POST /api/gallery
 */
router.post('/', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { gameId, name, url, type, tags, description, sceneTriggers, characterId, characterName, variantTags } = req.body;

    if (!gameId) {
      return ResponseUtil.error(res, '请先选择或创建游戏', 400);
    }
    if (!name || !url) {
      return ResponseUtil.error(res, '图片名称和URL不能为空', 400);
    }

    const image = await Gallery.create({
      gameId,
      name,
      url,
      type: type || 'background',
      characterId: characterId || null,
      characterName: characterName || '',
      variantTags: variantTags || [],
      tags: tags || [],
      description: description || '',
      sceneTriggers: sceneTriggers || []
    });

    Logger.info(`添加图片到图库: ${name} (${type || 'background'})`);
    ResponseUtil.success(res, image, '添加成功', 201);
  } catch (error) {
    Logger.error('添加图片失败:', error);
    ResponseUtil.error(res, '添加图片失败', 500);
  }
});

/**
 * 更新图片信息
 * PUT /api/gallery/:imageId
 * 注：这个路由必须在 /:gameId 之前定义
 */
router.put('/:imageId', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { name, url, type, tags, description, sceneTriggers, characterId, characterName, variantTags } = req.body;

    const image = await Gallery.findByIdAndUpdate(req.params.imageId, {
      name,
      url,
      type,
      characterId: characterId || null,
      characterName: characterName || '',
      variantTags: variantTags || [],
      tags,
      description,
      sceneTriggers,
      updatedAt: new Date()
    });

    if (!image) {
      return ResponseUtil.error(res, '图片不存在', 404);
    }

    Logger.info(`更新图库图片: ${image.name}`);
    ResponseUtil.success(res, image, '更新成功');
  } catch (error) {
    Logger.error('更新图片失败:', error);
    ResponseUtil.error(res, '更新图片失败', 500);
  }
});

/**
 * 删除图片
 * DELETE /api/gallery/:imageId
 * 注：这个路由必须在 /:gameId 之前定义
 */
router.delete('/:imageId', authMiddleware.verifyToken, async (req, res) => {
  try {
    const image = await Gallery.findByIdAndDelete(req.params.imageId);

    if (!image) {
      return ResponseUtil.error(res, '图片不存在', 404);
    }

    Logger.info(`删除图库图片: ${image.name}`);
    ResponseUtil.success(res, null, '删除成功');
  } catch (error) {
    Logger.error('删除图片失败:', error);
    ResponseUtil.error(res, '删除图片失败', 500);
  }
});

/**
 * 根据场景描述智能匹配背景图
 * POST /api/gallery/:gameId/match
 * 注：这个路由必须在 /:gameId 之前定义
 */
router.post('/:gameId/match', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { scene } = req.body;

    if (!scene) {
      return ResponseUtil.error(res, '场景描述不能为空', 400);
    }

    // 获取该游戏的所有背景图
    const images = await Gallery.find({ gameId, type: 'background' });

    // 简单的关键词匹配算法
    const sceneLower = scene.toLowerCase();
    const matched = images.map(img => {
      let score = 0;
      const text = `${img.name} ${img.description} ${img.tags?.join(' ') || ''} ${img.sceneTriggers?.join(' ') || ''}`.toLowerCase();
      
      // 提取场景关键词进行匹配
      const keywords = sceneLower.split(/\s+/);
      keywords.forEach(keyword => {
        if (keyword.length > 1 && text.includes(keyword)) {
          score += 1;
        }
      });

      // 特殊场景权重
      const sceneTypes = [
        { keywords: ['森林', '树林', '树', 'forest', 'wood'], type: 'forest' },
        { keywords: ['城市', '城镇', '街道', 'city', 'town', 'street'], type: 'city' },
        { keywords: ['室内', '房间', '屋子', 'indoor', 'room'], type: 'indoor' },
        { keywords: ['夜晚', '黑夜', 'night', 'dark'], type: 'night' },
        { keywords: ['战斗', '战斗场景', 'battle', 'fight'], type: 'battle' },
        { keywords: ['山', '山脉', 'mountain', 'hill'], type: 'mountain' },
        { keywords: ['水', '海', '湖', '河', 'water', 'sea', 'lake', 'river'], type: 'water' }
      ];

      sceneTypes.forEach(st => {
        if (st.keywords.some(k => sceneLower.includes(k))) {
          if (text.includes(st.type) || st.keywords.some(k => text.includes(k))) {
            score += 3;
          }
        }
      });

      return { ...img, matchScore: score };
    })
    .filter(img => img.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore);

    ResponseUtil.success(res, matched.slice(0, 3)); // 返回最匹配的前3个
  } catch (error) {
    Logger.error('匹配背景图失败:', error);
    ResponseUtil.error(res, '匹配背景图失败', 500);
  }
});

/**
 * AI 生成背景图建议
 * POST /api/gallery/:gameId/ai-suggest
 */
router.post('/:gameId/ai-suggest', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { scene, dialogue } = req.body;

    // 分析场景描述，提取关键元素
    const sceneAnalysis = analyzeScene(scene, dialogue);

    // 返回建议的标签和描述
    ResponseUtil.success(res, {
      suggestedTags: sceneAnalysis.tags,
      suggestedDescription: sceneAnalysis.description,
      suggestedPrompt: sceneAnalysis.prompt
    });
  } catch (error) {
    Logger.error('AI 分析场景失败:', error);
    ResponseUtil.error(res, 'AI 分析失败', 500);
  }
});

/**
 * 获取图库列表
 * GET /api/gallery/:gameId
 */
router.get('/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { type, tag } = req.query;

    let query = { gameId };
    if (type) query.type = type;
    if (tag) query.tags = { $in: [tag] };

    const images = await Gallery.find(query, { sort: { createdAt: -1 } });

    ResponseUtil.success(res, images);
  } catch (error) {
    Logger.error('获取图库失败:', error);
    ResponseUtil.error(res, '获取图库失败', 500);
  }
});

/**
 * 添加图片到图库
 * POST /api/gallery/:gameId
 */
router.post('/:gameId', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { gameId } = req.params;
    const { name, url, type, tags, description, sceneTriggers, characterId, characterName, variantTags } = req.body;

    if (!name || !url) {
      return ResponseUtil.error(res, '图片名称和URL不能为空', 400);
    }

    const image = await Gallery.create({
      gameId,
      name,
      url,
      type: type || 'background',
      characterId: characterId || null,
      characterName: characterName || '',
      variantTags: variantTags || [],
      tags: tags || [],
      description: description || '',
      sceneTriggers: sceneTriggers || []
    });

    Logger.info(`添加图片到图库: ${name} (${type || 'background'})`);
    ResponseUtil.success(res, image, '添加成功', 201);
  } catch (error) {
    Logger.error('添加图片失败:', error);
    ResponseUtil.error(res, '添加图片失败', 500);
  }
});

// 场景分析函数
function analyzeScene(scene, dialogue) {
  const text = `${scene || ''} ${dialogue || ''}`.toLowerCase();
  
  // 标签映射
  const tagMappings = [
    { keywords: ['森林', '树林', '树', 'forest', 'wood'], tag: '森林' },
    { keywords: ['城市', '城镇', '街道', 'city', 'town'], tag: '城市' },
    { keywords: ['室内', '房间', '屋子', 'indoor', 'room'], tag: '室内' },
    { keywords: ['夜晚', '黑夜', 'night'], tag: '夜晚' },
    { keywords: ['白天', '日间', 'day'], tag: '白天' },
    { keywords: ['战斗', '打斗', 'battle', 'fight'], tag: '战斗' },
    { keywords: ['山', '山脉', 'mountain'], tag: '山脉' },
    { keywords: ['水', '海', '湖', '海', 'water', 'sea', 'lake'], tag: '水域' },
    { keywords: ['雪', '冰', 'snow', 'ice'], tag: '冰雪' },
    { keywords: ['沙漠', 'sand', 'desert'], tag: '沙漠' },
    { keywords: ['宫殿', '城堡', 'palace', 'castle'], tag: '宫殿' },
    { keywords: ['村庄', '村落', 'village'], tag: '村庄' },
    { keywords: ['雨', '下雨', 'rain'], tag: '雨天' },
    { keywords: ['雾', '迷雾', 'fog', 'mist'], tag: '迷雾' }
  ];

  const tags = [];
  tagMappings.forEach(mapping => {
    if (mapping.keywords.some(k => text.includes(k))) {
      tags.push(mapping.tag);
    }
  });

  // 生成描述
  const timeOfDay = text.includes('night') || text.includes('夜晚') ? '夜晚' : 
                    text.includes('sunset') || text.includes('黄昏') ? '黄昏' : '白天';
  const weather = text.includes('rain') || text.includes('雨') ? '下雨' :
                  text.includes('snow') || text.includes('雪') ? '下雪' :
                  text.includes('fog') || text.includes('雾') ? '有雾' : '晴朗';

  const description = `${timeOfDay}，${weather}${tags.length > 0 ? '，场景：' + tags.join('、') : ''}`;

  // 生成 AI 绘图提示词
  const prompt = `A ${timeOfDay.toLowerCase()} scene${tags.length > 0 ? ', ' + tags.join(', ') : ''}${weather !== '晴朗' ? ', ' + weather : ''}, detailed background, anime style, high quality`;

  return {
    tags: [...new Set(tags)], // 去重
    description,
    prompt
  };
}

/**
 * AI 测试匹配图片
 * POST /api/gallery/test-match
 * 测试场景描述能否正确匹配到图片
 */
router.post('/test-match', async (req, res) => {
  try {
    const { gameId, scene, dialogue, characterId } = req.body;

    if (!gameId) {
      return ResponseUtil.error(res, '请先选择游戏', 400);
    }
    if (!scene && !dialogue) {
      return ResponseUtil.error(res, '请输入场景描述或对话内容', 400);
    }

    // 获取该游戏的所有图片
    let query = { gameId };
    
    // 如果指定了角色，只匹配该角色的立绘
    if (characterId) {
      query.characterId = characterId;
    }
    
    const images = await Gallery.find(query, { sort: { createdAt: -1 } });

    // 测试匹配算法
    const sceneText = `${scene || ''} ${dialogue || ''}`.toLowerCase();
    const matched = images.map(img => {
      let score = 0;
      let matchReasons = [];
      
      // 匹配源文本
      const text = `${img.name} ${img.description} ${img.tags?.join(' ') || ''} ${img.sceneTriggers?.join(' ') || ''} ${img.variantTags?.join(' ') || ''}`.toLowerCase();
      
      // 关键词匹配
      const keywords = sceneText.split(/\s+/).filter(k => k.length > 1);
      keywords.forEach(keyword => {
        if (text.includes(keyword)) {
          score += 1;
          if (!matchReasons.includes('关键词匹配')) {
            matchReasons.push('关键词匹配');
          }
        }
      });

      // 场景类型匹配
      const sceneTypes = [
        { keywords: ['森林', '树林', '树', 'forest', 'wood'], type: 'forest', name: '森林' },
        { keywords: ['城市', '城镇', '街道', 'city', 'town', 'street'], type: 'city', name: '城市' },
        { keywords: ['室内', '房间', '屋子', 'indoor', 'room'], type: 'indoor', name: '室内' },
        { keywords: ['夜晚', '黑夜', 'night', 'dark'], type: 'night', name: '夜晚' },
        { keywords: ['战斗', '战斗场景', 'battle', 'fight'], type: 'battle', name: '战斗' },
        { keywords: ['山', '山脉', 'mountain', 'hill'], type: 'mountain', name: '山脉' },
        { keywords: ['水', '海', '湖', '河', 'water', 'sea', 'lake', 'river'], type: 'water', name: '水域' }
      ];

      sceneTypes.forEach(st => {
        if (st.keywords.some(k => sceneText.includes(k))) {
          if (text.includes(st.type) || st.keywords.some(k => text.includes(k))) {
            score += 3;
            matchReasons.push(`场景类型: ${st.name}`);
          }
        }
      });

      // 表情/情绪匹配（针对角色立绘）
      const emotions = [
        { keywords: ['开心', '高兴', '笑', 'happy', 'smile', 'joy'], name: '开心' },
        { keywords: ['难过', '伤心', '哭', 'sad', 'cry', 'tear'], name: '难过' },
        { keywords: ['生气', '愤怒', '怒', 'angry', 'mad', 'fury'], name: '生气' },
        { keywords: ['惊讶', '吃惊', '吓', 'surprised', 'shock', 'amaze'], name: '惊讶' },
        { keywords: ['害羞', '害怕', '紧张', 'shy', 'nervous', 'blush'], name: '害羞' },
        { keywords: ['冷静', '淡定', '严肃', 'calm', 'serious', 'cool'], name: '冷静' }
      ];

      emotions.forEach(emo => {
        if (emo.keywords.some(k => sceneText.includes(k))) {
          if (img.variantTags?.some(tag => emo.keywords.some(k => tag.toLowerCase().includes(k)))) {
            score += 5;
            matchReasons.push(`情绪匹配: ${emo.name}`);
          }
        }
      });

      return { 
        ...img, 
        matchScore: score,
        matchReasons: [...new Set(matchReasons)]
      };
    })
    .filter(img => img.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore);

    ResponseUtil.success(res, {
      testScene: scene,
      testDialogue: dialogue,
      testCharacterId: characterId,
      totalImages: images.length,
      matchedCount: matched.length,
      topMatches: matched.slice(0, 5)
    }, '测试完成');
  } catch (error) {
    Logger.error('AI测试匹配失败:', error);
    ResponseUtil.error(res, '测试失败', 500);
  }
});

module.exports = router;
