/**
 * 测试脚本：验证角色导入功能
 * 
 * 功能：
 * 1. 读取导出的JSON文件
 * 2. 模拟前端导入逻辑
 * 3. 验证数据是否正确更新
 */

const fs = require('fs');
const path = require('path');

// 读取导出的JSON文件
const exportFilePath = path.join(__dirname, 'OutPutJson', 'characters-export-1775114813532.json');
const exportData = JSON.parse(fs.readFileSync(exportFilePath, 'utf8'));

console.log('读取导出文件成功，包含', exportData.characters.length, '个角色');

// 模拟前端导入逻辑
function simulateImport(characters, importedChars, mode) {
    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    
    switch (mode) {
        case 'replace':
            // 完全替换
            characters = JSON.parse(JSON.stringify(importedChars));
            importedCount = importedChars.length;
            break;
            
        case 'merge':
            // 智能合并：同名更新，其他追加
            importedChars.forEach(importedChar => {
                const existingIndex = characters.findIndex(c => c.name === importedChar.name);
                if (existingIndex >= 0) {
                    // 更新现有角色
                    characters[existingIndex] = { ...importedChar };
                    updatedCount++;
                } else {
                    // 添加新角色
                    characters.push({ ...importedChar });
                    importedCount++;
                }
            });
            break;
            
        case 'append':
            // 仅追加不存在的角色
            importedChars.forEach(importedChar => {
                const exists = characters.some(c => c.name === importedChar.name);
                if (!exists) {
                    characters.push({ ...importedChar });
                    importedCount++;
                } else {
                    skippedCount++;
                }
            });
            break;
    }
    
    return { characters, importedCount, updatedCount, skippedCount };
}

// 模拟现有角色数据
const existingCharacters = [
    {
        _id: "mem_1773324176145_2",
        name: "林婉",
        color: "#ff69b4",
        image: "https://origin.picgo.net/2026/01/31/LinWan85351d4173bd3ae6.png",
        prompt: "林婉是一个温柔、细腻、关心他人的女孩，说话轻声细语，总是为他人着想。她是修仙世界的向导，对周围的环境非常熟悉。",
        enabled: true,
        gameId: "mem_1773324176145_1",
        createdAt: "2026-03-12T14:02:56.145Z",
        updatedAt: "2026-04-02T07:26:36.069Z",
        imageFit: "cover",
        appearance: "",
        personality: "",
        physique: "",
        background: "",
        special: "",
        priority: 100,
        keys: [
            "林婉",
            "婉儿"
        ],
        favor: 16,
        trust: 30,
        stats: {
            mood: "平静",
            encounters: 0,
            dialogueTurns: 0
        },
        visual: {
            avatar: "https://origin.picgo.net/2026/01/31/LinWan85351d4173bd3ae6.png",
            cover: "",
            color: "#ff69b4",
            emotionCGs: {}
        },
        core: {
            description: "",
            personality: "",
            scenario: "",
            firstMessage: "",
            worldConnection: {
                faction: "",
                location: ""
            }
        },
        activation: {
            keys: [
                "林婉",
                "婉儿",
                "婉儿是啥2333"
            ],
            priority: 100,
            enabled: true
        },
        examples: {
            style: "",
            dialogues: []
        },
        lorebook: {
            entries: [],
            linkMode: "MANUAL",
            linkedEntryIds: []
        },
        injection: {
            characterNote: {
                content: "",
                depth: 0,
                frequency: 1,
                role: "system"
            },
            postHistory: {
                content: "",
                enabled: false
            }
        },
        relationship: {
            favor: 16,
            trust: 30,
            mood: "平静"
        },
        meta: {
            description: "",
            tags: [],
            creator: "",
            version: "2.0.0",
            updatedAt: "2026-04-02T07:26:36.069Z"
        },
        "meta.updatedAt": "2026-04-02T04:49:17.845Z"
    },
    {
        _id: "mem_1773324176145_3",
        name: "陆苍雪",
        color: "#87cefa",
        image: "https://origin.picgo.net/2026/01/31/LuCangXued0d1fd51b000d674.png",
        prompt: "陆苍雪是一个冷静、智慧、神秘的男孩，擅长冰系法术。他说话简洁有力，富有哲理，给人一种高深莫测的感觉。",
        enabled: true,
        gameId: "mem_1773324176145_1",
        createdAt: "2026-03-12T14:02:56.145Z",
        updatedAt: "2026-04-02T07:26:36.070Z",
        imageFit: "cover",
        appearance: "",
        personality: "",
        physique: "",
        background: "",
        special: "",
        priority: 100,
        keys: [
            "陆苍雪",
            "雪儿",
            "寒雪剑仙",
            "落星剑宗掌门"
        ],
        favor: 12,
        trust: 24,
        stats: {
            mood: "平静",
            encounters: 0,
            dialogueTurns: 0
        },
        visual: {
            avatar: "https://origin.picgo.net/2026/01/31/LuCangXued0d1fd51b000d674.png",
            cover: "",
            color: "#87cefa",
            emotionCGs: {}
        },
        core: {
            description: "",
            personality: "",
            scenario: "",
            firstMessage: "",
            worldConnection: {
                faction: "",
                location: ""
            }
        },
        activation: {
            keys: [
                "陆苍雪",
                "雪儿",
                "寒雪剑仙",
                "落星剑宗掌门"
            ],
            priority: 100,
            enabled: true
        },
        examples: {
            style: "",
            dialogues: []
        },
        lorebook: {
            entries: [],
            linkMode: "MANUAL",
            linkedEntryIds: []
        },
        injection: {
            characterNote: {
                content: "",
                depth: 0,
                frequency: 1,
                role: "system"
            },
            postHistory: {
                content: "",
                enabled: false
            }
        },
        relationship: {
            favor: 12,
            trust: 24,
            mood: "平静"
        },
        meta: {
            description: "",
            tags: [],
            creator: "",
            version: "2.0.0",
            updatedAt: "2026-04-02T07:26:36.070Z"
        },
        "meta.updatedAt": "2026-04-02T04:49:17.845Z"
    }
];

