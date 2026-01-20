require('dotenv').config();
const pool = require('../db');
const bcrypt = require('bcrypt');

(async () => {
  const pinHash = await bcrypt.hash('4444', 10);

  const user = await pool.query(
    'INSERT INTO users(username, full_name, pin_hash) VALUES ($1,$2,$3) RETURNING id',
    ['pa', 'Panameño', pinHash],
  );

  await pool.query(
    'INSERT INTO accounts(user_id, interest_rate, balance) VALUES ($1,$2,$3)',
    [user.rows[0].id, 1.2, 0],
  );

  console.log('Seed completed');
  process.exit();
})();
