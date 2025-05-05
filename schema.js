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
        date_of_birth DATE,
        event_id INTEGER REFERENCES events(id),
        check_in_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'checked-in',
        send_updates BOOLEAN DEFAULT FALSE
      )
    `);
    
    // Create visitor directory table
    await db.query(`
      CREATE TABLE IF NOT EXISTS visitor_directory (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        email VARCHAR(100),
        phone VARCHAR(20) NOT NULL UNIQUE,
        address TEXT,
        date_of_birth DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create scheduled events table
    await db.query(`
      CREATE TABLE IF NOT EXISTS scheduled_events (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        location VARCHAR(100),
        start_date TIMESTAMP WITH TIME ZONE NOT NULL,
        end_date TIMESTAMP WITH TIME ZONE NOT NULL,
        created_by INTEGER REFERENCES users(id),
        updated_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'active',
        is_recurring BOOLEAN DEFAULT FALSE,
        recurrence_type VARCHAR(20),
        recurrence_interval INTEGER,
        recurrence_days INTEGER[],
        recurrence_end_date TIMESTAMP WITH TIME ZONE
      )
    `);
    
    // Create scheduled event instances table (for recurring events)
    await db.query(`
      CREATE TABLE IF NOT EXISTS scheduled_event_instances (
        id SERIAL PRIMARY KEY,
        scheduled_event_id INTEGER REFERENCES scheduled_events(id) ON DELETE CASCADE,
        start_date TIMESTAMP WITH TIME ZONE NOT NULL,
        end_date TIMESTAMP WITH TIME ZONE NOT NULL,
        status VARCHAR(20) DEFAULT 'scheduled',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create event registrations table
    await db.query(`
      CREATE TABLE IF NOT EXISTS event_registrations (
        id SERIAL PRIMARY KEY,
        visitor_id INTEGER REFERENCES visitor_directory(id) ON DELETE CASCADE,
        event_instance_id INTEGER REFERENCES scheduled_event_instances(id) ON DELETE CASCADE,
        registration_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'registered',
        notes TEXT,
        UNIQUE(visitor_id, event_instance_id)
      )
    `);
    
    // Create members table
    await db.query(`
      CREATE TABLE IF NOT EXISTS members (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        date_of_birth DATE,
        address TEXT,
        phone VARCHAR(20) NOT NULL UNIQUE,
        tags TEXT[],
        picture_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES users(id)
      )
    `);
    
    // Create teams table
    await db.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        picture_url TEXT,
        director_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create team_members join table
    await db.query(`
      CREATE TABLE IF NOT EXISTS team_members (
        id SERIAL PRIMARY KEY,
        team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
        member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(team_id, member_id)
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