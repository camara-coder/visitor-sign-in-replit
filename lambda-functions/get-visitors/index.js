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
 * Lambda function to get all visitors for an event
 * 
 * @param {Object} event - API Gateway Lambda Proxy Input
 * @returns {Object} Response object with visitors list
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
    
    // Extract user ID from the requestContext for authentication
    const userId = event.requestContext?.authorizer?.claims?.sub;
    
    if (!userId) {
      return createResponse(401, {
        error: 'unauthorized',
        message: 'Authentication required to view visitors'
      });
    }
    
    // Verify the event exists and belongs to the user
    const verifyQuery = `
      SELECT id
      FROM events
      WHERE id = $1 AND created_by = $2
    `;
    
    const verifyResult = await pool.query(verifyQuery, [eventId, userId]);
    
    if (verifyResult.rows.length === 0) {
      return createResponse(404, {
        error: 'not_found',
        message: 'Event not found or you do not have permission to view its visitors'
      });
    }
    
    // Get all visitors for the event
    const visitorsQuery = `
      SELECT 
        id, 
        first_name, 
        last_name, 
        address,
        phone_number,
        event_id,
        registration_time
      FROM visitors
      WHERE event_id = $1
      ORDER BY registration_time DESC
    `;
    
    const visitorsResult = await pool.query(visitorsQuery, [eventId]);
    
    // Transform the results to match the expected format
    const visitors = visitorsResult.rows.map(visitor => ({
      id: visitor.id,
      firstName: visitor.first_name,
      lastName: visitor.last_name,
      address: visitor.address,
      phoneNumber: visitor.phone_number,
      eventId: visitor.event_id,
      registrationTime: visitor.registration_time
    }));
    
    return createResponse(200, visitors);
    
  } catch (error) {
    console.error('Error fetching visitors:', error);
    
    return createResponse(500, {
      error: 'internal_error',
      message: 'An error occurred while retrieving visitors'
    });
  }
};
