import express from 'express';
import cors from 'cors';
import authRoutes from './auth.js';
import groupRoutes from './groups.js';
import expenseRoutes from './expenses.js';

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);

app.get('/', (req, res) => {
  res.send('NovaSync API is running smoothly.');
});

app.listen(PORT, () => {
  console.log(`🚀 NovaSync Server running on http://localhost:${PORT}`);
});