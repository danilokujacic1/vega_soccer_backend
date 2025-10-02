// scripts/seed.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/database');

if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
  console.error('Username and password for admin must be provided');
  process.exit(1);
}

const seedUsers = [
  {
    username: process.env.ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD
  },
  
];

const seedPlayers = [
  { name: 'Vesko Lazarevic', victories: 0 },
  { name: 'Danilo Kujacic', victories: 0 },
  { name: 'Danilo Zagarcanin', victories: 0 },
  { name: 'Predrag Zunjic', victories: 0 },
  { name: 'Marko Cekaj', victories: 0 },
  { name: 'Stefan Braunovic', victories: 0 },
  { name: 'Milos Ivanis', victories: 0 }
];


const seed = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Clear existing users (optional - comment out if you want to keep existing data)
    await pool.query('DELETE FROM users');
    console.log('🗑️  Cleared existing users');
    
    // Insert seed users
    for (const user of seedUsers) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      await pool.query(
        'INSERT INTO users (username, password) VALUES ($1, $2)',
        [user.username, hashedPassword]
      );
      
      console.log(`✅ Created user: ${user.username} (${user.email})`);
    }

      for (const player of seedPlayers) {
      await pool.query(
        'INSERT INTO players (name, victories) VALUES ($1, $2)',
        [player.name, player.victories]
      );
      
      console.log(`✅ Created player: ${player.name}`);
    }
    
    console.log('✨ Database seeding completed successfully!');
    console.log('\n📝 You can login with these credentials:');
    seedUsers.forEach(user => {
      console.log(`   Username: ${user.username} | Password: ${user.password}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seed();