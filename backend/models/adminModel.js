// adminModel.js
import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
    name: { type: String, required: true },  // Ensure 'name' matches register function
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },  // Keep only one
    role: { type: String, enum: ['admin', 'superadmin'], default: 'admin' },
});

const adminModel = mongoose.models.Admin || mongoose.model("Admin", adminSchema, "admin");  // Ensure correct collection name

export default adminModel;

