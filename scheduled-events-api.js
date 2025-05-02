const express = require('express');
const db = require('./database');
const router = express.Router();

// Middleware to check if user is authenticated
const checkAuth = (req, res, next) => {
  // For simplicity, we'll check if there's a userId in the request body or query
  // In a production environment, you would validate a JWT token or session
  const userId = req.body?.userId || req.query?.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
};

// Helper function to format event data from DB to API response
const formatEventData = (event) => {
  return {
    id: event.id.toString(),
    name: event.name,
    description: event.description,
    location: event.location,
    startDate: event.start_date,
    endDate: event.end_date,
    status: event.status,
    isRecurring: event.is_recurring,
    recurrenceType: event.recurrence_type,
    recurrenceInterval: event.recurrence_interval,
    recurrenceDays: event.recurrence_days,
    recurrenceEndDate: event.recurrence_end_date,
    createdAt: event.created_at,
    updatedAt: event.updated_at
  };
};

// Helper function to format event instance data
const formatEventInstance = (instance) => {
  return {
    id: instance.id.toString(),
    scheduledEventId: instance.scheduled_event_id.toString(),
    startDate: instance.start_date,
    endDate: instance.end_date,
    status: instance.status,
    createdAt: instance.created_at,
    updatedAt: instance.updated_at,
    // Include event details if available
    eventName: instance.name,
    eventDescription: instance.description,
    eventLocation: instance.location
  };
};

// Helper function to format registration data
const formatRegistration = (registration) => {
  return {
    id: registration.id.toString(),
    visitorId: registration.visitor_id.toString(),
    eventInstanceId: registration.event_instance_id.toString(),
    registrationDate: registration.registration_date,
    status: registration.status,
    notes: registration.notes,
    // Include visitor and event details if available
    visitorName: registration.visitor_name,
    eventName: registration.event_name,
    eventStartDate: registration.event_start_date,
    eventEndDate: registration.event_end_date
  };
};

// Helper function to generate recurring event instances
async function generateEventInstances(eventId) {
  try {
    // Get the event details
    const eventResult = await db.query('SELECT * FROM scheduled_events WHERE id = $1', [eventId]);
    
    if (eventResult.rows.length === 0) {
      throw new Error('Event not found');
    }
    
    const event = eventResult.rows[0];
    
    // If not recurring, just create a single instance
    if (!event.is_recurring) {
      await db.query(
        'INSERT INTO scheduled_event_instances (scheduled_event_id, start_date, end_date) VALUES ($1, $2, $3)',
        [event.id, event.start_date, event.end_date]
      );
      return;
    }
    
    // Generate recurring instances based on recurrence_type
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);
    const duration = endDate.getTime() - startDate.getTime(); // Duration in milliseconds
    const recurrenceEndDate = event.recurrence_end_date ? new Date(event.recurrence_end_date) : null;
    
    // Start with the first instance
    let currentStart = new Date(startDate);
    let currentEnd = new Date(endDate);
    
    // Maximum number of instances to prevent infinite loops
    const MAX_INSTANCES = 100;
    let instanceCount = 0;
    
    // Generate instances until recurrence end date or max count
    while ((!recurrenceEndDate || currentStart <= recurrenceEndDate) && instanceCount < MAX_INSTANCES) {
      // Create the instance
      await db.query(
        'INSERT INTO scheduled_event_instances (scheduled_event_id, start_date, end_date) VALUES ($1, $2, $3)',
        [event.id, currentStart, currentEnd]
      );
      
      // Calculate next instance dates based on recurrence type
      switch (event.recurrence_type) {
        case 'daily':
          currentStart.setDate(currentStart.getDate() + event.recurrence_interval);
          currentEnd.setDate(currentEnd.getDate() + event.recurrence_interval);
          break;
          
        case 'weekly':
          // For weekly recurrence with specific days, we need to generate multiple instances per week
          if (event.recurrence_days && event.recurrence_days.length > 0) {
            // Move to the next day
            currentStart.setDate(currentStart.getDate() + 1);
            currentEnd.setDate(currentEnd.getDate() + 1);
            
            // Check if this day is in the recurrence_days array
            const dayOfWeek = currentStart.getDay(); // 0-6, where 0 is Sunday
            
            // If not a selected day, continue to next iteration without creating an instance
            if (!event.recurrence_days.includes(dayOfWeek)) {
              continue;
            }
            
            // If we've gone through a full week, move to the next week based on interval
            if (dayOfWeek === 6) { // Saturday
              currentStart.setDate(currentStart.getDate() + (7 * (event.recurrence_interval - 1)));
              currentEnd.setDate(currentEnd.getDate() + (7 * (event.recurrence_interval - 1)));
            }
          } else {
            // Simple weekly recurrence
            currentStart.setDate(currentStart.getDate() + (7 * event.recurrence_interval));
            currentEnd.setDate(currentEnd.getDate() + (7 * event.recurrence_interval));
          }
          break;
          
        case 'monthly':
          currentStart.setMonth(currentStart.getMonth() + event.recurrence_interval);
          currentEnd.setMonth(currentEnd.getMonth() + event.recurrence_interval);
          break;
          
        case 'yearly':
          currentStart.setFullYear(currentStart.getFullYear() + event.recurrence_interval);
          currentEnd.setFullYear(currentEnd.getFullYear() + event.recurrence_interval);
          break;
          
        default:
          // If recurrence type is invalid, just stop after first instance
          return;
      }
      
      instanceCount++;
    }
  } catch (error) {
    console.error('Error generating event instances:', error);
    throw error;
  }
}

