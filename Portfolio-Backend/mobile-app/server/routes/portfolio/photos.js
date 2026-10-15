const express = require('express');
const router = express.Router();
const Photo = require('../../models/portfolio/Photo');

router.get('/', async (req, res) => {
  try {
    const photos = await Photo.find().sort({ createdAt: -1 });
    res.json(photos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, images } = req.body;
    const photo = await Photo.create({ title, images });
    res.status(201).json(photo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/', async (req, res) => {
  try {
    if (req.query.id) {
      await Photo.deleteOne({ _id: req.query.id });
      return res.json(true);
    }
    res.status(400).json({ error: 'Missing photo id' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
