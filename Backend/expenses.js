import express from 'express';
import db from './db.js';
import requireAuth from './middleware.js';

const router = express.Router();
router.use(requireAuth);

// ---------- GET OVERALL USER BALANCE ACROSS ALL GROUPS ----------
router.get('/user-balance', (req, res) => {
  try {
    const userId = req.userId || (req.user && req.user.id);

    if (!userId) {
      return res.status(401).json({ error: 'User context missing from request' });
    }

    const userGroups = db.prepare(`
      SELECT DISTINCT group_id 
      FROM group_members 
      WHERE user_id = ?
    `).all(userId);

    let youOwe = 0;
    let youAreOwed = 0;

    for (const group of userGroups) {
      const balances = calculateBalances(group.group_id);
      const userBalanceObj = balances.find(b => b.userId === userId);

      if (userBalanceObj) {
        const bal = userBalanceObj.balance;
        if (bal > 0) {
          youAreOwed += bal;
        } else if (bal < 0) {
          youOwe += Math.abs(bal);
        }
      }
    }

    const netBalance = youAreOwed - youOwe;

    return res.json({
      netBalance: Math.round(netBalance * 100) / 100,
      youOwe: Math.round(youOwe * 100) / 100,
      youAreOwed: Math.round(youAreOwed * 100) / 100
    });
  } catch (error) {
    console.error('Error fetching overall user balance:', error);
    return res.status(500).json({ error: 'Failed to calculate overall user balance' });
  }
});

