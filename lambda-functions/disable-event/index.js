const { Pool } = require('pg');

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
 * Lambda function to disable an event
 * 
 * @param {Object} event - API Gateway Lambda Proxy Input
 * @returns {Object} Response object
 */
exports.handler = async (event) => {
  try {
    // Extract the event ID from the path parameters
    const eventId = event.pathParameters?.eventId;
    
    if (!eventId) {
      return createResponse(400, {
        error: 'missing_parameter',
        message: 'Event ID is required'
      });
    }
    
    // Extract user ID from the requestContext
    const userId = event.requestContext?.authorizer?.claims?.sub;
    
    if (!userId) {
      return createResponse(401, {
        error: 'unauthorized',
        message: 'Authentication required to disable an event'
      });
    }
    
    // Verify the event exists and belongs to the user
    const verifyQuery = `
      SELECT id, status
      FROM events
      WHERE id = $1 AND created_by = $2
    `;
    
    const verifyResult = await pool.query(verifyQuery, [eventId, userId]);
    
    if (verifyResult.rows.length === 0) {
      return createResponse(404, {
        error: 'not_found',
        message: 'Event not found or you do not have permission to disable it'
      });
    }
    
    const event = verifyResult.rows[0];
    
    if (event.status === 'disabled') {
      return createResponse(400, {
        error: 'already_disabled',
        message: 'The event is already disabled'
      });
    }
    
    // Disable the event
    const updateQuery = `
      UPDATE events
      SET status = 'disabled'
      WHERE id = $1
      RETURNING id
    `;
    
    await pool.query(updateQuery, [eventId]);
    
    return createResponse(200, {
      message: 'Event successfully disabled',
      eventId
    });
    
  } catch (error) {
    console.error('Error disabling event:', error);
    
    return createResponse(500, {
      error: 'internal_error',
      message: 'An error occurred while disabling the event'
    });
  }
};
