const fs = require('fs');
const path = require('path');

// 测试角色JSON导入功能
function testCharacterImport() {
    console.log('=== 测试世界角色导入功能 ===');
    
    try {
        // 读取角色导出文件
        const characterFile = 'd:\\LWL\\FengYue\\DHJQ\\OutPutJson\\characters-export-1775114813532.json';
        if (!fs.existsSync(characterFile)) {
            console.error('角色导出文件不存在:', characterFile);
            return;
        }
        
        const rawData = JSON.parse(fs.readFileSync(characterFile, 'utf8'));
        const characterData = rawData.characters || rawData;
        
        if (!Array.isArray(characterData) || characterData.length === 0) {
            console.error('无效的角色数据格式');
            return;
        }
        
        console.log(`读取到 ${characterData.length} 个角色`);
        console.log('角色列表:', characterData.map(c => c.name));
        
        // 模拟前端的转换功能
        function convertFromCharacterFormat(characters) {
            const entries = characters.map(char => {
                // 提取角色信息构建世界书条目
                const keys = [...(char.keys || []), ...(char.activation?.keys || [])];
                const content = `【角色】${char.name}\n\n` +
                              `【关键词】${keys.join('、')}\n\n` +
                              `【身份】${char.identity || '未知'}\n\n` +
                              `【性格】${char.personality || '未知'}\n\n` +
                              `【经历】${char.backstory || '未知'}\n\n` +
                              `【关系】${char.relationship || '未知'}\n\n` +
                              `【外貌】${char.appearance || '未知'}\n\n` +
                              `【能力】${char.abilities || '未知'}\n\n` +
                              `【物品】${char.belongings || '未知'}`;
                
                return {
                    name: char.name,
                    keys: keys.filter(Boolean),
                    content: content,
                    group: '角色',
                    priority: char.activation?.priority || 100,
                    enabled: char.activation?.enabled !== false
                };
            });
            
            return { entries };
        }
        
        // 转换角色数据为世界书条目
        const worldbookData = convertFromCharacterFormat(characterData);
        console.log(`\n转换后生成 ${worldbookData.entries.length} 个世界书条目`);
        console.log('生成的条目:', worldbookData.entries.map(e => e.name));
        
        // 保存转换后的数据到临时文件
        const outputFile = 'd:\\LWL\\FengYue\\DHJQ\\test-worldbook-import.json';
        fs.writeFileSync(outputFile, JSON.stringify(worldbookData, null, 2));
        console.log(`\n转换后的数据已保存到: ${outputFile}`);
        
        console.log('\n✅ 测试成功: 角色数据已成功转换为世界书条目格式');
        
    } catch (error) {
        console.error('测试过程中发生错误:', error);
    }
}

// 运行测试
testCharacterImport();
