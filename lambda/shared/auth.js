const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// JWT secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key-change-in-production';
const JWT_EXPIRATION = '24h'; // Token expires in 24 hours

/**
 * Generate a JWT token for a user
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
function generateToken(user) {
  const payload = {
    userId: user.id,
    username: user.username,
    hostName: user.host_name || user.hostName,
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
}

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded token payload or null if invalid
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Extract and verify token from API Gateway event
 * @param {Object} event - API Gateway event
 * @returns {Object|null} User information from token or null if invalid
 */
function extractAndVerifyToken(event) {
  try {
    // Extract token from Authorization header or cookies
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    const cookies = event.headers?.Cookie || event.headers?.cookie;
    
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (cookies) {
      const cookieParts = cookies.split(';');
      for (const part of cookieParts) {
        const [name, value] = part.trim().split('=');
        if (name === 'auth_token') {
          token = value;
          break;
        }
      }
    }
    
    if (!token) return null;
    
    // Verify token
    return verifyToken(token);
  } catch (error) {
    console.error('Error extracting or verifying token:', error);
    return null;
  }
}

/**
 * Hash a password with bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Compare a password with a hash
 * @param {string} password - Plain text password
 * @param {string} hash - Password hash
 * @returns {Promise<boolean>} True if password matches hash
 */
async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

module.exports = {
  generateToken,
  verifyToken,
  extractAndVerifyToken,
  hashPassword,
  comparePassword
};
