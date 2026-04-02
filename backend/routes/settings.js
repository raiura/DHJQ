const express = require('express');
const router = express.Router();
const ResponseUtil = require('../utils/response');
const Logger = require('../utils/logger');
const config = require('../config');
const { requireAuth, requireAdmin } = require('../middleware/requireAuth');

// 使用统一的模型加载
const { Setting, useMemoryStore } = require('../models');
if (useMemoryStore) {
  Logger.warn('设置模块使用内存存储模式');
}

/**
 * @GET /api/settings
 * 获取AI设置
 * 公开访问，但敏感信息（如完整API密钥）可能根据用户角色返回不同内容
 */
router.get('/', async (req, res) => {
  try {
    let setting = await Setting.findOne({});
    
    if (!setting) {
      // 如果没有设置，创建默认设置
      setting = await Setting.create({
        apiKey: config.ai.apiKey,
        apiUrl: config.ai.apiUrl,
        model: config.ai.model,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      Logger.info('初始化默认AI设置');
    }
    
    // 如果用户未登录或是普通用户，隐藏敏感信息
    if (!req.userId || req.userRole !== 'admin') {
      setting = {
        ...setting.toObject(),
        apiKey: setting.apiKey ? '***' : ''
      };
    }
    
    ResponseUtil.success(res, setting);
  } catch (error) {
    Logger.error('获取设置失败:', error);
    // 降级返回环境变量配置
    ResponseUtil.success(res, {
      apiKey: config.ai.apiKey,
      apiUrl: config.ai.apiUrl,
      model: config.ai.model
    }, '获取成功（使用环境变量配置）');
  }
});

/**
 * @PUT /api/settings
 * 更新AI设置
 * 需要管理员权限
 */
router.put('/', requireAdmin(async (req, res) => {
  try {
    const { apiKey, apiUrl, model } = req.body;
    
    if (!apiKey || !apiUrl || !model) {
      return ResponseUtil.error(res, 'API密钥、URL和模型名称都不能为空', 400);
    }
    
    if (!apiUrl.startsWith('http')) {
      return ResponseUtil.error(res, 'API URL格式不正确', 400);
    }
    
    let setting = await Setting.findOne({});
    
    if (!setting) {
      setting = await Setting.create({
        apiKey,
        apiUrl,
        model,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } else {
      setting = await Setting.findByIdAndUpdate(setting._id, {
        apiKey,
        apiUrl,
        model,
        updatedAt: new Date()
      }, { new: true });
    }
    
    Logger.info('AI设置已更新');
    
    ResponseUtil.success(res, setting, '设置更新成功');
  } catch (error) {
    Logger.error('更新设置失败:', error);
    ResponseUtil.error(res, '更新设置失败', 500);
  }
}));

/**
 * @POST /api/settings/test
 * 测试AI连接
 * 需要登录
 */
router.post('/test', requireAuth(async (req, res) => {
  try {
    const axios = require('axios');
    const { apiKey, apiUrl, model } = req.body;
    
    const response = await axios.post(
      apiUrl,
      {
        model: model,
        messages: [{ role: 'user', content: '你好' }],
        max_tokens: 10
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 10000
      }
    );
    
    if (response.data?.choices?.[0]) {
      ResponseUtil.success(res, null, '连接测试成功');
    } else {
      ResponseUtil.error(res, 'API响应格式异常', 500);
    }
  } catch (error) {
    Logger.error('AI连接测试失败:', error);
    ResponseUtil.error(res, `连接测试失败: ${error.message}`, 500);
  }
}));

module.exports = router;
