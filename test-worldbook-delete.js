const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// 测试配置
const API_BASE = 'http://localhost:3000/api';
const GAME_ID = '60d9c0b3c3f8b8001c8e4d5a'; // 替换为实际游戏ID
const AUTH_TOKEN = 'YOUR_AUTH_TOKEN'; // 替换为实际的认证令牌

// 测试世界书删除功能
async function testWorldbookDelete() {
    console.log('=== 测试世界书删除功能 ===');
    
    try {
        // 1. 获取当前世界书条目
        console.log('1. 获取当前世界书条目...');
        const getResponse = await fetch(`${API_BASE}/games/${GAME_ID}/worldbook`, {
            headers: {
                'Authorization': `Bearer ${AUTH_TOKEN}`
            }
        });
        
        if (!getResponse.ok) {
            throw new Error(`获取世界书失败: ${getResponse.status}`);
        }
        
        const getResult = await getResponse.json();
        console.log(`当前世界书条目数量: ${getResult.data.entries.length}`);
        console.log('当前条目:', getResult.data.entries.map(e => ({ id: e._id, name: e.name })));
        
        if (getResult.data.entries.length === 0) {
            console.log('没有条目可删除，测试结束');
            return;
        }
        
        // 2. 选择一个条目进行删除测试
        const entryToDelete = getResult.data.entries[0];
        console.log(`\n2. 准备删除条目: ${entryToDelete.name} (${entryToDelete._id})`);
        
        // 3. 构建删除后的条目列表（移除要删除的条目）
        const remainingEntries = getResult.data.entries.filter(e => e._id !== entryToDelete._id);
        console.log(`删除后剩余条目数量: ${remainingEntries.length}`);
        
        // 4. 保存删除后的条目列表到后端
        console.log('\n3. 保存删除后的条目列表到后端...');
        const saveResponse = await fetch(`${API_BASE}/games/${GAME_ID}/worldbook`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${AUTH_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ entries: remainingEntries })
        });
        
        if (!saveResponse.ok) {
            throw new Error(`保存世界书失败: ${saveResponse.status}`);
        }
        
        const saveResult = await saveResponse.json();
        console.log('保存结果:', saveResult.message);
        console.log('后端返回的条目数量:', saveResult.data.entries.length);
        
        // 5. 再次获取世界书条目，验证删除是否成功
        console.log('\n4. 验证删除是否成功...');
        const verifyResponse = await fetch(`${API_BASE}/games/${GAME_ID}/worldbook`, {
            headers: {
                'Authorization': `Bearer ${AUTH_TOKEN}`
            }
        });
        
        if (!verifyResponse.ok) {
            throw new Error(`验证世界书失败: ${verifyResponse.status}`);
        }
        
        const verifyResult = await verifyResponse.json();
        console.log(`验证后世界书条目数量: ${verifyResult.data.entries.length}`);
        console.log('验证后条目:', verifyResult.data.entries.map(e => ({ id: e._id, name: e.name })));
        
        // 检查被删除的条目是否仍然存在
        const deletedEntryExists = verifyResult.data.entries.some(e => e._id === entryToDelete._id);
        if (deletedEntryExists) {
            console.log('❌ 测试失败: 被删除的条目仍然存在');
        } else {
            console.log('✅ 测试成功: 被删除的条目已不存在');
        }
        
    } catch (error) {
        console.error('测试过程中发生错误:', error);
    }
}

// 运行测试
testWorldbookDelete();
