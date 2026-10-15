const express = require('express');
const router = express.Router();
const Skills = require('../../models/portfolio/Skills');

router.get('/', async (req, res) => {
  try {
    const skills = await Skills.find().sort({ createdAt: -1 });
    res.json(skills);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, description, images } = req.body;
    const skill = await Skills.create({ title, description, images });
    res.status(201).json(skill);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/', async (req, res) => {
  try {
    const { _id, title, description, images } = req.body;
    await Skills.updateOne({ _id }, { title, description, images });
    res.json(true);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/', async (req, res) => {
  try {
    if (req.query.id) {
      await Skills.deleteOne({ _id: req.query.id });
      return res.json(true);
    }
    res.status(400).json({ error: 'Missing skill id' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
