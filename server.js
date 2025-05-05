const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./database');
const schema = require('./schema');
const { promisify } = require('util');
const bcrypt = require('bcryptjs') || { hashSync: (password) => password, compareSync: (password, hash) => password === hash };
const emailService = require('./email-service');
const scheduledEventsApi = require('./scheduled-events-api');

// Create express app
const app = express();

// Initialize database schema
schema.setupDatabase().catch(err => {
  console.error('Failed to set up database schema:', err);
});

// In-memory fallback storage (used only if database connection fails)
const inMemory = {
  users: [
    {
      id: '1',
      username: 'admin',
      password: 'password',
      organizationName: 'Demo Organization',
      createdAt: new Date().toISOString()
    }
  ],
  teams: [],
  events: [
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
  ],
  visitors: [],
  visitorDirectory: [],
  members: []
};

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from next.js-frontend/public
app.use(express.static(path.join(__dirname, 'next.js-frontend/public')));

// Health check endpoint for AWS load balancer and monitoring
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    const dbStatus = await db.query('SELECT 1 as connected');
    const dbConnected = dbStatus.rows && dbStatus.rows[0]?.connected === 1;
    
    res.json({ 
      status: 'ok', 
      message: 'Server is running',
      version: '1.0.0',
      scheduledEvents: true,
      database: dbConnected ? 'connected' : 'disconnected',
      time: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.json({ 
      status: 'degraded', 
      message: 'Server is running with issues',
      database: 'disconnected',
      time: new Date().toISOString()
    });
  }
});

// AUTHENTICATION ENDPOINTS
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    // Try to find the user in the database
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      
      // Check if password matches
      const passwordMatches = bcrypt.compareSync(password, user.password) || password === user.password;
      
      if (passwordMatches) {
        // Transform database field names to match our API format
        const userResponse = {
          id: user.id.toString(),
          username: user.username,
          organizationName: user.organization_name,
          createdAt: user.created_at
        };
        
        res.json(userResponse);
      } else {
        res.status(401).json({ message: 'Invalid credentials' });
      }
    } else {
      // Fallback to in-memory if user not found in database
      const inMemoryUser = inMemory.users.find(u => u.username === username && u.password === password);
      
      if (inMemoryUser) {
        const { password, ...userWithoutPassword } = inMemoryUser;
        res.json(userWithoutPassword);
      } else {
        res.status(401).json({ message: 'Invalid credentials' });
      }
    }
  } catch (error) {
    console.error('Error during login:', error);
    
    // Fallback to in-memory if database error
    const inMemoryUser = inMemory.users.find(u => u.username === username && u.password === password);
    
    if (inMemoryUser) {
      const { password, ...userWithoutPassword } = inMemoryUser;
      res.json(userWithoutPassword);
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  }
});

app.post('/api/register', async (req, res) => {
  const { username, password, organizationName } = req.body;
  
  try {
    // Check if username already exists in the database
    const existingUser = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    
    // Hash the password
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    // Insert new user into the database
    const result = await db.query(
      'INSERT INTO users (username, password, organization_name) VALUES ($1, $2, $3) RETURNING *',
      [username, hashedPassword, organizationName]
    );
    
    const newUser = result.rows[0];
    
    // Log for debugging
    console.log('Registered new user:', username);
    
    // Transform database field names to match our API format
    const userResponse = {
      id: newUser.id.toString(),
      username: newUser.username,
      organizationName: newUser.organization_name,
      createdAt: newUser.created_at
    };
    
    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Error during registration:', error);
    
    // Fallback to in-memory if database error
    // Check if username already exists in memory
    if (inMemory.users.find(u => u.username === username)) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    
    // Create new user in memory
    const newUser = {
      id: (inMemory.users.length + 1).toString(),
      username,
      password,
      organizationName,
      createdAt: new Date().toISOString()
    };
    
    inMemory.users.push(newUser);
    
    console.log('Registered new user in memory:', username);
    console.log('Current in-memory users:', inMemory.users.map(u => u.username));
    
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json(userWithoutPassword);
  }
});

// EVENT MANAGEMENT ENDPOINTS
app.get('/api/events', async (req, res) => {
  try {
    // Get all events from the database
    const result = await db.query('SELECT * FROM events ORDER BY created_at DESC');
    
    // Transform database field names to match our API format
    const events = result.rows.map(event => ({
      id: event.id.toString(),
      title: event.title,
      description: event.description,
      organizationId: event.organization_id.toString(),
      status: event.status,
      location: event.location,
      startDate: event.start_date,
      endDate: event.end_date,
      createdAt: event.created_at
    }));
    
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    // Fallback to in-memory data
    res.json(inMemory.events);
  }
});

app.get('/api/events/current', async (req, res) => {
  try {
    // Get the active event from the database
    const result = await db.query("SELECT * FROM events WHERE status = 'enabled' LIMIT 1");
    
    if (result.rows.length > 0) {
      const event = result.rows[0];
      
      // Transform database field names to match our API format
      const formattedEvent = {
        id: event.id.toString(),
        title: event.title,
        description: event.description,
        organizationId: event.organization_id.toString(),
        status: event.status,
        location: event.location,
        startDate: event.start_date,
        endDate: event.end_date,
        createdAt: event.created_at
      };
      
      res.json(formattedEvent);
    } else {
      // Try in-memory data if no active event in database
      const activeEvent = inMemory.events.find(e => e.status === 'enabled');
      
      if (activeEvent) {
        res.json(activeEvent);
      } else {
        res.status(404).json({ message: 'No active event found' });
      }
    }
  } catch (error) {
    console.error('Error fetching current event:', error);
    // Fallback to in-memory data
    const activeEvent = inMemory.events.find(e => e.status === 'enabled');
    
    if (activeEvent) {
      res.json(activeEvent);
    } else {
      res.status(404).json({ message: 'No active event found' });
    }
  }
});

app.get('/api/events/:id', async (req, res) => {
  const eventId = req.params.id;
  
  try {
    // Get the event from the database
    const result = await db.query('SELECT * FROM events WHERE id = $1', [eventId]);
    
    if (result.rows.length > 0) {
      const event = result.rows[0];
      
      // Transform database field names to match our API format
      const formattedEvent = {
        id: event.id.toString(),
        title: event.title,
        description: event.description,
        organizationId: event.organization_id.toString(),
        status: event.status,
        location: event.location,
        startDate: event.start_date,
        endDate: event.end_date,
        createdAt: event.created_at
      };
      
      res.json(formattedEvent);
    } else {
      // Try in-memory data if event not found in database
      const event = inMemory.events.find(e => e.id === eventId);
      
      if (event) {
        res.json(event);
      } else {
        res.status(404).json({ message: 'Event not found' });
      }
    }
  } catch (error) {
    console.error('Error fetching event:', error);
    // Fallback to in-memory data
    const event = inMemory.events.find(e => e.id === eventId);
    
    if (event) {
      res.json(event);
    } else {
      res.status(404).json({ message: 'Event not found' });
    }
  }
});

