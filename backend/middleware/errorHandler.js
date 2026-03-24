/**
 * 全局错误处理中间件
 */

const Logger = require('../utils/logger');
const ResponseUtil = require('../utils/response');

const errorHandler = {
  /**
   * 404 处理
   */
  notFound: (req, res) => {
    ResponseUtil.error(res, `路由不存在: ${req.method} ${req.path}`, 404);
  },

  /**
   * 全局错误处理
   */
  global: (err, req, res, next) => {
    Logger.error('全局错误:', err);

    // MongoDB 重复键错误
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return ResponseUtil.error(res, `${field} 已存在`, 409);
    }

    // MongoDB 验证错误
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return ResponseUtil.error(res, '数据验证失败', 400, errors);
    }

    // MongoDB CastError（ID格式错误）
    if (err.name === 'CastError') {
      return ResponseUtil.error(res, `无效的 ${err.path}: ${err.value}`, 400);
    }

    // 默认错误响应
    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || '服务器内部错误';
    
    ResponseUtil.error(res, message, statusCode);
  }
};

module.exports = errorHandler;
