import jwt from "jsonwebtoken";
import adminModel from "../models/adminModel.js";

function getAdminToken(req) {
  const auth = req.headers.authorization;

  // Authorization: Bearer <jwt> (case-insensitive)
  if (typeof auth === "string" && auth.toLowerCase().startsWith("bearer ")) {
    const t = auth.slice(7).trim();
    if (t && t !== "null" && t !== "undefined") return t;
  }

  // Cookie fallback
  if (req.cookies?.admin_token) return req.cookies.admin_token;

  return null;
}

export default async function adminAuth(req, res, next) {
  try {
    const token = getAdminToken(req);
    if (!token) {
      return res.status(401).json({ success: false, message: "Token missing. Please login again." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const admin = await adminModel.findById(decoded.id).select("_id role isAdmin email");
    if (!admin) {
      return res.status(401).json({ success: false, message: "Admin not found. Please login again." });
    }

    const role = String(admin.role || "").toLowerCase();
    const isAdmin = role === "admin" || admin.isAdmin === true;

    if (!isAdmin) {
      return res.status(403).json({ success: false, message: "Access denied. Admin only." });
    }

    req.admin = admin;
    next();
  } catch (e) {
    const msg =
      e?.name === "TokenExpiredError"
        ? "Session expired. Please login again."
        : "Invalid token.";

    return res.status(401).json({ success: false, message: msg });
  }
}
