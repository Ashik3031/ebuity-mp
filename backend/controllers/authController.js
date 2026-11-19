// controllers/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";
import transporter from "../config/nodemailer.js";
import createToken from "../utils/createToken.util.js";
import { claimGuestBookings } from "../services/bookingClaimService.js";

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
  const { name, email, password, role, phone, bookingId, claimToken } = req.body;
  try {
    const normalizedEmail = (email || "").toLowerCase().trim();
    if (!normalizedEmail || !password) {
      return res.status(400).json({ success: false, message: "Email and Password required" });
    }

    let existingUser = await userModel.findOne({ email: normalizedEmail });
    let user;

    if (existingUser) {
      // Check if user was an auto-created guest account
      const isAutoGuest =
        existingUser.isGuest === true ||
        (existingUser.isAccountVerified === false &&
          (existingUser.email?.endsWith("@guest.ebuity.com") ||
            (typeof existingUser.password === "string" && existingUser.password.startsWith("guest_"))));

      if (isAutoGuest) {
        // Gracefully upgrade placeholder guest account to a fully registered user
        const hashedPassword = await bcrypt.hash(password, 10);
        existingUser.name = name ? name.trim() : existingUser.name;
        existingUser.password = hashedPassword;
        existingUser.isGuest = false;
        existingUser.role = role || existingUser.role || "user";
        if (phone && !existingUser.phone) {
          existingUser.phone = phone.trim();
        }
        await existingUser.save();
        user = existingUser;
      } else {
        return res.status(400).json({ success: false, message: "User already exists. Please sign in." });
      }
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      user = await userModel.create({
        name: name ? name.trim() : "Valued Customer",
        email: normalizedEmail,
        password: hashedPassword,
        phone: phone ? phone.trim() : "",
        role: role || "user",
        isGuest: false,
      });
    }

    // Auto-claim any guest bookings and orders associated with this user
    let claimResult = { associatedBookings: 0 };
    try {
      claimResult = await claimGuestBookings(user, { bookingId, claimToken });
    } catch (claimErr) {
      console.warn("[register] claimGuestBookings warning:", claimErr.message);
    }

    // sign token (ensure createToken uses the same JWT_SECRET)
    const token = createToken({ id: user._id, role: user.role });

    // Try sending welcome email, but don't fail the whole request if it errors
    try {
      const mailOptions = {
        from: process.env.SENDER_EMAIL,
        to: normalizedEmail,
        subject: "Welcome to Rose Essence",
        text: `Welcome! Your account has been created successfully with email: ${normalizedEmail}`,
      };
      await transporter.sendMail(mailOptions);
    } catch (mailErr) {
      console.error("Welcome email failed:", mailErr.message);
    }

    return res
      .cookie("token", token, cookieOpts) // <— user cookie
      .status(201)
      .json({
        success: true,
        message: "User registered successfully",
        associatedBookings: claimResult?.associatedBookings || 0,
      });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Login user
export const login = async (req, res) => {
  const { email, password, bookingId, claimToken } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and Password required" });
  }

  try {
    const normalizedEmail = (email || "").toLowerCase().trim();
    const user = await userModel.findOne({ email: normalizedEmail });
    if (!user) return res.status(401).json({ success: false, message: "User does not exist" });

    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: "You have been blocked by the admin" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      if (user.isGuest) {
        return res.status(401).json({
          success: false,
          message: "This email was used for a guest booking. Please create an account / set a password by clicking Sign Up.",
        });
      }
      return res.status(401).json({ success: false, message: "Incorrect Password" });
    }

    // Auto-claim any guest bookings and orders associated with this user upon login
    let claimResult = { associatedBookings: 0 };
    try {
      claimResult = await claimGuestBookings(user, { bookingId, claimToken });
    } catch (claimErr) {
      console.warn("[login] claimGuestBookings warning:", claimErr.message);
    }

    const token = createToken({ id: user._id, role: user.role });

    return res
      .cookie("token", token, cookieOpts) // <— user cookie
      .status(200)
      .json({
        success: true,
        message: "Login successful",
        associatedBookings: claimResult?.associatedBookings || 0,
      });
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
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const user = await userModel.findById(userId).select("name email isAccountVerified");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (user.isAccountVerified) {
      return res.json({ success: false, message: "User is already verified" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.verifyOtp = otp;
    user.verifyOtpExpiry = Date.now() + 10 * 60 * 1000; // 10 min
    await user.save();

    const fromAddress =
      process.env.SMTP_FROM ||
      process.env.SENDER_EMAIL ||
      process.env.SMTP_USER ||
      "ashikash202@gmail.com";
    const formattedFrom = fromAddress.includes("<")
      ? fromAddress
      : `"Rose Essence" <${fromAddress}>`;

    const mailOptions = {
      from: formattedFrom,
      to: user.email,
      subject: `Your Rose Essence Verification Code: ${otp}`,
      text: `Hello ${user.name || "Customer"},\n\nYour Rose Essence account verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nThank you,\nRose Essence Team`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #FAF7F2; border-radius: 16px; border: 1px solid #E8D8C8;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #292525; font-size: 24px; font-weight: 700; margin: 0; font-family: serif;">Rose Essence</h1>
            <p style="color: #746D69; font-size: 13px; margin: 4px 0 0 0;">Luxury At-Home Beauty &amp; Wellness</p>
          </div>
          <div style="background-color: #ffffff; padding: 28px; border-radius: 12px; border: 1px solid #E8D8C8; text-align: center;">
            <h2 style="color: #292525; font-size: 18px; margin: 0 0 12px 0;">Verify Your Email Address</h2>
            <p style="color: #555; font-size: 14px; line-height: 1.5; margin: 0 0 20px 0;">
              Please use the verification code below to verify your account and link your appointments.
            </p>
            <div style="background-color: #FCF4F2; border: 1px dashed #CF565D; border-radius: 8px; padding: 16px; margin: 0 auto 20px auto; max-width: 240px;">
              <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #CF565D; font-family: monospace;">${otp}</span>
            </div>
            <p style="color: #888; font-size: 12px; margin: 0;">
              This code will expire in <strong>10 minutes</strong>. If you did not request this, please disregard this email.
            </p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 11px;">
            &copy; ${new Date().getFullYear()} Rose Essence Beauty &amp; Wellness. All rights reserved.
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ success: true, message: "OTP sent successfully" });
  } catch (error) {
    console.error("sendVerifyOtp error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to send OTP" });
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

    // Auto-claim any guest bookings associated with this newly verified email
    let associatedCount = 0;
    try {
      const claimResult = await claimGuestBookings(user);
      associatedCount = claimResult.associatedBookings || 0;
    } catch (claimErr) {
      console.warn("[verifyOtp] claimGuestBookings warning:", claimErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      associatedBookings: associatedCount,
    });
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
    const user = await userModel.findOne({ email: (email || "").toLowerCase().trim() });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetOtp = otp;
    user.resetOtpExpiryAt = Date.now() + 15 * 60 * 1000; // 15 min
    await user.save();

    const fromAddress =
      process.env.SMTP_FROM ||
      process.env.SENDER_EMAIL ||
      process.env.SMTP_USER ||
      "ashikash202@gmail.com";
    const formattedFrom = fromAddress.includes("<")
      ? fromAddress
      : `"Rose Essence" <${fromAddress}>`;

    const mailOptions = {
      from: formattedFrom,
      to: user.email,
      subject: `Your Rose Essence Password Reset Code: ${otp}`,
      text: `Hello ${user.name || "Customer"},\n\nYour Rose Essence password reset code is: ${otp}\n\nThis code will expire in 15 minutes.\n\nRose Essence Team`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #FAF7F2; border-radius: 16px; border: 1px solid #E8D8C8;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #292525; font-size: 24px; font-weight: 700; margin: 0; font-family: serif;">Rose Essence</h1>
            <p style="color: #746D69; font-size: 13px; margin: 4px 0 0 0;">Luxury At-Home Beauty &amp; Wellness</p>
          </div>
          <div style="background-color: #ffffff; padding: 28px; border-radius: 12px; border: 1px solid #E8D8C8; text-align: center;">
            <h2 style="color: #292525; font-size: 18px; margin: 0 0 12px 0;">Password Reset Code</h2>
            <p style="color: #555; font-size: 14px; margin: 0 0 20px 0;">
              Please enter the code below to reset your password.
            </p>
            <div style="background-color: #FCF4F2; border: 1px dashed #CF565D; border-radius: 8px; padding: 16px; margin: 0 auto 20px auto; max-width: 240px;">
              <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #CF565D; font-family: monospace;">${otp}</span>
            </div>
            <p style="color: #888; font-size: 12px; margin: 0;">
              This code will expire in <strong>15 minutes</strong>. If you did not request a password reset, you can safely ignore this email.
            </p>
          </div>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (mailErr) {
      console.error("Reset email dispatch error:", mailErr);
      return res.status(500).json({ success: false, message: mailErr.message || "Failed to send reset email" });
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
    const user = await userModel.findOne({ email: (email || "").toLowerCase().trim() });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (!user.resetOtp || String(user.resetOtp) !== String(otp)) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
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
