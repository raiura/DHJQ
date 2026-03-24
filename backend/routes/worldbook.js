const express = require('express');
const router = express.Router();
const { WorldbookEntry } = require('../models');
const ResponseUtil = require('../utils/response');
const Logger = require('../utils/logger');

/**
 * @GET /api/worldbook
 * 获取所有世界书条目（支持分组筛选）
 */
router.get('/', async (req, res) => {
  try {
    const { group, enabled } = req.query;
    const query = {};
    
    if (group) query.group = group;
    if (enabled !== undefined) query.enabled = enabled === 'true';
    
    const entries = await WorldbookEntry.find(query)
      .sort({ priority: -1, createdAt: -1 });
    
    ResponseUtil.success(res, entries);
  } catch (error) {
    Logger.error('获取世界书条目失败:', error);
    ResponseUtil.error(res, '获取世界书条目失败', 500);
  }
});

/**
 * @GET /api/worldbook/:id
 * 获取单个条目详情
 */
router.get('/:id', async (req, res) => {
  try {
    const entry = await WorldbookEntry.findById(req.params.id);
    
    if (!entry) {
      return ResponseUtil.error(res, '条目不存在', 404);
    }
    
    ResponseUtil.success(res, entry);
  } catch (error) {
    Logger.error('获取世界书条目详情失败:', error);
    ResponseUtil.error(res, '获取条目详情失败', 500);
  }
});

/**
 * @POST /api/worldbook
 * 创建新的世界书条目
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      keys,
      content,
      enabled,
      priority,
      matchType,
      caseSensitive,
      insertPosition,
      depth,
      group,
      comment
    } = req.body;
    
    // 验证必填字段
    if (!name || !content) {
      return ResponseUtil.error(res, '条目名称和内容不能为空', 400);
    }
    
    // 处理 keys
    const processedKeys = Array.isArray(keys) 
      ? keys.filter(k => k && k.trim()).map(k => k.trim())
      : keys ? [keys.trim()] : [];
    
    if (processedKeys.length === 0) {
      return ResponseUtil.error(res, '至少需要设置一个触发关键词', 400);
    }
    
    const entry = await WorldbookEntry.create({
      name,
      keys: processedKeys,
      content,
      enabled: enabled !== undefined ? enabled : true,
      priority: priority || 100,
      matchType: matchType || 'contains',
      caseSensitive: caseSensitive || false,
      insertPosition: insertPosition || 'system',
      depth: depth || 0,
      group: group || 'default',
      comment: comment || ''
    });
    
    Logger.info(`创建世界书条目: ${name}`);
    ResponseUtil.success(res, entry, '条目创建成功', 201);
  } catch (error) {
    Logger.error('创建世界书条目失败:', error);
    ResponseUtil.error(res, '创建条目失败: ' + error.message, 500);
  }
});

/**
 * @PUT /api/worldbook/:id
 * 更新世界书条目
 */
router.put('/:id', async (req, res) => {
  try {
    const updateData = { ...req.body, updatedAt: new Date() };
    
    // 处理 keys 数组
    if (updateData.keys) {
      updateData.keys = Array.isArray(updateData.keys)
        ? updateData.keys.filter(k => k && k.trim()).map(k => k.trim())
        : [updateData.keys.trim()];
    }
    
    const entry = await WorldbookEntry.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!entry) {
      return ResponseUtil.error(res, '条目不存在', 404);
    }
    
    Logger.info(`更新世界书条目: ${entry.name}`);
    ResponseUtil.success(res, entry, '条目更新成功');
  } catch (error) {
    Logger.error('更新世界书条目失败:', error);
    ResponseUtil.error(res, '更新条目失败: ' + error.message, 500);
  }
});

/**
 * @DELETE /api/worldbook/:id
 * 删除世界书条目
 */
