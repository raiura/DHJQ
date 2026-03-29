/**
 * Gallery V2 API 测试脚本 - 详细版
 */

const API_BASE = 'http://localhost:3000/api';

// 测试数据
const testGameId = 'test_game_' + Date.now();
const testCG = {
    gameId: testGameId,
    name: '雪地战斗-拔剑',
    url: 'https://example.com/snow_battle.jpg',
    type: 'character_extended',
    triggerSystem: {
        mode: 'tag_match',
        conditions: {
            sceneKeywords: ['雪地', '战斗', '剑'],
            emotions: ['愤怒', '专注'],
            actions: ['拔剑', '攻击'],
            specialTags: ['战斗场景']
        },
        priority: 800,
        probability: 0.9
    },
    display: {
        mode: 'character_center',
        animation: { enter: 'zoom', duration: 500 },
        zIndex: 10
    }
};

async function testAPI() {
    console.log('🧪 Gallery V2 API 测试开始\n');
    console.log('API地址:', API_BASE);
    console.log('测试GameId:', testGameId, '\n');
    
    try {
        // 1. 测试添加CG
        console.log('1️⃣ 测试添加CG...');
        console.log('请求数据:', JSON.stringify(testCG, null, 2));
        const createRes = await fetch(`${API_BASE}/gallery/v2`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testCG)
        });
        console.log('响应状态:', createRes.status, createRes.statusText);
        const createData = await createRes.json();
        console.log('响应数据:', JSON.stringify(createData, null, 2));
        console.log('创建结果:', createData.success ? '✅ 成功' : '❌ 失败');
        if (!createData.success) {
            console.error('错误信息:', createData.message);
        }
        
        // 2. 测试获取列表
        console.log('\n2️⃣ 测试获取CG列表...');
        const listUrl = `${API_BASE}/gallery/v2?gameId=${testGameId}`;
        console.log('请求URL:', listUrl);
        const listRes = await fetch(listUrl);
        console.log('响应状态:', listRes.status);
        const listData = await listRes.json();
        console.log('列表结果:', listData.success ? '✅ 成功' : '❌ 失败');
        console.log('CG数量:', listData.data?.count || 0);
        if (listData.data?.images?.length > 0) {
            console.log('第一个CG:', listData.data.images[0].name);
        }
        
        // 3. 测试智能匹配（核心功能）
        console.log('\n3️⃣ 测试智能匹配...');
        const matchBody = {
            gameId: testGameId,
            context: {
                scene: '雪地里，她拔出长剑，眼神中充满愤怒',
                emotion: '愤怒',
                action: '拔剑'
            }
        };
        console.log('请求数据:', JSON.stringify(matchBody, null, 2));
        const matchRes = await fetch(`${API_BASE}/gallery/v2/match`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(matchBody)
        });
        console.log('响应状态:', matchRes.status);
        const matchData = await matchRes.json();
        console.log('匹配结果:', matchData.success ? '✅ 成功' : '❌ 失败');
        if (matchData.success) {
            console.log('置信度:', matchData.confidence);
            console.log('建议切换:', matchData.suggestedSwitch ? '是' : '否');
            console.log('Top匹配:', matchData.topMatch?.name || '无');
            console.log('匹配分数:', matchData.topMatch?.matchScore || 0);
        } else {
            console.error('错误信息:', matchData.message);
        }
        
        // 4. 测试匹配测试接口
        console.log('\n4️⃣ 测试匹配测试接口...');
        const testBody = {
            gameId: testGameId,
            testScenes: [
                '雪地里，她拔出长剑',
                '两人在温泉中放松',
                '星空下的浪漫约会'
            ]
        };
        console.log('请求数据:', JSON.stringify(testBody, null, 2));
        const testRes = await fetch(`${API_BASE}/gallery/v2/test-match`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testBody)
        });
        console.log('响应状态:', testRes.status);
        const testData = await testRes.json();
        console.log('测试结果:', testData.success ? '✅ 成功' : '❌ 失败');
        if (testData.success) {
            testData.data.testScenes.forEach((scene, idx) => {
                console.log(`场景${idx + 1}: "${scene.scene.substring(0, 30)}..."`);
                console.log(`  - 匹配到 ${scene.allMatches} 个CG`);
                if (scene.topMatches?.length > 0) {
                    console.log(`  - Top1: ${scene.topMatches[0]?.name} (${scene.topMatches[0]?.score?.toFixed(1) || 0})`);
                }
            });
        } else {
            console.error('错误信息:', testData.message);
        }
        
        console.log('\n✅ 所有测试完成！');
        
    } catch (error) {
        console.error('\n❌ 测试失败:', error.message);
        console.error('错误堆栈:', error.stack);
        console.log('\n请检查:');
        console.log('1. 后端服务是否运行在 http://localhost:3000');
        console.log('2. 网络连接是否正常');
    }
}

// 运行测试
testAPI();
