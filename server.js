const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Create express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from next.js-frontend/public
app.use(express.static(path.join(__dirname, 'next.js-frontend/public')));

// Create a simple API endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Basic authentication endpoints
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  // Simple authentication (replace with real database auth later)
  if (username === 'admin' && password === 'password') {
    res.json({
      id: '1',
      username: 'admin',
      organizationName: 'Demo Organization',
      createdAt: new Date().toISOString()
    });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

app.post('/api/register', (req, res) => {
  const { username, password, organizationName } = req.body;
  
  // Simple registration (replace with real database registration later)
  res.status(201).json({
    id: '2',
    username,
    organizationName,
    createdAt: new Date().toISOString()
  });
});

// Send index.html for root path
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'next.js-frontend/public/index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send('<h1>Visitor Sign-In System</h1><p>Welcome to the Visitor Sign-In System!</p>');
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});