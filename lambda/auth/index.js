const { connectToDatabase } = require('../shared/db');
const { generateToken, hashPassword, comparePassword } = require('../shared/auth');
const { v4: uuidv4 } = require('uuid');

/**
 * Lambda function to handle authentication (login, register, get current user)
 * @param {Object} event - API Gateway event object
 * @returns {Object} API response
 */
exports.handler = async (event) => {
  // Set up CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'
      },
      body: ''
    };
  }
  
  try {
    // Get path and method from the event
    const path = event.path;
    const method = event.httpMethod;
    
    // Connect to database
    const client = await connectToDatabase();
    
    try {
      // Route requests based on path and method
      if (path === '/auth/login' && method === 'POST') {
        // Handle login
        return await handleLogin(event, client, headers);
      } else if (path === '/auth/register' && method === 'POST') {
        // Handle registration
        return await handleRegistration(event, client, headers);
      } else if (path === '/auth/me' && method === 'GET') {
        // Handle get current user
        return await handleGetCurrentUser(event, client, headers);
      } else if (path === '/auth/logout' && method === 'POST') {
        // Handle logout (not much to do server-side with JWTs)
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'Logged out successfully' })
        };
      } else {
        // Handle unknown route
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'Endpoint not found' })
        };
      }
    } finally {
      // Release client
      client.release();
    }
  } catch (error) {
    console.error('Authentication error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        status: 'error',
        message: 'An unexpected error occurred'
      })
    };
  }
};

/**
 * Handle user login
 * @param {Object} event - API Gateway event
 * @param {Object} client - Database client
 * @param {Object} headers - Response headers
 * @returns {Object} API response
 */
async function handleLogin(event, client, headers) {
  const requestBody = JSON.parse(event.body || '{}');
  const { username, password } = requestBody;
  
  // Validate request
  if (!username || !password) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        status: 'error',
        message: 'Username and password are required'
      })
    };
  }
  
  // Find user by username
  const userResult = await client.query(
    'SELECT * FROM hosts WHERE username = $1',
    [username]
  );
  
  if (userResult.rows.length === 0) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        status: 'error',
        message: 'Invalid username or password'
      })
    };
  }
  
  const user = userResult.rows[0];
  
  // Verify password
  const passwordValid = await comparePassword(password, user.password_hash);
  
  if (!passwordValid) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        status: 'error',
        message: 'Invalid username or password'
      })
    };
  }
  
  // Generate JWT token
  const token = generateToken(user);
  
  // Format user response (exclude sensitive data)
  const userResponse = {
    id: user.id,
    username: user.username,
    hostName: user.host_name,
    email: user.email,
    createdAt: user.created_at,
    socialMedia: user.social_media,
    token
  };
  
  // Set cookie with JWT token
  const cookie = `auth_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`;
  
  return {
    statusCode: 200,
    headers: {
      ...headers,
      'Set-Cookie': cookie
    },
    body: JSON.stringify(userResponse)
  };
}

/**
 * Handle user registration
 * @param {Object} event - API Gateway event
 * @param {Object} client - Database client
 * @param {Object} headers - Response headers
 * @returns {Object} API response
 */
async function handleRegistration(event, client, headers) {
  const requestBody = JSON.parse(event.body || '{}');
  const { username, password, hostName, email } = requestBody;
  
  // Validate request
  if (!username || !password || !hostName || !email) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        status: 'error',
        message: 'Username, password, host name, and email are required'
      })
    };
  }
  
  // Check if username already exists
  const existingUserResult = await client.query(
    'SELECT * FROM hosts WHERE username = $1',
    [username]
  );
  
  if (existingUserResult.rows.length > 0) {
    return {
      statusCode: 409,
      headers,
      body: JSON.stringify({
        status: 'error',
        message: 'Username already exists'
      })
    };
  }
  
  // Check if email already exists
  const existingEmailResult = await client.query(
    'SELECT * FROM hosts WHERE email = $1',
    [email]
  );
  
  if (existingEmailResult.rows.length > 0) {
    return {
      statusCode: 409,
      headers,
      body: JSON.stringify({
        status: 'error',
        message: 'Email already exists'
      })
    };
  }
  
  try {
    // Begin transaction
    await client.query('BEGIN');
    
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Create default social media links
    const socialMedia = {
      facebook: null,
      instagram: null,
      youtube: null
    };
    
    // Generate a unique ID
    const userId = uuidv4();
    
    // Insert new host
    const result = await client.query(
      `INSERT INTO hosts (
        id, username, password_hash, host_name, email, social_media, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        userId,
        username,
        passwordHash,
        hostName,
        email,
        socialMedia,
        new Date(),
        new Date()
      ]
    );
    
    // Commit transaction
    await client.query('COMMIT');
    
    const newUser = result.rows[0];
    
    // Generate JWT token
    const token = generateToken(newUser);
    
    // Format user response (exclude sensitive data)
    const userResponse = {
      id: newUser.id,
      username: newUser.username,
      hostName: newUser.host_name,
      email: newUser.email,
      createdAt: newUser.created_at,
      socialMedia: newUser.social_media,
      token
    };
    
    // Set cookie with JWT token
    const cookie = `auth_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`;
    
    return {
      statusCode: 201,
      headers: {
        ...headers,
        'Set-Cookie': cookie
      },
      body: JSON.stringify(userResponse)
    };
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    throw error;
  }
}

/**
 * Handle get current user
 * @param {Object} event - API Gateway event
 * @param {Object} client - Database client
 * @param {Object} headers - Response headers
 * @returns {Object} API response
 */
async function handleGetCurrentUser(event, client, headers) {
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
  
  if (!token) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        status: 'error',
        message: 'Authentication required'
      })
    };
  }
  
  try {
    // Verify and decode token
    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const userResult = await client.query(
      'SELECT * FROM hosts WHERE id = $1',
      [decoded.userId]
    );
    
    if (userResult.rows.length === 0) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          status: 'error',
          message: 'Invalid or expired session'
        })
      };
    }
    
    const user = userResult.rows[0];
    
    // Format user response (exclude sensitive data)
    const userResponse = {
      id: user.id,
      username: user.username,
      hostName: user.host_name,
      email: user.email,
      createdAt: user.created_at,
      socialMedia: user.social_media
    };
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(userResponse)
    };
  } catch (error) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        status: 'error',
        message: 'Invalid or expired session'
      })
    };
  }
}
