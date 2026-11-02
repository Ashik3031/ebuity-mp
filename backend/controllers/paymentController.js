import Razorpay from "razorpay";
import crypto from "crypto";
import { getStoreSettings, computeServerSubtotal, buildPricingSnapshot } from "../utils/pricing.util.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createPaymentIntent = async (req, res) => {
  try {
    const { products, currency = "INR", metadata = {} } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: "Products are required" });
    }

    const [settings, subtotal] = await Promise.all([
      getStoreSettings(),
      computeServerSubtotal(products),
    ]);

    const pricing = buildPricingSnapshot({ subtotal, settings });
    const totalAmount = Number(pricing.grandTotal || 0);

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ message: "Invalid total amount" });
    }

    const amountInSmallestUnit = Math.round(totalAmount * 100);

    const userId = req.user?._id || req.user?.id || null;

    const options = {
      amount: amountInSmallestUnit,
      currency: String(currency || "INR").toUpperCase(),
      receipt: `order_${Date.now()}`,
      notes: {
        ...metadata,
        ...(userId ? { userId: String(userId) } : { isGuest: "true" }),
      },
    };

    const order = await razorpay.orders.create(options);

    return res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
      pricing,
    });
  } catch (e) {
    return res.status(500).json({ message: e.message || "Razorpay error" });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing Razorpay verification fields" });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(razorpay_signature)
    );

    if (!isValid) {
      return res.status(400).json({ message: "Invalid Razorpay signature" });
    }

    return res.json({ success: true, message: "Payment verified" });
  } catch (e) {
    return res.status(500).json({ message: e.message || "Verification failed" });
  }
};

export const capturePayment = async (req, res) => {
  try {
    return res.status(200).json({ message: "Razorpay payments are captured immediately by checkout" });
  } catch (e) {
    return res.status(500).json({ message: e.message || "Capture failed" });
  }
};

export const cancelPayment = async (req, res) => {
  try {
    return res.status(200).json({ message: "Razorpay cancellation is handled via the dashboard" });
  } catch (e) {
    return res.status(500).json({ message: e.message || "Cancel failed" });
  }
};
