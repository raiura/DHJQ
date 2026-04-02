// 世界书数据导入脚本
// 在浏览器控制台中执行此脚本以导入世界书数据

// 世界书数据
const worldbookData = {
  "entries": [
    {
      "id": "mem_1773324176146_5",
      "name": "坏空之纪",
      "keys": ["坏空", "劫灰", "末世", "灵气", "熵增"],
      "content": "这是一个灵气稀薄、充满劫灰的修仙末世。天地间的灵气混杂了\"劫灰\"，修行异常艰难且危险。飞升之路已经断绝，真仙以上的存在被困在仙界，无法降临。修士们为了资源相互厮杀，是一个真正\"人吃人\"的世界。",
      "group": "世界观",
      "priority": 100,
      "enabled": true,
      "createdAt": "2026-03-12T14:02:56.146Z",
      "updatedAt": "2026-03-12T14:02:56.146Z"
    },
    {
      "id": "mem_1773324176146_6",
      "name": "大荒九丘",
      "keys": ["大荒", "九丘", "浮陆", "弱水天河"],
      "content": "大荒九丘由九块漂浮在虚空中的巨大浮陆组成，被\"弱水天河\"分隔。包括：中天轩辕丘（皇权中心）、北寒落星丘（落星剑宗）、西极极乐丘（魔道大本营）、南荒妖灵丘（妖族聚居地）、东海散仙丘（散修联盟）等。",
      "group": "地理",
      "priority": 95,
      "enabled": true,
      "createdAt": "2026-03-12T14:02:56.146Z",
      "updatedAt": "2026-03-12T14:02:56.146Z"
    },
    {
      "id": "mem_1773324176146_7",
      "name": "落星谷",
      "keys": ["落星谷", "落星", "山谷", "北寒"],
      "content": "落星谷是北寒落星丘的圣地，终年被冰雪覆盖。这里是主角陆苍雪修炼的地方，谷中埋藏着一条正在死去的\"冰龙脉\"，散发出精纯的冰系灵气。",
      "group": "地理",
      "priority": 90,
      "enabled": true,
      "createdAt": "2026-03-12T14:02:56.146Z",
      "updatedAt": "2026-03-12T14:02:56.146Z"
    },
    {
      "id": "mem_1773324176146_8",
      "name": "轩辕皇族",
      "keys": ["轩辕", "皇族", "神朝", "皇帝", "传送阵"],
      "content": "轩辕皇族统治中天轩辕丘，掌握着通往其他八丘的传送阵。他们维持着脆弱的平衡，但也因垄断资源而备受争议。皇族血脉中流淌着上古真龙之力。",
      "group": "势力",
      "priority": 85,
      "enabled": true,
      "createdAt": "2026-03-12T14:02:56.146Z",
      "updatedAt": "2026-03-12T14:02:56.146Z"
    },
    {
      "id": "mem_1773324176146_9",
      "name": "落星剑宗",
      "keys": ["落星剑宗", "剑宗", "北寒"],
      "content": "北寒落星丘的正道领袖门派，以剑修为主。宗门建立在死去的冰龙脉之上，擅长冰系剑法。当代宗主是一位化神期大能。",
      "group": "势力",
      "priority": 85,
      "enabled": true,
      "createdAt": "2026-03-12T14:02:56.146Z",
      "updatedAt": "2026-03-12T14:02:56.146Z"
    },
    {
      "id": "mem_1773324176146_10",
      "name": "修行境界",
      "keys": ["练气", "筑基", "金丹", "元婴", "化神", "反虚", "真仙", "金仙", "境界"],
      "content": "【修行境界】练气 → 筑基 → 金丹 → 元婴 → 化神 → 反虚 → 真仙 → 金仙。由于坏空之纪的影响，化神以上突破极为困难，真仙以上更是被困仙界无法降临。",
      "group": "设定",
      "priority": 80,
      "enabled": true,
      "createdAt": "2026-03-12T14:02:56.146Z",
      "updatedAt": "2026-03-12T14:02:56.146Z"
    }
  ],
  "groups": {},
  "version": "1.0"
};

// 游戏ID
const gameId = 'mem_1773324176145_1';

// 存储键
const worldbookManagerKey = `galgame_${gameId}_worldbook`;
const worldbookLibraryKey = `wblibrary_${gameId}`;

// 步骤1: 保存到worldbookManager的存储
console.log('步骤1: 保存到worldbookManager的存储...');
localStorage.setItem(worldbookManagerKey, JSON.stringify(worldbookData));
console.log(`数据已保存到 ${worldbookManagerKey}`);
console.log(`保存了 ${worldbookData.entries.length} 个条目`);

// 步骤2: 清除WorldbookLibrary的存储，以便重新迁移
console.log('\n步骤2: 清除WorldbookLibrary的存储...');
localStorage.removeItem(worldbookLibraryKey);
console.log(`已清除 ${worldbookLibraryKey}`);

// 步骤3: 刷新页面以加载新数据
console.log('\n步骤3: 刷新页面以加载新数据...');
setTimeout(() => {
  location.reload();
}, 1000);