// CREATE a new scheduled event
router.post('/', checkAuth, async (req, res) => {
  const {
    userId, // for authentication
    name,
    description,
    location,
    startDate,
    endDate,
    isRecurring,
    recurrenceType,
    recurrenceInterval,
    recurrenceDays,
    recurrenceEndDate
  } = req.body;
  
  if (!name || !startDate || !endDate) {
    return res.status(400).json({ message: 'Name, start date, and end date are required' });
  }
  
  if (new Date(startDate) >= new Date(endDate)) {
    return res.status(400).json({ message: 'End date must be after start date' });
  }
  
  if (isRecurring && (!recurrenceType || !recurrenceInterval)) {
    return res.status(400).json({ message: 'Recurrence type and interval are required for recurring events' });
  }
  
  try {
    // Start a transaction
    await db.query('BEGIN');
    
    // Insert the event
    const result = await db.query(
      `INSERT INTO scheduled_events 
       (name, description, location, start_date, end_date, created_by, updated_by, 
        is_recurring, recurrence_type, recurrence_interval, recurrence_days, recurrence_end_date) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
       RETURNING *`,
      [
        name, 
        description || '', 
        location || '', 
        startDate, 
        endDate, 
        userId, 
        userId,
        isRecurring || false,
        recurrenceType || null,
        recurrenceInterval || null,
        recurrenceDays || null,
        recurrenceEndDate || null
      ]
    );
    
    const newEvent = result.rows[0];
    
    // Generate instances for this event
    await generateEventInstances(newEvent.id);
    
    // Commit the transaction
    await db.query('COMMIT');
    
    // Return the formatted event
    res.status(201).json(formatEventData(newEvent));
  } catch (error) {
    // Rollback the transaction in case of error
    await db.query('ROLLBACK');
    console.error('Error creating scheduled event:', error);
    res.status(500).json({ message: 'Failed to create scheduled event' });
  }
});

// GET all scheduled events
router.get('/', async (req, res) => {
  try {
    let query;
    let params = [];
    
    // Filter options
    if (req.query.userId) {
      // If userId provided, only show events created by this user
      query = `
        SELECT * FROM scheduled_events 
        WHERE created_by = $1
        ORDER BY start_date DESC
      `;
      params = [req.query.userId];
    } else if (req.query.future === 'true') {
      // If future=true, only show events where start_date is in the future
      // or recurring events that have instances in the future
      query = `
        SELECT DISTINCT se.*
        FROM scheduled_events se
        LEFT JOIN scheduled_event_instances sei ON se.id = sei.scheduled_event_id
        WHERE se.start_date > NOW() 
           OR (se.is_recurring = true AND sei.start_date > NOW())
        ORDER BY se.start_date ASC
      `;
    } else {
      // Get all events
      query = 'SELECT * FROM scheduled_events ORDER BY start_date DESC';
    }
    
    const result = await db.query(query, params);
    
    // Transform data
    const events = result.rows.map(formatEventData);
    
    res.json(events);
  } catch (error) {
    console.error('Error fetching scheduled events:', error);
    res.status(500).json({ message: 'Failed to fetch scheduled events' });
  }
});

