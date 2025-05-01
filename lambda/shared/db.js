const { Pool } = require('pg');

// Database connection configuration
const dbConfig = {
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: {
    rejectUnauthorized: false // Required for some PostgreSQL providers like RDS
  }
};

// Create a connection pool
const pool = new Pool(dbConfig);

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Connect to the database and return a client
 * @returns {Promise<Object>} Database client
 */
async function connectToDatabase() {
  try {
    return await pool.connect();
  } catch (error) {
    console.error('Error connecting to database:', error);
    throw error;
  }
}

/**
 * Execute a query with parameters
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
async function executeQuery(text, params = []) {
  const client = await connectToDatabase();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

/**
 * Check if database connection is working
 * @returns {Promise<boolean>} True if connected, false otherwise
 */
async function testConnection() {
  try {
    const result = await executeQuery('SELECT NOW()');
    return result.rows.length > 0;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

module.exports = {
  connectToDatabase,
  executeQuery,
  testConnection,
  pool
};
