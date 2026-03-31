const request = require('supertest');
const app = require('../../../backend/server');

describe('游戏管理API测试', () => {
  let testUser;
  let token;
  let testGame;

  beforeAll(async () => {
    // 注册测试用户
    testUser = testUtils.generateUser();
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

  describe('GET /api/games', () => {
    it('应该获取游戏列表', async () => {
      const response = await request(app)
        .get('/api/games');

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('应该支持分页和筛选', async () => {
      const response = await request(app)
        .get('/api/games?page=1&limit=10&genre=测试');

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

      expect(response.statusCode).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(testGame.title);
      expect(response.body.data.slug).toBe(testGame.slug);
      testGame._id = response.body.data._id;
    });

    it('应该拒绝缺少必填字段的创建请求', async () => {
      const response = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('标题和标识不能为空');
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
      const response = await request(app)
        .put(`/api/games/${testGame._id}`)
        .send({ title: '测试标题' });

      expect(response.statusCode).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/games/:id/publish', () => {
    it('应该成功发布游戏', async () => {
      const response = await request(app)
        .post(`/api/games/${testGame._id}/publish`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('published');
    });

    it('应该拒绝未认证的发布请求', async () => {
      const response = await request(app)
        .post(`/api/games/${testGame._id}/publish`);

      expect(response.statusCode).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/games/:slug', () => {
    it('应该获取游戏详情', async () => {
      const response = await request(app)
        .get(`/api/games/${testGame.slug}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.slug).toBe(testGame.slug);
    });

    it('应该返回404对于不存在的游戏', async () => {
      const response = await request(app)
        .get('/api/games/nonexistent-game');

      expect(response.statusCode).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('游戏不存在');
    });
  });
});