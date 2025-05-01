const { connectToDatabase } = require('../shared/db');

/**
 * Lambda function to get event details by ID or get the current active event
 * @param {Object} event - API Gateway event object
 * @returns {Object} API response with event details
 */
exports.handler = async (event) => {
  try {
    // Set up CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
      'Content-Type': 'application/json'
    };

    // Parse path parameters
    const pathParameters = event.pathParameters || {};
    const eventId = pathParameters.eventId;

    // Connect to database
    const client = await connectToDatabase();
    
    try {
      let eventResult;
      
      if (eventId) {
        // Get specific event by ID
        eventResult = await client.query(
          `SELECT e.*, h.host_name, h.host_logo, h.social_media
           FROM events e
           JOIN hosts h ON e.host_id = h.id
           WHERE e.id = $1`,
          [eventId]
        );
      } else {
        // Get current active event (the most recently created enabled event)
        eventResult = await client.query(
          `SELECT e.*, h.host_name, h.host_logo, h.social_media
           FROM events e
           JOIN hosts h ON e.host_id = h.id
           WHERE e.status = 'enabled'
           AND e.start_date <= NOW()
           AND e.end_date >= NOW()
           ORDER BY e.created_at DESC
           LIMIT 1`
        );
      }
      
      if (eventResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            status: 'error',
            message: eventId ? 'Event not found' : 'No active events available'
          })
        };
      }
      
      const event = eventResult.rows[0];
      
      // Transform the event data for the response
      const formattedEvent = {
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
      };
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(formattedEvent)
      };
    } finally {
      // Release client
      client.release();
    }
  } catch (error) {
    console.error('Error fetching event:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'error',
        message: 'An unexpected error occurred while fetching the event'
      })
    };
  }
};
