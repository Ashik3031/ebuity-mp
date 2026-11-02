import jwt from "jsonwebtoken";

export default function optionalAuth(req, res, next) {
  try {
    const token =
      req.cookies?.token ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null);

    if (!token) {
      req.user = null; // guest
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      ...decoded,
      _id: decoded._id || decoded.id,
      id: decoded.id || decoded._id,
    }; // logged in
    return next();
  } catch (err) {
    req.user = null; // treat as guest if token invalid
    return next();
  }
}