router.delete('/:id', async (req, res) => {
  try {
    const entry = await WorldbookEntry.findByIdAndDelete(req.params.id);
    
    if (!entry) {
      return ResponseUtil.error(res, '条目不存在', 404);
    }
    
    Logger.info(`删除世界书条目: ${entry.name}`);
    ResponseUtil.success(res, null, '条目删除成功');
  } catch (error) {
    Logger.error('删除世界书条目失败:', error);
    ResponseUtil.error(res, '删除条目失败', 500);
  }
});

/**
 * @POST /api/worldbook/:id/toggle
 * 切换条目启用/禁用状态
 */
router.post('/:id/toggle', async (req, res) => {
  try {
    const entry = await WorldbookEntry.findById(req.params.id);
    
    if (!entry) {
      return ResponseUtil.error(res, '条目不存在', 404);
    }
    
    const newEnabled = !entry.enabled;
    
    // 使用 findByIdAndUpdate 更新，兼容内存存储
    const updated = await WorldbookEntry.findByIdAndUpdate(
      req.params.id,
      { enabled: newEnabled },
      { new: true }
    );
    
    ResponseUtil.success(res, updated, updated.enabled ? '条目已启用' : '条目已禁用');
  } catch (error) {
    Logger.error('切换条目状态失败:', error);
    ResponseUtil.error(res, '操作失败', 500);
  }
});

/**
 * @GET /api/worldbook/groups/all
 * 获取所有分组列表
 */
router.get('/groups/all', async (req, res) => {
  try {
    const groups = await WorldbookEntry.distinct('group');
    ResponseUtil.success(res, groups);
  } catch (error) {
    Logger.error('获取分组列表失败:', error);
    ResponseUtil.error(res, '获取分组列表失败', 500);
  }
});

/**
 * @POST /api/worldbook/test
 * 测试关键词匹配
 */
router.post('/test', async (req, res) => {
  try {
    const { text, entryId } = req.body;
    
    if (!text) {
      return ResponseUtil.error(res, '请提供测试文本', 400);
    }
    
    let entries;
    if (entryId) {
      // 测试单个条目
      const entry = await WorldbookEntry.findById(entryId);
      entries = entry ? [entry] : [];
    } else {
      // 测试所有启用的条目
      entries = await WorldbookEntry.find({ enabled: true });
    }
    
    const results = entries.map(entry => ({
      id: entry._id,
      name: entry.name,
      keys: entry.keys,
      matched: entry.matches(text),
      content: entry.content.substring(0, 100) + '...'
    }));
    
    const matchedEntries = results.filter(r => r.matched);
    
    ResponseUtil.success(res, {
      testText: text,
      total: entries.length,
      matched: matchedEntries.length,
      results
    }, '匹配测试完成');
  } catch (error) {
    Logger.error('测试匹配失败:', error);
    ResponseUtil.error(res, '测试失败', 500);
  }
});

/**
 * @POST /api/worldbook/import
 * 批量导入条目
 */
router.post('/import', async (req, res) => {
  try {
    const { entries } = req.body;
    
    if (!Array.isArray(entries) || entries.length === 0) {
      return ResponseUtil.error(res, '请提供要导入的条目数组', 400);
    }
    
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };
    
    for (const entryData of entries) {
      try {
        // 处理 keys
        const keys = Array.isArray(entryData.keys)
          ? entryData.keys
          : entryData.keys ? entryData.keys.split(/[,，]/).map(k => k.trim()) : [];
        
        await WorldbookEntry.create({
          name: entryData.name,
          keys,
          content: entryData.content,
          group: entryData.group || 'imported',
          enabled: true,
          priority: entryData.priority || 100
        });
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({ name: entryData.name, error: err.message });
      }
    }
    
    Logger.info(`批量导入世界书条目: ${results.success} 成功, ${results.failed} 失败`);
    ResponseUtil.success(res, results, '导入完成');
  } catch (error) {
    Logger.error('批量导入失败:', error);
    ResponseUtil.error(res, '导入失败', 500);
  }
});

module.exports = router;
