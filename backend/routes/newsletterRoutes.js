import { Router } from "express";
import NewsletterSubscriber from "../models/NewsletterSubscriber.js";

const router = Router();

router.post("/subscribe", async (req, res) => {
  try {
    const emailRaw = (req.body?.email || "").trim().toLowerCase();

    if (!emailRaw) return res.status(400).json({ message: "Email is required." });

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(emailRaw);
    if (!emailOk) return res.status(400).json({ message: "Invalid email address" });

    const exists = await NewsletterSubscriber.findOne({ email: emailRaw });
    if (exists) return res.status(200).json({ message: "You're already subscribed." });

    await NewsletterSubscriber.create({ email: emailRaw });
    return res.status(201).json({ message: "Subscribed successfully!" });
  } catch (err) {
    return res.status(500).json({ message: "Server Error: " + err.message });
  }
});

export default router;
