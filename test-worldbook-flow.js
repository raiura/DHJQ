// 测试世界书数据流程
const fs = require('fs');
const path = require('path');

// 模拟前端localStorage
const localStorage = {
    data: {},
    getItem(key) {
        return this.data[key];
    },
    setItem(key, value) {
        this.data[key] = value;
    },
    clear() {
        this.data = {};
    }
};

// 1. 从memory_store.json读取数据
console.log('1. 从memory_store.json读取数据...');
const memoryStorePath = path.join(__dirname, 'backend', 'data', 'memory_store.json');
const memoryStoreData = JSON.parse(fs.readFileSync(memoryStorePath, 'utf8'));
const worldbookEntries = memoryStoreData.collections.worldbook_entries || [];
console.log(`读取到 ${worldbookEntries.length} 个世界书条目`);

// 2. 模拟worldbookManager保存数据到localStorage
console.log('\n2. 模拟worldbookManager保存数据到localStorage...');
const gameId = memoryStoreData.collections.games[0]?._id || 'default';
const worldbookManagerKey = `galgame_${gameId}_worldbook`;
const globalWorldbook = {
    entries: worldbookEntries.map(entry => ({
        id: entry._id,
        name: entry.name,
        keys: entry.keys,
        content: entry.content,
        group: entry.group,
        priority: entry.priority,
        enabled: entry.enabled,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt
    })),
    groups: {},
    version: '1.0'
};
localStorage.setItem(worldbookManagerKey, JSON.stringify(globalWorldbook));
console.log(`数据已保存到localStorage键: ${worldbookManagerKey}`);

// 3. 模拟WorldbookLibrary从localStorage迁移数据
console.log('\n3. 模拟WorldbookLibrary从localStorage迁移数据...');
const worldbookLibraryKey = `wblibrary_${gameId}`;

// 模拟WorldbookLibrary的迁移逻辑
function migrateFromOldFormat() {
    const oldKeys = [
        `wb_global_${gameId}`,
        `worldbook_${gameId}`,
        'worldbook_global',
        `galgame_${gameId}_worldbook`,
        `galgame_default_worldbook`
    ];
    
    let migratedEntries = [];
    
    for (const key of oldKeys) {
        const oldData = localStorage.getItem(key);
        if (oldData) {
            try {
                const parsed = JSON.parse(oldData);
                let entries = [];
                if (parsed.entries && Array.isArray(parsed.entries)) {
                    entries = parsed.entries;
                } else if (Array.isArray(parsed)) {
                    entries = parsed;
                }
                
                if (entries.length > 0) {
                    console.log(`从 ${key} 迁移 ${entries.length} 个条目`);
                    migratedEntries = migratedEntries.concat(entries);
                }
            } catch (error) {
                console.error(`解析 ${key} 失败:`, error);
            }
        }
    }
    
    return migratedEntries;
}

const migratedEntries = migrateFromOldFormat();
console.log(`总共迁移了 ${migratedEntries.length} 个条目`);

// 4. 模拟WorldbookLibrary保存数据
console.log('\n4. 模拟WorldbookLibrary保存数据...');
const libraryData = {
    books: [{
        id: 'wb_default',
        name: '默认世界书',
        description: '自动创建的世界书',
        isGlobal: true,
        entries: migratedEntries.map(entry => ({
            id: entry.id || `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: entry.name || '未命名条目',
            keys: entry.keys || [],
            excludeKeys: entry.excludeKeys || [],
            content: entry.content || '',
            priority: entry.priority || 100,
            insertPosition: entry.insertPosition || 'character',
            group: entry.group || '默认分组',
            constant: entry.constant || false,
            enabled: entry.enabled !== false,
            createdAt: entry.createdAt || new Date().toISOString(),
            updatedAt: entry.updatedAt || new Date().toISOString()
        })),
        groups: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }],
    activeBookIds: ['wb_default'],
    selectedBookId: 'wb_default',
    version: '2.0'
};

localStorage.setItem(worldbookLibraryKey, JSON.stringify(libraryData));
console.log(`数据已保存到localStorage键: ${worldbookLibraryKey}`);

// 5. 验证数据
console.log('\n5. 验证数据...');
const storedLibraryData = JSON.parse(localStorage.getItem(worldbookLibraryKey));
console.log(`WorldbookLibrary存储的书本数: ${storedLibraryData.books.length}`);
console.log(`WorldbookLibrary存储的条目数: ${storedLibraryData.books[0].entries.length}`);

// 6. 输出总结
console.log('\n6. 总结:');
console.log('- 从memory_store.json读取了', worldbookEntries.length, '个条目');
console.log('- 迁移到WorldbookLibrary了', migratedEntries.length, '个条目');
console.log('- 数据已成功保存到WorldbookLibrary的存储中');

// 保存测试结果到文件
const testResult = {
    memoryStoreEntries: worldbookEntries.length,
    migratedEntries: migratedEntries.length,
    libraryEntries: storedLibraryData.books[0].entries.length,
    worldbookManagerKey: worldbookManagerKey,
    worldbookLibraryKey: worldbookLibraryKey,
    timestamp: new Date().toISOString()
};

const testResultPath = path.join(__dirname, 'test-worldbook-result.json');
fs.writeFileSync(testResultPath, JSON.stringify(testResult, null, 2));
console.log(`\n测试结果已保存到 ${testResultPath}`);
