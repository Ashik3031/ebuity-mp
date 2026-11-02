import userModel from "../models/userModel.js";
import { subscribeBackInStock } from "../services/backInStockService.js";

export async function subscribeNotify(req, res) {
  try {
    const userId = req.user?._id || null;
    const { productId, variantId, email: emailBody, source, locale } = req.body || {};

    let email = emailBody;
    if (!email && userId) {
      const u = await userModel.findById(userId).select("email");
      email = u?.email;
    }
    if (!email) return res.status(400).json({ message: "Email is required" });
    if (!productId) return res.status(400).json({ message: "productId is required" });

    const result = await subscribeBackInStock({
      userId,
      email,
      productId,
      variantId,
      source: source || "notify_button",
      locale,
    });

    const msg = result.created
      ? "Subscribed for back-in-stock alerts."
      : result.reactivated
      ? "Subscription reactivated."
      : "You are already subscribed.";

    res.json({ ok: true, message: msg, subscription: result.subscription });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message || "Failed to subscribe" });
  }
}
