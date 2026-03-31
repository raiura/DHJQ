// 测试环境设置
require('dotenv').config({ path: './test/.env.test' });

// 模拟环境变量
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.DATABASE_URI = 'memory';

// 测试数据生成工具
const { faker } = require('@faker-js/faker');

global.testUtils = {
  // 生成测试用户数据
  generateUser: () => ({
    username: faker.internet.userName(),
    password: faker.internet.password(),
    nickname: faker.person.fullName()
  }),

  // 生成测试角色数据
  generateCharacter: (gameId) => ({
    gameId: gameId || faker.string.uuid(),
    name: faker.person.fullName(),
    color: faker.internet.color(),
    prompt: faker.lorem.paragraph()
  }),
  
  // 生成测试游戏数据
  generateGame: () => ({
    title: faker.lorem.words(3),
    subtitle: faker.lorem.sentence(),
    slug: faker.lorem.slug(),
    description: faker.lorem.paragraph(),
    genre: '测试',
    tags: [faker.lorem.word(), faker.lorem.word()]
  }),
  
  // 生成测试角色数据
  generateCharacter: (gameId) => ({
    gameId: gameId || faker.datatype.uuid(),
    name: faker.name.findName(),
    color: faker.internet.color(),
    prompt: faker.lorem.paragraph()
  }),
  
  // 生成测试世界书条目数据
  generateWorldbookEntry: () => ({
    name: faker.lorem.words(2),
    keys: [faker.lorem.word(), faker.lorem.word()],
    content: faker.lorem.paragraph(),
    group: '测试',
    priority: faker.datatype.number({ min: 1, max: 100 })
  })
};

// 测试环境初始化
console.log('测试环境初始化...');

// 测试环境清理函数
function cleanup() {
  console.log('测试环境清理...');
}

// 导出清理函数
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { cleanup };
}