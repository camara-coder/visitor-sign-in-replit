const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Initialize PostgreSQL connection pool
const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

// JWT secret (should be in environment variable in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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
 * Lambda function to authenticate a user
 * 
 * @param {Object} event - API Gateway Lambda Proxy Input
 * @returns {Object} Response object with authentication result
 */
exports.handler = async (event) => {
  try {
    // Parse the request body
    const requestBody = JSON.parse(event.body);
    const { username, password } = requestBody;
    
    if (!username || !password) {
      return createResponse(400, {
        error: 'missing_parameters',
        message: 'Username and password are required'
      });
    }
    
    // Find the user by username
    const query = `
      SELECT id, username, password_hash, organization_name, created_at
      FROM users
      WHERE username = $1
    `;
    
    const result = await pool.query(query, [username]);
    
    if (result.rows.length === 0) {
      return createResponse(401, {
        error: 'invalid_credentials',
        message: 'Invalid username or password'
      });
    }
    
    const user = result.rows[0];
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      return createResponse(401, {
        error: 'invalid_credentials',
        message: 'Invalid username or password'
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        sub: user.id,
        username: user.username
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Return user info and token
    return createResponse(200, {
      id: user.id,
      username: user.username,
      organizationName: user.organization_name,
      createdAt: user.created_at,
      token
    });
    
  } catch (error) {
    console.error('Error during login:', error);
    
    return createResponse(500, {
      error: 'internal_error',
      message: 'An error occurred during login'
    });
  }
};
