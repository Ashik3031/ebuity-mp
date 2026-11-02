// routes/adminDashboard.js
import express from "express";
import admin from "../middleware/adminAuth.js";

const router = express.Router();

router.get("/dashboard", adminAuth, (req, res) => {
    res.json({ message: "Welcome to the admin dashboard!" });
});

export default router;
