const { connectToDatabase } = require('../shared/db');
const { getCurrentEvent } = require('../shared/utils');

/**
 * Lambda function to register a visitor for an event
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

    // Parse request body
    const requestBody = JSON.parse(event.body || '{}');
    const { eventId, firstName, lastName, address, phoneNumber } = requestBody;

    // Validate required parameters
    if (!eventId || !firstName || !lastName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          status: 'missing_information',
          message: 'First name, last name, and event ID are required'
        })
      };
    }

    // Connect to database
    const client = await connectToDatabase();
    
    try {
      // Begin transaction
      await client.query('BEGIN');
      
      // Get current event information
      const currentEventResult = await client.query(
        'SELECT * FROM events WHERE id = $1',
        [eventId]
      );
      
      // Check if event exists and is enabled
      if (currentEventResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            status: 'no_event_available',
            message: 'Event not found'
          })
        };
      }
      
      const currentEvent = currentEventResult.rows[0];
      
      // Check if event is enabled
      if (currentEvent.status !== 'enabled') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            status: 'no_event_available',
            message: 'Event is not currently active'
          })
        };
      }
      
      // Check if current time is within event time range
      const now = new Date();
      const startDate = new Date(currentEvent.start_date);
      const endDate = new Date(currentEvent.end_date);
      
      if (now < startDate || now > endDate) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            status: 'no_event_available',
            message: 'Event is not currently active'
          })
        };
      }
      
      // Check for duplicate registration
      const duplicateCheckResult = await client.query(
        'SELECT * FROM visitors WHERE event_id = $1 AND LOWER(first_name) = LOWER($2) AND LOWER(last_name) = LOWER($3)',
        [eventId, firstName, lastName]
      );
      
      if (duplicateCheckResult.rows.length > 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            status: 'duplicate_registration',
            message: 'You have already registered for this event'
          })
        };
      }
      
      // Register visitor
      const visitorResult = await client.query(
        `INSERT INTO visitors (
          event_id, first_name, last_name, address, phone_number, registration_time
        ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [eventId, firstName, lastName, address || null, phoneNumber || null, new Date()]
      );
      
      // Update visitor count for the event
      await client.query(
        'UPDATE events SET visitor_count = visitor_count + 1, updated_at = $1 WHERE id = $2',
        [new Date(), eventId]
      );
      
      // Commit transaction
      await client.query('COMMIT');
      
      // Return success response
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          status: 'success',
          message: 'Registration successful',
          visitor: {
            id: visitorResult.rows[0].id,
            firstName: visitorResult.rows[0].first_name,
            lastName: visitorResult.rows[0].last_name,
            registrationTime: visitorResult.rows[0].registration_time
          }
        })
      };
    } catch (error) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      throw error;
    } finally {
      // Release client
      client.release();
    }
  } catch (error) {
    console.error('Error registering visitor:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'error',
        message: 'An unexpected error occurred while processing your registration'
      })
    };
  }
};
