const express = require('express');
const router = express.Router();
const Worldbook = require('../models/worldbook');

// 获取世界书
router.get('/', async (req, res) => {
  try {
    let worldbook = await Worldbook.findOne();
    if (!worldbook) {
      // 如果没有世界书，创建一个默认的
      worldbook = new Worldbook({
        content: '这是一个修仙世界，充满了神秘和奇迹。'
      });
      await worldbook.save();
    }
    res.json(worldbook);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新世界书
router.put('/', async (req, res) => {
  try {
    let worldbook = await Worldbook.findOne();
    if (!worldbook) {
      worldbook = new Worldbook(req.body);
    } else {
      worldbook.content = req.body.content;
    }
    await worldbook.save();
    res.json(worldbook);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;