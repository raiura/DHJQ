// 导入世界书数据到前端localStorage
const fs = require('fs');
const path = require('path');

// 读取memory_store.json文件
const memoryStorePath = path.join(__dirname, 'backend', 'data', 'memory_store.json');
const memoryStoreData = JSON.parse(fs.readFileSync(memoryStorePath, 'utf8'));

// 提取worldbook_entries
const worldbookEntries = memoryStoreData.collections.worldbook_entries || [];
console.log(`从memory_store.json读取到 ${worldbookEntries.length} 个世界书条目`);

// 转换为前端需要的格式
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

// 生成localStorage键名
const gameId = memoryStoreData.collections.games[0]?._id || 'default';
const storageKey = `galgame_${gameId}_worldbook`;

console.log(`将转换后的数据保存到localStorage键: ${storageKey}`);
console.log('转换后的数据:', JSON.stringify(globalWorldbook, null, 2));

// 模拟localStorage
const localStorageData = {};
localStorageData[storageKey] = JSON.stringify(globalWorldbook);

// 保存到临时文件
const tempPath = path.join(__dirname, 'localStorage.json');
fs.writeFileSync(tempPath, JSON.stringify(localStorageData, null, 2));
console.log(`数据已保存到 ${tempPath}`);

// 同时创建一个浏览器可执行的脚本
const browserScript = `
// 手动导入世界书数据
const worldbookData = ${JSON.stringify(globalWorldbook, null, 2)};
const storageKey = '${storageKey}';

localStorage.setItem(storageKey, JSON.stringify(worldbookData));
console.log('世界书数据已导入到localStorage:', storageKey);
console.log('导入的条目数:', worldbookData.entries.length);

// 刷新页面以加载新数据
location.reload();
`;

const browserScriptPath = path.join(__dirname, 'import-worldbook-browser.js');
fs.writeFileSync(browserScriptPath, browserScript);
console.log(`浏览器执行脚本已保存到 ${browserScriptPath}`);
