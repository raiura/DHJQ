const express = require('express');
const router = express.Router();
const Setting = require('../models/setting');

// 获取设置
router.get('/', async (req, res) => {
  try {
    let setting = await Setting.findOne();
    if (!setting) {
      // 如果没有设置，创建默认设置
      setting = new Setting({
        apiKey: process.env.API_KEY,
        apiUrl: process.env.API_URL,
        model: process.env.MODEL
      });
      await setting.save();
    }
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新设置
router.put('/', async (req, res) => {
  try {
    let setting = await Setting.findOne();
    if (!setting) {
      setting = new Setting(req.body);
    } else {
      setting.apiKey = req.body.apiKey;
      setting.apiUrl = req.body.apiUrl;
      setting.model = req.body.model;
    }
    await setting.save();
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;