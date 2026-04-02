/**
 * memory_store.json 格式更新脚本
 * 
 * 功能：
 * 1. 为世界书条目添加缺少的必要字段
 * 2. 确保提示词配置能够从memory_store.json加载
 * 3. 确保所有字段符合最新的系统规范
 * 
 * 使用方法：
 * 1. 将此脚本保存为 update-memory-store.js
 * 2. 在backend目录下运行：node update-memory-store.js
 * 3. 运行后会生成更新后的memory_store.json文件
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'memory_store.json');
const BACKUP_FILE = path.join(__dirname, 'data', 'memory_store.json.backup');

// 读取文件
function readFile() {
    try {
        const content = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error('读取文件失败:', error.message);
        process.exit(1);
    }
}

// 写入文件
function writeFile(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
        console.log('文件更新成功:', DATA_FILE);
    } catch (error) {
        console.error('写入文件失败:', error.message);
        process.exit(1);
    }
}

// 创建备份
function createBackup(data) {
    try {
        fs.writeFileSync(BACKUP_FILE, JSON.stringify(data, null, 2), 'utf8');
        console.log('创建备份成功:', BACKUP_FILE);
    } catch (error) {
        console.error('创建备份失败:', error.message);
        // 继续执行，不中断
    }
}

// 更新世界书条目格式
function updateWorldbookEntries(data) {
    if (!data.collections) {
        data.collections = {};
    }
    
    if (!data.collections.worldbook_entries) {
        data.collections.worldbook_entries = [];
        console.log('世界书条目为空，跳过更新');
        return data;
    }
    
    console.log('更新世界书条目格式...');
    
    data.collections.worldbook_entries = data.collections.worldbook_entries.map(entry => {
        // 添加缺少的必要字段
        return {
            _id: entry._id,
            name: entry.name,
            keys: entry.keys || [],
            content: entry.content,
            group: entry.group || 'default',
            priority: entry.priority || 100,
            enabled: entry.enabled !== false, // 默认启用
            gameId: entry.gameId || null,
            
            // 添加缺少的字段
            entryType: entry.entryType || 'normal', // normal, timeline, setting
            matchType: entry.matchType || 'contains', // exact, contains, regex, prefix, suffix
            caseSensitive: entry.caseSensitive || false,
            insertPosition: entry.insertPosition || 'system', // system, character, user, after_user
            depth: entry.depth || 0,
            comment: entry.comment || '',
            usageCount: entry.usageCount || 0,
            lastTriggered: entry.lastTriggered || null,
            
            // 保留原有时间戳
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt
        };
    });
    
    console.log(`已更新 ${data.collections.worldbook_entries.length} 个世界书条目`);
    return data;
}

// 添加提示词配置支持
function addPromptConfigSupport(data) {
    if (!data.collections) {
        data.collections = {};
    }
    
    // 检查是否已有提示词配置集合
    if (!data.collections.prompt_configs) {
        data.collections.prompt_configs = [];
        console.log('添加提示词配置集合');
    }
    
    // 为每个游戏添加默认提示词配置
    if (data.collections.games) {
        data.collections.games.forEach(game => {
            // 检查是否已有该游戏的提示词配置
            const existingConfig = data.collections.prompt_configs.find(
                config => config.gameId === game._id
            );
            
            if (!existingConfig) {
                const defaultConfig = {
                    _id: `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    gameId: game._id,
                    systemPrompt: game.worldSetting || '',
                    prePrompt: '',
                    postPrompt: '',
                    exampleDialogue: '',
                    dialogStyle: '',
                    restrictions: '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                
                data.collections.prompt_configs.push(defaultConfig);
                console.log(`为游戏 ${game.title} 添加默认提示词配置`);
            }
        });
    }
    
    return data;
}

// 主函数
function main() {
    console.log('开始更新 memory_store.json 格式...');
    
    // 读取数据
    const data = readFile();
    
    // 创建备份
    createBackup(data);
    
    // 更新世界书条目格式
    const updatedData = updateWorldbookEntries(data);
    
    // 添加提示词配置支持
    const finalData = addPromptConfigSupport(updatedData);
    
    // 写入更新后的数据
    writeFile(finalData);
    
    console.log('\n格式更新完成！');
    console.log('\n更新内容：');
    console.log('1. 为世界书条目添加了缺少的必要字段');
    console.log('2. 添加了提示词配置支持');
    console.log('3. 确保所有字段符合最新的系统规范');
    console.log('\n备份文件已创建：', BACKUP_FILE);
}

// 执行主函数
main();