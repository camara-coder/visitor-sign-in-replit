const { connectToDatabase } = require('../shared/db');
const { verifyToken } = require('../shared/auth');

/**
 * Lambda function to get all events for a host
 * @param {Object} event - API Gateway event object
 * @returns {Object} API response with list of events
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
      // Query events for this host
      const eventsResult = await client.query(
        `SELECT e.*, h.host_name, h.host_logo, h.social_media
         FROM events e
         JOIN hosts h ON e.host_id = h.id
         WHERE e.host_id = $1
         ORDER BY e.created_at DESC`,
        [user.id]
      );
      
      // Format events for response
      const events = eventsResult.rows.map(event => ({
        id: event.id,
        hostId: event.host_id,
        hostName: event.host_name,
        hostLogo: event.host_logo,
        status: event.status,
        startDate: event.start_date,
        endDate: event.end_date,
        visitorCount: event.visitor_count,
        createdAt: event.created_at,
        updatedAt: event.updated_at,
        socialMedia: event.social_media
      }));
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(events)
      };
    } finally {
      // Release client
      client.release();
    }
  } catch (error) {
    console.error('Error fetching events:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'error',
        message: 'An unexpected error occurred while fetching events'
      })
    };
  }
};
