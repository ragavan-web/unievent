const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================================
// Middleware: MUST be defined BEFORE routers and handlers
// ==========================================================

// 1. Middleware to parse JSON bodies (REQUIRED for POST requests)
app.use(express.json()); 

// 2. Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================================
// Router Requires & Setup
// ==========================================================
const eventsRouter = require('./src/routes/events');
const usersRouter = require('./src/routes/users');

// Route Handlers: Define your API routes
app.use('/api/events', eventsRouter);
app.use('/api/users', usersRouter);

// Basic route for the home page (falls back to index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