console.log('模拟现有角色数据，包含', existingCharacters.length, '个角色');

// 测试不同导入模式
const modes = ['replace', 'merge', 'append'];

modes.forEach(mode => {
    console.log(`\n=== 测试 ${mode} 模式 ===`);
    
    // 深拷贝现有角色数据
    const testCharacters = JSON.parse(JSON.stringify(existingCharacters));
    
    // 模拟导入
    const result = simulateImport(testCharacters, exportData.characters, mode);
    
    console.log(`导入结果: 导入 ${result.importedCount} 个, 更新 ${result.updatedCount} 个, 跳过 ${result.skippedCount} 个`);
    console.log(`导入后角色总数: ${result.characters.length}`);
    
    // 验证数据是否正确更新
    if (mode === 'merge') {
        // 检查林婉的keys是否更新
        const linWan = result.characters.find(c => c.name === '林婉');
        if (linWan) {
            console.log('林婉的keys:', linWan.keys);
            console.log('林婉的activation.keys:', linWan.activation.keys);
        }
        
        // 检查陆苍雪的keys是否更新
        const luCangXue = result.characters.find(c => c.name === '陆苍雪');
        if (luCangXue) {
            console.log('陆苍雪的keys:', luCangXue.keys);
            console.log('陆苍雪的activation.keys:', luCangXue.activation.keys);
        }
    }
});

// 验证导入文件的结构
console.log('\n=== 验证导入文件结构 ===');
console.log('导出文件包含以下字段:', Object.keys(exportData));
console.log('每个角色包含的字段:');
exportData.characters.forEach((char, index) => {
    console.log(`角色 ${index + 1} (${char.name}) 包含 ${Object.keys(char).length} 个字段`);
    console.log('  关键字段:', Object.keys(char).filter(key => ['_id', 'name', 'keys', 'activation'].includes(key)));
});

// 检查是否存在meta字段
console.log('\n=== 检查meta字段 ===');
exportData.characters.forEach((char, index) => {
    if (char.meta) {
        console.log(`角色 ${index + 1} (${char.name}) 存在meta字段`);
        console.log('  meta.updatedAt:', char.meta.updatedAt);
    } else {
        console.log(`角色 ${index + 1} (${char.name}) 缺少meta字段`);
    }
});

console.log('\n测试完成！');