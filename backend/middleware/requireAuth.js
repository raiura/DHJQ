/**
 * 认证辅助函数
 * 用于在路由内部检查用户是否已认证
 */

const ResponseUtil = require('../utils/response');

/**
 * 要求认证的路由处理包装器
 * @param {Function} handler - 路由处理函数
 * @returns {Function} - 包装后的处理函数
 */
function requireAuth(handler) {
  return async (req, res, next) => {
    if (!req.userId) {
      return ResponseUtil.error(res, '请先登录', 401);
    }
    return handler(req, res, next);
  };
}

/**
 * 要求管理员权限的路由处理包装器
 * @param {Function} handler - 路由处理函数
 * @returns {Function} - 包装后的处理函数
 */
function requireAdmin(handler) {
  return async (req, res, next) => {
    if (!req.userId) {
      return ResponseUtil.error(res, '请先登录', 401);
    }
    if (req.userRole !== 'admin') {
      return ResponseUtil.error(res, '需要管理员权限', 403);
    }
    return handler(req, res, next);
  };
}

/**
 * 可选认证的路由处理包装器
 * 如果用户已登录，会传递用户信息；如果未登录，userId 为 null
 * @param {Function} handler - 路由处理函数
 * @returns {Function} - 包装后的处理函数
 */
function optionalAuth(handler) {
  return async (req, res, next) => {
    // 可选认证，不强制要求登录
    return handler(req, res, next);
  };
}

module.exports = {
  requireAuth,
  requireAdmin,
  optionalAuth
};
