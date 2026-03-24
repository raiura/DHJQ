const express = require('express');
const router = express.Router();
const Character = require('../models/character');

// 获取所有角色
router.get('/', async (req, res) => {
  try {
    const characters = await Character.find();
    res.json(characters);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建新角色
router.post('/', async (req, res) => {
  try {
    const character = new Character(req.body);
    await character.save();
    res.json(character);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新角色
router.put('/:id', async (req, res) => {
  try {
    const character = await Character.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(character);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除角色
router.delete('/:id', async (req, res) => {
  try {
    await Character.findByIdAndDelete(req.params.id);
    res.json({ message: 'Character deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;