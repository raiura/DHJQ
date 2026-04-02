const http = require('http');
const fs = require('fs');
const path = require('path');

// 测试配置
const API_BASE = 'localhost:3000';
const GAME_ID = 'mem_1773324176145_1'; // 替换为实际游戏ID

// 发送HTTP请求的函数
function sendRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({ status: res.statusCode, data: JSON.parse(data) });
            });
        });
        
        req.on('error', (e) => {
            reject(e);
        });
        
        if (postData) {
            req.write(postData);
        }
        
        req.end();
    });
}

// 测试世界书删除功能
async function testWorldbookDelete() {
    console.log('=== 测试世界书删除功能 ===');
    
    try {
        // 1. 获取当前世界书条目
        console.log('1. 获取当前世界书条目...');
        const getOptions = {
            hostname: API_BASE.split(':')[0],
            port: API_BASE.split(':')[1],
            path: `/api/games/${GAME_ID}/worldbook`,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        const getResult = await sendRequest(getOptions);
        console.log(`当前世界书条目数量: ${getResult.data.data.entries.length}`);
        console.log('当前条目:', getResult.data.data.entries.map(e => ({ id: e._id, name: e.name })));
        
        if (getResult.data.data.entries.length === 0) {
            console.log('没有条目可删除，测试结束');
            return;
        }
        
        // 2. 选择一个条目进行删除测试
        const entryToDelete = getResult.data.data.entries[0];
        console.log(`\n2. 准备删除条目: ${entryToDelete.name} (${entryToDelete._id})`);
        
        // 3. 构建删除后的条目列表（移除要删除的条目）
        const remainingEntries = getResult.data.data.entries.filter(e => e._id !== entryToDelete._id);
        console.log(`删除后剩余条目数量: ${remainingEntries.length}`);
        
        // 4. 保存删除后的条目列表到后端
        console.log('\n3. 保存删除后的条目列表到后端...');
        const saveOptions = {
            hostname: API_BASE.split(':')[0],
            port: API_BASE.split(':')[1],
            path: `/api/games/${GAME_ID}/worldbook`,
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(JSON.stringify({ entries: remainingEntries }))
            }
        };
        
        const saveResult = await sendRequest(saveOptions, JSON.stringify({ entries: remainingEntries }));
        console.log('保存结果:', saveResult.data.message);
        console.log('保存响应完整数据:', JSON.stringify(saveResult.data, null, 2));
        if (saveResult.data.data && saveResult.data.data.entries) {
            console.log('后端返回的条目数量:', saveResult.data.data.entries.length);
        } else {
            console.log('后端返回的数据结构不符合预期');
        }
        
        // 5. 再次获取世界书条目，验证删除是否成功
        console.log('\n4. 验证删除是否成功...');
        const verifyResult = await sendRequest(getOptions);
        console.log(`验证后世界书条目数量: ${verifyResult.data.data.entries.length}`);
        console.log('验证后条目:', verifyResult.data.data.entries.map(e => ({ id: e._id, name: e.name })));
        
        // 检查被删除的条目是否仍然存在
        const deletedEntryExists = verifyResult.data.data.entries.some(e => e._id === entryToDelete._id);
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
