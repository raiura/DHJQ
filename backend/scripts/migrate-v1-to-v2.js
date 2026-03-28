/**
 * V1角色数据迁移脚本
 * 将现有V1格式角色迁移到V2格式
 * 
 * 使用方法:
 * node backend/scripts/migrate-v1-to-v2.js [--dry-run] [--game-id=xxx]
 */

const mongoose = require('mongoose');
const path = require('path');

// 解析命令行参数
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const gameIdArg = args.find(arg => arg.startsWith('--game-id='));
const targetGameId = gameIdArg ? gameIdArg.split('=')[1] : null;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/galgame';

async function migrate() {
  console.log('========================================');
  console.log('Character Card V1 → V2 数据迁移');
  console.log('========================================');
  console.log(`模式: ${dryRun ? '预览模式' : '实际迁移'}`);
  if (targetGameId) console.log(`目标游戏: ${targetGameId}`);
  console.log('');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    const Character = require('../models/character');
    const query = targetGameId ? { gameId: targetGameId } : {};
    const characters = await Character.find(query);
    
    console.log(`找到 ${characters.length} 个角色\n`);

    let migrated = 0, skipped = 0, failed = 0;

    for (const char of characters) {
      try {
        // 检查是否已经是V2格式
        if (char.core && char.visual) {
          console.log(`⏭️  [跳过] ${char.name} - 已是V2格式`);
          skipped++;
          continue;
        }

        console.log(`🔄 [迁移] ${char.name}`);
        const v2Data = buildV2FromV1(char.toObject ? char.toObject() : char);
        
        if (!dryRun && char._id) {
          await Character.findByIdAndUpdate(char._id, v2Data);
          console.log('   ✅ 已保存');
        }
        
        migrated++;
      } catch (err) {
        console.error(`   ❌ 失败: ${err.message}`);
        failed++;
      }
    }

    console.log('\n========================================');
    console.log(`总计: ${characters.length} | 成功: ${migrated} | 跳过: ${skipped} | 失败: ${failed}`);

  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

function buildV2FromV1(v1Data) {
  const now = new Date();
  return {
    name: v1Data.name || '未命名角色',
    visual: {
      avatar: v1Data.image || '',
      cover: '',
      color: v1Data.color || '#8a6d3b',
      emotionCGs: {}
    },
    core: {
      description: [v1Data.appearance, v1Data.physique, v1Data.special].filter(Boolean).join('\n\n'),
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

migrate();
