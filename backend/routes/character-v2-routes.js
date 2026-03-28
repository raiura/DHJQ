/**
 * 角色卡V2路由扩展
 * 
 * 使用方法：
 * 1. 将此文件添加到 backend/routes/ 目录
 * 2. 在 backend/app.js 中添加：
 *    app.use('/api/characters/v2', require('./routes/character-v2-routes'));
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// 导入扩展函数
const { validateV2Data, migrateV1ToV2, downgradeV2ToV1 } = require('../models/character-v2-extension');

// 中间件：验证MongoDB连接
const checkMongoDB = (req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ 
            success: false, 
            message: '数据库未连接' 
        });
    }
    next();
};

// ========== V2专用路由 ==========

/**
 * POST /api/characters/v2
 * 创建或更新V2角色
 */
router.post('/', checkMongoDB, async (req, res) => {
    try {
        const v2Data = req.body;
        const gameId = req.body.gameId || req.body.worldId;
        
        // 验证数据
        const validation = validateV2Data(v2Data);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: 'V2数据验证失败',
                errors: validation.errors
            });
        }
        
        // 获取Character模型
        const Character = mongoose.model('Character');
        
        // 构建保存数据
        const saveData = {
            name: v2Data.name,
            // 保留V1字段以兼容旧代码
            appearance: v2Data.core?.description || '',
            personality: v2Data.core?.personality || '',
            background: v2Data.core?.scenario || '',
            firstMessage: v2Data.core?.firstMessage || '',
            avatar: v2Data.visual?.avatar || '',
            color: v2Data.visual?.color || '#8a6d3b',
            keys: v2Data.activation?.keys || [],
            priority: v2Data.activation?.priority || 100,
            favor: v2Data.relationship?.favor || 50,
            trust: v2Data.relationship?.trust || 50,
            mood: v2Data.relationship?.mood || '平静',
            // V2数据存储在v2Data字段
            v2Data: {
                ...v2Data,
                version: '2.0',
                format: 'v2',
                _savedAt: new Date().toISOString()
            },
            // 标记为V2格式
            format: 'v2',
            version: '2.0'
        };
        
        if (gameId) {
            saveData.gameId = gameId;
        }
        
        let character;
        
        if (v2Data.id) {
            // 更新现有角色
            character = await Character.findByIdAndUpdate(
                v2Data.id,
                saveData,
                { new: true, upsert: false }
            );
            
            if (!character) {
                return res.status(404).json({
                    success: false,
                    message: '角色不存在'
                });
            }
        } else {
            // 创建新角色
            character = new Character(saveData);
            await character.save();
        }
        
        res.json({
            success: true,
            message: v2Data.id ? '角色已更新 (V2)' : '角色已创建 (V2)',
            data: {
                id: character._id,
                name: character.name,
                version: '2.0',
                format: 'v2'
            }
        });
        
    } catch (error) {
        console.error('[CharacterV2] 保存失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误: ' + error.message
        });
    }
});

/**
 * GET /api/characters/v2/:id
 * 获取V2角色详情
 */
router.get('/:id', checkMongoDB, async (req, res) => {
    try {
        const { id } = req.params;
        const format = req.query.format || 'v2'; // 'v2' 或 'v1-compat'
        
        const Character = mongoose.model('Character');
        const character = await Character.findById(id);
        
        if (!character) {
            return res.status(404).json({
                success: false,
                message: '角色不存在'
            });
        }
        
        // 检查是否为V2角色
        const isV2 = character.format === 'v2' || (character.v2Data && character.v2Data.version);
        
        if (!isV2) {
            // 如果是V1角色且请求V2格式，进行迁移
            if (format === 'v2') {
                const migrated = migrateV1ToV2(character.toObject());
                return res.json({
                    success: true,
                    data: migrated,
                    isMigrated: true,
                    originalFormat: 'v1'
                });
            }
        }
        
        // 返回数据
        let responseData;
        if (format === 'v1-compat' && character.v2Data) {
            // 降级到V1格式
            responseData = downgradeV2ToV1(character.v2Data);
        } else {
            // 返回V2格式
            responseData = character.v2Data || migrateV1ToV2(character.toObject());
            responseData.id = character._id.toString();
            responseData.name = character.name;
        }
        
        res.json({
            success: true,
            data: responseData,
            format: format === 'v1-compat' ? 'v1' : 'v2',
            isMigrated: false
        });
        
    } catch (error) {
        console.error('[CharacterV2] 获取失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误: ' + error.message
        });
    }
});

