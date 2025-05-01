const { connectToDatabase } = require('./db');

/**
 * Get the current active event
 * @returns {Promise<Object|null>} Current event or null if none found
 */
async function getCurrentEvent() {
  try {
    const client = await connectToDatabase();
    
    try {
      const result = await client.query(
        `SELECT e.*, h.host_name, h.host_logo, h.social_media
         FROM events e
         JOIN hosts h ON e.host_id = h.id
         WHERE e.status = 'enabled'
         AND e.start_date <= NOW()
         AND e.end_date >= NOW()
         ORDER BY e.created_at DESC
         LIMIT 1`
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const event = result.rows[0];
      
      // Transform the event data for the response
      return {
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
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error getting current event:', error);
    return null;
  }
}

/**
 * Format a date to ISO string without milliseconds
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Validate a phone number
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidPhoneNumber(phoneNumber) {
  if (!phoneNumber) return true; // Optional field
  return /^\+?[\d\s()-]{8,15}$/.test(phoneNumber);
}

/**
 * Validate an email address
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Generate a response object with CORS headers
 * @param {number} statusCode - HTTP status code
 * @param {Object} body - Response body
 * @returns {Object} Response object
 */
function createResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  };
}

/**
 * Parse request body safely
 * @param {string} body - Request body
 * @returns {Object} Parsed body or empty object if invalid
 */
function parseRequestBody(body) {
  try {
    return JSON.parse(body || '{}');
  } catch (error) {
    console.error('Error parsing request body:', error);
    return {};
  }
}

module.exports = {
  getCurrentEvent,
  formatDate,
  isValidPhoneNumber,
  isValidEmail,
  createResponse,
  parseRequestBody
};
