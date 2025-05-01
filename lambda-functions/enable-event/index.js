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
 * Lambda function to enable a new event
 * 
 * @param {Object} event - API Gateway Lambda Proxy Input
 * @returns {Object} Response object with the created event details
 */
exports.handler = async (event) => {
  // Start a database transaction
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Extract user ID from the requestContext
    const userId = event.requestContext?.authorizer?.claims?.sub;
    
    if (!userId) {
      return createResponse(401, {
        error: 'unauthorized',
        message: 'Authentication required to enable an event'
      });
    }
    
    // Disable any currently active events
    const disableQuery = `
      UPDATE events
      SET status = 'disabled'
      WHERE status = 'enabled'
    `;
    
    await client.query(disableQuery);
    
    // Generate event details
    const eventId = uuidv4();
    const startDateTime = new Date();
    
    // End time is 4 hours from now
    const endDateTime = new Date();
    endDateTime.setHours(endDateTime.getHours() + 4);
    
    // Check if there's a title and organization for this user
    const userQuery = `
      SELECT username, organization_name
      FROM users
      WHERE id = $1
    `;
    
    const userResult = await client.query(userQuery, [userId]);
    const user = userResult.rows[0];
    
    // Default social links
    const socialLinks = {
      facebook: '#',
      instagram: '#',
      youtube: '#'
    };
    
    // Create the new event
    const insertQuery = `
      INSERT INTO events (
        id, 
        title, 
        organization_name, 
        status, 
        start_date_time, 
        end_date_time, 
        created_by,
        social_links
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING 
        id, 
        title,
        organization_name, 
        status, 
        start_date_time, 
        end_date_time, 
        created_by
    `;
    
    const eventTitle = user ? `${user.organization_name || user.username}'s Event` : 'New Event';
    const organizationName = user ? user.organization_name : null;
    
    const insertResult = await client.query(insertQuery, [
      eventId,
      eventTitle,
      organizationName,
      'enabled',
      startDateTime,
      endDateTime,
      userId,
      JSON.stringify(socialLinks)
    ]);
    
    const newEvent = insertResult.rows[0];
    
    await client.query('COMMIT');
    
    return createResponse(201, {
      id: newEvent.id,
      title: newEvent.title,
      organizationName: newEvent.organization_name,
      status: newEvent.status,
      startDateTime: newEvent.start_date_time,
      endDateTime: newEvent.end_date_time,
      createdBy: newEvent.created_by,
      socialLinks
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error enabling event:', error);
    
    return createResponse(500, {
      error: 'internal_error',
      message: 'An error occurred while enabling the event'
    });
  } finally {
    client.release();
  }
};
