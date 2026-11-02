import jwt from "jsonwebtoken";
import Staff from "../models/Staff.js";

function getStaffToken(req) {
  const auth = req.headers.authorization;
  if (typeof auth === "string" && auth.toLowerCase().startsWith("bearer ")) {
    const t = auth.slice(7).trim();
    if (t && t !== "null" && t !== "undefined") return t;
  }
  if (req.cookies?.staff_token) return req.cookies.staff_token;
  return null;
}

export default async function staffAuth(req, res, next) {
  try {
    const token = getStaffToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token missing. Please sign in to the staff portal.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid session token.",
      });
    }

    const staff = await Staff.findById(decoded.id).select("-password");
    if (!staff) {
      return res.status(401).json({
        success: false,
        message: "Staff profile not found.",
      });
    }

    if (!staff.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your staff account has been deactivated. Please contact administration.",
      });
    }

    req.staff = staff;
    next();
  } catch (error) {
    const msg =
      error?.name === "TokenExpiredError"
        ? "Session expired. Please sign in again."
        : "Invalid authentication token.";
    return res.status(401).json({ success: false, message: msg });
  }
}
