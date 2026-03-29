/**
 * Gallery V2 API 测试 - 带模拟数据
 * 直接在内存中添加CG进行测试
 */

const API_BASE = 'http://localhost:3000/api';
const testGameId = 'test_game_' + Date.now();

// 先直接操作内存存储添加CG
const memoryStore = require('./utils/memoryStore');

// 添加测试CG到内存
const testCGs = [
  {
    _id: 'galv2_001',
    gameId: testGameId,
    name: '雪地战斗-拔剑',
    url: 'https://images.unsplash.com/photo-1514539079130-25950c84af65?w=800',
    type: 'character_extended',
    triggerSystem: {
      mode: 'tag_match',
      conditions: {
        sceneKeywords: ['雪地', '战斗', '剑', '寒冷'],
        emotions: ['愤怒', '专注', '决绝'],
        actions: ['拔剑', '攻击', '战斗'],
        specialTags: ['战斗场景']
      },
      priority: 800,
      probability: 1.0
    },
    display: {
      mode: 'character_center',
      animation: { enter: 'zoom', duration: 500 },
      zIndex: 10
    },
    meta: { createdAt: new Date(), usageCount: 0 }
  },
  {
    _id: 'galv2_002',
    gameId: testGameId,
    name: '温泉放松-微笑',
    url: 'https://images.unsplash.com/photo-1575425186775-b8de9a427e67?w=800',
    type: 'character_extended',
    triggerSystem: {
      mode: 'tag_match',
      conditions: {
        sceneKeywords: ['温泉', '放松', '水', '蒸汽'],
        emotions: ['开心', '放松', '舒适'],
        actions: ['泡澡', '休息', '微笑'],
        specialTags: ['日常']
      },
      priority: 600,
      probability: 1.0
    },
    display: {
      mode: 'character_center',
      animation: { enter: 'fade', duration: 800 },
      zIndex: 10
    },
    meta: { createdAt: new Date(), usageCount: 0 }
  },
  {
    _id: 'galv2_003',
    gameId: testGameId,
    name: '星空浪漫-亲吻',
    url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=800',
    type: 'character_extended',
    triggerSystem: {
      mode: 'tag_match',
      conditions: {
        sceneKeywords: ['星空', '夜晚', '浪漫', '星星'],
        emotions: ['害羞', '开心', '爱恋'],
        actions: ['亲吻', '拥抱', '依偎'],
        relationshipStates: ['热恋', '亲密'],
        specialTags: ['浪漫', 'R18']
      },
      priority: 900,
      probability: 0.8
    },
    constraints: {
      prerequisites: { minFavor: 70, maxFavor: 100 }
    },
    display: {
      mode: 'character_center',
      animation: { enter: 'fade', duration: 1000 },
      zIndex: 10
    },
    meta: { createdAt: new Date(), usageCount: 0 }
  },
  {
    _id: 'galv2_004',
    gameId: testGameId,
    name: '战斗受伤-痛苦',
    url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800',
    type: 'character_extended',
    triggerSystem: {
      mode: 'tag_match',
      conditions: {
        sceneKeywords: ['受伤', '流血', '痛苦', '战斗'],
        emotions: ['痛苦', '悲伤', '绝望'],
        actions: ['倒地', '流血', '挣扎'],
        specialTags: ['血腥']
      },
      priority: 850,
      probability: 1.0
    },
    display: {
      mode: 'character_center',
      animation: { enter: 'slide', duration: 600 },
      zIndex: 10
    },
    meta: { createdAt: new Date(), usageCount: 0 }
  }
];

