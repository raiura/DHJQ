/**
 * 调试测试
 */

const API_BASE = 'http://localhost:3000/api';
const DEMO_GAME_ID = 'demo_game_001';

async function debug() {
  console.log('🔍 调试Gallery V2匹配\n');
  
  // 直接调用match接口并查看完整返回
  console.log('1. 调用 /match 接口...');
  const res = await fetch(`${API_BASE}/gallery/v2/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gameId: DEMO_GAME_ID,
      context: {
        scene: '雪地里战斗',
        emotion: '愤怒',
        action: '拔剑'
      }
    })
  });
  
  const data = await res.json();
  console.log('返回数据:', JSON.stringify(data, null, 2));
}

debug();
