const request = require('supertest');
const app = require('../../../backend/server');

describe('认证API测试', () => {
  let testUser;
  let token;

  beforeAll(() => {
    testUser = testUtils.generateUser();
  });

  describe('POST /api/auth/register', () => {
    it('应该成功注册新用户', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: testUser.username,
          password: testUser.password,
          nickname: testUser.nickname
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.username).toBe(testUser.username.toLowerCase());
      expect(response.body.data.token).toBeDefined();
    });

    it('应该拒绝注册已存在的用户名', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: testUser.username,
          password: testUser.password,
          nickname: testUser.nickname
        });

      expect(response.statusCode).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('用户名已被使用');
    });

    it('应该拒绝缺少必填字段的注册请求', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({});

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('应该成功登录已注册用户', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.username).toBe(testUser.username.toLowerCase());
      expect(response.body.data.token).toBeDefined();
      token = response.body.data.token;
    });

    it('应该拒绝无效的登录凭据', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: testUser.username,
          password: 'wrongpassword'
        });

      expect(response.statusCode).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('用户名或密码错误');
    });

    it('应该拒绝缺少必填字段的登录请求', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('应该使用有效令牌获取用户信息', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.username).toBe(testUser.username.toLowerCase());
    });

    it('应该拒绝缺少令牌的请求', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.statusCode).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('未提供认证令牌');
    });

    it('应该拒绝无效令牌的请求', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalidtoken');

      expect(response.statusCode).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});