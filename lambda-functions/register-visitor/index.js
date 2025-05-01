const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Initialize PostgreSQL connection pool
const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

// Response helper function
const createResponse = (statusCode, body) => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify(body),
  };
};

/**
 * Lambda function to register a visitor for an event
 * 
 * @param {Object} event - API Gateway Lambda Proxy Input
 * @returns {Object} Response object
 */
exports.handler = async (event) => {
  try {
    // Parse the request body
    const requestBody = JSON.parse(event.body);
    const { eventId, firstName, lastName, address, phoneNumber } = requestBody;
    
    // Validate required parameters
    if (!firstName || !lastName) {
      return createResponse(400, {
        status: 'missing',
        message: 'First name and last name are required'
      });
    }
    
    if (!eventId) {
      return createResponse(400, {
        status: 'missing',
        message: 'Event ID is required'
      });
    }
    
    // Get current event to ensure it exists and is active
    const eventQuery = `
      SELECT id, status
      FROM events
      WHERE id = $1 AND status = 'enabled'
    `;
    
    const eventResult = await pool.query(eventQuery, [eventId]);
    
    if (eventResult.rows.length === 0) {
      return createResponse(404, {
        status: 'noEvents',
        message: 'No active event found with the provided ID'
      });
    }
    
    // Check if visitor is already registered for this event
    const duplicateQuery = `
      SELECT id
      FROM visitors
      WHERE event_id = $1
        AND LOWER(first_name) = LOWER($2)
        AND LOWER(last_name) = LOWER($3)
    `;
    
    const duplicateResult = await pool.query(duplicateQuery, [
      eventId,
      firstName,
      lastName
    ]);
    
    if (duplicateResult.rows.length > 0) {
      return createResponse(409, {
        status: 'duplicate',
        message: 'You have already registered for this event'
      });
    }
    
    // Register the visitor
    const id = uuidv4();
    const registrationTime = new Date().toISOString();
    
    const insertQuery = `
      INSERT INTO visitors (
        id, first_name, last_name, address, phone_number, event_id, registration_time
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;
    
    await pool.query(insertQuery, [
      id,
      firstName,
      lastName,
      address || null,
      phoneNumber || null,
      eventId,
      registrationTime
    ]);
    
    return createResponse(201, {
      status: 'success',
      message: 'Registration successful',
      visitorId: id
    });
    
  } catch (error) {
    console.error('Error registering visitor:', error);
    
    return createResponse(500, {
      status: 'error',
      message: 'An error occurred while processing your registration'
    });
  }
};
