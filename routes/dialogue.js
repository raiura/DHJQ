const express = require('express');
const router = express.Router();
const DialogueService = require('../services/dialogueService');

// 处理对话请求
router.post('/', async (req, res) => {
  try {
    const { message, characterId } = req.body;
    const response = await DialogueService.generateResponse(message, characterId);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取对话历史
router.get('/history', async (req, res) => {
  try {
    const history = await DialogueService.getHistory();
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;