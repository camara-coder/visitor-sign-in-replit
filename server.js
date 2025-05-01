const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Create express app
const app = express();

// In-memory storage (replace with database in production)
const users = [
  {
    id: '1',
    username: 'admin',
    password: 'password',
    organizationName: 'Demo Organization',
    createdAt: new Date().toISOString()
  }
];

const events = [
  {
    id: '1',
    title: 'Company Open House',
    description: 'Annual company open house for visitors and prospective clients',
    organizationId: '1',
    status: 'enabled',
    location: 'Main Office',
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 86400000).toISOString() // 24 hours later
  }
];

const visitors = [];

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from next.js-frontend/public
app.use(express.static(path.join(__dirname, 'next.js-frontend/public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// AUTHENTICATION ENDPOINTS
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  // Find user by username and password
  const user = users.find(u => u.username === username && u.password === password);
  
  if (user) {
    // Send user data without password
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

app.post('/api/register', (req, res) => {
  const { username, password, organizationName } = req.body;
  
  // Check if username already exists
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ message: 'Username already exists' });
  }
  
  // Create new user
  const newUser = {
    id: (users.length + 1).toString(),
    username,
    password,
    organizationName,
    createdAt: new Date().toISOString()
  };
  
  // Add to users array
  users.push(newUser);
  
  // Log for debugging
  console.log('Registered new user:', username);
  console.log('Current users:', users.map(u => u.username));
  
  // Return user data without password
  const { password: _, ...userWithoutPassword } = newUser;
  res.status(201).json(userWithoutPassword);
});

// EVENT MANAGEMENT ENDPOINTS
app.get('/api/events', (req, res) => {
  res.json(events);
});

app.get('/api/events/current', (req, res) => {
  const activeEvent = events.find(e => e.status === 'enabled');
  
  if (activeEvent) {
    res.json(activeEvent);
  } else {
    res.status(404).json({ message: 'No active event found' });
  }
});

app.get('/api/events/:id', (req, res) => {
  const event = events.find(e => e.id === req.params.id);
  
  if (event) {
    res.json(event);
  } else {
    res.status(404).json({ message: 'Event not found' });
  }
});

app.post('/api/events', (req, res) => {
  const { title, description, location } = req.body;
  const userId = req.body.userId || '1'; // For simplicity, default to user 1
  
  // Create new event
  const newEvent = {
    id: (events.length + 1).toString(),
    title,
    description,
    organizationId: userId,
    status: 'enabled',
    location,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 86400000).toISOString() // 24 hours later
  };
  
  // First, disable all other events
  events.forEach(e => {
    e.status = 'disabled';
  });
  
  // Add new event
  events.push(newEvent);
  
  res.status(201).json(newEvent);
});

app.put('/api/events/:id/disable', (req, res) => {
  const event = events.find(e => e.id === req.params.id);
  
  if (event) {
    event.status = 'disabled';
    res.json(event);
  } else {
    res.status(404).json({ message: 'Event not found' });
  }
});

app.put('/api/events/:id/enable', (req, res) => {
  const eventToEnable = events.find(e => e.id === req.params.id);
  
  if (!eventToEnable) {
    return res.status(404).json({ message: 'Event not found' });
  }
  
  // Disable all events first
  events.forEach(e => {
    e.status = 'disabled';
  });
  
  // Enable the requested event
  eventToEnable.status = 'enabled';
  res.json(eventToEnable);
});

// VISITOR MANAGEMENT ENDPOINTS
app.get('/api/visitors', (req, res) => {
  const eventId = req.query.eventId;
  
  if (eventId) {
    const eventVisitors = visitors.filter(v => v.eventId === eventId);
    res.json(eventVisitors);
  } else {
    res.json(visitors);
  }
});

app.post('/api/visitors', (req, res) => {
  const { firstName, lastName, email, phone, address, eventId } = req.body;
  
  // Validate event exists
  const event = events.find(e => e.id === eventId);
  if (!event) {
    return res.status(400).json({ message: 'Event not found' });
  }
  
  // Create new visitor
  const newVisitor = {
    id: (visitors.length + 1).toString(),
    firstName,
    lastName,
    email,
    phone: phone || '',
    address: address || '',
    eventId,
    checkInTime: new Date().toISOString(),
    status: 'checked-in'
  };
  
  // Add to visitors array
  visitors.push(newVisitor);
  
  // Log for debugging
  console.log('New visitor checked in:', `${firstName} ${lastName}`);
  
  res.status(201).json(newVisitor);
});

// Get all users (for development purposes)
app.get('/api/users', (req, res) => {
  // Return users without passwords
  const usersWithoutPasswords = users.map(user => {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });
  
  res.json(usersWithoutPasswords);
});

// STATIC ROUTES
// Send index.html for root path
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'next.js-frontend/public/index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send('<h1>Visitor Sign-In System</h1><p>Welcome to the Visitor Sign-In System!</p>');
  }
});

// Send dashboard.html for /dashboard path
app.get('/dashboard', (req, res) => {
  const dashboardPath = path.join(__dirname, 'next.js-frontend/public/dashboard.html');
  if (fs.existsSync(dashboardPath)) {
    res.sendFile(dashboardPath);
  } else {
    res.redirect('/');
  }
});

// Send signin.html for /signin path
app.get('/signin', (req, res) => {
  const signinPath = path.join(__dirname, 'next.js-frontend/public/signin.html');
  if (fs.existsSync(signinPath)) {
    res.sendFile(signinPath);
  } else {
    res.redirect('/');
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});