app.post('/api/events', async (req, res) => {
  const { title, description, location } = req.body;
  const userId = req.body.userId || '1'; // For simplicity, default to user 1
  const organizationId = userId; // Map userId to organizationId
  
  try {
    // First, disable all other events
    await db.query("UPDATE events SET status = 'disabled'");
    
    // Create end date (24 hours from now)
    const endDate = new Date(Date.now() + 86400000);
    
    // Insert new event into the database
    const result = await db.query(
      `INSERT INTO events 
       (title, description, organization_id, status, location, end_date) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [title, description, organizationId, 'enabled', location, endDate]
    );
    
    const newEvent = result.rows[0];
    
    // Transform database field names to match our API format
    const formattedEvent = {
      id: newEvent.id.toString(),
      title: newEvent.title,
      description: newEvent.description,
      organizationId: newEvent.organization_id.toString(),
      status: newEvent.status,
      location: newEvent.location,
      startDate: newEvent.start_date,
      endDate: newEvent.end_date,
      createdAt: newEvent.created_at
    };
    
    res.status(201).json(formattedEvent);
  } catch (error) {
    console.error('Error creating event:', error.message || error);
    console.error('Error stack:', error.stack);
    
    // Fallback to in-memory if database error
    // Create new event in memory
    const newEvent = {
      id: (inMemory.events.length + 1).toString(),
      title,
      description,
      organizationId: organizationId,
      status: 'enabled',
      location,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString() // 24 hours later
    };
    
    // First, disable all other events
    inMemory.events.forEach(e => {
      e.status = 'disabled';
    });
    
    // Add new event
    inMemory.events.push(newEvent);
    
    res.status(201).json(newEvent);
  }
});

app.put('/api/events/:id/disable', async (req, res) => {
  const eventId = req.params.id;
  
  try {
    // Update the event in the database
    const result = await db.query(
      "UPDATE events SET status = 'disabled' WHERE id = $1 RETURNING *",
      [eventId]
    );
    
    if (result.rows.length > 0) {
      const event = result.rows[0];
      
      // Transform database field names to match our API format
      const formattedEvent = {
        id: event.id.toString(),
        title: event.title,
        description: event.description,
        organizationId: event.organization_id.toString(),
        status: event.status,
        location: event.location,
        startDate: event.start_date,
        endDate: event.end_date,
        createdAt: event.created_at
      };
      
      res.json(formattedEvent);
    } else {
      // Try in-memory data if event not found in database
      const event = inMemory.events.find(e => e.id === eventId);
      
      if (event) {
        event.status = 'disabled';
        res.json(event);
      } else {
        res.status(404).json({ message: 'Event not found' });
      }
    }
  } catch (error) {
    console.error('Error disabling event:', error);
    
    // Fallback to in-memory data
    const event = inMemory.events.find(e => e.id === eventId);
    
    if (event) {
      event.status = 'disabled';
      res.json(event);
    } else {
      res.status(404).json({ message: 'Event not found' });
    }
  }
});

app.post('/api/events/:id/copy', async (req, res) => {
  const eventId = req.params.id;
  const userId = req.body.userId || '1'; // For simplicity, default to user 1
  const organizationId = userId; // Map userId to organizationId
  
  try {
    // First check if there's any active event
    const activeEventCheck = await db.query("SELECT id FROM events WHERE status = 'enabled' LIMIT 1");
    
    if (activeEventCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Cannot copy event while there is an active event. Please disable the current active event first.' });
    }
    
    // Get the event to copy
    const eventResult = await db.query('SELECT * FROM events WHERE id = $1', [eventId]);
    
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    const eventToCopy = eventResult.rows[0];
    
    // Check if the event is disabled
    if (eventToCopy.status !== 'disabled') {
      return res.status(400).json({ message: 'Only disabled events can be copied' });
    }
    
    // Create end date (24 hours from now)
    const endDate = new Date(Date.now() + 86400000);
    
    // Create a date suffix for the title
    const dateSuffix = new Date().toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
    
    // Create a new title with the date
    const newTitle = `${eventToCopy.title} - ${dateSuffix}`;
    
    // Insert new event into the database with status 'enabled'
    const result = await db.query(
      `INSERT INTO events 
       (title, description, organization_id, status, location, end_date) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [newTitle, eventToCopy.description, organizationId, 'enabled', eventToCopy.location, endDate]
    );
    
    const newEvent = result.rows[0];
    
    // Transform database field names to match our API format
    const formattedEvent = {
      id: newEvent.id.toString(),
      title: newEvent.title,
      description: newEvent.description,
      organizationId: newEvent.organization_id.toString(),
      status: newEvent.status,
      location: newEvent.location,
      startDate: newEvent.start_date,
      endDate: newEvent.end_date,
      createdAt: newEvent.created_at
    };
    
    res.status(201).json(formattedEvent);
  } catch (error) {
    console.error('Error copying event:', error.message || error);
    console.error('Error stack:', error.stack);
    
    // Fallback to in-memory if database error
    try {
      // Check if there's any active event
      const activeEvent = inMemory.events.find(e => e.status === 'enabled');
      
      if (activeEvent) {
        return res.status(400).json({ message: 'Cannot copy event while there is an active event. Please disable the current active event first.' });
      }
      
      // Get the event to copy
      const eventToCopy = inMemory.events.find(e => e.id === eventId);
      
      if (!eventToCopy) {
        return res.status(404).json({ message: 'Event not found' });
      }
      
      // Check if the event is disabled
      if (eventToCopy.status !== 'disabled') {
        return res.status(400).json({ message: 'Only disabled events can be copied' });
      }
      
      // Create a date suffix for the title
      const dateSuffix = new Date().toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
      
      // Create a new title with the date
      const newTitle = `${eventToCopy.title} - ${dateSuffix}`;
      
      // Create new event in memory
      const newEvent = {
        id: (inMemory.events.length + 1).toString(),
        title: newTitle,
        description: eventToCopy.description,
        organizationId: eventToCopy.organizationId,
        status: 'enabled',
        location: eventToCopy.location,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000).toISOString() // 24 hours later
      };
      
      // Add new event
      inMemory.events.push(newEvent);
      
      res.status(201).json(newEvent);
    } catch (fallbackError) {
      console.error('Error in fallback copy event:', fallbackError);
      res.status(500).json({ message: 'Failed to copy event' });
    }
  }
});

app.put('/api/events/:id/enable', async (req, res) => {
  const eventId = req.params.id;
  
  try {
    // First, disable all events
    await db.query("UPDATE events SET status = 'disabled'");
    
    // Then enable the requested event
    const result = await db.query(
      "UPDATE events SET status = 'enabled' WHERE id = $1 RETURNING *",
      [eventId]
    );
    
    if (result.rows.length > 0) {
      const event = result.rows[0];
      
      // Transform database field names to match our API format
      const formattedEvent = {
        id: event.id.toString(),
        title: event.title,
        description: event.description,
        organizationId: event.organization_id.toString(),
        status: event.status,
        location: event.location,
        startDate: event.start_date,
        endDate: event.end_date,
        createdAt: event.created_at
      };
      
      res.json(formattedEvent);
    } else {
      // Try in-memory data if event not found in database
      const eventToEnable = inMemory.events.find(e => e.id === eventId);
      
      if (!eventToEnable) {
        return res.status(404).json({ message: 'Event not found' });
      }
      
      // Disable all events first
      inMemory.events.forEach(e => {
        e.status = 'disabled';
      });
      
      // Enable the requested event
      eventToEnable.status = 'enabled';
      res.json(eventToEnable);
    }
  } catch (error) {
    console.error('Error enabling event:', error);
    
    // Fallback to in-memory data
    const eventToEnable = inMemory.events.find(e => e.id === eventId);
    
    if (!eventToEnable) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Disable all events first
    inMemory.events.forEach(e => {
      e.status = 'disabled';
    });
    
    // Enable the requested event
    eventToEnable.status = 'enabled';
    res.json(eventToEnable);
  }
});

// VISITOR MANAGEMENT ENDPOINTS
app.get('/api/visitors', async (req, res) => {
  const eventId = req.query.eventId;
  const phone = req.query.phone;
  const email = req.query.email;
  
  try {
    let query = 'SELECT v.*, e.title as event_name FROM visitors v LEFT JOIN events e ON v.event_id = e.id';
    let params = [];
    let whereClauseAdded = false;
    
    if (eventId) {
      query += ' WHERE v.event_id = $1';
      params.push(eventId);
      whereClauseAdded = true;
    }
    
    if (phone) {
      if (whereClauseAdded) {
        query += ' AND v.phone = $' + (params.length + 1);
      } else {
        query += ' WHERE v.phone = $1';
        whereClauseAdded = true;
      }
      params.push(phone);
    }
    
    if (email) {
      if (whereClauseAdded) {
        query += ' AND v.email = $' + (params.length + 1);
      } else {
        query += ' WHERE v.email = $1';
      }
      params.push(email);
    }
    
    query += ' ORDER BY v.check_in_time DESC';
    
    const result = await db.query(query, params);
    
    // Transform database field names to match our API format
    const visitors = result.rows.map(visitor => ({
      id: visitor.id.toString(),
      firstName: visitor.first_name,
      lastName: visitor.last_name,
      email: visitor.email,
      phone: visitor.phone,
      address: visitor.address,
      dateOfBirth: visitor.date_of_birth ? new Date(visitor.date_of_birth).toISOString().split('T')[0] : null,
      eventId: visitor.event_id.toString(),
      eventName: visitor.event_name,
      checkInTime: visitor.check_in_time,
      status: visitor.status,
      sendUpdates: visitor.send_updates
    }));
    
    res.json(visitors);
  } catch (error) {
    console.error('Error fetching visitors:', error);
    
    // Fallback to in-memory data
    let filteredVisitors = [...inMemory.visitors];
    
    if (eventId) {
      filteredVisitors = filteredVisitors.filter(v => v.eventId === eventId);
    }
    
    if (phone) {
      filteredVisitors = filteredVisitors.filter(v => v.phone === phone);
    }
    
    if (email) {
      filteredVisitors = filteredVisitors.filter(v => v.email === email);
    }
    
    // Add event name
    const visitorsWithEventName = filteredVisitors.map(visitor => {
      const event = inMemory.events.find(e => e.id === visitor.eventId);
      return {
        ...visitor,
        eventName: event ? event.title : 'Unknown Event'
      };
    });
    
    res.json(visitorsWithEventName);
  }
});

