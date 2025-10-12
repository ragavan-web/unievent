const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================================
// Middleware
// ==========================================================
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================================
// Routers
// ==========================================================
const eventsRouter = require('./src/routes/events');
const usersRouter = require('./src/routes/users');

app.use('/api/events', eventsRouter);
app.use('/api/users', usersRouter);

// ==========================================================
// Frontend routes fallback (important for SPA routing)
// ==========================================================

// Serve index.html for all non-API routes
app.get('/*', (req, res) => {
  // Make sure this only handles frontend routes, not API routes
  if (!req.originalUrl.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.status(404).json({ message: 'API route not found' });
  }
});

// ==========================================================
// Start Server
// ==========================================================
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
