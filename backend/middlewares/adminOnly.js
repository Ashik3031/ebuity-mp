import User from "../models/userModel.js";

const adminOnly = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        if ( user && user.role === "admin") {
            next();   
        }else {
            return res.status(403).json({ success: false, message: "Access denied. Admin only" });
        }
    }catch (error) {
        return res.status(500).json({ success: false, message: "server error"})
    }
};

export default adminOnly;