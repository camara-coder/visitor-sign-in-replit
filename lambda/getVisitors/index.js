const { connectToDatabase } = require('../shared/db');
const { verifyToken } = require('../shared/auth');

/**
 * Lambda function to get visitors for a specific event
 * @param {Object} event - API Gateway event object
 * @returns {Object} API response with list of visitors
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
      // Verify the event belongs to this host
      const eventResult = await client.query(
        'SELECT * FROM events WHERE id = $1 AND host_id = $2',
        [eventId, user.id]
      );
      
      if (eventResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            status: 'error',
            message: 'Event not found or you do not have permission to view visitors'
          })
        };
      }
      
      // Query visitors for this event
      const visitorsResult = await client.query(
        `SELECT * FROM visitors
         WHERE event_id = $1
         ORDER BY registration_time DESC`,
        [eventId]
      );
      
      // Format visitors for response
      const visitors = visitorsResult.rows.map(visitor => ({
        id: visitor.id,
        eventId: visitor.event_id,
        firstName: visitor.first_name,
        lastName: visitor.last_name,
        address: visitor.address,
        phoneNumber: visitor.phone_number,
        registrationTime: visitor.registration_time
      }));
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(visitors)
      };
    } finally {
      // Release client
      client.release();
    }
  } catch (error) {
    console.error('Error fetching visitors:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'error',
        message: 'An unexpected error occurred while fetching visitors'
      })
    };
  }
};
