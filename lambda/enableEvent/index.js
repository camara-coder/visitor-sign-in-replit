const { connectToDatabase } = require('../shared/db');
const { verifyToken } = require('../shared/auth');
const { v4: uuidv4 } = require('uuid');

/**
 * Lambda function to enable/create a new event
 * @param {Object} event - API Gateway event object
 * @returns {Object} API response
 */
exports.handler = async (event) => {
  try {
    // Set up CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
      'Content-Type': 'application/json'
    };

    // Verify authentication
    const user = await verifyToken(event);
    if (!user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          status: 'error',
          message: 'Authentication required'
        })
      };
    }

    // Connect to database
    const client = await connectToDatabase();
    
    try {
      // Calculate start and end dates
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 4); // Default 4 hours duration
      
      // Generate a unique event ID
      const eventId = uuidv4();
      
      // Create the new event
      const result = await client.query(
        `INSERT INTO events (
          id, host_id, status, start_date, end_date, visitor_count, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          eventId,
          user.id,
          'enabled',
          startDate,
          endDate,
          0,
          new Date(),
          new Date()
        ]
      );
      
      const newEvent = result.rows[0];
      
      // Get host information
      const hostResult = await client.query(
        'SELECT host_name, host_logo, social_media FROM hosts WHERE id = $1',
        [user.id]
      );
      
      const host = hostResult.rows[0];
      
      // Format event response
      const formattedEvent = {
        id: newEvent.id,
        hostId: newEvent.host_id,
        hostName: host.host_name,
        hostLogo: host.host_logo,
        status: newEvent.status,
        startDate: newEvent.start_date,
        endDate: newEvent.end_date,
        visitorCount: newEvent.visitor_count,
        createdAt: newEvent.created_at,
        updatedAt: newEvent.updated_at,
        socialMedia: host.social_media
      };
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(formattedEvent)
      };
    } finally {
      // Release client
      client.release();
    }
  } catch (error) {
    console.error('Error enabling event:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'error',
        message: 'An unexpected error occurred while creating the event'
      })
    };
  }
};
