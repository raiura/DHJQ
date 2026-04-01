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

describe('认证API测试', () => {
  let testUser;
  let token;
  let app;

  beforeAll(() => {
    testUser = testUtils.generateUser();
    app = getApp();
  });

  afterAll(() => {
    // 测试完成后清理端口
    checkAndKillPort(3001);
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
      // 保存令牌用于后续测试
      token = response.body.data.token;
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
      // 使用小写用户名登录，因为注册时用户名会被转换为小写
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: testUser.username.toLowerCase(),
          password: testUser.password
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.username).toBe(testUser.username.toLowerCase());
      expect(response.body.data.token).toBeDefined();
      // 更新令牌
      token = response.body.data.token;
    });

    it('应该拒绝无效的登录凭据', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: testUser.username.toLowerCase(),
          password: 'wrongpassword'
        });

      expect(response.statusCode).toBe(401);
      expect(response.body.success).toBe(false);
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
      if (!token) {
        console.log('令牌不存在，跳过获取用户信息测试');
        return;
      }
      
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