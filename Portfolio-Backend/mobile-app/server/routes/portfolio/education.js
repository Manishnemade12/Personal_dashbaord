const express = require('express');
const router = express.Router();
const Education = require('../../models/portfolio/Education');

// GET education profile
router.get('/', async (req, res) => {
  try {
    let profile = await Education.findOne({});
    if (!profile) {
      profile = await Education.create({
        education: [
          {
            school: 'Stanford University',
            degree: 'Master of Science',
            fieldOfStudy: 'Computer Science & AI',
            year: '2022 - 2024',
            educationDescription: 'Focused on distributed systems, modern web engineering, and applied machine learning algorithms.',
            grade: '4.0 GPA',
          },
          {
            school: 'Indian Institute of Technology (IIT)',
            degree: 'Bachelor of Technology',
            fieldOfStudy: 'Information Technology',
            year: '2018 - 2022',
            educationDescription: 'Core software architecture, data structures, algorithms, and full-stack web application development.',
            grade: 'First Class with Distinction',
          },
        ],
      });
    }
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create or add education
router.post('/', async (req, res) => {
  try {
    const { school, degree, fieldOfStudy, year, educationDescription, grade, education } = req.body;
    let profile = await Education.findOne({});
    if (!profile) {
      profile = new Education({
        education: education || (school ? [{ school, degree, fieldOfStudy, year, educationDescription, grade }] : []),
      });
      await profile.save();
      return res.status(201).json(profile);
    }

    if (Array.isArray(education)) {
      profile.education = education;
    } else if (school) {
      profile.education.unshift({ school, degree, fieldOfStudy, year, educationDescription, grade });
    }

    await profile.save();
    res.status(201).json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update whole list or single item
router.put('/', async (req, res) => {
  try {
    const { education, itemId, itemData } = req.body;
    let profile = await Education.findOne({});
    if (!profile) return res.status(404).json({ error: 'Education profile not found' });

    if (Array.isArray(education)) {
      profile.education = education;
    } else if (itemId && itemData) {
      const itemIndex = profile.education.findIndex((ed) => ed._id.toString() === itemId);
      if (itemIndex > -1) {
        profile.education[itemIndex] = { ...profile.education[itemIndex].toObject(), ...itemData };
      }
    }

    await profile.save();
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE single education entry by itemId
router.delete('/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    let profile = await Education.findOne({});
    if (!profile) return res.status(404).json({ error: 'Education profile not found' });

    profile.education = profile.education.filter((item) => item._id.toString() !== itemId);
    await profile.save();
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
