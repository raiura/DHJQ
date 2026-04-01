// 测试存储系统修复
console.log('=== 存储系统测试 ===');

// 1. 测试AI配置存储
console.log('\n1. AI配置存储测试:');
try {
    const aiSettings = localStorage.getItem('galgame_ai_settings');
    if (aiSettings) {
        console.log('✅ AI配置已存在:', JSON.parse(aiSettings));
    } else {
        console.log('❌ AI配置不存在，创建默认配置...');
        const defaultSettings = {
            apiKey: '',
            apiUrl: 'https://api.openai.com/v1',
            model: 'gpt-3.5-turbo'
        };
        localStorage.setItem('galgame_ai_settings', JSON.stringify(defaultSettings));
        console.log('✅ 默认AI配置已创建');
    }
} catch (error) {
    console.error('❌ AI配置测试失败:', error.message);
}

// 2. 测试世界书存储
console.log('\n2. 世界书存储测试:');
try {
    // 测试全局世界书
    const gameId = 'mem_1773324176145_1'; // 从URL中获取的gameId
    const globalKey = `wb_global_${gameId}`;
    const globalData = localStorage.getItem(globalKey);
    
    if (globalData) {
        const parsed = JSON.parse(globalData);
        console.log(`✅ 全局世界书已存在 (${globalKey}):`, parsed.entries.length, '个条目');
    } else {
        console.log(`❌ 全局世界书不存在 (${globalKey})，创建默认数据...`);
        const defaultGlobal = {
            entries: [
                {
                    id: 'default_1',
                    name: '默认设置',
                    keys: ['默认', '设置'],
                    content: '这是默认的世界书条目',
                    priority: 100,
                    group: '默认',
                    matchType: 'contains',
                    insertPosition: 'character',
                    enabled: true,
                    constant: false
                }
            ],
            groups: {
                '默认': {
                    color: '#888',
                    count: 1
                }
            },
            version: '1.0'
        };
        localStorage.setItem(globalKey, JSON.stringify(defaultGlobal));
        console.log('✅ 默认全局世界书已创建');
    }
    
    // 测试用户世界书
    const userData = localStorage.getItem('wb_user_data');
    if (userData) {
        const parsed = JSON.parse(userData);
        console.log('✅ 用户世界书已存在:', Object.keys(parsed).length, '个存档');
    } else {
        console.log('❌ 用户世界书不存在，创建默认数据...');
        const defaultUserData = {
            'default': {
                entries: [],
                stats: {},
                createdAt: new Date().toISOString()
            }
        };
        localStorage.setItem('wb_user_data', JSON.stringify(defaultUserData));
        console.log('✅ 默认用户世界书已创建');
    }
} catch (error) {
    console.error('❌ 世界书测试失败:', error.message);
}

// 3. 测试存储大小
console.log('\n3. 存储大小测试:');
try {
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        totalSize += key.length + value.length;
    }
    const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);
    console.log(`✅ 存储总大小: ${totalSizeMB} MB (限制: 5 MB)`);
    if (totalSizeMB < 5) {
        console.log('✅ 存储空间充足');
    } else {
        console.warn('⚠️  存储空间接近限制');
    }
} catch (error) {
    console.error('❌ 存储大小测试失败:', error.message);
}

// 4. 测试内存服务API
console.log('\n4. 内存服务API测试:');
try {
    // 尝试获取记忆统计数据
    fetch('http://localhost:3000/api/memories/mem_1773324176145_1/stats', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    })
    .then(data => {
        console.log('✅ 内存服务API调用成功:', data);
    })
    .catch(error => {
        console.error('❌ 内存服务API调用失败:', error.message);
    });
} catch (error) {
    console.error('❌ 内存服务API测试失败:', error.message);
}

console.log('\n=== 存储系统测试完成 ===');
