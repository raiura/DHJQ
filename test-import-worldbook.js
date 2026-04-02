#!/usr/bin/env node

/**
 * 测试脚本：将memory_store.json中的世界书条目导入到前端WorldbookLibrary
 * 
 * 功能：
 * 1. 读取memory_store.json文件中的世界书条目
 * 2. 将数据转换为前端WorldbookLibrary需要的格式
 * 3. 保存到localStorage中
 * 4. 验证数据是否正确导入
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

// 转换为WorldbookLibrary需要的格式
const libraryData = {
    version: '2.0',
    gameId: gameId,
    books: [
        {
            id: 'wb_default_' + Date.now(),
            name: '默认世界书',
            description: '自动创建的世界书，包含游戏的默认设定',
            isGlobal: true,
            entries: worldbookEntries.map(entry => ({
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
console.log(`将转换后的数据保存到localStorage键: ${storageKey}`);

// 模拟localStorage
const localStorageData = {};
localStorageData[storageKey] = JSON.stringify(libraryData);

// 保存到临时文件
const tempPath = path.join(__dirname, 'localStorage_worldbook.json');
fs.writeFileSync(tempPath, JSON.stringify(localStorageData, null, 2));
console.log(`数据已保存到 ${tempPath}`);

// 同时也保存为worldbookManager的格式
const worldbookManagerData = {
    entries: worldbookEntries.map(entry => ({
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
};

const worldbookManagerKey = `galgame_${gameId}_worldbook`;
localStorageData[worldbookManagerKey] = JSON.stringify(worldbookManagerData);

// 保存更新后的localStorage数据
fs.writeFileSync(tempPath, JSON.stringify(localStorageData, null, 2));
console.log(`同时保存了worldbookManager格式的数据到键: ${worldbookManagerKey}`);

// 验证转换结果
console.log('\n转换结果验证:');
console.log(`- 总条目数: ${worldbookEntries.length}`);
console.log(`- 生成的书本数: ${libraryData.books.length}`);
console.log(`- 激活的书本数: ${libraryData.activeBookIds.length}`);
console.log(`- 选中的书本: ${libraryData.selectedBookId}`);

// 显示前3个条目的信息作为示例
console.log('\n前3个条目的信息:');
worldbookEntries.slice(0, 3).forEach((entry, index) => {
    console.log(`\n条目 ${index + 1}:`);
    console.log(`  名称: ${entry.name}`);
    console.log(`  关键词: ${entry.keys.join(', ')}`);
    console.log(`  分组: ${entry.group}`);
    console.log(`  优先级: ${entry.priority}`);
});

console.log('\n操作完成！请将生成的localStorage_worldbook.json文件中的数据复制到浏览器的localStorage中。');
console.log('具体步骤:');
console.log('1. 打开浏览器开发者工具');
console.log('2. 导航到Application标签页');
console.log('3. 在左侧选择Local Storage -> 当前域名');
console.log('4. 点击"+"按钮添加新的键值对');
console.log('5. 键名: wblibrary_' + gameId);
console.log('6. 键值: 复制localStorage_worldbook.json文件中对应的值');
console.log('7. 同样添加键名: galgame_' + gameId + '_worldbook');
console.log('8. 刷新设置页面，查看世界书图书馆是否显示条目');