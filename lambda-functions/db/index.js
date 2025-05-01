const { Pool } = require('pg');

// Initialize PostgreSQL connection pool with environment variables
const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

// Database initialization function
const initDatabase = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create users table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        organization_name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create events table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY,
        title VARCHAR(255),
        organization_name VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'enabled',
        start_date_time TIMESTAMP WITH TIME ZONE NOT NULL,
        end_date_time TIMESTAMP WITH TIME ZONE NOT NULL,
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        social_links JSONB
      )
    `);
    
    // Create visitors table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS visitors (
        id UUID PRIMARY KEY,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        address TEXT,
        phone_number VARCHAR(50),
        event_id UUID NOT NULL REFERENCES events(id),
        registration_time TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);
    
    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
      CREATE INDEX IF NOT EXISTS idx_visitors_event_id ON visitors(event_id);
      CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_visitor_event 
        ON visitors(event_id, LOWER(first_name), LOWER(last_name));
    `);
    
    await client.query('COMMIT');
    
    console.log('Database schema initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error initializing database schema:', error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  initDatabase
};
