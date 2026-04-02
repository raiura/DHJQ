/**
 * 世界书数据修复脚本
 * 
 * 功能：
 * 1. 从memory_store.json读取世界书条目
 * 2. 修复后端API返回格式
 * 3. 确保前端能够正确加载数据
 */

const fs = require('fs');
const path = require('path');

// 读取memory_store.json文件
const memoryStorePath = path.join(__dirname, 'backend', 'data', 'memory_store.json');
const memoryStoreData = JSON.parse(fs.readFileSync(memoryStorePath, 'utf8'));

// 提取worldbook_entries
const worldbookEntries = memoryStoreData.collections.worldbook_entries || [];
console.log(`从memory_store.json读取到 ${worldbookEntries.length} 个世界书条目`);

// 获取gameId
const gameId = memoryStoreData.collections.games[0]?._id || 'default';
console.log(`使用的gameId: ${gameId}`);

// 修复worldbook_entries数据格式
const fixedWorldbookEntries = worldbookEntries.map(entry => ({
    ...entry,
    // 确保所有必要字段都存在
    excludeKeys: entry.excludeKeys || [],
    insertPosition: entry.insertPosition || 'character',
    constant: entry.constant || false,
    gameId: entry.gameId || gameId // 添加gameId字段
}));

// 更新memory_store.json文件
memoryStoreData.collections.worldbook_entries = fixedWorldbookEntries;
fs.writeFileSync(memoryStorePath, JSON.stringify(memoryStoreData, null, 2));
console.log('已更新memory_store.json文件，添加了必要的字段');

// 创建前端导入数据
const libraryData = {
    version: '2.0',
    gameId: gameId,
    books: [
        {
            id: 'wb_default_' + Date.now(),
            name: '默认世界书',
            description: '自动创建的世界书，包含游戏的默认设定',
            isGlobal: true,
            entries: fixedWorldbookEntries.map(entry => ({
                id: entry._id,
                name: entry.name,
                keys: entry.keys || [],
                excludeKeys: entry.excludeKeys || [],
                content: entry.content,
                priority: entry.priority || 100,
                insertPosition: entry.insertPosition || 'character',
                group: entry.group || '默认分组',
                constant: entry.constant || false,
                enabled: entry.enabled !== false,
                createdAt: entry.createdAt,
                updatedAt: entry.updatedAt
            })),
            groups: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    ],
    activeBookIds: [],
    selectedBookId: null
};

// 设置激活的书本和选中的书本
if (libraryData.books.length > 0) {
    const defaultBookId = libraryData.books[0].id;
    libraryData.activeBookIds.push(defaultBookId);
    libraryData.selectedBookId = defaultBookId;
}

// 生成localStorage键名
const storageKey = `wblibrary_${gameId}`;
const worldbookManagerKey = `galgame_${gameId}_worldbook`;

// 保存为前端导入文件
const importData = {
    [storageKey]: libraryData,
    [worldbookManagerKey]: {
        entries: fixedWorldbookEntries.map(entry => ({
            id: entry._id,
            name: entry.name,
            keys: entry.keys || [],
            excludeKeys: entry.excludeKeys || [],
            content: entry.content,
            priority: entry.priority || 100,
            insertPosition: entry.insertPosition || 'character',
            group: entry.group || '默认分组',
            constant: entry.constant || false,
            enabled: entry.enabled !== false,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt
        })),
        groups: {},
        version: '1.0'
    }
};

const importFilePath = path.join(__dirname, 'worldbook-import-data.json');
fs.writeFileSync(importFilePath, JSON.stringify(importData, null, 2));
console.log(`前端导入数据已保存到 ${importFilePath}`);

// 显示修复结果
console.log('\n修复结果:');
console.log(`- 修复了 ${fixedWorldbookEntries.length} 个世界书条目`);
console.log(`- 为每个条目添加了必要的字段`);
console.log(`- 生成了前端导入数据`);
console.log('\n下一步操作:');
console.log('1. 打开浏览器，访问设置页面');
console.log('2. 打开浏览器开发者工具（F12）');
console.log('3. 导航到Application标签页');
console.log('4. 在左侧选择Local Storage -> 当前域名');
console.log('5. 点击"+"按钮添加新的键值对');
console.log(`6. 键名: ${storageKey}`);
console.log(`7. 键值: 复制worldbook-import-data.json文件中对应的值`);
console.log(`8. 同样添加键名: ${worldbookManagerKey}`);
console.log('9. 刷新设置页面，查看世界书图书馆是否显示条目');
console.log('\n或者直接打开import-worldbook.html文件，点击"导入世界书数据"按钮');