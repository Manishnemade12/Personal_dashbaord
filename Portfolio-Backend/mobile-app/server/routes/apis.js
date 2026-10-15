const express = require('express');
const router = express.Router();
const API = require('../models/API');

// GET all APIs
router.get('/', async (req, res) => {
  try {
    const query = {};
    if (req.query.category && req.query.category !== 'All') {
      query.category = req.query.category;
    }
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { url: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
      ];
    }
    const apis = await API.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: apis });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET single API
router.get('/:id', async (req, res) => {
  try {
    const apiDoc = await API.findById(req.params.id);
    if (!apiDoc) return res.status(404).json({ success: false, message: 'API not found' });
    res.json({ success: true, data: apiDoc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST create API
router.post('/', async (req, res) => {
  try {
    const { name, url, method, category, description, status } = req.body;
    if (!name || !url) {
      return res.status(400).json({ success: false, message: 'Name and URL are required' });
    }
    const newAPI = new API({
      name,
      url,
      method: method || 'GET',
      category: category || 'General',
      description: description || '',
      status: status || 'active',
    });
    await newAPI.save();
    res.status(201).json({ success: true, data: newAPI });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT update API
router.put('/:id', async (req, res) => {
  try {
    const { name, url, method, category, description, status } = req.body;
    const updated = await API.findByIdAndUpdate(
      req.params.id,
      { name, url, method, category, description, status },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: 'API not found' });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE API
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await API.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'API not found' });
    res.json({ success: true, message: 'API deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
