const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const login = async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ username });
  if (!admin || !(await admin.matchPassword(password)))
    return res.status(401).json({ message: 'Invalid credentials' });

  const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, username: admin.username });
};

const register = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: 'Username and password are required' });
  if (password.length < 6)
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  const exists = await Admin.findOne({ username });
  if (exists) return res.status(409).json({ message: 'Username already taken' });
  await Admin.create({ username, password });
  res.status(201).json({ message: 'Account created successfully' });
};

const seed = async (req, res) => {
  const exists = await Admin.findOne({ username: 'admin' });
  if (exists) return res.json({ message: 'Admin already exists' });
  await Admin.create({ username: 'admin', password: 'temple@123' });
  res.json({ message: 'Admin created: admin / temple@123' });
};

module.exports = { login, register, seed };