async function testWithMockData() {
  console.log('🧪 Gallery V2 API 测试（带模拟数据）\n');
  console.log('测试GameId:', testGameId);
  
  // 1. 添加模拟CG到内存
  console.log('\n1️⃣ 添加测试CG到内存存储...');
  testCGs.forEach(cg => {
    memoryStore.create('gallery_v2', cg);
  });
  console.log(`✅ 已添加 ${testCGs.length} 个测试CG`);
  
  // 2. 测试获取列表
  console.log('\n2️⃣ 测试获取CG列表...');
  try {
    const res = await fetch(`${API_BASE}/gallery/v2?gameId=${testGameId}`);
    const data = await res.json();
    console.log('列表结果:', data.success ? '✅ 成功' : '❌ 失败');
    console.log('CG数量:', data.data?.count || 0);
    if (data.data?.images?.length > 0) {
      data.data.images.forEach((cg, i) => {
        console.log(`  ${i+1}. ${cg.name} (关键词: ${cg.triggerSystem?.conditions?.sceneKeywords?.join(', ') || '无'})`);
      });
    }
  } catch (err) {
    console.error('❌ 失败:', err.message);
  }
  
  // 3. 测试智能匹配 - 战斗场景
  console.log('\n3️⃣ 测试智能匹配 - 战斗场景...');
  const testCases = [
    { scene: '雪地里，她拔出长剑，眼神中充满愤怒', expected: '雪地战斗-拔剑' },
    { scene: '温泉中，她放松地微笑着', expected: '温泉放松-微笑' },
    { scene: '星空下，两人相拥而吻，气氛浪漫', expected: '星空浪漫-亲吻', emotion: '害羞' },
    { scene: '战斗中，她身受重伤，倒在地上流血', expected: '战斗受伤-痛苦' },
    { scene: '普通对话，没有特殊场景', expected: '无匹配' }
  ];
  
  for (const testCase of testCases) {
    try {
      const res = await fetch(`${API_BASE}/gallery/v2/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: testGameId,
          context: {
            scene: testCase.scene,
            emotion: testCase.emotion || '',
            action: ''
          }
        })
      });
      const data = await res.json();
      
      const topMatch = data.data?.topMatch;
      const matchName = topMatch?.name || '无匹配';
      const confidence = data.data?.confidence || 0;
      const isMatch = matchName === testCase.expected || (testCase.expected === '无匹配' && !topMatch);
      
      console.log(`\n  📝 "${testCase.scene.substring(0, 30)}..."`);
      console.log(`     预期: ${testCase.expected}`);
      console.log(`     结果: ${matchName} ${isMatch ? '✅' : '❌'}`);
      console.log(`     置信度: ${(confidence * 100).toFixed(0)}%`);
      if (topMatch?.matchDetails?.length > 0) {
        console.log(`     匹配原因: ${topMatch.matchDetails.slice(0, 2).join(', ')}`);
      }
    } catch (err) {
      console.error(`  ❌ 测试失败:`, err.message);
    }
  }
  
  // 4. 测试好感度约束
  console.log('\n4️⃣ 测试好感度约束...');
  try {
    // 好感度不足的情况
    const res1 = await fetch(`${API_BASE}/gallery/v2/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: testGameId,
        context: {
          scene: '星空下，两人相拥而吻',
          emotion: '害羞'
        },
        relationshipState: { favor: 30 } // 好感度30，不满足70+的要求
      })
    });
    const data1 = await res1.json();
    console.log('  好感度30（要求70+）:', data1.data?.topMatch?.name || '被阻止 ✅');
    
    // 好感度满足的情况
    const res2 = await fetch(`${API_BASE}/gallery/v2/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: testGameId,
        context: {
          scene: '星空下，两人相拥而吻',
          emotion: '害羞'
        },
        relationshipState: { favor: 80 } // 好感度80，满足要求
      })
    });
    const data2 = await res2.json();
    console.log('  好感度80（满足要求）:', data2.data?.topMatch?.name || '无匹配');
  } catch (err) {
    console.error('  ❌ 测试失败:', err.message);
  }
  
  // 5. 测试测试匹配接口
  console.log('\n5️⃣ 测试匹配测试接口...');
  try {
    const res = await fetch(`${API_BASE}/gallery/v2/test-match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: testGameId,
        testScenes: [
          '雪地里，她拔出长剑',
          '温泉中放松',
          '星空下的浪漫',
          '战斗中受伤'
        ]
      })
    });
    const data = await res.json();
    
    if (data.success) {
      console.log('✅ 批量测试成功');
      data.data.testScenes.forEach((result, idx) => {
        const topMatch = result.topMatches[0];
        console.log(`  场景${idx+1}: "${result.scene.substring(0, 15)}..." → ${topMatch?.name || '无匹配'} (${topMatch?.score?.toFixed(1) || 0})`);
      });
    }
  } catch (err) {
    console.error('❌ 测试失败:', err.message);
  }
  
  console.log('\n✅ 所有测试完成！');
  
  // 清理数据
  console.log('\n🧹 清理测试数据...');
  testCGs.forEach(cg => {
    memoryStore.delete('gallery_v2', cg._id);
  });
}

testWithMockData();
