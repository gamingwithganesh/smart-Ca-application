const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Simple admin password check middleware
const adminAuth = (req, res, next) => {
  const adminPass = req.headers['x-admin-password'];
  if (adminPass !== 'zintechca') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

router.post('/login', adminController.adminLogin);
router.get('/users', adminAuth, adminController.getAllUsers);
router.get('/users/:id', adminAuth, adminController.getUserDetail);
router.post('/users', adminAuth, adminController.createUser);
router.delete('/users/:id', adminAuth, adminController.deleteUser);

module.exports = router;
