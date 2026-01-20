require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const accountRoutes = require('./routes/accounts.routes'); // ← singular

const app = express();

app.use(cors());
app.use(express.json());

// SERVE FRONTEND
app.use(express.static(path.join(__dirname, 'public')));

// API ROUTES
app.use('/auth', authRoutes);
app.use('/accounts', accountRoutes);

// FRONTEND ENTRY
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
