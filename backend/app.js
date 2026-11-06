// Import required modules
import express from "express";
import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import cors from "cors";
import "dotenv/config";
import debug from "debug";
import connectDB from "./config/mongodb-connection.config.js";
import cookieParser from 'cookie-parser';
import { initRealtimeService } from "./services/realtimeService.js";

import authRouter from "./routes/authRoutes.js";
import userRouter from "./routes/userRoutes.js";
import bannerRouter from "./routes/bannerRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import couponRouter from "./routes/couponRoutes.js";
import wishlistRouter from "./routes/wishlistRoutes.js";
import varitantRoute from "./routes/variant.routes.js";
import uploadRoutes from './routes/uploadRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import reviewRoutes from './routes/reviews.js';
import orderRoutes from './routes/orderRoutes.js';
import adminOrderRoutes from './routes/adminOrderRoutes.js';
import adminInventoryRoutes from './routes/adminInventoryRoutes.js';
import brandRoutes from './routes/brandRoutes.js';
import settingRoutes from './routes/settingRoutes.js';
import notifyRoutes from "./routes/notifyRoutes.js";
import offerRoutes from "./routes/offerRoutes.js";
import adminOfferRoutes from "./routes/adminOfferRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import adminStripeOrderRoutes from "./routes/adminStripeOrderRoutes.js";
import personalStylistRoutes from "./routes/personalStylist.routes.js";
import featureRoutes from "./routes/featureRoutes.js";
import ratesRoutes from "./routes/rates.routes.js";
import newsletterRoutes from "./routes/newsletterRoutes.js";
import sellPageRoutes from "./routes/sellPageRoutes.js";
import sellRequestRoutes from "./routes/sellRequestRoutes.js";
import serviceCategoryRoutes from "./routes/serviceCategoryRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import serviceZoneRoutes from "./routes/serviceZoneRoutes.js";
import packageRoutes from "./routes/packageRoutes.js";
import adminServiceRoutes from "./routes/adminServiceRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import staffRoutes from "./routes/staffRoutes.js";
import adminStaffRoutes from "./routes/adminStaffRoutes.js";

import dns from "node:dns";

dns.setDefaultResultOrder("ipv4first");

// Connect to MongoDB database without blocking app startup
connectDB().catch((error) => {
  console.error("MongoDB connection failed; continuing with API fallback mode:", error.message);
});

// App Config
const app = express();
const PORT = process.env.PORT || 4000;
const debugging = debug("development:app");

//cors
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  "https://roseessence.ae",
  "https://www.roseessence.ae"
];

// Middlewares
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads folder exists and serve static uploads
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

// API Endpoints
app.use('/api/auth', authRouter);
app.use("/api/user", userRouter);
app.use("/api/banner", bannerRouter);
app.use("/api/category", categoryRoutes);
app.use("/api/admin", adminRouter);
app.use('/api/coupon', couponRouter);
app.use("/api/wishlist", wishlistRouter);
app.use("/api/products", productRoutes);
app.use("/api/variants", varitantRoute);
app.use("/api/upload", uploadRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/settings", settingRoutes);
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/admin/inventory", adminInventoryRoutes);
app.use("/api/notify", notifyRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/offers", adminOfferRoutes);
app.use("/api/public/offer", offerRoutes);
app.use("/api/personal-stylist", personalStylistRoutes);

app.use("/api/payment", paymentRoutes);
app.use("/api/admin/stripe-orders", adminStripeOrderRoutes);
app.use("/api/newsletter", newsletterRoutes);
app.use("/api/features", featureRoutes);
app.use("/api/rates", ratesRoutes);
app.use("/api/sell-page", sellPageRoutes);
app.use("/api/sell-requests", sellRequestRoutes);

// --- At-Home Beauty & Wellness Services Module ---
app.use("/api/v1/service-categories", serviceCategoryRoutes);
app.use("/api/service-categories", serviceCategoryRoutes);

app.use("/api/v1/services", serviceRoutes);
app.use("/api/services", serviceRoutes);

app.use("/api/v1/service-zones", serviceZoneRoutes);
app.use("/api/service-zones", serviceZoneRoutes);

app.use("/api/v1/packages", packageRoutes);
app.use("/api/packages", packageRoutes);

app.use("/api/v1/admin", adminServiceRoutes);
app.use("/api/admin/services-module", adminServiceRoutes);

app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/bookings", bookingRoutes);

// --- Level 5: Staff Management & Automatic Assignment Module ---
app.use("/api/v1/staff", staffRoutes);
app.use("/api/staff", staffRoutes);

app.use("/api/v1/admin/staff-management", adminStaffRoutes);
app.use("/api/admin/staff-management", adminStaffRoutes);

app.get("/", (req, res) => {
  res.send("API Working");
});

// Create HTTP server & initialize Socket.IO Realtime Service
const server = http.createServer(app);
initRealtimeService(server);

// Start the server and listen on process.env.port PORT
server.listen(PORT, () => {
  console.log("Server started on PORT: " + PORT + " (with Real-Time WebSockets enabled)");
  debugging("Server started on PORT: " + PORT);
});
