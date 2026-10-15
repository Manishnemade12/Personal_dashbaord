const express = require('express');
const router = express.Router();
const Prof = require('../../models/portfolio/Prof');

// GET profile
router.get('/', async (req, res) => {
  try {
    if (req.query.id) {
      const profile = await Prof.findById(req.query.id);
      if (profile) return res.json(profile);
      return res.status(404).json({ error: 'Profile not found' });
    }
    const profile = await Prof.findOne({});
    if (profile) return res.json(profile);
    return res.status(404).json({ error: 'Profile not found' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST / PUT profile
router.post('/', async (req, res) => {
  try {
    const {
      name,
      email,
      description,
      profession,
      work1Title,
      work1Description,
      work2Title,
      work2Description,
      work3Title,
      work3Description,
      work4Title,
      work4Description,
      images,
    } = req.body;

    const existingProfile = await Prof.findOne({});
    if (existingProfile) {
      Object.assign(existingProfile, {
        name,
        email,
        description,
        profession,
        work1Title,
        work1Description,
        work2Title,
        work2Description,
        work3Title,
        work3Description,
        work4Title,
        work4Description,
        images,
      });
      await existingProfile.save();
      return res.json({ message: 'Profile updated successfully', profile: existingProfile });
    }

    const newProfile = await Prof.create({
      name,
      email,
      description,
      profession,
      work1Title,
      work1Description,
      work2Title,
      work2Description,
      work3Title,
      work3Description,
      work4Title,
      work4Description,
      images,
    });
    res.status(201).json(newProfile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
