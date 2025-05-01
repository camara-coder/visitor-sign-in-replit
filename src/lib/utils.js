/**
 * Utility functions for the application
 */

/**
 * Format a date to a readable string
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  if (!date) return '';
  const dateObj = new Date(date);
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Validate a phone number
 * @param {string} phoneNumber - The phone number to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function isValidPhoneNumber(phoneNumber) {
  if (!phoneNumber) return true; // Optional field
  // Basic phone validation - allows various formats with optional country code
  return /^\+?[\d\s()-]{8,15}$/.test(phoneNumber);
}

/**
 * Validate an email address
 * @param {string} email - The email to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function isValidEmail(email) {
  if (!email) return false;
  // Basic email validation
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Generate a short ID from a UUID
 * @param {string} uuid - The UUID to shorten
 * @param {number} length - The desired length
 * @returns {string} Shortened ID
 */
export function shortenUuid(uuid, length = 8) {
  if (!uuid) return '';
  return uuid.replace(/-/g, '').substring(0, length);
}

/**
 * Truncate a string if it's longer than maxLength
 * @param {string} str - The string to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated string
 */
export function truncateString(str, maxLength = 30) {
  if (!str || str.length <= maxLength) return str;
  return `${str.substring(0, maxLength)}...`;
}

/**
 * Safely parse JSON without throwing errors
 * @param {string} json - The JSON string to parse
 * @param {any} defaultValue - Default value if parsing fails
 * @returns {any} Parsed object or default value
 */
export function safeJsonParse(json, defaultValue = {}) {
  try {
    return JSON.parse(json);
  } catch (error) {
    console.error('JSON parsing error:', error);
    return defaultValue;
  }
}

/**
 * Format error message from API response
 * @param {Error} error - The error object
 * @returns {string} Formatted error message
 */
export function formatErrorMessage(error) {
  if (!error) return 'An unknown error occurred';
  
  if (error.response && error.response.data && error.response.data.message) {
    return error.response.data.message;
  }
  
  if (error.message) {
    // Clean up common error messages
    const msg = error.message.replace('Error: ', '');
    return msg.charAt(0).toUpperCase() + msg.slice(1); // Capitalize first letter
  }
  
  return 'An error occurred. Please try again.';
}

/**
 * Create a query string from an object of parameters
 * @param {Object} params - The parameters object
 * @returns {string} Query string
 */
export function createQueryString(params) {
  return Object.keys(params)
    .filter(key => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
}

/**
 * Parse URL query parameters into an object
 * @param {string} queryString - The query string to parse
 * @returns {Object} Parsed parameters object
 */
export function parseQueryString(queryString) {
  if (!queryString || queryString === '') return {};
  
  const params = {};
  const cleanQueryString = queryString.startsWith('?') 
    ? queryString.substring(1) 
    : queryString;
  
  cleanQueryString.split('&').forEach(param => {
    const [key, value] = param.split('=');
    if (key && value) {
      params[decodeURIComponent(key)] = decodeURIComponent(value);
    }
  });
  
  return params;
}

/**
 * Check if the current device is mobile
 * @returns {boolean} True if mobile, false otherwise
 */
export function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    window.navigator.userAgent
  );
}

/**
 * Get the base URL for the current environment
 * @returns {string} Base URL
 */
export function getBaseUrl() {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}
