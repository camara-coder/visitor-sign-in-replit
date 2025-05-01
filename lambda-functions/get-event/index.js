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
 * Lambda function to get the current active event
 * 
 * @param {Object} event - API Gateway Lambda Proxy Input
 * @returns {Object} Response object with event details
 */
exports.handler = async (event) => {
  try {
    // Query to get the current active event
    // An event is active if:
    // 1. Status is 'enabled'
    // 2. Current time is between start_date_time and end_date_time
    const query = `
      SELECT 
        id, 
        title,
        organization_name, 
        status,
        start_date_time,
        end_date_time,
        created_by,
        created_at,
        social_links
      FROM events 
      WHERE status = 'enabled' 
        AND start_date_time <= NOW()
        AND end_date_time >= NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'not_available',
        message: 'No active events available at this time'
      });
    }
    
    // Transform the result to match the expected format
    const event = result.rows[0];
    
    return createResponse(200, {
      id: event.id,
      title: event.title,
      organizationName: event.organization_name,
      status: event.status,
      startDateTime: event.start_date_time,
      endDateTime: event.end_date_time,
      createdBy: event.created_by,
      socialLinks: event.social_links || {
        facebook: '#',
        instagram: '#',
        youtube: '#'
      }
    });
    
  } catch (error) {
    console.error('Error fetching current event:', error);
    
    return createResponse(500, {
      error: 'internal_error',
      message: 'An error occurred while retrieving the current event'
    });
  }
};
