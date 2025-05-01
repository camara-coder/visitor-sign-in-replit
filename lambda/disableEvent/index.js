const { connectToDatabase } = require('../shared/db');
const { verifyToken } = require('../shared/auth');

/**
 * Lambda function to disable an event
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

    // Parse path parameters
    const pathParameters = event.pathParameters || {};
    const eventId = pathParameters.eventId;

    if (!eventId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          status: 'error',
          message: 'Event ID is required'
        })
      };
    }

    // Connect to database
    const client = await connectToDatabase();
    
    try {
      // Check if the event exists and belongs to the user
      const checkResult = await client.query(
        'SELECT * FROM events WHERE id = $1 AND host_id = $2',
        [eventId, user.id]
      );
      
      if (checkResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            status: 'error',
            message: 'Event not found or you do not have permission to disable it'
          })
        };
      }
      
      // Update the event status to disabled
      const updateResult = await client.query(
        `UPDATE events 
         SET status = 'disabled', updated_at = $1 
         WHERE id = $2 AND host_id = $3
         RETURNING *`,
        [new Date(), eventId, user.id]
      );
      
      const updatedEvent = updateResult.rows[0];
      
      // Get host information
      const hostResult = await client.query(
        'SELECT host_name, host_logo, social_media FROM hosts WHERE id = $1',
        [user.id]
      );
      
      const host = hostResult.rows[0];
      
      // Format event response
      const formattedEvent = {
        id: updatedEvent.id,
        hostId: updatedEvent.host_id,
        hostName: host.host_name,
        hostLogo: host.host_logo,
        status: updatedEvent.status,
        startDate: updatedEvent.start_date,
        endDate: updatedEvent.end_date,
        visitorCount: updatedEvent.visitor_count,
        createdAt: updatedEvent.created_at,
        updatedAt: updatedEvent.updated_at,
        socialMedia: host.social_media
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
    console.error('Error disabling event:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'error',
        message: 'An unexpected error occurred while disabling the event'
      })
    };
  }
};
