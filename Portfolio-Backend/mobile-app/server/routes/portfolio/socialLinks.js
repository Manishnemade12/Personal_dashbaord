const express = require('express');
const router = express.Router();
const SocialLink = require('../../models/portfolio/SocialLink');

// GET social links
router.get('/', async (req, res) => {
  try {
    let socialLinks = await SocialLink.findOne({});
    if (!socialLinks) {
      socialLinks = await SocialLink.create({
        Instagram: 'https://instagram.com/manish',
        Twitter: 'https://twitter.com/manish',
        Linkedin: 'https://linkedin.com/in/manish',
        Github: 'https://github.com/manish',
        personalweb: 'https://manishportfolio.com',
        youtube: '',
        discord: '',
        telegram: '',
      });
    }
    res.json(socialLinks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST or PUT save social links
router.post('/', async (req, res) => {
  try {
    const { Instagram, Twitter, Linkedin, Github, personalweb, youtube, discord, telegram } = req.body;
    let socialLinks = await SocialLink.findOne({});
    if (socialLinks) {
      if (Instagram !== undefined) socialLinks.Instagram = Instagram;
      if (Twitter !== undefined) socialLinks.Twitter = Twitter;
      if (Linkedin !== undefined) socialLinks.Linkedin = Linkedin;
      if (Github !== undefined) socialLinks.Github = Github;
      if (personalweb !== undefined) socialLinks.personalweb = personalweb;
      if (youtube !== undefined) socialLinks.youtube = youtube;
      if (discord !== undefined) socialLinks.discord = discord;
      if (telegram !== undefined) socialLinks.telegram = telegram;
      await socialLinks.save();
      return res.json({ message: 'Social links updated successfully', socialLinks });
    }

    socialLinks = await SocialLink.create({
      Instagram: Instagram || '',
      Twitter: Twitter || '',
      Linkedin: Linkedin || '',
      Github: Github || '',
      personalweb: personalweb || '',
      youtube: youtube || '',
      discord: discord || '',
      telegram: telegram || '',
    });
    res.status(201).json({ message: 'Social links created successfully', socialLinks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/', async (req, res) => {
  try {
    const { Instagram, Twitter, Linkedin, Github, personalweb, youtube, discord, telegram } = req.body;
    let socialLinks = await SocialLink.findOne({});
    if (!socialLinks) {
      socialLinks = await SocialLink.create({
        Instagram,
        Twitter,
        Linkedin,
        Github,
        personalweb,
        youtube,
        discord,
        telegram,
      });
      return res.json({ message: 'Social links created successfully', socialLinks });
    }

    if (Instagram !== undefined) socialLinks.Instagram = Instagram;
    if (Twitter !== undefined) socialLinks.Twitter = Twitter;
    if (Linkedin !== undefined) socialLinks.Linkedin = Linkedin;
    if (Github !== undefined) socialLinks.Github = Github;
    if (personalweb !== undefined) socialLinks.personalweb = personalweb;
    if (youtube !== undefined) socialLinks.youtube = youtube;
    if (discord !== undefined) socialLinks.discord = discord;
    if (telegram !== undefined) socialLinks.telegram = telegram;

    await socialLinks.save();
    res.json({ message: 'Social links updated successfully', socialLinks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
