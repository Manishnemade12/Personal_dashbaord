const express = require('express');
const router = express.Router();

const blogsRouter = require('./blogs');
const projectsRouter = require('./projects');
const skillsRouter = require('./skills');
const photosRouter = require('./photos');
const contactsRouter = require('./contacts');
const educationRouter = require('./education');
const socialLinksRouter = require('./socialLinks');
const profRouter = require('./prof');
const projectApisRouter = require('./projectApis');

// Sub-routes mounted under /api/portfolio/...
router.use('/blogs', blogsRouter);
router.use('/projects', projectsRouter);
router.use('/skills', skillsRouter);
router.use('/photos', photosRouter);
router.use('/contacts', contactsRouter);
router.use('/education', educationRouter);
router.use('/sociallinks', socialLinksRouter);
router.use('/prof', profRouter);
router.use('/projectapi', projectApisRouter);
router.use('/upload', require('../upload'));

// Unified portfolio summary overview
router.get('/summary', async (req, res) => {
  try {
    const {
      Blog,
      Project,
      Skills,
      Photo,
      Contact,
      Education,
      SocialLink,
    } = require('../../models/portfolio');


    const [
      totalBlogs,
      totalProjects,
      totalSkills,
      totalPhotos,
      totalContacts,
      educationDoc,
      socialDoc,
    ] = await Promise.all([
      Blog.countDocuments(),
      Project.countDocuments(),
      Skills.countDocuments(),
      Photo.countDocuments(),
      Contact.countDocuments(),
      Education.findOne({}),
      SocialLink.findOne({}),
    ]);

    res.json({
      blogs: totalBlogs,
      projects: totalProjects,
      skills: totalSkills,
      photos: totalPhotos,
      contacts: totalContacts,
      educationCount: educationDoc?.education?.length || 0,
      socialLinksConfigured: socialDoc ? Object.values(socialDoc.toObject()).filter(Boolean).length : 0,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
