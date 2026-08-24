import { Router } from 'express';
import pool from '../db';

const router = Router();

// GET /api/users
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM "user" ORDER BY uid'
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});


// GET /api/users/:uid
router.get('/:uid', async (req, res) => {
  try {
    const { uid } = req.params;

    const result = await pool.query(
      'SELECT * FROM "user" WHERE uid = $1',
      [uid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});


// POST /api/users
router.post('/', async (req, res) => {
  try {
    const {
      uid,
      email,
      username,
      current_card_skin,
      current_table_skin
    } = req.body;

    const result = await pool.query(
      `INSERT INTO "user"
       (uid, email, username, current_card_skin, current_table_skin)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        uid,
        email,
        username,
        current_card_skin,
        current_table_skin
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});


// PUT /api/users/:uid
router.put('/:uid', async (req, res) => {
  try {
    const { uid } = req.params;

    const {
      email,
      username,
      current_card_skin,
      current_table_skin
    } = req.body;

    const result = await pool.query(
      `UPDATE "user"
       SET email = $1,
           username = $2,
           current_card_skin = $3,
           current_table_skin = $4
       WHERE uid = $5
       RETURNING *`,
      [
        email,
        username,
        current_card_skin,
        current_table_skin,
        uid
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});


// DELETE /api/users/:uid
router.delete('/:uid', async (req, res) => {
  try {
    const { uid } = req.params;

    const result = await pool.query(
      'DELETE FROM "user" WHERE uid = $1 RETURNING *',
      [uid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      message: 'User deleted successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;