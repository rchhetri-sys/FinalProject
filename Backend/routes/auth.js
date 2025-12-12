import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import validator from 'validator';
import User from '../models/user.js';
import dotenv from 'dotenv';


dotenv.config();
const router = express.Router();


// POST /api/register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Missing fields' });
  }
  if (!validator.isEmail(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 7 characters' });
  }

  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'Email already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    user = new User({ username, email, password: hashed });
    await user.save();

    const payload = { user: { id: user.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '2h' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});


// POST /api/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Missing fields' });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    const payload = { user: { id: user.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '2h' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});


export default router;