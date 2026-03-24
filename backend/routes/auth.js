const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config');
const ResponseUtil = require('../utils/response');
const Logger = require('../utils/logger');
const { validateBody } = require('../middleware/validator');
const { userSchemas } = require('../validators');

// 使用统一的模型加载
const { User, useMemoryStore } = require('../models');
if (useMemoryStore) {
  Logger.warn('认证模块使用内存存储模式');
}

/**
 * @POST /api/auth/register
 * 用户注册
 */
router.post('/register', validateBody(userSchemas.register), async (req, res) => {
  try {
    const { username, password, nickname } = req.body;

    // 验证必填字段
    if (!username || !password) {
      return ResponseUtil.error(res, '用户名和密码不能为空', 400);
    }

    // 检查用户名是否已存在
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return ResponseUtil.error(res, '用户名已被使用', 409);
    }

    // 创建新用户
    const user = await User.create({
      username: username.toLowerCase(),
      password, // 密码会在 preSave 钩子中加密
      nickname: nickname || username,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    Logger.info(`新用户注册: ${username}`);

    // 生成 JWT
    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role || 'user' },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    // 返回用户信息（不包含密码）
    const userResponse = {
      _id: user._id,
      username: user.username,
      nickname: user.nickname,
      role: user.role || 'user',
      createdAt: user.createdAt
    };

    ResponseUtil.success(res, {
      user: userResponse,
      token,
      expiresIn: config.jwt.expiresIn
    }, '注册成功');

  } catch (error) {
    Logger.error('注册失败:', error);
    ResponseUtil.error(res, '注册失败: ' + error.message, 500);
  }
});

/**
 * @POST /api/auth/login
 * 用户登录
 */
router.post('/login', validateBody(userSchemas.login), async (req, res) => {
  try {
    const { username, password } = req.body;

    // 验证必填字段
    if (!username || !password) {
      return ResponseUtil.error(res, '用户名和密码不能为空', 400);
    }

    // 查找用户
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return ResponseUtil.error(res, '用户名或密码错误', 401);
    }

    // 验证密码
    let isPasswordValid = false;
    
    // 检查密码是否已加密（以 $2 开头的是 bcrypt 加密）
    if (user.password.startsWith('$2')) {
      isPasswordValid = await bcrypt.compare(password, user.password);
    } else {
      // 明文密码（仅用于测试）
      isPasswordValid = password === user.password;
    }
    
    if (!isPasswordValid) {
      return ResponseUtil.error(res, '用户名或密码错误', 401);
    }

    // 更新最后登录时间
    await User.findByIdAndUpdate(user._id, {
      lastLoginAt: new Date(),
      updatedAt: new Date()
    });

    // 生成 JWT
    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role || 'user' },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    Logger.info(`用户登录: ${username}`);

    // 返回用户信息（不包含密码）
    const userResponse = {
      _id: user._id,
      username: user.username,
      nickname: user.nickname,
      role: user.role || 'user',
      lastLoginAt: new Date(),
      createdAt: user.createdAt
    };

    ResponseUtil.success(res, {
      user: userResponse,
      token,
      expiresIn: config.jwt.expiresIn
    }, '登录成功');

  } catch (error) {
    Logger.error('登录失败:', error);
    ResponseUtil.error(res, '登录失败: ' + error.message, 500);
  }
});

/**
 * @GET /api/auth/me
 * 获取当前用户信息
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ResponseUtil.error(res, '未提供认证令牌', 401);
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwt.secret);
    
    const user = await User.findById(decoded.userId);
    if (!user) {
      return ResponseUtil.error(res, '用户不存在', 404);
    }

    // 返回用户信息（不包含密码）
    const userResponse = {
      _id: user._id,
      username: user.username,
      nickname: user.nickname,
      role: user.role || 'user',
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt
    };

    ResponseUtil.success(res, { user: userResponse }, '获取成功');

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return ResponseUtil.error(res, '认证令牌已过期', 401);
    }
    if (error.name === 'JsonWebTokenError') {
      return ResponseUtil.error(res, '无效的认证令牌', 401);
    }
    Logger.error('获取用户信息失败:', error);
    ResponseUtil.error(res, '获取用户信息失败', 500);
  }
});

module.exports = router;
