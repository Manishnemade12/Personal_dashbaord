const express = require('express');
const router = express.Router();
const Project = require('../../models/portfolio/Project');

// GET all projects or by id
router.get('/', async (req, res) => {
  try {
    if (req.query.id) {
      const project = await Project.findById(req.query.id);
      return res.json(project);
    }
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create project
router.post('/', async (req, res) => {
  try {
    const { title, slug, images, description, client, projectcategory, tags, livepreview, status } = req.body;
    const project = await Project.create({
      title,
      slug,
      images,
      description,
      client,
      projectcategory,
      tags,
      livepreview,
      status: status || 'draft',
    });
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update project
router.put('/', async (req, res) => {
  try {
    const { _id, title, slug, images, description, client, projectcategory, tags, livepreview, status } = req.body;
    await Project.updateOne(
      { _id },
      { title, slug, images, description, client, projectcategory, tags, livepreview, status }
    );
    res.json(true);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE project
router.delete('/', async (req, res) => {
  try {
    if (req.query.id) {
      await Project.deleteOne({ _id: req.query.id });
      return res.json(true);
    }
    res.status(400).json({ error: 'Missing project id' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
