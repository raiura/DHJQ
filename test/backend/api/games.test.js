const request = require('supertest');
const { execSync } = require('child_process');

// 检查并终止占用3001端口的进程
function checkAndKillPort(port) {
  try {
    const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    if (output) {
      const lines = output.trim().split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          const pid = parts[4];
          try {
            execSync(`taskkill /PID ${pid} /F`);
          } catch (error) {
            // 忽略错误
          }
        }
      }
    }
  } catch (error) {
    // 忽略错误
  }
}

// 确保端口可用
checkAndKillPort(3001);

// 动态加载app，确保每次测试都使用新的实例
function getApp() {
  // 清理模块缓存
  Object.keys(require.cache).forEach(key => {
    if (key.includes('backend')) {
      delete require.cache[key];
    }
  });
  return require('../../../backend/server');
}

describe('游戏管理API测试', () => {
  let testUser;
  let token;
  let testGame;
  let app;

  beforeAll(async () => {
    testUser = testUtils.generateUser();
    app = getApp();
    
    // 注册测试用户
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: testUser.username,
        password: testUser.password,
        nickname: testUser.nickname
      });
    token = registerResponse.body.data.token;

    // 生成测试游戏数据
    testGame = testUtils.generateGame();
  });

  afterAll(() => {
    // 测试完成后清理端口
    checkAndKillPort(3001);
  });

  describe('GET /api/games', () => {
    it('应该获取游戏列表', async () => {
      const response = await request(app)
        .get('/api/games');

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('应该支持分页和筛选', async () => {
      const encodedGenre = encodeURIComponent('测试');
      const response = await request(app)
        .get(`/api/games?page=1&limit=10&genre=${encodedGenre}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/games/featured/list', () => {
    it('应该获取推荐游戏列表', async () => {
      const response = await request(app)
        .get('/api/games/featured/list');

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.popular).toBeDefined();
      expect(response.body.data.newest).toBeDefined();
      expect(response.body.data.topRated).toBeDefined();
    });
  });

  describe('POST /api/games', () => {
    it('应该成功创建新游戏', async () => {
      const response = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${token}`)
        .send(testGame);

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(testGame.title);
      expect(response.body.data.slug).toBe(testGame.slug);
      testGame._id = response.body.data._id;
      testGame.slug = response.body.data.slug;
    });

    it('应该拒绝缺少必填字段的创建请求', async () => {
      const response = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('应该拒绝未认证的创建请求', async () => {
      const response = await request(app)
        .post('/api/games')
        .send(testGame);

      expect(response.statusCode).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/games/my', () => {
    it('应该获取当前用户的游戏列表', async () => {
      const response = await request(app)
        .get('/api/games/my')
        .set('Authorization', `Bearer ${token}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('应该拒绝未认证的请求', async () => {
      const response = await request(app)
        .get('/api/games/my');

      expect(response.statusCode).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/games/:id', () => {
    it('应该成功更新游戏信息', async () => {
      if (!testGame._id) {
        console.log('游戏ID不存在，跳过更新测试');
        return;
      }
      
      const updatedTitle = '更新后的游戏标题';
      const response = await request(app)
        .put(`/api/games/${testGame._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: updatedTitle });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updatedTitle);
    });

    it('应该拒绝未认证的更新请求', async () => {
      if (!testGame._id) {
        console.log('游戏ID不存在，跳过未认证更新测试');
        return;
      }
      
      const response = await request(app)
        .put(`/api/games/${testGame._id}`)
        .send({ title: '测试标题' });

      expect(response.statusCode).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/games/:id/publish', () => {
    it('应该成功发布游戏', async () => {
      if (!testGame._id) {
        console.log('游戏ID不存在，跳过发布测试');
        return;
      }
      
      const response = await request(app)
        .post(`/api/games/${testGame._id}/publish`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('应该拒绝未认证的发布请求', async () => {
      if (!testGame._id) {
        console.log('游戏ID不存在，跳过未认证发布测试');
        return;
      }
      
      const response = await request(app)
        .post(`/api/games/${testGame._id}/publish`);

      expect(response.statusCode).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/games/:slug', () => {
    it('应该获取游戏详情', async () => {
      if (!testGame.slug) {
        console.log('游戏slug不存在，跳过详情测试');
        return;
      }
      
      const response = await request(app)
        .get(`/api/games/${testGame.slug}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.slug).toBe(testGame.slug);
    });

    it('应该返回404对于不存在的游戏', async () => {
      const response = await request(app)
        .get('/api/games/nonexistent-game');

      expect(response.statusCode).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});