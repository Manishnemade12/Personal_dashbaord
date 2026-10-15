const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Admin Schema bound to 'admin' collection (matching original Next.js website Profile/admin)
const AdminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema, 'admin');

const handleLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Find admin user in 'admin' collection (case-insensitive regex)
    let user = await Admin.findOne({ email: cleanEmail });
    if (!user) {
      user = await Admin.findOne({
        email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') },
      });
    }

    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    return res.json({
      success: true,
      user: { id: user._id, email: user.email },
    });
  } catch (error) {
    console.error('[Auth Error]', error);
    res.status(500).json({ error: error.message });
  }
};

// Handle both /login and /signin
router.post('/login', handleLogin);
router.post('/signin', handleLogin);

// POST /api/auth/signup (matching original website signup)
router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await Admin.findOne({
      email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') },
    });

    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const newUser = await Admin.create({ email: cleanEmail, password });
    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: { id: newUser._id, email: newUser.email },
    });
  } catch (error) {
    console.error('[Signup Error]', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

