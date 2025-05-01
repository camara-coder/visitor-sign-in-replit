const db = require('./database');

// Create tables if they don't exist
async function setupDatabase() {
  try {
    // Create users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        organization_name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create events table
    await db.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        description TEXT,
        organization_id INTEGER REFERENCES users(id),
        status VARCHAR(20) NOT NULL DEFAULT 'disabled',
        location VARCHAR(100),
        start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        end_date TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create visitors table
    await db.query(`
      CREATE TABLE IF NOT EXISTS visitors (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        email VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        address TEXT,
        event_id INTEGER REFERENCES events(id),
        check_in_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'checked-in',
        send_updates BOOLEAN DEFAULT FALSE
      )
    `);
    
    console.log('Database schema setup completed successfully');
    
    // Check if default admin user exists, if not create one
    const adminExists = await db.query('SELECT * FROM users WHERE username = $1', ['admin']);
    if (adminExists.rows.length === 0) {
      await db.query(
        'INSERT INTO users (username, password, organization_name) VALUES ($1, $2, $3)',
        ['admin', 'password', 'Demo Organization']
      );
      console.log('Default admin user created');
    }
    
  } catch (error) {
    console.error('Error setting up database schema:', error);
  }
}

module.exports = { setupDatabase };