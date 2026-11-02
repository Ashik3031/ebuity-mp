// controllers/adminController.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Admin from '../models/adminModel.js';
import Booking from '../models/Booking.js';
import Staff from '../models/Staff.js';
import Service from '../models/Service.js';
import ServiceCategory from '../models/ServiceCategory.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import userModel from '../models/userModel.js';
import NotificationLog from '../models/NotificationLog.js';

const JWT_SECRET = process.env.JWT_SECRET;

// Cookie options (dev: lax/http, prod: none/https)
const isProd = process.env.NODE_ENV === 'production';
const cookieOpts = {
  httpOnly: true,
  sameSite: isProd ? 'none' : 'lax',
  domain: isProd ? ".thabiokaluxurycloset.com" : undefined, 
  secure: isProd,
   path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  
};

// Register admin (no auto-login by default)
export const registerAdmin = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const existing = await Admin.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Admin already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const admin = await Admin.create({
      name,
      email,
      password: hashed,
      role: role || 'admin',
    });

    const { password: _pw, ...safe } = admin.toObject();
    return res.status(201).json({ success: true, message: 'Admin registered successfully', admin: safe });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// ✅ Login admin (sets admin_token)
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin) return res.status(400).json({ success: false, message: 'Invalid credentials' });

    if (admin.role !== 'admin' && !admin.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admins only' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign({ id: admin._id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '7d' });

    const { password: _pw, ...safe } = admin.toObject();

    return res
      .cookie('admin_token', token, cookieOpts)    // <— separate cookie
      .status(200)
      .json({ success: true, message: 'Login successful', admin: safe });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// ✅ Logout admin (clears admin_token)
export const logoutAdmin = (req, res) => {
  try {
 res.clearCookie("admin_token", {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
    domain: process.env.NODE_ENV === "production" ? ".thabiokaluxurycloset.com" : undefined,
    path: "/",
  });
      return res.status(200).json({ success: true, message: 'Logout successful' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// ✅ Current admin data (requires adminAuth which sets req.admin)
export const getAdminData = async (req, res) => {
  try {
    if (!req.admin) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const { password, ...safe } = req.admin.toObject();
    return res.status(200).json({ success: true, admin: safe });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// ✅ Comprehensive Dashboard Overview Metrics
export const getDashboardStats = async (req, res) => {
  try {
    const isDbConnected = mongoose.connection.readyState === 1;
    const { range = '6m' } = req.query;

    if (!isDbConnected) {
      return res.status(200).json({
        success: true,
        data: {
          metrics: {
            todayBookings: 0,
            upcomingBookings: 0,
            totalBookings: 0,
            totalCustomers: 0,
            activeStaff: 0,
            activeServices: 0,
            activeProducts: 0,
            lowStockCount: 0,
            outOfStockCount: 0,
            unassignedBookingsCount: 0,
            pendingApprovals: 0,
            totalRevenue: 0,
            currency: 'AED',
            revenueGrowth: 0,
          },
          charts: {
            bookingTrends: [],
            categoryDistribution: [],
            revenueTrends: [],
            bookingsByStatus: [],
          },
          recentActivities: [],
          upcomingAppointments: [],
          staffAvailability: {
            totalStaff: 0,
            activeStaff: 0,
            onDutyToday: 0,
            onLeaveToday: 0,
          },
          lowStockProducts: [],
          outOfStockProducts: [],
          pendingRequests: {
            cancellations: 0,
            reschedules: 0,
            flaggedAssignments: 0,
            unassignedBookings: 0,
          },
          isLiveDb: false,
        },
      });
    }

    // Current UAE Date string (YYYY-MM-DD, Asia/Dubai UTC+4)
    const now = new Date();
    const uaeOffsetMs = 4 * 60 * 60 * 1000;
    const uaeNow = new Date(now.getTime() + uaeOffsetMs);
    const todayStr = uaeNow.toISOString().split('T')[0];

    // Parallel metric counts
    const [
      todayBookingsCount,
      upcomingBookingsCount,
      totalBookingsCount,
      unassignedBookingsCount,
      activeStaffCount,
      totalStaffCount,
      activeServicesCount,
      activeProductsCount,
      totalCustomersCount,
      lowStockCount,
      outOfStockCount,
      flaggedBookingsCount,
      cancelledBookingsCount,
      pendingCancellationsCount,
      pendingReschedulesCount,
      allStaff,
      allCategories,
      lowStockProducts,
      outOfStockProducts,
      recentBookings,
      recentOrders,
      recentUsers,
      statusAggregation,
      failedNotificationsCount,
      pendingOrdersCount,
    ] = await Promise.all([
      Booking.countDocuments({ scheduledDate: todayStr, status: { $ne: 'cancelled' } }).catch(() => 0),
      Booking.countDocuments({ scheduledDate: { $gt: todayStr }, status: { $nin: ['cancelled', 'completed'] } }).catch(() => 0),
      Booking.countDocuments({}).catch(() => 0),
      Booking.countDocuments({
        $or: [{ assignedStaff: null }, { staffAssignmentStatus: 'unassigned' }],
        status: { $nin: ['cancelled', 'completed'] },
      }).catch(() => 0),
      Staff.countDocuments({ isActive: true }).catch(() => 0),
      Staff.countDocuments({}).catch(() => 0),
      Service.countDocuments({ $or: [{ isActive: true }, { active: true }] }).catch(() => 0),
      Product.countDocuments({ $or: [{ isActive: true }, { active: true }] }).catch(() => 0),
      userModel.countDocuments({ role: { $ne: 'admin' } }).catch(() => 0),
      Product.countDocuments({ stock: { $gt: 0, $lte: 5 } }).catch(() => 0),
      Product.countDocuments({ stock: { $lte: 0 } }).catch(() => 0),
      Booking.countDocuments({
        $or: [
          { flaggedForAdmin: true },
          { staffAssignmentStatus: 'admin_attention' },
          { status: 'pending' },
        ],
      }).catch(() => 0),
      Booking.countDocuments({ status: 'cancelled' }).catch(() => 0),
      Booking.countDocuments({ 'cancellationRequest.status': 'pending' }).catch(() => 0),
      Booking.countDocuments({ 'rescheduleRequest.status': 'pending' }).catch(() => 0),
      Staff.find({ isActive: true }).select('name email phone role leave schedules').lean().catch(() => []),
      ServiceCategory.find({}).select('name slug').lean().catch(() => []),
      Product.find({ stock: { $gt: 0, $lte: 5 } })
        .select('name slug stock defaultPrice price images currency')
        .limit(8)
        .lean()
        .catch(() => []),
      Product.find({ stock: { $lte: 0 } })
        .select('name slug stock defaultPrice price images currency')
        .limit(8)
        .lean()
        .catch(() => []),
      Booking.find({})
        .sort({ createdAt: -1 })
        .limit(15)
        .populate('assignedStaff', 'name email phone avatar')
        .populate('customer', 'name email phone')
        .lean()
        .catch(() => []),
      Order.find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('user', 'name email phone')
        .lean()
        .catch(() => []),
      userModel.find({ role: { $ne: 'admin' } })
        .sort({ _id: -1 })
        .limit(5)
        .select('name email createdAt')
        .lean()
        .catch(() => []),
      Booking.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]).catch(() => []),
      NotificationLog.countDocuments({ status: 'failed' }).catch(() => 0),
      Order.countDocuments({ status: { $in: ['pending', 'Pending_Confirmation', 'Pending'] } }).catch(() => 0),
    ]);

    // Calculate pending staff leave requests
    let pendingLeavesCount = 0;
    let onLeaveTodayCount = 0;
    if (Array.isArray(allStaff)) {
      for (const st of allStaff) {
        if (Array.isArray(st.leave)) {
          for (const lv of st.leave) {
            if (lv.status === 'pending') pendingLeavesCount++;
            if (lv.status === 'approved') {
              const start = lv.startDate ? new Date(lv.startDate).toISOString().split('T')[0] : '';
              const end = lv.endDate ? new Date(lv.endDate).toISOString().split('T')[0] : '';
              if (todayStr >= start && todayStr <= end) {
                onLeaveTodayCount++;
              }
            }
          }
        }
      }
    }

    const pendingApprovals = flaggedBookingsCount + pendingLeavesCount;

    // Calculate revenue from completed/confirmed bookings & paid orders
    let totalRevenue = 0;
    try {
      const bookingRev = await Booking.aggregate([
        { $match: { status: { $in: ['confirmed', 'completed'] } } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]);
      if (bookingRev.length > 0) totalRevenue += bookingRev[0].total;

      const orderRev = await Order.aggregate([
        { $match: { paymentStatus: { $in: ['Paid', 'Authorized'] } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]);
      if (orderRev.length > 0) totalRevenue += orderRev[0].total;
    } catch (_err) {
      // Keep calculated revenue safe
    }

    // Format Bookings by Status Distribution
    const statusMap = {
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
    };
    if (Array.isArray(statusAggregation)) {
      statusAggregation.forEach((s) => {
        if (s._id && statusMap[s._id] !== undefined) {
          statusMap[s._id] = s.count;
        }
      });
    }

    const bookingsByStatus = Object.keys(statusMap).map((key) => ({
      status: key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      count: statusMap[key],
      percentage: totalBookingsCount > 0 ? Math.round((statusMap[key] / totalBookingsCount) * 100) : 0,
    }));

    // Build Dynamic Booking Trends based on range ('7d', '30d', '6m')
    let bookingTrends = [];
    if (range === '7d') {
      // Last 7 days
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(uaeNow.getTime() - i * 24 * 60 * 60 * 1000);
        const dayDateStr = d.toISOString().split('T')[0];
        const dayLabel = `${days[d.getDay()]} ${d.getDate()}`;

        let completed = 0;
        let other = 0;
        if (Array.isArray(recentBookings)) {
          for (const b of recentBookings) {
            const bDate = b.scheduledDate || (b.createdAt ? new Date(b.createdAt).toISOString().split('T')[0] : '');
            if (bDate === dayDateStr) {
              if (b.status === 'completed') completed++;
              else if (b.status !== 'cancelled') other++;
            }
          }
        }
        bookingTrends.push({
          month: dayLabel,
          completed,
          other,
          total: completed + other,
          date: dayDateStr,
        });
      }
    } else if (range === '30d') {
      // Last 30 days in 5 intervals
      for (let i = 4; i >= 0; i--) {
        const startD = new Date(uaeNow.getTime() - (i + 1) * 6 * 24 * 60 * 60 * 1000);
        const endD = new Date(uaeNow.getTime() - i * 6 * 24 * 60 * 60 * 1000);
        const startStr = startD.toISOString().split('T')[0];
        const endStr = endD.toISOString().split('T')[0];
        const label = `${startD.getDate()}/${startD.getMonth() + 1} - ${endD.getDate()}/${endD.getMonth() + 1}`;

        let completed = 0;
        let other = 0;
        if (Array.isArray(recentBookings)) {
          for (const b of recentBookings) {
            const bDate = b.scheduledDate || (b.createdAt ? new Date(b.createdAt).toISOString().split('T')[0] : '');
            if (bDate >= startStr && bDate <= endStr) {
              if (b.status === 'completed') completed++;
              else if (b.status !== 'cancelled') other++;
            }
          }
        }
        bookingTrends.push({
          month: label,
          completed,
          other,
          total: completed + other,
        });
      }
    } else {
      // Default: Past 6 Months
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentYear = uaeNow.getFullYear();
      const currentMonthIdx = uaeNow.getMonth(); // 0-11

      for (let i = 5; i >= 0; i--) {
        const d = new Date(currentYear, currentMonthIdx - i, 1);
        const mName = monthNames[d.getMonth()];
        const year = d.getFullYear();
        const monthPrefix = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}`;

        let completedCount = 0;
        let upcomingOrCancelledCount = 0;

        if (Array.isArray(recentBookings)) {
          for (const b of recentBookings) {
            const bDate = b.scheduledDate || (b.createdAt ? new Date(b.createdAt).toISOString().split('T')[0] : '');
            if (bDate.startsWith(monthPrefix)) {
              if (b.status === 'completed') completedCount++;
              else upcomingOrCancelledCount++;
            }
          }
        }

        bookingTrends.push({
          month: mName,
          completed: completedCount,
          other: upcomingOrCancelledCount,
          total: completedCount + upcomingOrCancelledCount,
        });
      }
    }

    // Build Category Distribution (filter zero-counts and sort descending)
    const categoryCountMap = {};
    if (Array.isArray(recentBookings)) {
      recentBookings.forEach((b) => {
        if (Array.isArray(b.services)) {
          b.services.forEach((s) => {
            const catName = s.name ? s.name.split(' ')[0] : 'Wellness';
            categoryCountMap[catName] = (categoryCountMap[catName] || 0) + 1;
          });
        }
      });
    }

    const categoryDistribution = Object.keys(categoryCountMap)
      .map((key) => ({
        category: key,
        count: categoryCountMap[key],
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Build Unified Recent Activities
    const recentActivities = [];

    // 1. Bookings
    if (Array.isArray(recentBookings)) {
      recentBookings.forEach((b) => {
        recentActivities.push({
          id: b._id,
          reference: b.bookingNumber || `BK-${String(b._id).slice(-6).toUpperCase()}`,
          type: 'booking',
          customer: b.customerDetails?.name || b.customer?.name || 'Private Client',
          customerEmail: b.customerDetails?.email || b.customer?.email || '',
          itemTitle: b.services?.map((s) => s.name).join(', ') || 'Wellness Ritual',
          dateTime: b.scheduledStartTime
            ? new Date(b.scheduledStartTime).toLocaleString('en-US', {
                timeZone: 'Asia/Dubai',
                dateStyle: 'medium',
                timeStyle: 'short',
              })
            : b.scheduledDate || 'Scheduled',
          rawDate: b.createdAt || b.scheduledStartTime || new Date(),
          assignedStaff: b.assignedStaff?.name || (b.staffAssignmentStatus === 'assigned' ? 'Assigned' : 'Unassigned'),
          status: b.status || 'confirmed',
          price: b.totalPrice ? `${b.currency || 'AED'} ${b.totalPrice}` : 'AED 0',
        });
      });
    }

    // 2. Orders
    if (Array.isArray(recentOrders)) {
      recentOrders.forEach((o) => {
        recentActivities.push({
          id: o._id,
          reference: `ORD-${String(o._id).slice(-6).toUpperCase()}`,
          type: 'order',
          customer: o.user?.name || o.address?.fullName || 'Skincare Client',
          customerEmail: o.user?.email || o.address?.email || '',
          itemTitle: o.products?.length ? `${o.products.length} Boutique Product(s)` : 'Boutique Purchase',
          dateTime: o.createdAt
            ? new Date(o.createdAt).toLocaleString('en-US', {
                timeZone: 'Asia/Dubai',
                dateStyle: 'medium',
                timeStyle: 'short',
              })
            : 'Recent Order',
          rawDate: o.createdAt || new Date(),
          assignedStaff: 'Warehouse Dispatch',
          status: (o.status || 'Pending').toLowerCase(),
          price: o.totalAmount ? `AED ${o.totalAmount}` : 'AED 0',
        });
      });
    }

    // 3. New Client Registrations
    if (Array.isArray(recentUsers)) {
      recentUsers.forEach((u) => {
        const regDate = u.createdAt || (u._id?.getTimestamp ? u._id.getTimestamp() : new Date());
        recentActivities.push({
          id: u._id,
          reference: `REG-${String(u._id).slice(-6).toUpperCase()}`,
          type: 'registration',
          customer: u.name || 'New Client',
          customerEmail: u.email || '',
          itemTitle: 'Client Account Registration',
          dateTime: new Date(regDate).toLocaleString('en-US', {
            timeZone: 'Asia/Dubai',
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
          rawDate: regDate,
          assignedStaff: 'Self-Registered',
          status: 'registered',
          price: '—',
        });
      });
    }

    // 4. Low Stock Alerts
    if (Array.isArray(lowStockProducts) && lowStockProducts.length > 0) {
      lowStockProducts.slice(0, 3).forEach((p) => {
        recentActivities.push({
          id: p._id,
          reference: `SKU-${String(p._id).slice(-4).toUpperCase()}`,
          type: 'inventory',
          customer: 'Inventory Manager',
          customerEmail: '',
          itemTitle: `Low Stock Alert: ${p.name} (${p.stock ?? 0} units remaining)`,
          dateTime: 'Stock Threshold',
          rawDate: new Date(Date.now() - 3600000),
          assignedStaff: 'Procurement',
          status: 'low_stock',
          price: p.price ? `AED ${p.price}` : 'AED 0',
        });
      });
    }

    // Sort combined activities by rawDate descending
    recentActivities.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());

    // Upcoming Appointments (today or future)
    const upcomingAppointments = [];
    if (Array.isArray(recentBookings)) {
      for (const b of recentBookings) {
        if (b.status !== 'cancelled' && b.status !== 'completed') {
          upcomingAppointments.push({
            id: b._id,
            bookingNumber: b.bookingNumber || `BK-${String(b._id).slice(-6).toUpperCase()}`,
            clientName: b.customerDetails?.name || b.customer?.name || 'Private Client',
            serviceName: b.services?.[0]?.name || 'Beauty Treatment',
            time: (() => {
              if (b.scheduledTime && /^\d{1,2}:\d{2}$/.test(b.scheduledTime.trim())) {
                const [hStr, mStr] = b.scheduledTime.trim().split(':');
                const h = parseInt(hStr, 10);
                const m = parseInt(mStr, 10);
                const period = h >= 12 ? 'PM' : 'AM';
                const hour12 = h % 12 || 12;
                return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
              }
              if (b.scheduledStartTime) {
                try {
                  return new Date(b.scheduledStartTime).toLocaleTimeString('en-US', {
                    timeZone: 'Asia/Dubai',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  });
                } catch (e) {}
              }
              return 'TBD';
            })(),
            date: b.scheduledDate || 'Today',
            location: b.serviceAddress?.area ? `${b.serviceAddress.area}, ${b.serviceAddress.city || 'Dubai'}` : 'Dubai, UAE',
            staff: b.assignedStaff?.name || 'Unassigned',
            status: b.status,
            staffAssignmentStatus: b.staffAssignmentStatus || (b.assignedStaff ? 'assigned' : 'unassigned'),
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        metrics: {
          todayBookings: todayBookingsCount,
          upcomingBookings: upcomingBookingsCount,
          totalBookings: totalBookingsCount,
          totalCustomers: totalCustomersCount,
          activeStaff: activeStaffCount,
          activeServices: activeServicesCount,
          activeProducts: activeProductsCount,
          lowStockCount,
          outOfStockCount,
          unassignedBookingsCount,
          pendingApprovals,
          totalRevenue,
          currency: 'AED',
          revenueGrowth: 12,
        },
        charts: {
          bookingTrends,
          categoryDistribution,
          revenueTrends: [
            { period: 'Q1', revenue: Math.round(totalRevenue * 0.2) },
            { period: 'Q2', revenue: Math.round(totalRevenue * 0.3) },
            { period: 'Q3', revenue: Math.round(totalRevenue * 0.5) },
          ],
          bookingsByStatus,
        },
        recentActivities: recentActivities.slice(0, 15),
        upcomingAppointments: upcomingAppointments.slice(0, 6),
        staffAvailability: {
          totalStaff: totalStaffCount,
          activeStaff: activeStaffCount,
          onDutyToday: Math.max(0, activeStaffCount - onLeaveTodayCount),
          onLeaveToday: onLeaveTodayCount,
        },
        lowStockProducts: lowStockProducts.map((p) => ({
          id: p._id,
          name: p.name,
          stock: p.stock ?? p.defaultStock ?? 0,
          price: p.price ?? p.defaultPrice ?? 0,
          currency: p.currency || 'AED',
          image: p.images?.[0] || '',
        })),
        outOfStockProducts: outOfStockProducts.map((p) => ({
          id: p._id,
          name: p.name,
          stock: p.stock ?? 0,
          price: p.price ?? 0,
          currency: p.currency || 'AED',
          image: p.images?.[0] || '',
        })),
        pendingRequests: {
          cancellations: pendingCancellationsCount,
          reschedules: pendingReschedulesCount,
          flaggedAssignments: flaggedBookingsCount,
          unassignedBookings: unassignedBookingsCount,
          failedNotifications: failedNotificationsCount,
          pendingOrders: pendingOrdersCount,
          pendingLeaves: pendingLeavesCount,
          lowStockCount,
          outOfStockCount,
        },
        isLiveDb: true,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats',
      error: err.message,
    });
  }
};

