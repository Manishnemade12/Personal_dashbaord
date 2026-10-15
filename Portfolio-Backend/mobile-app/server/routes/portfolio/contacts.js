const express = require('express');
const router = express.Router();
const Contact = require('../../models/portfolio/Contact');

router.get('/', async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, lname, email, company, phone, country, price, description, project } = req.body;
    const contact = await Contact.create({
      name,
      lname,
      email,
      company,
      phone,
      country,
      price,
      description,
      project,
    });
    res.status(201).json(contact);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
