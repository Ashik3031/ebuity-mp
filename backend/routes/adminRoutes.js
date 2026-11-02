// routes/adminRoutes.js
import express from 'express';
import { registerAdmin, loginAdmin, logoutAdmin, getAdminData, getDashboardStats } from '../controllers/adminController.js';
import adminAuth from '../middlewares/adminAuth.middleware.js';

const router = express.Router();

// Register new admin
router.post('/register', registerAdmin);

// Login admin (sets admin_token cookie)
router.post('/login', loginAdmin);

// Logout admin (clears admin_token)
router.post('/logout', logoutAdmin);

// ✅ Verify admin login status (requires valid admin_token)
router.get('/is-auth', adminAuth, (req, res) => {
  // adminAuth verified token and loaded req.admin
  return res.status(200).json({
    success: true,
    message: 'Authenticated',
    adminId: req.admin._id,
    admin: req.admin,
  });
});

// ✅ Get current admin data (refresh-safe, requires admin_token)
router.get('/data', adminAuth, getAdminData);

// ✅ Get overview dashboard statistics (real metrics)
router.get('/dashboard/stats', adminAuth, getDashboardStats);

export default router;

