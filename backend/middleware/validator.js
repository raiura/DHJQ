/**
 * 请求参数验证中间件
 * 使用 Joi 进行参数验证
 */

const Joi = require('joi');
const ResponseUtil = require('../utils/response');

/**
 * 验证请求体
 * @param {Joi.Schema} schema - Joi 验证模式
 * @returns {Function} Express 中间件
 */
const validateBody = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // 返回所有错误，不只是第一个
      stripUnknown: true // 移除未定义的字段
    });

    if (error) {
      const errorMessage = error.details
        .map(detail => detail.message)
        .join('; ');
      
      return ResponseUtil.error(res, `参数验证失败: ${errorMessage}`, 400);
    }

    // 使用验证后的值（可能经过转换）
    req.body = value;
    next();
  };
};

/**
 * 验证请求参数
 * @param {Joi.Schema} schema - Joi 验证模式
 * @returns {Function} Express 中间件
 */
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessage = error.details
        .map(detail => detail.message)
        .join('; ');
      
      return ResponseUtil.error(res, `URL参数验证失败: ${errorMessage}`, 400);
    }

    req.params = value;
    next();
  };
};

/**
 * 验证查询参数
 * @param {Joi.Schema} schema - Joi 验证模式
 * @returns {Function} Express 中间件
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessage = error.details
        .map(detail => detail.message)
        .join('; ');
      
      return ResponseUtil.error(res, `查询参数验证失败: ${errorMessage}`, 400);
    }

    req.query = value;
    next();
  };
};

module.exports = {
  validateBody,
  validateParams,
  validateQuery
};
