// Fix Windows Node.js querySrv ECONNREFUSED on MongoDB Atlas SRV connection strings
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {}

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Request logger for API calls
app.use('/api', (req, res, next) => {
  console.log(`[API ${req.method}] ${req.url}`);
  next();
});

// API Routes
app.use('/api/auth', require('./routes/auth'));

// Portfolio Unified Module (/api/portfolio/* and direct endpoints)
app.use('/api/portfolio', require('./routes/portfolio'));
app.use('/api/blogs', require('./routes/portfolio/blogs'));
app.use('/api/projects', require('./routes/portfolio/projects'));
app.use('/api/skills', require('./routes/portfolio/skills'));
app.use('/api/photos', require('./routes/portfolio/photos'));
app.use('/api/contacts', require('./routes/portfolio/contacts'));
app.use('/api/education', require('./routes/portfolio/education'));
app.use('/api/sociallinks', require('./routes/portfolio/socialLinks'));
app.use('/api/prof', require('./routes/portfolio/prof'));

// System, Calendar, Finance & API Management Routes
app.use('/api/calendars', require('./routes/calendars'));
app.use('/api/calendar-events', require('./routes/calendarEvents'));
app.use('/api/reminders', require('./routes/reminders'));
app.use('/api/finance', require('./routes/finance'));
app.use('/api/investments', require('./routes/investments'));
app.use('/api/apis', require('./routes/apis'));
app.use('/api/projectapi', require('./routes/portfolio/projectApis'));


// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', server: 'mobile-app-standalone-server', timestamp: new Date() });
});

// Serve frontend static web build directly from port 5000
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

// Fallback to index.html for SPA frontend routing
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) next();
  });
});

app.listen(PORT, () => {
  console.log(`[Standalone Server] Running on http://localhost:${PORT}`);
  console.log(`[Frontend UI] Open in browser at http://localhost:${PORT}`);
  console.log(`[API Endpoints] Ready at http://localhost:${PORT}/api/*`);
});