// ---------- ADD AN EXPENSE ----------
router.post('/:groupId/expenses', (req, res) => {
  const groupId = req.params.groupId;
  const { amount, description, payerId, splitType, participants } = req.body;

  if (!amount || !payerId || !splitType || !participants || participants.length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  let shares = [];

  if (splitType === 'EQUAL') {
    const perPerson = amount / participants.length;
    shares = participants.map(p => ({ userId: p.userId, share: perPerson }));
  } else if (splitType === 'EXACT') {
    const total = participants.reduce((sum, p) => sum + p.amount, 0);
    if (Math.abs(total - amount) > 0.01) {
      return res.status(400).json({ error: 'Exact amounts must sum to total expense amount' });
    }
    shares = participants.map(p => ({ userId: p.userId, share: p.amount }));
  } else if (splitType === 'PERCENT') {
    const totalPercent = participants.reduce((sum, p) => sum + p.percent, 0);
    if (Math.abs(totalPercent - 100) > 0.01) {
      return res.status(400).json({ error: 'Percentages must sum to 100' });
    }
    shares = participants.map(p => ({ userId: p.userId, share: (p.percent / 100) * amount }));
  } else {
    return res.status(400).json({ error: 'Invalid split type' });
  }

  const expenseStmt = db.prepare(`
    INSERT INTO expenses (group_id, payer_id, amount, description, split_type)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = expenseStmt.run(groupId, payerId, amount, description || '', splitType);
  const expenseId = result.lastInsertRowid;

  const shareStmt = db.prepare(`
    INSERT INTO expense_shares (expense_id, user_id, share_amount) VALUES (?, ?, ?)
  `);
  for (const s of shares) {
    shareStmt.run(expenseId, s.userId, s.share);
  }

  res.status(201).json({ id: expenseId, amount, description, splitType, shares });
});

// ---------- GET LEDGER (all expenses in a group) ----------
router.get('/:groupId/expenses', (req, res) => {
  const groupId = req.params.groupId;
  const { userId, fromDate, toDate } = req.query;

  let query = `
    SELECT expenses.*, users.name as payerName
    FROM expenses
    JOIN users ON users.id = expenses.payer_id
    WHERE expenses.group_id = ?
  `;
  const params = [groupId];

  if (fromDate) {
    query += ' AND date >= ?';
    params.push(fromDate);
  }
  if (toDate) {
    query += ' AND date <= ?';
    params.push(toDate);
  }

  query += ' ORDER BY id DESC';

  let expenses = db.prepare(query).all(...params);

  if (userId) {
    const involvedExpenseIds = db.prepare(
      'SELECT expense_id FROM expense_shares WHERE user_id = ?'
    ).all(userId).map(row => row.expense_id);
    expenses = expenses.filter(e => involvedExpenseIds.includes(e.id));
  }

  res.json(expenses);
});

// ---------- GET NET BALANCES FOR EVERY USER IN A GROUP ----------
router.get('/:groupId/balances', (req, res) => {
  const groupId = req.params.groupId;
  res.json(calculateBalances(groupId));
});

// ---------- GET SETTLEMENT PLAN ----------
router.get('/:groupId/settlements', (req, res) => {
  const groupId = req.params.groupId;
  const balances = calculateBalances(groupId);
  const settlements = computeSettlements(balances);
  res.json(settlements);
});

// ---------- RECORD A SETTLEMENT (SETTLE UP DEBT) ----------
router.post('/:groupId/settle', (req, res) => {
  const groupId = req.params.groupId;
  const { payerId, receiverId, amount } = req.body;

  const pId = parseInt(payerId);
  const rId = parseInt(receiverId);
  const amt = parseFloat(amount);

  if (isNaN(pId) || isNaN(rId) || isNaN(amt) || amt <= 0) {
    return res.status(400).json({ error: 'Valid numeric payerId, receiverId, and positive amount are required.' });
  }

  if (pId === rId) {
    return res.status(400).json({ error: 'Payer and receiver cannot be the same user.' });
  }

  try {
    const currentDate = new Date().toISOString();
    let result;

    // Uses 'EXACT' as split_type to pass SQLite CHECK constraints cleanly
    try {
      const expenseStmt = db.prepare(`
        INSERT INTO expenses (group_id, payer_id, amount, description, split_type, date)
        VALUES (?, ?, ?, 'Settlement Payment', 'EXACT', ?)
      `);
      result = expenseStmt.run(groupId, pId, amt, currentDate);
    } catch (dbErr) {
      const fallbackStmt = db.prepare(`
        INSERT INTO expenses (group_id, payer_id, amount, description, split_type)
        VALUES (?, ?, ?, 'Settlement Payment', 'EXACT')
      `);
      result = fallbackStmt.run(groupId, pId, amt);
    }

    const expenseId = result.lastInsertRowid;

    // Assign full settlement share to the receiver to cancel out net debt
    const shareStmt = db.prepare(`
      INSERT INTO expense_shares (expense_id, user_id, share_amount)
      VALUES (?, ?, ?)
    `);
    shareStmt.run(expenseId, rId, amt);

    return res.status(201).json({
      message: 'Settlement recorded successfully',
      expenseId,
      payerId: pId,
      receiverId: rId,
      amount: amt
    });
  } catch (error) {
    console.error('Error recording settlement:', error);
    return res.status(500).json({ error: `Database error: ${error.message}` });
  }
});

// ============================================================
// HELPER LOGIC FUNCTIONS
// ============================================================

function calculateBalances(groupId) {
  const members = db.prepare(`
    SELECT users.id, users.name
    FROM group_members
    JOIN users ON users.id = group_members.user_id
    WHERE group_members.group_id = ?
  `).all(groupId);

  const balances = {};
  members.forEach(m => balances[m.id] = { userId: m.id, name: m.name, balance: 0 });

  const expenses = db.prepare('SELECT * FROM expenses WHERE group_id = ?').all(groupId);
  for (const exp of expenses) {
    if (balances[exp.payer_id]) {
      balances[exp.payer_id].balance += exp.amount;
    }
  }

  const expenseIds = expenses.map(e => e.id);
  if (expenseIds.length > 0) {
    const placeholders = expenseIds.map(() => '?').join(',');
    const shares = db.prepare(
      `SELECT * FROM expense_shares WHERE expense_id IN (${placeholders})`
    ).all(...expenseIds);

    for (const s of shares) {
      if (balances[s.user_id]) {
        balances[s.user_id].balance -= s.share_amount;
      }
    }
  }

  return Object.values(balances);
}

function computeSettlements(balances) {
  const creditors = balances
    .filter(b => b.balance > 0.01)
    .map(b => ({ ...b }))
    .sort((a, b) => b.balance - a.balance);

  const debtors = balances
    .filter(b => b.balance < -0.01)
    .map(b => ({ ...b }))
    .sort((a, b) => a.balance - b.balance);

  const settlements = [];
  let i = 0, j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const amount = Math.min(-debtor.balance, creditor.balance);

    settlements.push({
      from: debtor.name,
      fromId: debtor.userId,
      to: creditor.name,
      toId: creditor.userId,
      amount: Math.round(amount * 100) / 100
    });

    debtor.balance += amount;
    creditor.balance -= amount;

    if (Math.abs(debtor.balance) < 0.01) i++;
    if (Math.abs(creditor.balance) < 0.01) j++;
  }

  return settlements;
}

export default router;