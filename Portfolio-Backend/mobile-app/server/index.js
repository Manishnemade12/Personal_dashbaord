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
connectDB().catch((err) => console.error('[Init DB Error]', err.message));

// Middlewares
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Ensure DB connected & log API calls (crucial for Serverless like Vercel)
app.use('/api', async (req, res, next) => {
  console.log(`[API ${req.method}] ${req.url}`);
  if (req.path === '/health') return next();
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('[DB Connect Error]', err.message);
    return res.status(500).json({ error: 'Database connection failed: ' + err.message });
  }
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
app.use('/api/upload', require('./routes/upload'));

// System, Calendar, Finance & API Management Routes
app.use('/api/calendars', require('./routes/calendars'));
app.use('/api/calendar-events', require('./routes/calendarEvents'));
app.use('/api/reminders', require('./routes/reminders'));
app.use('/api/finance', require('./routes/finance'));
app.use('/api/investments', require('./routes/investments'));
app.use('/api/apis', require('./routes/apis'));
app.use('/api/projectapi', require('./routes/portfolio/projectApis'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/diet', require('./routes/diet'));


// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', server: 'mobile-app-standalone-server', timestamp: new Date() });
});

// Disable caching for HTML files so browsers always load new bundle hashes immediately
app.use((req, res, next) => {
  if (req.path === '/' || req.path.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// Serve frontend static web build directly from port 5000
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Fallback to index.html for SPA frontend routing
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) next();
  });
});

app.listen(PORT, () => {
  console.log(`[Standalone Server] Running on http://localhost:${PORT}`);
  console.log(`[Frontend UI] Open in browser at http://localhost:${PORT}`);
  console.log(`[API Endpoints] Ready at http://localhost:${PORT}/api/*`);

  // Scheduled Portfolio Snapshot Capture (Runs 10s after boot, and periodically)
  setTimeout(() => {
    const snapshotService = require('./services/snapshotService');
    snapshotService
      .captureDailySnapshot('admin', { source: 'automated_cron' })
      .then((s) => console.log(`[Daily Snapshot Cron] Net Worth snapshot ready for ${s.dateStr}`))
      .catch((e) => console.log('[Snapshot Cron Notice]', e.message));
  }, 10000);

  setInterval(() => {
    const snapshotService = require('./services/snapshotService');
    snapshotService
      .captureDailySnapshot('admin', { source: 'automated_cron' })
      .catch((e) => console.log('[Snapshot Cron Notice]', e.message));
  }, 4 * 60 * 60 * 1000);
});

module.exports = app;
