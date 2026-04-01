/**
 * 角色管理路由 - Character Card V2.0
 * 统一使用V2格式，完全替代V1
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// 检查MongoDB连接状态（内存存储模式下允许通过）
const checkMongoDB = (req, res, next) => {
  // 内存存储模式下也允许请求通过（由模型层处理）
  next();
};

// 获取Character模型
const getCharacterModel = () => {
  try {
    return mongoose.model('Character');
  } catch (e) {
    return require('../models/character');
  }
};

// ========== CRUD接口 ==========

/**
 * GET /api/characters
 * 获取角色列表
 */
router.get('/', checkMongoDB, async (req, res) => {
  try {
    const Character = getCharacterModel();
    const { gameId, search } = req.query;
    
    let query = {};
    if (gameId) query.gameId = gameId;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'core.description': { $regex: search, $options: 'i' } },
        { 'activation.keys': { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    let characters = await Character.find(query);
    
    // 内存存储模式下手动排序
    if (Array.isArray(characters)) {
      characters.sort((a, b) => {
        const aDate = new Date(a.meta?.updatedAt || a.updatedAt || 0);
        const bDate = new Date(b.meta?.updatedAt || b.updatedAt || 0);
        return bDate - aDate;
      });
    } else {
      // MongoDB 模式下使用 sort 方法
      characters = characters.sort({ 'meta.updatedAt': -1 });
    }
    
    res.json({
      success: true,
      data: characters,
      count: characters.length
    });
  } catch (error) {
    console.error('获取角色列表失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/characters/:id
 * 获取单个角色详情
 */
router.get('/:id', checkMongoDB, async (req, res) => {
  try {
    const Character = getCharacterModel();
    const character = await Character.findById(req.params.id);
    
    if (!character) {
      return res.status(404).json({ success: false, message: '角色不存在' });
    }
    
    res.json({ success: true, data: character });
  } catch (error) {
    console.error('获取角色详情失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/characters
 * 创建新角色
 */
router.post('/', checkMongoDB, async (req, res) => {
  try {
    const Character = getCharacterModel();
    const data = req.body;
    
    // 验证必填字段
    if (!data.name) {
      return res.status(400).json({ success: false, message: '角色名称不能为空' });
    }
    
    // 确保符合V2结构
    const characterData = ensureV2Structure(data);
    
    // 根据存储模式选择创建方式
    let character;
    if (typeof Character.create === 'function') {
        // 内存存储模式
        character = await Character.create(characterData);
    } else {
        // MongoDB模式
        character = new Character(characterData);
        await character.save();
    }
    
    res.json({
      success: true,
      message: '角色创建成功',
      data: { id: character._id, name: character.name }
    });
  } catch (error) {
    console.error('创建角色失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/characters/:id
 * 更新角色
 */
router.put('/:id', checkMongoDB, async (req, res) => {
  try {
    const Character = getCharacterModel();
    const data = req.body;
    
    // 确保符合V2结构
    const characterData = ensureV2Structure(data);
    
    const character = await Character.findByIdAndUpdate(
      req.params.id,
      characterData,
      { new: true }
    );
    
    if (!character) {
      return res.status(404).json({ success: false, message: '角色不存在' });
    }
    
    res.json({
      success: true,
      message: '角色更新成功',
      data: character
    });
  } catch (error) {
    console.error('更新角色失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/characters/:id
 * 删除角色
 */
router.delete('/:id', checkMongoDB, async (req, res) => {
  try {
    const Character = getCharacterModel();
    const result = await Character.findByIdAndDelete(req.params.id);
    
    if (!result) {
      return res.status(404).json({ success: false, message: '角色不存在' });
    }
    
    res.json({ success: true, message: '角色已删除' });
  } catch (error) {
    console.error('删除角色失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== 批量操作 ==========

/**
 * POST /api/characters/batch
 * 批量创建/更新角色
 */
router.post('/batch', checkMongoDB, async (req, res) => {
  try {
    const Character = getCharacterModel();
    const { characters, gameId } = req.body;
    
    if (!Array.isArray(characters)) {
      return res.status(400).json({ success: false, message: 'characters必须是数组' });
    }
    
    const results = [];
    for (const charData of characters) {
      try {
        const v2Data = ensureV2Structure({ ...charData, gameId });
        
        if (v2Data._id) {
          // 更新
          const updated = await Character.findByIdAndUpdate(v2Data._id, v2Data, { new: true });
          results.push({ success: true, id: updated._id, action: 'update' });
        } else {
          // 创建
          let character;
          if (typeof Character.create === 'function') {
              // 内存存储模式
              character = await Character.create(v2Data);
          } else {
              // MongoDB模式
              character = new Character(v2Data);
              await character.save();
          }
          results.push({ success: true, id: character._id, action: 'create' });
        }
      } catch (err) {
        results.push({ success: false, error: err.message, name: charData.name });
      }
    }
    
    res.json({
      success: true,
      data: results,
      summary: {
        total: characters.length,
        success: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });
  } catch (error) {
    console.error('批量操作失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== 导入导出 ==========

/**
 * POST /api/characters/import
 * 导入角色（支持SillyTavern格式）
 */
router.post('/import', checkMongoDB, async (req, res) => {
  try {
    const Character = getCharacterModel();
    const { data, format, gameId } = req.body;
    
    let characterData;
    
    if (format === 'sillytavern' || data.name) {
      // SillyTavern格式或标准格式
      characterData = importFromSillyTavern(data);
    } else {
      return res.status(400).json({ success: false, message: '不支持的导入格式' });
    }
    
    if (gameId) characterData.gameId = gameId;
    
    // 根据存储模式选择创建方式
    let character;
    if (typeof Character.create === 'function') {
        // 内存存储模式
        character = await Character.create(characterData);
    } else {
        // MongoDB模式
        character = new Character(characterData);
        await character.save();
    }
    
    res.json({
      success: true,
      message: '角色导入成功',
      data: { id: character._id, name: character.name }
    });
  } catch (error) {
    console.error('导入角色失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/characters/:id/export
 * 导出角色
 */
router.get('/:id/export', checkMongoDB, async (req, res) => {
  try {
    const Character = getCharacterModel();
    const { format } = req.query;
    
    const character = await Character.findById(req.params.id);
    if (!character) {
      return res.status(404).json({ success: false, message: '角色不存在' });
    }
    
    let exportData;
    if (format === 'sillytavern') {
      exportData = character.toSillyTavern ? character.toSillyTavern() : convertToSillyTavern(character);
    } else {
      exportData = character.toObject ? character.toObject() : character;
    }
    
    res.json({
      success: true,
      format: format || 'native',
      data: exportData
    });
  } catch (error) {
    console.error('导出角色失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== 世界书关联 ==========

/**
 * POST /api/characters/:id/lorebook/link
 * 关联世界书条目
 */
router.post('/:id/lorebook/link', checkMongoDB, async (req, res) => {
  try {
    const Character = getCharacterModel();
    const { entryIds, mode } = req.body;
    
    const character = await Character.findById(req.params.id);
    if (!character) {
      return res.status(404).json({ success: false, message: '角色不存在' });
    }
    
    // 更新关联
    if (entryIds) {
      character.lorebook.linkedEntryIds = entryIds.map(id => 
        mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id
      );
    }
    if (mode) {
      character.lorebook.linkMode = mode;
    }
    
    await character.save();
    
    res.json({
      success: true,
      message: '世界书关联已更新',
      data: {
        linkMode: character.lorebook.linkMode,
        linkedCount: character.lorebook.linkedEntryIds.length
      }
    });
  } catch (error) {
    console.error('关联世界书失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/characters/:id/lorebook
 * 获取角色的世界书内容
 */
router.get('/:id/lorebook', checkMongoDB, async (req, res) => {
  try {
    const Character = getCharacterModel();
    const character = await Character.findById(req.params.id);
    
    if (!character) {
      return res.status(404).json({ success: false, message: '角色不存在' });
    }
    
    res.json({
      success: true,
      data: {
        entries: character.lorebook.entries,
        linkMode: character.lorebook.linkMode,
        linkedEntryIds: character.lorebook.linkedEntryIds
      }
    });
  } catch (error) {
    console.error('获取世界书失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== 辅助函数 ==========

/**
 * 确保数据符合V2结构
 */
function ensureV2Structure(data) {
  // 如果已经是V2结构，直接返回
  if (data.core && data.visual) {
    return {
      ...data,
      meta: {
        ...data.meta,
        updatedAt: new Date()
      }
    };
  }
  
  // 从V1迁移
  return migrateV1ToV2(data);
}

/**
 * V1到V2迁移
 */
function migrateV1ToV2(v1Data) {
  const now = new Date();
  
  return {
    name: v1Data.name || '未命名角色',
    visual: {
      avatar: v1Data.image || v1Data.avatar || '',
      cover: '',
      color: v1Data.color || '#8a6d3b',
      emotionCGs: {}
    },
    core: {
      description: [v1Data.appearance, v1Data.physique, v1Data.special]
        .filter(Boolean).join('\n\n'),
      personality: v1Data.personality || '',
      scenario: v1Data.background || '',
      firstMessage: v1Data.firstMessage || '',
      worldConnection: { faction: '', location: '' }
    },
    activation: {
      keys: v1Data.keys || [],
      priority: v1Data.priority || 100,
      enabled: v1Data.enabled !== false
    },
    examples: { style: '', dialogues: [] },
    lorebook: { entries: [], linkMode: 'MANUAL', linkedEntryIds: [] },
    injection: {
      characterNote: { content: '', depth: 0, frequency: 1, role: 'system' },
      postHistory: { content: '', enabled: false }
    },
    relationship: {
      favor: v1Data.favor || 50,
      trust: v1Data.trust || 50,
      mood: v1Data.mood || '平静'
    },
    meta: {
      description: '',
      tags: [],
      creator: '',
      version: '2.0.0',
      createdAt: v1Data.createdAt || now,
      updatedAt: now
    },
    gameId: v1Data.gameId || null,
    _legacy: {
      appearance: v1Data.appearance || '',
      personality: v1Data.personality || '',
      physique: v1Data.physique || '',
      background: v1Data.background || '',
      special: v1Data.special || '',
      prompt: v1Data.prompt || '',
      image: v1Data.image || '',
      imageFit: v1Data.imageFit || 'cover',
      color: v1Data.color || '#999999',
      keys: v1Data.keys || [],
      priority: v1Data.priority || 100,
      enabled: v1Data.enabled !== false
    }
  };
}

/**
 * 从SillyTavern格式导入
 */
function importFromSillyTavern(data) {
  return {
    name: data.name,
    visual: {
      avatar: '',
      color: '#8a6d3b',
      emotionCGs: {}
    },
    core: {
      description: data.description || '',
      personality: data.personality || '',
      scenario: data.scenario || '',
      firstMessage: data.first_mes || '',
      worldConnection: { faction: '', location: '' }
    },
    activation: { keys: [], priority: 100, enabled: true },
    examples: {
      style: '',
      dialogues: parseSillyTavernExamples(data.mes_example)
    },
    lorebook: { entries: [], linkMode: 'MANUAL', linkedEntryIds: [] },
    injection: {
      characterNote: { 
        content: data.creatorcomment || '', 
        depth: 0, 
        frequency: 1, 
        role: 'system' 
      },
      postHistory: { content: '', enabled: false }
    },
    relationship: { favor: 50, trust: 50, mood: '平静' },
    meta: {
      description: '',
      tags: data.tags || [],
      creator: data.creator || '',
      version: data.character_version || '2.0.0',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    gameId: null
  };
}

/**
 * 解析SillyTavern示例对话
 */
function parseSillyTavernExamples(exampleText) {
  if (!exampleText) return [];
  
  const dialogues = [];
  const parts = exampleText.split('<START>');
  
  for (const part of parts) {
    if (!part.trim()) continue;
    
    const lines = part.trim().split('\n');
    let userMsg = '';
    let charMsg = '';
    
    for (const line of lines) {
      if (line.startsWith('{{user}}:')) {
        userMsg = line.replace('{{user}}:', '').trim();
      } else if (line.startsWith('{{char}}:')) {
        charMsg = line.replace('{{char}}:', '').trim();
      }
    }
    
    if (userMsg || charMsg) {
      dialogues.push({ user: userMsg, character: charMsg, annotation: '' });
    }
  }
  
  return dialogues;
}

/**
 * 转换为SillyTavern格式
 */
function convertToSillyTavern(character) {
  return {
    name: character.name,
    description: character.core?.description || '',
    personality: character.core?.personality || '',
    scenario: character.core?.scenario || '',
    first_mes: character.core?.firstMessage || '',
    mes_example: character.examples?.dialogues?.map(d => 
      `<START>\n{{user}}: ${d.user}\n{{char}}: ${d.character}`
    ).join('\n') || '',
    creatorcomment: character.injection?.characterNote?.content || '',
    tags: character.meta?.tags || [],
    creator: character.meta?.creator || '',
    character_version: character.meta?.version || '2.0.0'
  };
}

module.exports = router;