// GET a single scheduled event by ID
router.get('/:id', async (req, res) => {
  const eventId = req.params.id;
  
  try {
    // Get the event
    const eventResult = await db.query('SELECT * FROM scheduled_events WHERE id = $1', [eventId]);
    
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    const event = formatEventData(eventResult.rows[0]);
    
    // Get all instances of this event
    const instancesResult = await db.query(
      'SELECT * FROM scheduled_event_instances WHERE scheduled_event_id = $1 ORDER BY start_date ASC',
      [eventId]
    );
    
    event.instances = instancesResult.rows.map(formatEventInstance);
    
    res.json(event);
  } catch (error) {
    console.error('Error fetching scheduled event:', error);
    res.status(500).json({ message: 'Failed to fetch scheduled event' });
  }
});

// UPDATE a scheduled event
router.put('/:id', checkAuth, async (req, res) => {
  const eventId = req.params.id;
  const {
    userId, // for authentication and updated_by
    name,
    description,
    location,
    startDate,
    endDate,
    status,
    isRecurring,
    recurrenceType,
    recurrenceInterval,
    recurrenceDays,
    recurrenceEndDate
  } = req.body;
  
  try {
    // Check if event exists
    const checkResult = await db.query('SELECT * FROM scheduled_events WHERE id = $1', [eventId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Validate dates if provided
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }
    
    // Start transaction
    await db.query('BEGIN');
    
    // Update the event
    const updateResult = await db.query(
      `UPDATE scheduled_events 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           location = COALESCE($3, location),
           start_date = COALESCE($4, start_date),
           end_date = COALESCE($5, end_date),
           status = COALESCE($6, status),
           is_recurring = COALESCE($7, is_recurring),
           recurrence_type = COALESCE($8, recurrence_type),
           recurrence_interval = COALESCE($9, recurrence_interval),
           recurrence_days = COALESCE($10, recurrence_days),
           recurrence_end_date = COALESCE($11, recurrence_end_date),
           updated_by = $12,
           updated_at = NOW()
       WHERE id = $13
       RETURNING *`,
      [
        name,
        description,
        location,
        startDate,
        endDate,
        status,
        isRecurring,
        recurrenceType,
        recurrenceInterval,
        recurrenceDays,
        recurrenceEndDate,
        userId,
        eventId
      ]
    );
    
    // If recurrence settings changed, regenerate instances
    const originalEvent = checkResult.rows[0];
    const updatedEvent = updateResult.rows[0];
    
    if (
      originalEvent.is_recurring !== updatedEvent.is_recurring ||
      originalEvent.recurrence_type !== updatedEvent.recurrence_type ||
      originalEvent.recurrence_interval !== updatedEvent.recurrence_interval ||
      JSON.stringify(originalEvent.recurrence_days) !== JSON.stringify(updatedEvent.recurrence_days) ||
      originalEvent.recurrence_end_date !== updatedEvent.recurrence_end_date ||
      originalEvent.start_date !== updatedEvent.start_date ||
      originalEvent.end_date !== updatedEvent.end_date
    ) {
      // Delete future instances
      await db.query(
        'DELETE FROM scheduled_event_instances WHERE scheduled_event_id = $1 AND start_date > NOW()',
        [eventId]
      );
      
      // Regenerate instances
      await generateEventInstances(eventId);
    }
    
    // Commit transaction
    await db.query('COMMIT');
    
    res.json(formatEventData(updatedEvent));
  } catch (error) {
    // Rollback transaction
    await db.query('ROLLBACK');
    console.error('Error updating scheduled event:', error);
    res.status(500).json({ message: 'Failed to update scheduled event' });
  }
});

// DELETE a scheduled event
router.delete('/:id', checkAuth, async (req, res) => {
  const eventId = req.params.id;
  
  try {
    // Check if event exists
    const checkResult = await db.query('SELECT * FROM scheduled_events WHERE id = $1', [eventId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Start transaction
    await db.query('BEGIN');
    
    // Delete all instances (will cascade delete registrations)
    await db.query('DELETE FROM scheduled_event_instances WHERE scheduled_event_id = $1', [eventId]);
    
    // Delete the event
    await db.query('DELETE FROM scheduled_events WHERE id = $1', [eventId]);
    
    // Commit transaction
    await db.query('COMMIT');
    
    res.json({ message: 'Event deleted successfully', id: eventId });
  } catch (error) {
    // Rollback transaction
    await db.query('ROLLBACK');
    console.error('Error deleting scheduled event:', error);
    res.status(500).json({ message: 'Failed to delete scheduled event' });
  }
});

// VISITOR REGISTRATION ENDPOINTS

// Register a visitor for an event instance
router.post('/instances/:instanceId/register', async (req, res) => {
  const instanceId = req.params.instanceId;
  const { phone, notes } = req.body;
  
  if (!phone) {
    return res.status(400).json({ message: 'Phone number is required' });
  }
  
  try {
    // Check if instance exists and is not completed or cancelled
    const instanceResult = await db.query(
      `SELECT sei.*, se.name, se.status as event_status
       FROM scheduled_event_instances sei
       JOIN scheduled_events se ON sei.scheduled_event_id = se.id
       WHERE sei.id = $1`,
      [instanceId]
    );
    
    if (instanceResult.rows.length === 0) {
      return res.status(404).json({ message: 'Event instance not found' });
    }
    
    const instance = instanceResult.rows[0];
    
    if (instance.status === 'completed' || instance.status === 'cancelled' || 
        instance.event_status === 'cancelled') {
      return res.status(400).json({ message: 'Cannot register for a completed or cancelled event' });
    }
    
    // Check if visitor exists in directory
    const visitorResult = await db.query(
      'SELECT * FROM visitor_directory WHERE phone = $1',
      [phone]
    );
    
    if (visitorResult.rows.length === 0) {
      return res.status(404).json({ 
        message: 'Visitor not found in directory. Please register in the directory first.',
        code: 'VISITOR_NOT_FOUND'
      });
    }
    
    const visitor = visitorResult.rows[0];
    
    // Check if already registered
    const registrationCheckResult = await db.query(
      'SELECT * FROM event_registrations WHERE visitor_id = $1 AND event_instance_id = $2',
      [visitor.id, instanceId]
    );
    
    if (registrationCheckResult.rows.length > 0) {
      return res.status(400).json({ 
        message: 'You are already registered for this event',
        code: 'ALREADY_REGISTERED'
      });
    }
    
    // Create registration
    const registrationResult = await db.query(
      `INSERT INTO event_registrations 
       (visitor_id, event_instance_id, notes)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [visitor.id, instanceId, notes || '']
    );
    
    const registration = registrationResult.rows[0];
    
    // Add visitor and event details to response
    const formattedRegistration = {
      id: registration.id.toString(),
      visitorId: visitor.id.toString(),
      visitorName: `${visitor.first_name} ${visitor.last_name}`,
      visitorPhone: visitor.phone,
      eventInstanceId: instanceId,
      eventName: instance.name,
      eventStartDate: instance.start_date,
      eventEndDate: instance.end_date,
      registrationDate: registration.registration_date,
      status: registration.status,
      notes: registration.notes
    };
    
    res.status(201).json(formattedRegistration);
  } catch (error) {
    console.error('Error registering for event:', error);
    res.status(500).json({ message: 'Failed to register for event' });
  }
});

// Cancel a visitor's registration
router.post('/registrations/:registrationId/cancel', async (req, res) => {
  const registrationId = req.params.registrationId;
  const { phone } = req.body;
  
  if (!phone) {
    return res.status(400).json({ message: 'Phone number is required for verification' });
  }
  
  try {
    // Get the registration with related data
    const registrationResult = await db.query(
      `SELECT er.*, sei.status as instance_status, sei.start_date, vd.phone
       FROM event_registrations er
       JOIN scheduled_event_instances sei ON er.event_instance_id = sei.id
       JOIN visitor_directory vd ON er.visitor_id = vd.id
       WHERE er.id = $1`,
      [registrationId]
    );
    
    if (registrationResult.rows.length === 0) {
      return res.status(404).json({ message: 'Registration not found' });
    }
    
    const registration = registrationResult.rows[0];
    
    // Verify phone number
    if (registration.phone !== phone) {
      return res.status(403).json({ message: 'Phone number does not match registration' });
    }
    
    // Check if event is in the past or cancelled
    if (registration.instance_status === 'completed' || registration.instance_status === 'cancelled') {
      return res.status(400).json({ message: 'Cannot cancel registration for a completed or cancelled event' });
    }
    
    if (new Date(registration.start_date) < new Date()) {
      return res.status(400).json({ message: 'Cannot cancel registration for a past event' });
    }
    
    // Update registration status
    await db.query(
      "UPDATE event_registrations SET status = 'cancelled' WHERE id = $1",
      [registrationId]
    );
    
    res.json({ 
      message: 'Registration cancelled successfully', 
      id: registrationId 
    });
  } catch (error) {
    console.error('Error cancelling registration:', error);
    res.status(500).json({ message: 'Failed to cancel registration' });
  }
});

// Get all registrations for a visitor (by phone)
router.get('/registrations/visitor', async (req, res) => {
  const { phone } = req.query;
  
  if (!phone) {
    return res.status(400).json({ message: 'Phone number is required' });
  }
  
  try {
    // Get visitor ID
    const visitorResult = await db.query(
      'SELECT id FROM visitor_directory WHERE phone = $1',
      [phone]
    );
    
    if (visitorResult.rows.length === 0) {
      return res.status(404).json({ message: 'Visitor not found in directory' });
    }
    
    const visitorId = visitorResult.rows[0].id;
    
    // Get all registrations with event details
    const result = await db.query(
      `SELECT er.*, sei.start_date, sei.end_date, sei.status as instance_status, se.name as event_name
       FROM event_registrations er
       JOIN scheduled_event_instances sei ON er.event_instance_id = sei.id
       JOIN scheduled_events se ON sei.scheduled_event_id = se.id
       WHERE er.visitor_id = $1
       ORDER BY sei.start_date DESC`,
      [visitorId]
    );
    
    // Format the registrations
    const registrations = result.rows.map(reg => ({
      id: reg.id.toString(),
      visitorId: reg.visitor_id.toString(),
      eventInstanceId: reg.event_instance_id.toString(),
      eventName: reg.event_name,
      eventStartDate: reg.start_date,
      eventEndDate: reg.end_date,
      eventStatus: reg.instance_status,
      registrationDate: reg.registration_date,
      status: reg.status,
      notes: reg.notes
    }));
    
    res.json(registrations);
  } catch (error) {
    console.error('Error fetching visitor registrations:', error);
    res.status(500).json({ message: 'Failed to fetch registrations' });
  }
});

// Get all future events with registration status for a visitor
router.get('/visitor-events', async (req, res) => {
  const { phone } = req.query;
  
  if (!phone) {
    return res.status(400).json({ message: 'Phone number is required' });
  }
  
  try {
    // Get visitor ID
    const visitorResult = await db.query(
      'SELECT id FROM visitor_directory WHERE phone = $1',
      [phone]
    );
    
    if (visitorResult.rows.length === 0) {
      return res.status(404).json({ message: 'Visitor not found in directory' });
    }
    
    const visitorId = visitorResult.rows[0].id;
    
    // Get all future event instances and check if visitor is registered
    const result = await db.query(
      `SELECT sei.id as instance_id, se.id as event_id, se.name, se.description, se.location,
              sei.start_date, sei.end_date, sei.status, 
              er.id as registration_id, er.status as registration_status
       FROM scheduled_event_instances sei
       JOIN scheduled_events se ON sei.scheduled_event_id = se.id
       LEFT JOIN event_registrations er ON sei.id = er.event_instance_id AND er.visitor_id = $1
       WHERE sei.start_date > NOW() AND sei.status = 'scheduled' AND se.status = 'active'
       ORDER BY sei.start_date ASC`,
      [visitorId]
    );
    
    // Format the events
    const events = result.rows.map(event => ({
      eventId: event.event_id.toString(),
      instanceId: event.instance_id.toString(),
      name: event.name,
      description: event.description,
      location: event.location,
      startDate: event.start_date,
      endDate: event.end_date,
      status: event.status,
      registrationStatus: event.registration_id 
        ? event.registration_status 
        : 'not_registered',
      registrationId: event.registration_id 
        ? event.registration_id.toString() 
        : null,
      isRegistered: !!event.registration_id
    }));
    
    res.json(events);
  } catch (error) {
    console.error('Error fetching visitor events:', error);
    res.status(500).json({ message: 'Failed to fetch events' });
  }
});

// Get all registrations for an event instance
router.get('/instances/:instanceId/registrations', checkAuth, async (req, res) => {
  const instanceId = req.params.instanceId;
  
  try {
    // Get all registrations with visitor details
    const result = await db.query(
      `SELECT er.*, vd.first_name, vd.last_name, vd.phone, vd.email
       FROM event_registrations er
       JOIN visitor_directory vd ON er.visitor_id = vd.id
       WHERE er.event_instance_id = $1
       ORDER BY er.registration_date ASC`,
      [instanceId]
    );
    
    // Format the registrations
    const registrations = result.rows.map(reg => ({
      id: reg.id.toString(),
      visitorId: reg.visitor_id.toString(),
      visitorName: `${reg.first_name} ${reg.last_name}`,
      visitorPhone: reg.phone,
      visitorEmail: reg.email,
      eventInstanceId: reg.event_instance_id.toString(),
      registrationDate: reg.registration_date,
      status: reg.status,
      notes: reg.notes
    }));
    
    res.json(registrations);
  } catch (error) {
    console.error('Error fetching event registrations:', error);
    res.status(500).json({ message: 'Failed to fetch registrations' });
  }
});

module.exports = router;