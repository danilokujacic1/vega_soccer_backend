require('dotenv').config();
const express = require('express')
const app = express()
const pool = require('./config/database')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const cors = require('cors')
const port = 3000

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('ERROR: JWT_SECRET is not defined in environment variables');
  process.exit(1);
}



app.use(cors({
    origin: '*', // Allow all origins
})); // Add this line
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};


app.get('/matches', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM matches ORDER BY match_date DESC'
    );

    res.json({
      message: 'Matches retrieved successfully',
      count: result.rows.length,
      matches: result.rows
    });
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/players', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM players ORDER BY victories DESC'
    );

    res.json({
      message: 'Players retrieved successfully',
      count: result.rows.length,
      players: result.rows
    });
  } catch (error) {
    console.error('Get players error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
})

app.post('/log-match', authenticateToken, async (req, res) => {
    try {
    const { first_player, second_player, first_player_score, second_player_score } = req.body;

    // Validation
    if (!first_player || !second_player || first_player_score === undefined || second_player_score === undefined) {
      return res.status(400).json({ message: 'All fields are required: first_player, second_player, first_player_score, second_player_score' });
    }

    // Check if players are different
    if (first_player === second_player) {
      return res.status(400).json({ message: 'Players must be different' });
    }

    // Validate scores are numbers
    if (typeof first_player_score !== 'number' || typeof second_player_score !== 'number') {
      return res.status(400).json({ message: 'Scores must be numbers' });
    }

    // Insert match into database
    const result = await pool.query(
      'INSERT INTO matches (first_player_name, second_player_name, first_player_score, second_player_score) VALUES ($1, $2, $3, $4) RETURNING *',
      [first_player, second_player, first_player_score, second_player_score]
    );

    // Determine winner and update victories
    if (first_player_score > second_player_score) {
      await pool.query(
        'UPDATE players SET victories = victories + 1 WHERE name = $1',
        [first_player]
      );
    } else if (second_player_score > first_player_score) {
      await pool.query(
        'UPDATE players SET victories = victories + 1 WHERE name = $1',
        [second_player]
      );
    }

    res.status(201).json({
      message: 'Match logged successfully',
      match: result.rows[0]
    });
  } catch (error) {
    console.error('Log match error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
})

app.get('/logged-in', authenticateToken, (req, res) => {
    return res.json({loggedIn: !!req.user})
})

app.post('/login', async (req, res) => {
    try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ 
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
})

app.listen(port, () => {
  console.log(`Listening on port: ${port}`)
})