const User = require('../models/User');
const Client = require('../models/Client');
const Document = require('../models/Document');
const bcrypt = require('bcryptjs');

const ADMIN_PASSWORD = 'zintechca';

// Verify admin password
exports.adminLogin = (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    return res.json({ success: true });
  }
  return res.status(401).json({ error: 'Invalid password' });
};

// Get all users with their client and document counts
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });

    const usersWithStats = await Promise.all(users.map(async (user) => {
      const clientCount = await Client.countDocuments({ createdBy: user._id });
      const clients = await Client.find({ createdBy: user._id }, '_id');
      const clientIds = clients.map(c => c._id);
      const docCount = await Document.countDocuments({ clientId: { $in: clientIds } });

      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        clientCount,
        docCount
      };
    }));

    res.json({ users: usersWithStats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single user details
exports.getUserDetail = async (req, res) => {
  try {
    const user = await User.findById(req.params.id, '-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const clients = await Client.find({ createdBy: user._id });
    const clientIds = clients.map(c => c._id);
    const docCount = await Document.countDocuments({ clientId: { $in: clientIds } });

    res.json({ user, clients, docCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new user
exports.createUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already exists' });

    const user = new User({ name, email, password });
    await user.save();

    res.status(201).json({
      message: 'User created successfully',
      user: { _id: user._id, name: user.name, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete user and all their data
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const clients = await Client.find({ createdBy: user._id });
    const clientIds = clients.map(c => c._id);

    await Document.deleteMany({ clientId: { $in: clientIds } });
    await Client.deleteMany({ createdBy: user._id });
    await User.findByIdAndDelete(user._id);

    res.json({ message: 'User and all associated data deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
