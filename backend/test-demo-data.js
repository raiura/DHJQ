/**
 * Gallery V2 API 测试 - 使用预加载的Demo数据
 */

const API_BASE = 'http://localhost:3000/api';
const DEMO_GAME_ID = 'demo_game_001';

async function testWithDemoData() {
  console.log('🧪 Gallery V2 API 测试（使用Demo数据）\n');
  console.log('测试GameId:', DEMO_GAME_ID, '\n');
  
  // 1. 获取CG列表
  console.log('1️⃣ 获取CG列表...');
  try {
    const res = await fetch(`${API_BASE}/gallery/v2?gameId=${DEMO_GAME_ID}`);
    const data = await res.json();
    console.log('✅ 成功');
    console.log('CG数量:', data.data?.count || 0);
    if (data.data?.images?.length > 0) {
      data.data.images.forEach((cg, i) => {
        console.log(`  ${i+1}. ${cg.name}`);
        console.log(`     关键词: ${cg.triggerSystem?.conditions?.sceneKeywords?.join(', ')}`);
        console.log(`     情绪: ${cg.triggerSystem?.conditions?.emotions?.join(', ')}`);
      });
    }
  } catch (err) {
    console.error('❌ 失败:', err.message);
  }
  
  // 2. 测试智能匹配
  console.log('\n2️⃣ 测试智能匹配...');
  const testCases = [
    { 
      scene: '雪地里，她拔出长剑，眼神中充满愤怒',
      expected: '雪地战斗-拔剑'
    },
    { 
      scene: '温泉中，她放松地微笑着',
      expected: '温泉放松'
    },
    { 
      scene: '星空下，两人相拥而吻，气氛浪漫',
      emotion: '害羞',
      favor: 80,  // 高好感度
      expected: '星空浪漫'
    },
    { 
      scene: '星空下，两人相拥', 
      favor: 30,  // 低好感度，应该被约束阻止
      expected: '被阻止'
    }
  ];
  
  for (const testCase of testCases) {
    try {
      const body = {
        gameId: DEMO_GAME_ID,
        context: {
          scene: testCase.scene,
          emotion: testCase.emotion || ''
        }
      };
      
      if (testCase.favor) {
        body.context.relationshipState = { favor: testCase.favor };
      }
      
      const res = await fetch(`${API_BASE}/gallery/v2/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      
      const topMatch = data.data?.topMatch;
      const matchName = topMatch?.name || '无匹配';
      const confidence = data.data?.confidence || 0;
      const isBlocked = topMatch?.blocked;
      
      console.log(`\n  📝 "${testCase.scene.substring(0, 30)}..."`);
      console.log(`     预期: ${testCase.expected}`);
      if (isBlocked) {
        console.log(`     结果: 被阻止 ✅ (${topMatch.blockReason})`);
      } else {
        console.log(`     结果: ${matchName} ${matchName === testCase.expected ? '✅' : (testCase.expected === '无匹配' ? '✅' : '⚠️')}`);
        console.log(`     置信度: ${(confidence * 100).toFixed(0)}%`);
        if (topMatch?.matchDetails?.length > 0) {
          console.log(`     匹配原因: ${topMatch.matchDetails.join(', ')}`);
        }
      }
    } catch (err) {
      console.error(`  ❌ 失败:`, err.message);
    }
  }
  
  // 3. 测试批量匹配
  console.log('\n3️⃣ 测试批量匹配...');
  try {
    const res = await fetch(`${API_BASE}/gallery/v2/test-match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: DEMO_GAME_ID,
        testScenes: [
          '雪地里战斗',
          '温泉放松',
          '星空浪漫约会'
        ]
      })
    });
    
    const data = await res.json();
    
    if (data.success) {
      console.log('✅ 批量测试成功');
      data.data.testScenes.forEach((result, idx) => {
        const topMatch = result.topMatches[0];
        console.log(`  场景${idx+1}: "${result.scene}"`);
        console.log(`       → ${topMatch?.name || '无匹配'} (分数: ${topMatch?.score?.toFixed(1) || 0})`);
      });
    }
  } catch (err) {
    console.error('❌ 失败:', err.message);
  }
  
  console.log('\n✅ 测试完成！');
  console.log('\n📚 下一步:');
  console.log('1. 打开 settings.html?id=demo_game_001');
  console.log('2. 进入"图库管理 V2.0"');
  console.log('3. 查看预加载的CG并测试匹配功能');
}

testWithDemoData();
