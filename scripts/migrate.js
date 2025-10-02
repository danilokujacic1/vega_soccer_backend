// scripts/migrate.js
require('dotenv').config();
const pool = require('../config/database');

// Drop all tables (use with caution!)
const dropTables = async () => {
  console.log('🗑️  Dropping existing tables...');
  
  await pool.query('DROP TABLE IF EXISTS matches CASCADE');
  await pool.query('DROP TABLE IF EXISTS players CASCADE');
  await pool.query('DROP TABLE IF EXISTS users CASCADE');
  await pool.query('DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE');
  
  console.log('✅ Tables dropped successfully');
};

// Create users table
const createUsersTable = async () => {
  console.log('📝 Creating users table...');
  
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  await pool.query(query);
  console.log('✅ Users table created');
};

// Create players table
const createPlayersTable = async () => {
  console.log('📝 Creating players table...');
  
  const query = `
    CREATE TABLE IF NOT EXISTS players (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      victories INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  await pool.query(query);
  console.log('✅ Players table created');
};

// Create matches table
const createMatchesTable = async () => {
  console.log('📝 Creating matches table...');
  
  const query = `
    CREATE TABLE IF NOT EXISTS matches (
      id SERIAL PRIMARY KEY,
      first_player_name VARCHAR(100) NOT NULL,
      second_player_name VARCHAR(100) NOT NULL,
      first_player_score INTEGER NOT NULL,
      second_player_score INTEGER NOT NULL,
      match_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT different_players CHECK (first_player_name != second_player_name)
    );
  `;
  
  await pool.query(query);
  console.log('✅ Matches table created');
};

// Create indexes
const createIndexes = async () => {
  console.log('📝 Creating indexes...');
  
  // Users table indexes
  await pool.query('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
  
  // Players table indexes
  await pool.query('CREATE INDEX IF NOT EXISTS idx_players_name ON players(name)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_players_victories ON players(victories DESC)');
  
  // Matches table indexes
  await pool.query('CREATE INDEX IF NOT EXISTS idx_matches_first_player ON matches(first_player_name)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_matches_second_player ON matches(second_player_name)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date DESC)');
  
  console.log('✅ Indexes created');
};

// Create update timestamp function
const createUpdateFunction = async () => {
  console.log('📝 Creating update timestamp function...');
  
  const query = `
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';
  `;
  
  await pool.query(query);
  console.log('✅ Update function created');
};

// Create triggers
const createTriggers = async () => {
  console.log('📝 Creating triggers...');
  
  // Drop triggers if they exist
  await pool.query('DROP TRIGGER IF EXISTS update_users_updated_at ON users');
  await pool.query('DROP TRIGGER IF EXISTS update_players_updated_at ON players');
  
  // Create triggers for users table
  await pool.query(`
    CREATE TRIGGER update_users_updated_at 
      BEFORE UPDATE ON users 
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column()
  `);
  
  // Create triggers for players table
  await pool.query(`
    CREATE TRIGGER update_players_updated_at 
      BEFORE UPDATE ON players 
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column()
  `);
  
  console.log('✅ Triggers created');
};

// Verify tables were created
const verifyTables = async () => {
  console.log('\n🔍 Verifying tables...');
  
  const result = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `);
  
  console.log('📊 Tables in database:');
  result.rows.forEach(row => {
    console.log(`   ✓ ${row.table_name}`);
  });
};

// Main migration function
const migrate = async () => {
  try {
    console.log('🚀 Starting database migration...\n');
    
    // Check if we should drop existing tables
    const args = process.argv.slice(2);
    const shouldDrop = args.includes('--drop') || args.includes('-d');
    
    if (shouldDrop) {
      await dropTables();
      console.log('');
    }
    
    // Create tables
    await createUsersTable();
    await createPlayersTable();
    await createMatchesTable();
    
    console.log('');
    
    // Create indexes
    await createIndexes();
    
    console.log('');
    
    // Create function and triggers
    await createUpdateFunction();
    await createTriggers();
    
    // Verify everything was created
    await verifyTables();
    
    console.log('\n✨ Migration completed successfully!');
    console.log('💡 Run "npm run db:seed" to populate the database with sample data\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
};

// Run migration
migrate();