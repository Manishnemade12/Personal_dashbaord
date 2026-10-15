const express = require('express');
const router = express.Router();
const Blog = require('../../models/portfolio/Blog');

// GET all blogs or by id (?id=...)
router.get('/', async (req, res) => {
  try {
    if (req.query.id) {
      const blog = await Blog.findById(req.query.id);
      return res.json(blog);
    }
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create blog
router.post('/', async (req, res) => {
  try {
    const { title, slug, images, description, blogcategory, tags, status } = req.body;
    const blog = await Blog.create({
      title,
      slug,
      images,
      description,
      blogcategory,
      tags,
      status: status || 'draft',
    });
    res.status(201).json(blog);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update blog
router.put('/', async (req, res) => {
  try {
    const { _id, title, slug, images, description, blogcategory, tags, status } = req.body;
    await Blog.updateOne(
      { _id },
      { title, slug, images, description, blogcategory, tags, status }
    );
    res.json(true);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE blog
router.delete('/', async (req, res) => {
  try {
    if (req.query.id) {
      await Blog.deleteOne({ _id: req.query.id });
      return res.json(true);
    }
    res.status(400).json({ error: 'Missing blog id' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
