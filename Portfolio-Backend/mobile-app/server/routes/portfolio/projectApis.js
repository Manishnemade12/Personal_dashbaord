const express = require('express');
const router = express.Router();
const ProjectApi = require('../../models/portfolio/ProjectApi');

// GET all projects and their APIs
router.get('/', async (req, res) => {
  try {
    const projects = await ProjectApi.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single project
router.get('/:id', async (req, res) => {
  try {
    const project = await ProjectApi.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create project
router.post('/', async (req, res) => {
  try {
    const { projectName, description, apis } = req.body;
    if (!projectName) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    const project = await ProjectApi.create({
      projectName,
      description: description || '',
      apis: Array.isArray(apis) ? apis : [],
    });
    res.status(201).json(project);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT update project
router.put('/:id', async (req, res) => {
  try {
    const { projectName, description, apis } = req.body;
    const updateData = {};
    if (projectName !== undefined) updateData.projectName = projectName;
    if (description !== undefined) updateData.description = description;
    if (apis !== undefined) updateData.apis = apis;

    const updated = await ProjectApi.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updated) return res.status(404).json({ error: 'Project not found' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST add endpoint to project
router.post('/:id/apis', async (req, res) => {
  try {
    const { name, endpoint, method, description } = req.body;
    if (!name || !endpoint) {
      return res.status(400).json({ error: 'Endpoint name and URL are required' });
    }
    const project = await ProjectApi.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    project.apis.push({
      name,
      endpoint,
      method: method || 'GET',
      description: description || '',
    });
    await project.save();
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE endpoint from project
router.delete('/:id/apis/:apiId', async (req, res) => {
  try {
    const project = await ProjectApi.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    project.apis = project.apis.filter(
      (api) => api._id.toString() !== req.params.apiId
    );
    await project.save();
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE project
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await ProjectApi.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Project not found' });
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
