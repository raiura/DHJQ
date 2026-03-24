/**
 * JWT 认证中间件
 */

const jwt = require('jsonwebtoken');
const config = require('../config');
const ResponseUtil = require('../utils/response');

const authMiddleware = {
  /**
   * 验证 JWT Token
   */
  verifyToken: (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return ResponseUtil.error(res, '未提供认证令牌', 401);
      }

      const token = authHeader.substring(7);
      
      if (!token) {
        return ResponseUtil.error(res, '认证令牌格式错误', 401);
      }

      const decoded = jwt.verify(token, config.jwt.secret);
      req.userId = decoded.userId;
      req.username = decoded.username;
      req.userRole = decoded.role || 'user';
      
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return ResponseUtil.error(res, '认证令牌已过期', 401);
      }
      if (error.name === 'JsonWebTokenError') {
        return ResponseUtil.error(res, '无效的认证令牌', 401);
      }
      return ResponseUtil.error(res, '认证失败', 401);
    }
  },

  /**
   * 可选认证（不强制要求登录，但如果有token会解析）
   */
  optionalAuth: (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, config.jwt.secret);
        req.userId = decoded.userId;
        req.username = decoded.username;
        req.userRole = decoded.role || 'user';
      }
      
      next();
    } catch (error) {
      // 可选认证失败不阻止请求
      next();
    }
  }
};

module.exports = authMiddleware;
