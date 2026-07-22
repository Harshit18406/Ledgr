import express from 'express';
import db from './db.js';
import requireAuth from './middleware.js';

const router = express.Router();
router.use(requireAuth);

// Get all groups for the logged-in user
router.get('/', (req, res) => {
  try {
    const groups = db.prepare(`
      SELECT g.* 
      FROM groups g
      JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = ?
      ORDER BY g.created_at DESC
    `).all(req.userId);

    res.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Create a new group & auto-add creator as member
router.post('/', (req, res) => {
  const { name, description } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Group name is required' });
  }

  // Fallback check to ensure authentication attached req.userId
  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized: Missing user authentication token' });
  }

  try {
    // Wrap both DB writes into a single atomic transaction
    const createGroupTransaction = db.transaction((groupName, groupDesc, userId) => {
      // 1. Insert Group
      const result = db
        .prepare('INSERT INTO groups (name, description, created_by) VALUES (?, ?, ?)')
        .run(groupName, groupDesc, userId);

      const groupId = result.lastInsertRowid;

      // 2. Add creator to group_members
      db.prepare('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)').run(groupId, userId);

      return groupId;
    });

    // Execute the transaction
    const groupId = createGroupTransaction(name.trim(), description ? description.trim() : '', req.userId);

    res.status(201).json({ 
      id: groupId, 
      name, 
      description: description || '', 
      created_by: req.userId 
    });

  } catch (error) {
    console.error('CRITICAL: Error creating group:', error.message);
    res.status(500).json({ error: `Database error: ${error.message}` });
  }
});

// Get Single Group details + Member List
router.get('/:id', (req, res) => {
  const groupId = req.params.id;

  try {
    const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const members = db.prepare(`
      SELECT u.id, u.name, u.email
      FROM users u
      JOIN group_members gm ON u.id = gm.user_id
      WHERE gm.group_id = ?
    `).all(groupId);

    res.json({ ...group, members });
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ error: 'Failed to fetch group' });
  }
});

// Add Member to Group by Email
router.post('/:id/members', (req, res) => {
  const groupId = req.params.id;
  const { email } = req.body;

  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const user = db.prepare('SELECT id, name, email FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(404).json({ error: 'User with this email not found. Make sure they registered first.' });
    }

    const existing = db.prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, user.id);
    if (existing) {
      return res.status(400).json({ error: 'User is already a member of this group' });
    }

    db.prepare('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)').run(groupId, user.id);

    res.status(201).json({ message: 'Member added successfully', user });
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// Record a Settle Up Payment between two users
router.post('/:id/settle', (req, res) => {
  const groupId = req.params.id;
  const { payerId, receiverId, amount } = req.body;

  const numericAmount = parseFloat(amount);

  if (!payerId || !receiverId || isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: 'Valid payer, receiver, and positive amount are required.' });
  }

  try {
    const settleTransaction = db.transaction(() => {
      // 1. Insert settlement record into expenses table
      const insertExpense = db.prepare(`
        INSERT INTO expenses (group_id, payer_id, amount, description, split_type)
        VALUES (?, ?, ?, 'Settle Up Payment', 'SETTLEMENT')
      `);
      const result = insertExpense.run(groupId, payerId, numericAmount);
      const expenseId = result.lastInsertRowid;

      // 2. Assign 100% share to the receiver to offset debt
      db.prepare(`
        INSERT INTO expense_shares (expense_id, user_id, share_amount)
        VALUES (?, ?, ?)
      `).run(expenseId, receiverId, numericAmount);

      return expenseId;
    });

    const expenseId = settleTransaction();

    res.status(201).json({
      message: 'Settlement recorded successfully',
      expenseId
    });
  } catch (error) {
    console.error('Error settling up:', error);
    res.status(500).json({ error: 'Failed to record settlement' });
  }
});

export default router;