/**
 * POST /api/characters/v2/:id/migrate
 * 将V1角色迁移到V2
 */
router.post('/:id/migrate', checkMongoDB, async (req, res) => {
    try {
        const { id } = req.params;
        const Character = mongoose.model('Character');
        
        const character = await Character.findById(id);
        
        if (!character) {
            return res.status(404).json({
                success: false,
                message: '角色不存在'
            });
        }
        
        // 检查是否已经是V2
        if (character.format === 'v2' && character.v2Data) {
            return res.json({
                success: true,
                message: '角色已经是V2格式',
                data: { id: character._id, alreadyV2: true }
            });
        }
        
        // 执行迁移
        const v2Data = migrateV1ToV2(character.toObject());
        
        await Character.findByIdAndUpdate(id, {
            format: 'v2',
            version: '2.0',
            v2Data: v2Data
        });
        
        res.json({
            success: true,
            message: '角色已迁移到V2格式',
            data: { id, migrated: true }
        });
        
    } catch (error) {
        console.error('[CharacterV2] 迁移失败:', error);
        res.status(500).json({
            success: false,
            message: '迁移失败: ' + error.message
        });
    }
});

/**
 * GET /api/characters/v2/game/:gameId
 * 获取游戏的所有V2角色
 */
router.get('/game/:gameId', checkMongoDB, async (req, res) => {
    try {
        const { gameId } = req.params;
        const Character = mongoose.model('Character');
        
        const characters = await Character.find({ 
            gameId: gameId,
            $or: [
                { format: 'v2' },
                { v2Data: { $exists: true, $ne: null } }
            ]
        });
        
        const v2Characters = characters.map(char => ({
            id: char._id,
            name: char.name,
            version: char.v2Data?.version || '2.0',
            format: char.format || 'v2',
            visual: char.v2Data?.visual || { avatar: char.avatar, color: char.color }
        }));
        
        res.json({
            success: true,
            data: v2Characters,
            count: v2Characters.length
        });
        
    } catch (error) {
        console.error('[CharacterV2] 查询失败:', error);
        res.status(500).json({
            success: false,
            message: '查询失败: ' + error.message
        });
    }
});

/**
 * POST /api/characters/v2/:id/worldbook/link
 * 关联世界书条目
 */
router.post('/:id/worldbook/link', checkMongoDB, async (req, res) => {
    try {
        const { id } = req.params;
        const { entryIds, mode } = req.body;
        
        const Character = mongoose.model('Character');
        const character = await Character.findById(id);
        
        if (!character) {
            return res.status(404).json({
                success: false,
                message: '角色不存在'
            });
        }
        
        // 确保有v2Data
        if (!character.v2Data) {
            character.v2Data = migrateV1ToV2(character.toObject());
        }
        
        // 更新关联
        character.v2Data.lorebook = character.v2Data.lorebook || {};
        character.v2Data.lorebook.entries = entryIds.map(id => mongoose.Types.ObjectId(id));
        character.v2Data.lorebook._linkMode = mode || 'manual';
        
        await character.save();
        
        res.json({
            success: true,
            message: '世界书关联已更新',
            data: {
                linkedCount: entryIds.length,
                mode: mode || 'manual'
            }
        });
        
    } catch (error) {
        console.error('[CharacterV2] 关联失败:', error);
        res.status(500).json({
            success: false,
            message: '关联失败: ' + error.message
        });
    }
});

module.exports = router;
