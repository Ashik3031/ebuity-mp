// controllers/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";
import transporter from "../config/nodemailer.js";
import createToken from "../utils/createToken.util.js";

const JWT_SECRET = process.env.JWT_SECRET;

// Cookie options (dev: lax/http, prod: none/https)
const isProd = process.env.NODE_ENV === "production";
const cookieOpts = {
  httpOnly: true,
  sameSite: isProd ? "none" : "lax",
  secure: isProd,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days

};

// Register + auto-login user
export const register = async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await userModel.create({
      name,
      email,
      password: hashedPassword,
      role: role || "user",
    });

    // sign token (ensure createToken uses the same JWT_SECRET)
    const token = createToken({ id: user._id, role: user.role });

    // Try sending welcome email, but don't fail the whole request if it errors
    try {
      const mailOptions = {
        from: process.env.SENDER_EMAIL,
        to: email,
        subject: "Welcome to MERN Auth",
        text: `Welcome! Your account has been created successfully with email: ${email}`,
      };
      await transporter.sendMail(mailOptions);
    } catch (mailErr) {
      console.error("Welcome email failed:", mailErr.message);
    }

    return res
      .cookie("token", token, cookieOpts) // <— user cookie
      .status(201)
      .json({ success: true, message: "User registered successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Login user
export const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and Password required" });
  }

  try {
    const user = await userModel.findOne({ email });
    if (!user) return res.status(401).json({ success: false, message: "User does not exist" });

    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: "You have been blocked by the admin" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Incorrect Password" });

    const token = createToken({ id: user._id, role: user.role });

    return res
      .cookie("token", token, cookieOpts) // <— user cookie
      .status(200)
      .json({ success: true, message: "Login successful" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Logout user
export const logout = async (req, res) => {
  try {
    res.clearCookie("token", { ...cookieOpts, maxAge: undefined });
    return res.status(200).json({ success: true, message: "User logged out" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// --- OTP & helpers (unchanged except for small catch fixes) ---

// Send Verification OTP
export const sendVerifyOtp = async (req, res) => {
  try {
    const  userId  = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const user = await userModel.findById(userId).select("email isAccountVerified");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (user.isAccountVerified) {
      return res.json({ success: false, message: "User is already verified" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();//convert to string
    user.verifyOtp = otp;
    user.verifyOtpExpiry = Date.now() + 10* 60 * 1000; // 10 min
    await user.save();

    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: "Account Verification OTP",
      text: `Your OTP: ${otp}. It expires in 10 minutes.`,
    };
    await transporter.sendMail(mailOptions);

    return res.status(200).json({ success: true, message: "OTP sent successfully" });
  } catch (error) {
    console.error("sendVerifyOtp error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// Verify account via OTP
export const verifyOtp = async (req, res) => {
  const userId = req.user?._id || req.user?.id; // Ensure userId is obtained from authenticated user
  const { otp } = req.body;

if (!userId) {
return res.status(401).json({ success: false, message: "Not authenticated" });
}

if (!otp || typeof otp !== "string" || otp.length !== 6) {
return res.status(400).json({ success: false, message: "Invalid OTP" });
}

  // if (!userId || !otp) {
  //   return res.status(400).json({ success: false, message: "Missing details" });
  // }

  try {
    const user = await userModel.findById(userId).select("verifyOtp verifyOtpExpiry isAccountVerified");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (user.isAccountVerified) {
      return res.status(400).json({ success: false, message: "User is already verified" });
    }

    if (!user.verifyOtp || !user.verifyOtpExpiry) {
      return res.status(400).json({ success: false, message: "No OTP requested" });
    }

    if (Date.now() > user.verifyOtpExpiry) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    if (String(user.verifyOtp) !== String(otp)) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    user.isAccountVerified = true;
    user.verifyOtp = "";// clear OTP
    user.verifyOtpExpiry = null;// clear expiry
    await user.save();

    return res.status(200).json({ success: true, message: "OTP verified successfully" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// Check if user is authenticated (protect with userAuth)
export const isAuthenticated = async (req, res) => {
  try {
    return res.status(200).json({ success: true, message: "User is authenticated" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Send Reset OTP
export const ResetOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: "Missing details" });

  try {
    const user = await userModel.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000);
    user.resetOtp = otp;
    user.resetOtpExpiryAt = Date.now() + 15 * 60 * 1000; // 15 min
    await user.save();

    try {
      const mailOptions = {
        from: process.env.SENDER_EMAIL,
        to: user.email,
        subject: "Password Reset OTP",
        text: `Your OTP: ${otp}. Reset your password.`,
      };
      await transporter.sendMail(mailOptions);
    } catch (mailErr) {
      console.warn("Reset email dispatch notice:", mailErr.message);
    }

    return res.status(200).json({ success: true, message: "OTP sent successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Reset Password
export const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ success: false, message: "Missing details" });
  }

  try {
    const user = await userModel.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (user.resetOtp === "" || user.resetOtp !== otp) {
      return res.json({ success: false, message: "Invalid OTP" });
    }

    if (user.resetOtpExpiryAt < Date.now()) {
      return res.json({ success: false, message: "OTP expired" });
    }

    const hashPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashPassword;
    user.resetOtp = "";
    user.resetOtpExpiryAt = 0;
    await user.save();

    return res.status(200).json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// Change Password for authenticated user
export const changePassword = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Incorrect current password",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
