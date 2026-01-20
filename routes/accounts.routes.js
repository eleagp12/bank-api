const express = require('express');
const pool = require('../db');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');

const router = express.Router();

/* =========================
   GET ACCOUNT + TRANSACTIONS
========================= */
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    if (req.user.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const accountRes = await pool.query(
      `SELECT id, balance, interest_rate FROM accounts WHERE user_id = $1`,
      [userId],
    );

    if (accountRes.rowCount === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const account = accountRes.rows[0];

    const txRes = await pool.query(
      `SELECT amount, type, created_at
       FROM transactions
       WHERE account_id = $1
       ORDER BY created_at`,
      [account.id],
    );

    res.json({
      id: account.id,
      balance: Number(account.balance),
      interestRate: Number(account.interest_rate),
      movements: txRes.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Load failed' });
  }
});

/* =========================
   TRANSFER MONEY
========================= */
router.post('/:accountId/transfer', authenticateToken, async (req, res) => {
  const { accountId } = req.params;
  const { toUsername, amount } = req.body;

  if (!toUsername || amount <= 0) {
    return res.status(400).json({ error: 'Invalid transfer data' });
  }

  try {
    await pool.query('BEGIN');

    const senderRes = await pool.query(
      `SELECT id, balance FROM accounts WHERE id = $1`,
      [accountId],
    );

    if (senderRes.rowCount === 0) {
      throw new Error('Sender account not found');
    }

    const sender = senderRes.rows[0];

    if (sender.balance < amount) {
      throw new Error('Insufficient funds');
    }

    const receiverRes = await pool.query(
      `SELECT a.id FROM accounts a
       JOIN users u ON u.id = a.user_id
       WHERE u.username = $1`,
      [toUsername],
    );

    if (receiverRes.rowCount === 0) {
      throw new Error('Receiver not found');
    }

    const receiverId = receiverRes.rows[0].id;

    if (receiverId === accountId) {
      throw new Error('Cannot transfer to same account');
    }

    await pool.query(
      `UPDATE accounts SET balance = balance - $1 WHERE id = $2`,
      [amount, accountId],
    );

    await pool.query(
      `UPDATE accounts SET balance = balance + $1 WHERE id = $2`,
      [amount, receiverId],
    );

    await pool.query(
      `INSERT INTO transactions (account_id, amount, type)
       VALUES ($1, $2, 'transfer')`,
      [accountId, -amount],
    );

    await pool.query(
      `INSERT INTO transactions (account_id, amount, type)
       VALUES ($1, $2, 'transfer')`,
      [receiverId, amount],
    );

    await pool.query('COMMIT');
    res.json({ message: 'Transfer completed' });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  }
});

/* =========================
   REQUEST LOAN
========================= */
router.post('/:accountId/loan', authenticateToken, async (req, res) => {
  const { accountId } = req.params;
  const { amount } = req.body;

  if (amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  try {
    const accRes = await pool.query(
      `SELECT balance FROM accounts WHERE id = $1`,
      [accountId],
    );

    if (accRes.rowCount === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const balance = Number(accRes.rows[0].balance);

    if (req.user.role !== 'admin' && amount > balance * 0.1) {
      return res.status(403).json({ error: 'Loan denied' });
    }

    await pool.query(
      `UPDATE accounts SET balance = balance + $1 WHERE id = $2`,
      [amount, accountId],
    );

    await pool.query(
      `INSERT INTO transactions (account_id, amount, type)
       VALUES ($1, $2, 'loan')`,
      [accountId, amount],
    );

    res.json({ message: 'Loan approved' });
  } catch (err) {
    res.status(500).json({ error: 'Loan failed' });
  }
});

/* =========================
   ADMIN — CLOSE ACCOUNT
========================= */
router.delete(
  '/by-username',
  authenticateToken,
  authorizeAdmin,
  async (req, res) => {
    const { targetUsername } = req.body;

    try {
      const userRes = await pool.query(
        `SELECT id FROM users WHERE username = $1`,
        [targetUsername],
      );

      if (userRes.rowCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userId = userRes.rows[0].id;

      const accRes = await pool.query(
        `SELECT id FROM accounts WHERE user_id = $1`,
        [userId],
      );

      if (accRes.rowCount > 0) {
        const accId = accRes.rows[0].id;
        await pool.query(`DELETE FROM transactions WHERE account_id = $1`, [
          accId,
        ]);
        await pool.query(`DELETE FROM accounts WHERE id = $1`, [accId]);
      }

      await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);

      res.json({ message: 'Account closed' });
    } catch (err) {
      res.status(500).json({ error: 'Close failed' });
    }
  },
);

module.exports = router;