app.post('/api/visitors', async (req, res) => {
  const { firstName, lastName, email, phone, address, eventId, sendUpdates, dateOfBirth } = req.body;
  
  try {
    // Validate event exists in the database
    const eventResult = await db.query('SELECT * FROM events WHERE id = $1', [eventId]);
    
    if (eventResult.rows.length === 0) {
      // Check in-memory if not found in database
      const event = inMemory.events.find(e => e.id === eventId);
      if (!event) {
        return res.status(400).json({ message: 'Event not found' });
      }
    }
    
    // Get the event for email notifications
    const event = eventResult.rows.length > 0 
      ? {
          id: eventResult.rows[0].id.toString(),
          title: eventResult.rows[0].title,
          description: eventResult.rows[0].description,
          organizationId: eventResult.rows[0].organization_id.toString(),
          status: eventResult.rows[0].status,
          location: eventResult.rows[0].location
        }
      : inMemory.events.find(e => e.id === eventId);
    
    // Check if phone number exists in directory
    let isExistingVisitor = false;
    let directoryVisitor = null;
    
    if (phone) {
      const directoryResult = await db.query('SELECT * FROM visitor_directory WHERE phone = $1', [phone]);
      isExistingVisitor = directoryResult.rows.length > 0;
      
      if (isExistingVisitor) {
        directoryVisitor = directoryResult.rows[0];
        
        // Update directory with any new information
        if (address && address !== directoryVisitor.address) {
          await db.query(
            'UPDATE visitor_directory SET address = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [address, directoryVisitor.id]
          );
        }
      } else {
        // Add to directory if not already present and has a phone number
        await db.query(
          `INSERT INTO visitor_directory 
           (first_name, last_name, email, phone, address, date_of_birth, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [firstName, lastName, email, phone, address || '', dateOfBirth || null]
        );
        
        console.log('Added new visitor to directory:', `${firstName} ${lastName}`);
      }
    }
    
    // Insert new visitor into the database
    const result = await db.query(
      `INSERT INTO visitors 
       (first_name, last_name, email, phone, address, date_of_birth, event_id, send_updates) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [firstName, lastName, email, phone || '', address || '', dateOfBirth || null, eventId, !!sendUpdates]
    );
    
    const newVisitor = result.rows[0];
    
    // Transform database field names to match our API format
    const formattedVisitor = {
      id: newVisitor.id.toString(),
      firstName: newVisitor.first_name,
      lastName: newVisitor.last_name,
      email: newVisitor.email,
      phone: newVisitor.phone,
      address: newVisitor.address,
      dateOfBirth: newVisitor.date_of_birth ? new Date(newVisitor.date_of_birth).toISOString().split('T')[0] : null,
      eventId: newVisitor.event_id.toString(),
      checkInTime: newVisitor.check_in_time,
      status: newVisitor.status,
      sendUpdates: newVisitor.send_updates,
      isExistingVisitor: isExistingVisitor
    };
    
    // Log for debugging
    console.log('New visitor checked in:', `${firstName} ${lastName}`);
    
    // Try to get the organization/host info
    let hostUser;
    try {
      const userResult = await db.query('SELECT * FROM users WHERE id = $1', [event.organizationId]);
      if (userResult.rows.length > 0) {
        hostUser = {
          id: userResult.rows[0].id.toString(),
          username: userResult.rows[0].username,
          email: userResult.rows[0].email || `${userResult.rows[0].username}@example.com`, // Fallback email
          organizationName: userResult.rows[0].organization_name
        };
      }
    } catch (err) {
      console.error('Error fetching host user:', err);
      // Fallback to a default admin user
      hostUser = {
        id: '1',
        username: 'admin',
        email: process.env.ADMIN_EMAIL || 'admin@example.com',
        organizationName: 'Default Organization'
      };
    }
    
    // Send email notifications
    try {
      // Send welcome email to visitor if they opted in
      if (sendUpdates) {
        emailService.sendVisitorWelcomeEmail(formattedVisitor, event)
          .catch(err => console.error('Failed to send welcome email:', err));
      }
      
      // Send notification to host/admin
      if (hostUser) {
        emailService.sendVisitorNotification(hostUser, formattedVisitor, event)
          .catch(err => console.error('Failed to send host notification email:', err));
      }
    } catch (err) {
      console.error('Error sending email notifications:', err);
      // Continue anyway, email notifications are not critical
    }
    
    res.status(201).json(formattedVisitor);
  } catch (error) {
    console.error('Error registering visitor:', error);
    
    // Fallback to in-memory if database error
    // Validate event exists in memory
    const event = inMemory.events.find(e => e.id === eventId);
    if (!event) {
      return res.status(400).json({ message: 'Event not found' });
    }
    
    // Check if phone number exists in in-memory directory
    let isExistingVisitor = false;
    
    if (phone) {
      isExistingVisitor = inMemory.visitorDirectory.some(v => v.phone === phone);
      
      if (!isExistingVisitor) {
        // Add to in-memory directory
        const newDirectoryEntry = {
          id: (inMemory.visitorDirectory.length + 1).toString(),
          firstName,
          lastName,
          phone,
          address: address || '',
          dateOfBirth: dateOfBirth || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        inMemory.visitorDirectory.push(newDirectoryEntry);
        console.log('Added new visitor to in-memory directory:', `${firstName} ${lastName}`);
      }
    }
    
    // Create new visitor in memory
    const newVisitor = {
      id: (inMemory.visitors.length + 1).toString(),
      firstName,
      lastName,
      email,
      phone: phone || '',
      address: address || '',
      dateOfBirth: dateOfBirth || null,
      eventId,
      checkInTime: new Date().toISOString(),
      status: 'checked-in',
      sendUpdates: !!sendUpdates,
      isExistingVisitor
    };
    
    // Add to in-memory visitors array
    inMemory.visitors.push(newVisitor);
    
    // Log for debugging
    console.log('New visitor checked in (in-memory):', `${firstName} ${lastName}`);
    
    // Try to send email notifications
    try {
      // Default admin user
      const hostUser = {
        id: '1',
        username: 'admin',
        email: process.env.ADMIN_EMAIL || 'admin@example.com',
        organizationName: 'Default Organization'
      };
      
      // Send welcome email to visitor if they opted in
      if (sendUpdates) {
        emailService.sendVisitorWelcomeEmail(newVisitor, event)
          .catch(err => console.error('Failed to send welcome email:', err));
      }
      
      // Send notification to host/admin
      emailService.sendVisitorNotification(hostUser, newVisitor, event)
        .catch(err => console.error('Failed to send host notification email:', err));
    } catch (err) {
      console.error('Error sending email notifications:', err);
      // Continue anyway, email notifications are not critical
    }
    
    res.status(201).json(newVisitor);
  }
});

// VISITOR DIRECTORY ENDPOINTS
app.get('/api/directory', async (req, res) => {
  try {
    let result;
    
    // Check if querying by phone number
    if (req.query.phone) {
      // Search by phone number
      result = await db.query(
        'SELECT vd.*, COUNT(v.id) as visit_count, MAX(v.check_in_time) as last_visit ' +
        'FROM visitor_directory vd ' +
        'LEFT JOIN visitors v ON vd.phone = v.phone ' +
        'WHERE vd.phone LIKE $1 ' +
        'GROUP BY vd.id ' +
        'ORDER BY vd.last_name, vd.first_name', 
        [`%${req.query.phone}%`]
      );
      console.log(`Searching directory by phone: ${req.query.phone}`);
    } else {
      // Get all directory entries with visit counts
      result = await db.query(
        'SELECT vd.*, COUNT(v.id) as visit_count, MAX(v.check_in_time) as last_visit ' +
        'FROM visitor_directory vd ' +
        'LEFT JOIN visitors v ON vd.phone = v.phone ' +
        'GROUP BY vd.id ' +
        'ORDER BY vd.last_name, vd.first_name'
      );
    }
    
    // Transform database field names to match our API format
    const directoryEntries = result.rows.map(entry => ({
      id: entry.id.toString(),
      firstName: entry.first_name,
      lastName: entry.last_name,
      email: entry.email,
      phone: entry.phone,
      address: entry.address,
      dateOfBirth: entry.date_of_birth ? new Date(entry.date_of_birth).toISOString().split('T')[0] : null,
      visitCount: parseInt(entry.visit_count) || 0,
      lastVisit: entry.last_visit ? new Date(entry.last_visit).toISOString() : null,
      createdAt: entry.created_at,
      updatedAt: entry.updated_at
    }));
    
    res.json(directoryEntries);
  } catch (error) {
    console.error('Error fetching visitor directory:', error);
    
    // Fallback to in-memory data
    if (req.query.phone) {
      // Filter in-memory data by phone if querying
      const filtered = inMemory.visitorDirectory.filter(entry => 
        entry.phone && entry.phone.includes(req.query.phone)
      );
      res.json(filtered);
    } else {
      res.json(inMemory.visitorDirectory);
    }
  }
});

app.get('/api/directory/:id', async (req, res) => {
  const directoryId = req.params.id;
  
  try {
    // Get the directory entry from the database
    const result = await db.query('SELECT * FROM visitor_directory WHERE id = $1', [directoryId]);
    
    if (result.rows.length > 0) {
      const entry = result.rows[0];
      
      // Transform database field names to match our API format
      const formattedEntry = {
        id: entry.id.toString(),
        firstName: entry.first_name,
        lastName: entry.last_name,
        phone: entry.phone,
        email: entry.email,
        address: entry.address,
        dateOfBirth: entry.date_of_birth ? new Date(entry.date_of_birth).toISOString().split('T')[0] : null,
        createdAt: entry.created_at,
        updatedAt: entry.updated_at
      };
      
      res.json(formattedEntry);
    } else {
      // Try in-memory data if entry not found in database
      const entry = inMemory.visitorDirectory.find(e => e.id === directoryId);
      
      if (entry) {
        res.json(entry);
      } else {
        res.status(404).json({ message: 'Directory entry not found' });
      }
    }
  } catch (error) {
    console.error('Error fetching directory entry:', error);
    
    // Fallback to in-memory data
    const entry = inMemory.visitorDirectory.find(e => e.id === directoryId);
    
    if (entry) {
      res.json(entry);
    } else {
      res.status(404).json({ message: 'Directory entry not found' });
    }
  }
});

app.post('/api/directory', async (req, res) => {
  const { firstName, lastName, phone, address, dateOfBirth, email } = req.body;
  
  // Validate required fields
  if (!firstName || !lastName || !phone) {
    return res.status(400).json({ message: 'First name, last name, and phone number are required' });
  }
  
  try {
    // Check if phone number already exists
    const existingEntry = await db.query('SELECT * FROM visitor_directory WHERE phone = $1', [phone]);
    
    if (existingEntry.rows.length > 0) {
      return res.status(400).json({ 
        message: 'A visitor with this phone number already exists in the directory',
        existingEntry: {
          id: existingEntry.rows[0].id.toString(),
          firstName: existingEntry.rows[0].first_name,
          lastName: existingEntry.rows[0].last_name
        }
      });
    }
    
    // Insert new entry into the database
    const result = await db.query(
      `INSERT INTO visitor_directory 
       (first_name, last_name, phone, email, address, date_of_birth, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
       RETURNING *`,
      [firstName, lastName, phone, email || null, address || '', dateOfBirth || null]
    );
    
    const newEntry = result.rows[0];
    
    // Transform database field names to match our API format
    const formattedEntry = {
      id: newEntry.id.toString(),
      firstName: newEntry.first_name,
      lastName: newEntry.last_name,
      phone: newEntry.phone,
      email: newEntry.email,
      address: newEntry.address,
      dateOfBirth: newEntry.date_of_birth ? new Date(newEntry.date_of_birth).toISOString().split('T')[0] : null,
      createdAt: newEntry.created_at,
      updatedAt: newEntry.updated_at
    };
    
    // Log for debugging
    console.log('Added new entry to visitor directory:', `${firstName} ${lastName}`);
    
    res.status(201).json(formattedEntry);
  } catch (error) {
    console.error('Error adding directory entry:', error);
    
    // Fallback to in-memory if database error
    try {
      // Check if phone number already exists in memory
      if (inMemory.visitorDirectory.some(entry => entry.phone === phone)) {
        return res.status(400).json({ message: 'A visitor with this phone number already exists in the directory' });
      }
      
      // Create new entry in memory
      const newEntry = {
        id: (inMemory.visitorDirectory.length + 1).toString(),
        firstName,
        lastName,
        phone,
        email: email || null,
        address: address || '',
        dateOfBirth: dateOfBirth || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Add to in-memory directory array
      inMemory.visitorDirectory.push(newEntry);
      
      // Log for debugging
      console.log('Added new entry to in-memory visitor directory:', `${firstName} ${lastName}`);
      
      res.status(201).json(newEntry);
    } catch (err) {
      console.error('Error adding to in-memory directory:', err);
      res.status(500).json({ message: 'Failed to add visitor to directory' });
    }
  }
});

app.put('/api/directory/:id', async (req, res) => {
  const directoryId = req.params.id;
  const { firstName, lastName, phone, address, dateOfBirth, email } = req.body;
  
  // Validate required fields
  if (!firstName || !lastName || !phone) {
    return res.status(400).json({ message: 'First name, last name, and phone number are required' });
  }
  
  try {
    // Check if the entry exists
    const entryCheck = await db.query('SELECT * FROM visitor_directory WHERE id = $1', [directoryId]);
    
    if (entryCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Directory entry not found' });
    }
    
    // Check if phone number is already used by another entry
    const phoneCheck = await db.query('SELECT * FROM visitor_directory WHERE phone = $1 AND id != $2', [phone, directoryId]);
    
    if (phoneCheck.rows.length > 0) {
      return res.status(400).json({ 
        message: 'Phone number is already used by another visitor in the directory',
        existingEntry: {
          id: phoneCheck.rows[0].id.toString(),
          firstName: phoneCheck.rows[0].first_name,
          lastName: phoneCheck.rows[0].last_name
        }
      });
    }
    
    // Update the entry in the database
    const result = await db.query(
      `UPDATE visitor_directory 
       SET first_name = $1, last_name = $2, phone = $3, email = $4, address = $5, date_of_birth = $6, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $7 
       RETURNING *`,
      [firstName, lastName, phone, email || null, address || '', dateOfBirth || null, directoryId]
    );
    
    const updatedEntry = result.rows[0];
    
    // Transform database field names to match our API format
    const formattedEntry = {
      id: updatedEntry.id.toString(),
      firstName: updatedEntry.first_name,
      lastName: updatedEntry.last_name,
      phone: updatedEntry.phone,
      email: updatedEntry.email,
      address: updatedEntry.address,
      dateOfBirth: updatedEntry.date_of_birth ? new Date(updatedEntry.date_of_birth).toISOString().split('T')[0] : null,
      createdAt: updatedEntry.created_at,
      updatedAt: updatedEntry.updated_at
    };
    
    // Log for debugging
    console.log('Updated visitor directory entry:', `${firstName} ${lastName}`);
    
    res.json(formattedEntry);
  } catch (error) {
    console.error('Error updating directory entry:', error);
    
    // Fallback to in-memory if database error
    try {
      // Check if the entry exists in memory
      const entryIndex = inMemory.visitorDirectory.findIndex(entry => entry.id === directoryId);
      
      if (entryIndex === -1) {
        return res.status(404).json({ message: 'Directory entry not found' });
      }
      
      // Check if phone number is already used by another entry
      const phoneConflict = inMemory.visitorDirectory.find(entry => entry.phone === phone && entry.id !== directoryId);
      
      if (phoneConflict) {
        return res.status(400).json({ message: 'Phone number is already used by another visitor in the directory' });
      }
      
      // Update the entry in memory
      const updatedEntry = {
        ...inMemory.visitorDirectory[entryIndex],
        firstName,
        lastName,
        phone,
        email: email || null,
        address: address || '',
        dateOfBirth: dateOfBirth || null,
        updatedAt: new Date().toISOString()
      };
      
      inMemory.visitorDirectory[entryIndex] = updatedEntry;
      
      // Log for debugging
      console.log('Updated in-memory visitor directory entry:', `${firstName} ${lastName}`);
      
      res.json(updatedEntry);
    } catch (err) {
      console.error('Error updating in-memory directory:', err);
      res.status(500).json({ message: 'Failed to update visitor directory entry' });
    }
  }
});

app.delete('/api/directory/:id', async (req, res) => {
  const directoryId = req.params.id;
  
  try {
    // Check if the entry exists
    const entryCheck = await db.query('SELECT * FROM visitor_directory WHERE id = $1', [directoryId]);
    
    if (entryCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Directory entry not found' });
    }
    
    // Delete the entry from the database
    await db.query('DELETE FROM visitor_directory WHERE id = $1', [directoryId]);
    
    // Log for debugging
    console.log('Deleted visitor directory entry with ID:', directoryId);
    
    res.json({ message: 'Directory entry deleted successfully', id: directoryId });
  } catch (error) {
    console.error('Error deleting directory entry:', error);
    
    // Fallback to in-memory if database error
    try {
      // Check if the entry exists in memory
      const entryIndex = inMemory.visitorDirectory.findIndex(entry => entry.id === directoryId);
      
      if (entryIndex === -1) {
        return res.status(404).json({ message: 'Directory entry not found' });
      }
      
      // Remove the entry from memory
      inMemory.visitorDirectory.splice(entryIndex, 1);
      
      // Log for debugging
      console.log('Deleted in-memory visitor directory entry with ID:', directoryId);
      
      res.json({ message: 'Directory entry deleted successfully', id: directoryId });
    } catch (err) {
      console.error('Error deleting in-memory directory entry:', err);
      res.status(500).json({ message: 'Failed to delete visitor directory entry' });
    }
  }
});

// Get all users (for development purposes)
app.get('/api/users', async (req, res) => {
  try {
    // Get all users from the database
    const result = await db.query('SELECT id, username, organization_name, created_at FROM users');
    
    // Transform database field names to match our API format
    const users = result.rows.map(user => ({
      id: user.id.toString(),
      username: user.username,
      organizationName: user.organization_name,
      createdAt: user.created_at
    }));
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    
    // Fallback to in-memory data
    const usersWithoutPasswords = inMemory.users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    
    res.json(usersWithoutPasswords);
  }
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

// Send analytics.html for /analytics path
app.get('/analytics', (req, res) => {
  const analyticsPath = path.join(__dirname, 'next.js-frontend/public/analytics.html');
  if (fs.existsSync(analyticsPath)) {
    res.sendFile(analyticsPath);
  } else {
    res.redirect('/dashboard');
  }
});

// Send directory.html for /directory path
app.get('/directory', (req, res) => {
  const directoryPath = path.join(__dirname, 'next.js-frontend/public/directory.html');
  if (fs.existsSync(directoryPath)) {
    res.sendFile(directoryPath);
  } else {
    res.redirect('/dashboard');
  }
});

// Register the scheduled events API routes
app.use('/api/scheduled-events', scheduledEventsApi);

// Add a redirect from /schedule to the scheduling page
app.get('/schedule', (req, res) => {
  const schedulePath = path.join(__dirname, 'next.js-frontend/public/schedule.html');
  if (fs.existsSync(schedulePath)) {
    res.sendFile(schedulePath);
  } else {
    res.redirect('/dashboard');
  }
});

// MEMBERS MANAGEMENT ENDPOINTS
app.get('/api/members', async (req, res) => {
  try {
    // Get all members from the database
    const result = await db.query('SELECT * FROM members ORDER BY updated_at DESC');
    
    // Transform database field names to match our API format
    const members = result.rows.map(member => ({
      id: member.id.toString(),
      firstName: member.first_name,
      lastName: member.last_name,
      dateOfBirth: member.date_of_birth,
      address: member.address,
      phone: member.phone,
      tags: member.tags || [],
      pictureUrl: member.picture_url,
      createdAt: member.created_at,
      updatedAt: member.updated_at,
      createdBy: member.created_by ? member.created_by.toString() : null
    }));
    
    res.json(members);
  } catch (error) {
    console.error('Error fetching members:', error);
    // Fallback to in-memory data
    res.json(inMemory.members);
  }
});

app.get('/api/members/:id', async (req, res) => {
  const memberId = req.params.id;
  
  try {
    // Get the member from the database
    const result = await db.query('SELECT * FROM members WHERE id = $1', [memberId]);
    
    if (result.rows.length > 0) {
      const member = result.rows[0];
      
      // Transform database field names to match our API format
      const formattedMember = {
        id: member.id.toString(),
        firstName: member.first_name,
        lastName: member.last_name,
        dateOfBirth: member.date_of_birth,
        address: member.address,
        phone: member.phone,
        tags: member.tags || [],
        pictureUrl: member.picture_url,
        createdAt: member.created_at,
        updatedAt: member.updated_at,
        createdBy: member.created_by ? member.created_by.toString() : null
      };
      
      res.json(formattedMember);
    } else {
      // Try in-memory data if member not found in database
      const member = inMemory.members.find(m => m.id === memberId);
      
      if (member) {
        res.json(member);
      } else {
        res.status(404).json({ message: 'Member not found' });
      }
    }
  } catch (error) {
    console.error('Error fetching member:', error);
    // Fallback to in-memory data
    const member = inMemory.members.find(m => m.id === memberId);
    
    if (member) {
      res.json(member);
    } else {
      res.status(404).json({ message: 'Member not found' });
    }
  }
});

app.post('/api/members', async (req, res) => {
  const { firstName, lastName, dateOfBirth, address, phone, tags, pictureUrl } = req.body;
  const userId = req.body.userId || '1'; // For simplicity, default to user 1
  
  try {
    // Check for existing phone number
    const phoneCheck = await db.query('SELECT * FROM members WHERE phone = $1', [phone]);
    if (phoneCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Phone number already exists' });
    }
    
    // Insert new member into the database
    const result = await db.query(
      `INSERT INTO members 
       (first_name, last_name, date_of_birth, address, phone, tags, picture_url, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [firstName, lastName, dateOfBirth, address, phone, tags, pictureUrl, userId]
    );
    
    const newMember = result.rows[0];
    
    // Transform database field names to match our API format
    const formattedMember = {
      id: newMember.id.toString(),
      firstName: newMember.first_name,
      lastName: newMember.last_name,
      dateOfBirth: newMember.date_of_birth,
      address: newMember.address,
      phone: newMember.phone,
      tags: newMember.tags || [],
      pictureUrl: newMember.picture_url,
      createdAt: newMember.created_at,
      updatedAt: newMember.updated_at,
      createdBy: newMember.created_by ? newMember.created_by.toString() : null
    };
    
    res.status(201).json(formattedMember);
  } catch (error) {
    console.error('Error creating member:', error);
    
    // Fallback to in-memory if database error
    // Check for existing phone number
    if (inMemory.members.find(m => m.phone === phone)) {
      return res.status(400).json({ message: 'Phone number already exists' });
    }
    
    // Create new member in memory
    const newMember = {
      id: (inMemory.members.length + 1).toString(),
      firstName,
      lastName,
      dateOfBirth,
      address,
      phone,
      tags: tags || [],
      pictureUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: userId
    };
    
    // Add to in-memory members array
    inMemory.members.push(newMember);
    
    res.status(201).json(newMember);
  }
});

app.put('/api/members/:id', async (req, res) => {
  const memberId = req.params.id;
  const { firstName, lastName, dateOfBirth, address, phone, tags, pictureUrl } = req.body;
  
  try {
    // Check if member exists
    const memberCheck = await db.query('SELECT * FROM members WHERE id = $1', [memberId]);
    if (memberCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Member not found' });
    }
    
    // Check for phone number conflicts
    const phoneCheck = await db.query('SELECT * FROM members WHERE phone = $1 AND id != $2', [phone, memberId]);
    if (phoneCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Phone number already in use by another member' });
    }
    
    // Update member in the database
    const result = await db.query(
      `UPDATE members 
       SET first_name = $1, last_name = $2, date_of_birth = $3, address = $4, 
           phone = $5, tags = $6, picture_url = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [firstName, lastName, dateOfBirth, address, phone, tags, pictureUrl, memberId]
    );
    
    const updatedMember = result.rows[0];
    
    // Transform database field names to match our API format
    const formattedMember = {
      id: updatedMember.id.toString(),
      firstName: updatedMember.first_name,
      lastName: updatedMember.last_name,
      dateOfBirth: updatedMember.date_of_birth,
      address: updatedMember.address,
      phone: updatedMember.phone,
      tags: updatedMember.tags || [],
      pictureUrl: updatedMember.picture_url,
      createdAt: updatedMember.created_at,
      updatedAt: updatedMember.updated_at,
      createdBy: updatedMember.created_by ? updatedMember.created_by.toString() : null
    };
    
    res.json(formattedMember);
  } catch (error) {
    console.error('Error updating member:', error);
    
    // Fallback to in-memory if database error
    try {
      // Check if member exists
      const memberIndex = inMemory.members.findIndex(m => m.id === memberId);
      if (memberIndex === -1) {
        return res.status(404).json({ message: 'Member not found' });
      }
      
      // Check for phone number conflicts
      const phoneConflict = inMemory.members.find(m => m.phone === phone && m.id !== memberId);
      if (phoneConflict) {
        return res.status(400).json({ message: 'Phone number already in use by another member' });
      }
      
      // Update member in memory
      const updatedMember = {
        ...inMemory.members[memberIndex],
        firstName,
        lastName,
        dateOfBirth,
        address,
        phone,
        tags: tags || [],
        pictureUrl,
        updatedAt: new Date().toISOString()
      };
      
      inMemory.members[memberIndex] = updatedMember;
      
      res.json(updatedMember);
    } catch (inMemoryError) {
      console.error('Error in in-memory fallback:', inMemoryError);
      res.status(500).json({ message: 'Failed to update member' });
    }
  }
});

app.delete('/api/members/:id', async (req, res) => {
  const memberId = req.params.id;
  
  try {
    // Check if member exists
    const memberCheck = await db.query('SELECT * FROM members WHERE id = $1', [memberId]);
    if (memberCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Member not found' });
    }
    
    // Delete member from the database
    await db.query('DELETE FROM members WHERE id = $1', [memberId]);
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting member:', error);
    
    // Fallback to in-memory if database error
    try {
      // Check if member exists
      const memberIndex = inMemory.members.findIndex(m => m.id === memberId);
      if (memberIndex === -1) {
        return res.status(404).json({ message: 'Member not found' });
      }
      
      // Delete member from memory
      inMemory.members.splice(memberIndex, 1);
      
      res.status(204).send();
    } catch (inMemoryError) {
      console.error('Error in in-memory fallback:', inMemoryError);
      res.status(500).json({ message: 'Failed to delete member' });
    }
  }
});

// Team Management API Endpoints
// Get all teams
app.get('/api/teams', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT t.*, 
             m.first_name || ' ' || m.last_name AS director_name, 
             m.picture_url AS director_picture,
             (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) AS member_count
      FROM teams t
      LEFT JOIN members m ON t.director_id = m.id
      ORDER BY t.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching teams:', error);
    
    // Fallback to in-memory
    if (!inMemory.teams) {
      inMemory.teams = [];
    }
    res.json(inMemory.teams);
  }
});

// Get team by ID with members
app.get('/api/teams/:id', async (req, res) => {
  const teamId = req.params.id;
  
  try {
    // Get team details
    const teamResult = await db.query(`
      SELECT t.*, 
             m.first_name || ' ' || m.last_name AS director_name, 
             m.picture_url AS director_picture
      FROM teams t
      LEFT JOIN members m ON t.director_id = m.id
      WHERE t.id = $1
    `, [teamId]);
    
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    const team = teamResult.rows[0];
    
    // Get team members
    const membersResult = await db.query(`
      SELECT m.*, tm.joined_at
      FROM team_members tm
      JOIN members m ON tm.member_id = m.id
      WHERE tm.team_id = $1
      ORDER BY tm.joined_at ASC
    `, [teamId]);
    
    team.members = membersResult.rows;
    
    res.json(team);
  } catch (error) {
    console.error('Error fetching team:', error);
    
    // Fallback to in-memory
    if (!inMemory.teams) {
      inMemory.teams = [];
    }
    
    const team = inMemory.teams.find(t => t.id === teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    res.json(team);
  }
});

// Create a new team
app.post('/api/teams', async (req, res) => {
  const { name, description, pictureUrl, directorId, memberIds } = req.body;
  const userId = req.body.userId || 1; // Default to admin if no user ID provided
  
  if (!name) {
    return res.status(400).json({ message: 'Team name is required' });
  }
  
  try {
    // Start a transaction
    await db.query('BEGIN');
    
    // Create the team
    const teamResult = await db.query(`
      INSERT INTO teams (name, description, picture_url, director_id, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name, description, pictureUrl, directorId, userId]);
    
    const team = teamResult.rows[0];
    
    // Add members if provided
    if (memberIds && memberIds.length > 0) {
      for (const memberId of memberIds) {
        await db.query(`
          INSERT INTO team_members (team_id, member_id)
          VALUES ($1, $2)
          ON CONFLICT (team_id, member_id) DO NOTHING
        `, [team.id, memberId]);
      }
    }
    
    // Commit the transaction
    await db.query('COMMIT');
    
    // Get the newly created team with members
    const completeTeamResult = await db.query(`
      SELECT t.*, 
             m.first_name || ' ' || m.last_name AS director_name, 
             m.picture_url AS director_picture
      FROM teams t
      LEFT JOIN members m ON t.director_id = m.id
      WHERE t.id = $1
    `, [team.id]);
    
    // Get team members
    const membersResult = await db.query(`
      SELECT m.*, tm.joined_at
      FROM team_members tm
      JOIN members m ON tm.member_id = m.id
      WHERE tm.team_id = $1
      ORDER BY tm.joined_at ASC
    `, [team.id]);
    
    const completeTeam = completeTeamResult.rows[0];
    completeTeam.members = membersResult.rows;
    
    res.status(201).json(completeTeam);
  } catch (error) {
    // Rollback the transaction in case of error
    await db.query('ROLLBACK');
    
    console.error('Error creating team:', error);
    
    // Fallback to in-memory
    try {
      if (!inMemory.teams) {
        inMemory.teams = [];
      }
      
      const newTeam = {
        id: String(Date.now()),
        name,
        description,
        pictureUrl,
        directorId,
        members: [],
        createdBy: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      if (memberIds && memberIds.length > 0) {
        for (const memberId of memberIds) {
          const member = inMemory.members.find(m => m.id === memberId);
          if (member) {
            newTeam.members.push({
              ...member,
              joinedAt: new Date().toISOString()
            });
          }
        }
      }
      
      inMemory.teams.push(newTeam);
      
      res.status(201).json(newTeam);
    } catch (inMemoryError) {
      console.error('Error in in-memory fallback:', inMemoryError);
      res.status(500).json({ message: 'Failed to create team' });
    }
  }
});

// Update a team
app.put('/api/teams/:id', async (req, res) => {
  const teamId = req.params.id;
  const { name, description, pictureUrl, directorId } = req.body;
  
  if (!name) {
    return res.status(400).json({ message: 'Team name is required' });
  }
  
  try {
    // Check if team exists
    const teamCheck = await db.query('SELECT * FROM teams WHERE id = $1', [teamId]);
    if (teamCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    // Update team
    const result = await db.query(`
      UPDATE teams 
      SET name = $1, 
          description = $2, 
          picture_url = $3, 
          director_id = $4,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [name, description, pictureUrl, directorId, teamId]);
    
    // Get updated team with director name
    const updatedTeamResult = await db.query(`
      SELECT t.*, 
             m.first_name || ' ' || m.last_name AS director_name, 
             m.picture_url AS director_picture
      FROM teams t
      LEFT JOIN members m ON t.director_id = m.id
      WHERE t.id = $1
    `, [teamId]);
    
    res.json(updatedTeamResult.rows[0]);
  } catch (error) {
    console.error('Error updating team:', error);
    
    // Fallback to in-memory
    try {
      if (!inMemory.teams) {
        inMemory.teams = [];
      }
      
      const teamIndex = inMemory.teams.findIndex(t => t.id === teamId);
      if (teamIndex === -1) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      const updatedTeam = {
        ...inMemory.teams[teamIndex],
        name,
        description,
        pictureUrl,
        directorId,
        updatedAt: new Date().toISOString()
      };
      
      inMemory.teams[teamIndex] = updatedTeam;
      
      res.json(updatedTeam);
    } catch (inMemoryError) {
      console.error('Error in in-memory fallback:', inMemoryError);
      res.status(500).json({ message: 'Failed to update team' });
    }
  }
});

// Add members to a team
app.post('/api/teams/:id/members', async (req, res) => {
  const teamId = req.params.id;
  const { memberIds } = req.body;
  
  if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
    return res.status(400).json({ message: 'Member IDs are required' });
  }
  
  try {
    // Check if team exists
    const teamCheck = await db.query('SELECT * FROM teams WHERE id = $1', [teamId]);
    if (teamCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    // Start a transaction
    await db.query('BEGIN');
    
    // Add members
    for (const memberId of memberIds) {
      await db.query(`
        INSERT INTO team_members (team_id, member_id)
        VALUES ($1, $2)
        ON CONFLICT (team_id, member_id) DO NOTHING
      `, [teamId, memberId]);
    }
    
    // Commit the transaction
    await db.query('COMMIT');
    
    // Get updated team members
    const membersResult = await db.query(`
      SELECT m.*, tm.joined_at
      FROM team_members tm
      JOIN members m ON tm.member_id = m.id
      WHERE tm.team_id = $1
      ORDER BY tm.joined_at ASC
    `, [teamId]);
    
    res.json(membersResult.rows);
  } catch (error) {
    // Rollback the transaction in case of error
    await db.query('ROLLBACK');
    
    console.error('Error adding team members:', error);
    
    // Fallback to in-memory
    try {
      if (!inMemory.teams) {
        inMemory.teams = [];
      }
      
      const team = inMemory.teams.find(t => t.id === teamId);
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      if (!team.members) {
        team.members = [];
      }
      
      for (const memberId of memberIds) {
        const member = inMemory.members.find(m => m.id === memberId);
        if (member && !team.members.some(m => m.id === memberId)) {
          team.members.push({
            ...member,
            joinedAt: new Date().toISOString()
          });
        }
      }
      
      res.json(team.members);
    } catch (inMemoryError) {
      console.error('Error in in-memory fallback:', inMemoryError);
      res.status(500).json({ message: 'Failed to add team members' });
    }
  }
});

// Remove a member from a team
app.delete('/api/teams/:teamId/members/:memberId', async (req, res) => {
  const { teamId, memberId } = req.params;
  
  try {
    // Check if team exists
    const teamCheck = await db.query('SELECT * FROM teams WHERE id = $1', [teamId]);
    if (teamCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    // Remove member
    await db.query('DELETE FROM team_members WHERE team_id = $1 AND member_id = $2', [teamId, memberId]);
    
    res.status(204).send();
  } catch (error) {
    console.error('Error removing team member:', error);
    
    // Fallback to in-memory
    try {
      if (!inMemory.teams) {
        inMemory.teams = [];
      }
      
      const team = inMemory.teams.find(t => t.id === teamId);
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      if (team.members) {
        team.members = team.members.filter(m => m.id !== memberId);
      }
      
      res.status(204).send();
    } catch (inMemoryError) {
      console.error('Error in in-memory fallback:', inMemoryError);
      res.status(500).json({ message: 'Failed to remove team member' });
    }
  }
});

// Delete a team
app.delete('/api/teams/:id', async (req, res) => {
  const teamId = req.params.id;
  
  try {
    // Check if team exists
    const teamCheck = await db.query('SELECT * FROM teams WHERE id = $1', [teamId]);
    if (teamCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    // Delete team (cascade will delete team members)
    await db.query('DELETE FROM teams WHERE id = $1', [teamId]);
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting team:', error);
    
    // Fallback to in-memory
    try {
      if (!inMemory.teams) {
        inMemory.teams = [];
      }
      
      const teamIndex = inMemory.teams.findIndex(t => t.id === teamId);
      if (teamIndex === -1) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      inMemory.teams.splice(teamIndex, 1);
      
      res.status(204).send();
    } catch (inMemoryError) {
      console.error('Error in in-memory fallback:', inMemoryError);
      res.status(500).json({ message: 'Failed to delete team' });
    }
  }
});

// Add a redirect from /teams to the teams page
app.get('/teams', (req, res) => {
  const teamsPath = path.join(__dirname, 'next.js-frontend/public/teams.html');
  if (fs.existsSync(teamsPath)) {
    res.sendFile(teamsPath);
  } else {
    res.redirect('/dashboard');
  }
});

// Add a redirect from /members to the members page
app.get('/members', (req, res) => {
  const membersPath = path.join(__dirname, 'next.js-frontend/public/members.html');
  if (fs.existsSync(membersPath)) {
    res.sendFile(membersPath);
  } else {
    res.redirect('/dashboard');
  }
});

// Add a route handler for team-schedules page
app.get('/team-schedules', (req, res) => {
  const teamSchedulesPath = path.join(__dirname, 'next.js-frontend/public/team-schedules.html');
  if (fs.existsSync(teamSchedulesPath)) {
    res.sendFile(teamSchedulesPath);
  } else {
    res.redirect('/dashboard');
  }
});

// Team Schedules API endpoints
const { RECURRENCE_TYPES } = require('./schema');

// Get all team schedules for a specific team
app.get('/api/teams/:id/schedules', async (req, res) => {
  const teamId = req.params.id;
  
  try {
    // Validate if team exists
    const teamResult = await db.query('SELECT * FROM teams WHERE id = $1', [teamId]);
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    // Get all schedules for the team
    const schedulesResult = await db.query(`
      SELECT 
        ts.*, 
        t.name as team_name,
        (SELECT COUNT(*) FROM team_schedule_members WHERE schedule_id = ts.id) as member_count
      FROM team_schedules ts
      JOIN teams t ON ts.team_id = t.id
      WHERE ts.team_id = $1
      ORDER BY ts.start_date DESC, ts.created_at DESC
    `, [teamId]);
    
    res.json(schedulesResult.rows);
  } catch (error) {
    console.error('Error fetching team schedules:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a specific team schedule by ID
app.get('/api/team-schedules/:id', async (req, res) => {
  const scheduleId = req.params.id;
  
  try {
    // Get the schedule
    const scheduleResult = await db.query(`
      SELECT ts.*, t.name as team_name
      FROM team_schedules ts
      JOIN teams t ON ts.team_id = t.id
      WHERE ts.id = $1
    `, [scheduleId]);
    
    if (scheduleResult.rows.length === 0) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    
    const schedule = scheduleResult.rows[0];
    
    // Parse recurrence_dates JSON if it exists
    if (schedule.recurrence_dates) {
      try {
        if (typeof schedule.recurrence_dates === 'string') {
          schedule.recurrence_dates = JSON.parse(schedule.recurrence_dates);
        }
      } catch (error) {
        console.error('Error parsing recurrence_dates JSON:', error);
        schedule.recurrence_dates = [];
      }
    }
    
    // Get members in this schedule
    const membersResult = await db.query(`
      SELECT 
        m.id, m.first_name, m.last_name, m.picture_url,
        tsm.start_date, tsm.end_date
      FROM team_schedule_members tsm
      JOIN members m ON tsm.member_id = m.id
      WHERE tsm.schedule_id = $1
      ORDER BY m.first_name, m.last_name
    `, [scheduleId]);
    
    schedule.members = membersResult.rows.map(member => ({
      id: member.id,
      firstName: member.first_name,
      lastName: member.last_name,
      pictureUrl: member.picture_url,
      startDate: member.start_date,
      endDate: member.end_date
    }));
    
    res.json(schedule);
  } catch (error) {
    console.error('Error fetching team schedule:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new team schedule
app.post('/api/teams/:id/schedules', async (req, res) => {
  const teamId = req.params.id;
  const { title, description, startDate, endDate, recurrenceType, recurrenceEndDate, additionalDates, memberIds } = req.body;
  const userId = 1; // Default to admin user for now
  
  try {
    // Validate input
    if (!title || !startDate || !endDate || !memberIds || !Array.isArray(memberIds)) {
      return res.status(400).json({ message: 'Missing or invalid required fields' });
    }
    
    // Start a transaction
    await db.query('BEGIN');
    
    // Create the schedule with additional dates if provided
    const scheduleResult = await db.query(`
      INSERT INTO team_schedules 
        (team_id, title, description, start_date, end_date, recurrence_type, recurrence_end_date, recurrence_dates, created_by)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      teamId, 
      title, 
      description || '', 
      startDate, 
      endDate, 
      recurrenceType || RECURRENCE_TYPES.NONE,
      recurrenceEndDate || null,
      additionalDates && additionalDates.length > 0 ? JSON.stringify(additionalDates) : null,
      userId
    ]);
    
    const newSchedule = scheduleResult.rows[0];
    
    // Add members to the schedule
    for (const memberId of memberIds) {
      await db.query(`
        INSERT INTO team_schedule_members
          (schedule_id, member_id, start_date, end_date)
        VALUES
          ($1, $2, $3, $4)
      `, [newSchedule.id, memberId, startDate, endDate]);
    }
    
    // Commit the transaction
    await db.query('COMMIT');
    
    // Get the complete schedule with members
    const completeScheduleResult = await db.query(`
      SELECT ts.*, t.name as team_name
      FROM team_schedules ts
      JOIN teams t ON ts.team_id = t.id
      WHERE ts.id = $1
    `, [newSchedule.id]);
    
    const completeSchedule = completeScheduleResult.rows[0];
    
    // Get members in this schedule
    const membersResult = await db.query(`
      SELECT 
        m.id, m.first_name, m.last_name, m.picture_url,
        tsm.start_date, tsm.end_date
      FROM team_schedule_members tsm
      JOIN members m ON tsm.member_id = m.id
      WHERE tsm.schedule_id = $1
      ORDER BY m.first_name, m.last_name
    `, [newSchedule.id]);
    
    completeSchedule.members = membersResult.rows.map(member => ({
      id: member.id,
      firstName: member.first_name,
      lastName: member.last_name,
      pictureUrl: member.picture_url,
      startDate: member.start_date,
      endDate: member.end_date
    }));
    
    res.status(201).json(completeSchedule);
  } catch (error) {
    // Rollback the transaction in case of error
    await db.query('ROLLBACK');
    console.error('Error creating team schedule:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a team schedule
app.put('/api/team-schedules/:id', async (req, res) => {
  const scheduleId = req.params.id;
  const { title, description, startDate, endDate, recurrenceType, recurrenceEndDate, additionalDates } = req.body;
  
  try {
    // Validate if schedule exists
    const scheduleCheck = await db.query('SELECT * FROM team_schedules WHERE id = $1', [scheduleId]);
    if (scheduleCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    
    // Update the schedule
    const updateResult = await db.query(`
      UPDATE team_schedules 
      SET 
        title = $1, 
        description = $2, 
        start_date = $3, 
        end_date = $4, 
        recurrence_type = $5, 
        recurrence_end_date = $6,
        recurrence_dates = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [
      title, 
      description, 
      startDate, 
      endDate, 
      recurrenceType,
      recurrenceEndDate,
      additionalDates && additionalDates.length > 0 ? JSON.stringify(additionalDates) : null,
      scheduleId
    ]);
    
    const updatedSchedule = updateResult.rows[0];
    
    // Also update dates for all members in this schedule
    await db.query(`
      UPDATE team_schedule_members
      SET start_date = $1, end_date = $2
      WHERE schedule_id = $3
    `, [startDate, endDate, scheduleId]);
    
    // Get the complete updated schedule with members
    const completeScheduleResult = await db.query(`
      SELECT ts.*, t.name as team_name
      FROM team_schedules ts
      JOIN teams t ON ts.team_id = t.id
      WHERE ts.id = $1
    `, [scheduleId]);
    
    const completeSchedule = completeScheduleResult.rows[0];
    
    // Get members in this schedule
    const membersResult = await db.query(`
      SELECT 
        m.id, m.first_name, m.last_name, m.picture_url,
        tsm.start_date, tsm.end_date
      FROM team_schedule_members tsm
      JOIN members m ON tsm.member_id = m.id
      WHERE tsm.schedule_id = $1
      ORDER BY m.first_name, m.last_name
    `, [scheduleId]);
    
    completeSchedule.members = membersResult.rows.map(member => ({
      id: member.id,
      firstName: member.first_name,
      lastName: member.last_name,
      pictureUrl: member.picture_url,
      startDate: member.start_date,
      endDate: member.end_date
    }));
    
    res.json(completeSchedule);
  } catch (error) {
    console.error('Error updating team schedule:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a team schedule
app.delete('/api/team-schedules/:id', async (req, res) => {
  const scheduleId = req.params.id;
  
  try {
    // Delete the schedule (cascade will handle deleting team_schedule_members entries)
    const deleteResult = await db.query('DELETE FROM team_schedules WHERE id = $1 RETURNING id', [scheduleId]);
    
    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    
    res.json({ message: 'Schedule deleted successfully', id: deleteResult.rows[0].id });
  } catch (error) {
    console.error('Error deleting team schedule:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add members to a team schedule
app.post('/api/team-schedules/:id/members', async (req, res) => {
  const scheduleId = req.params.id;
  const { memberIds } = req.body;
  
  try {
    // Validate input
    if (!memberIds || !Array.isArray(memberIds)) {
      return res.status(400).json({ message: 'Member IDs are required and must be an array' });
    }
    
    // Get the schedule
    const scheduleResult = await db.query('SELECT * FROM team_schedules WHERE id = $1', [scheduleId]);
    if (scheduleResult.rows.length === 0) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    
    const schedule = scheduleResult.rows[0];
    
    // Start a transaction
    await db.query('BEGIN');
    
    // Add each member to the schedule
    for (const memberId of memberIds) {
      await db.query(`
        INSERT INTO team_schedule_members
          (schedule_id, member_id, start_date, end_date)
        VALUES
          ($1, $2, $3, $4)
        ON CONFLICT (schedule_id, member_id, start_date) DO NOTHING
      `, [scheduleId, memberId, schedule.start_date, schedule.end_date]);
    }
    
    // Commit the transaction
    await db.query('COMMIT');
    
    // Get the updated member list
    const membersResult = await db.query(`
      SELECT 
        m.id, m.first_name, m.last_name, m.picture_url,
        tsm.start_date, tsm.end_date
      FROM team_schedule_members tsm
      JOIN members m ON tsm.member_id = m.id
      WHERE tsm.schedule_id = $1
      ORDER BY m.first_name, m.last_name
    `, [scheduleId]);
    
    const members = membersResult.rows.map(member => ({
      id: member.id,
      firstName: member.first_name,
      lastName: member.last_name,
      pictureUrl: member.picture_url,
      startDate: member.start_date,
      endDate: member.end_date
    }));
    
    res.json(members);
  } catch (error) {
    // Rollback the transaction in case of error
    await db.query('ROLLBACK');
    console.error('Error adding members to team schedule:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove a member from a team schedule
app.delete('/api/team-schedules/:scheduleId/members/:memberId', async (req, res) => {
  const { scheduleId, memberId } = req.params;
  
  try {
    // Delete the member from the schedule
    const deleteResult = await db.query(`
      DELETE FROM team_schedule_members
      WHERE schedule_id = $1 AND member_id = $2
      RETURNING id
    `, [scheduleId, memberId]);
    
    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ message: 'Member not found in this schedule' });
    }
    
    res.json({ message: 'Member removed from schedule successfully', id: deleteResult.rows[0].id });
  } catch (error) {
    console.error('Error removing member from team schedule:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});