import Stripe from "stripe";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import { restock } from "../utils/stock.util.js";
import userModel from "../models/userModel.js";
import { emailOrderConfirmed, emailOrderCancelled } from "../services/email.service.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const approveStripeOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate("products.productId", "name images")
      .populate("products.variantId", "price images");

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.paymentMethod !== "STRIPE") {
      return res.status(400).json({ message: "Not a Stripe order" });
    }

    if (order.paymentStatus !== "Authorized") {
      return res.status(400).json({ message: "Order is not authorized for capture" });
    }

    if (!order.paymentIntentId) {
      return res.status(400).json({ message: "Order missing paymentIntentId" });
    }
if (order.status === "Cancelled") return res.status(400).json({ message: "Order already cancelled" });

    const pi = await stripe.paymentIntents.retrieve(order.paymentIntentId);
    if (pi.status !== "requires_capture") {
      return res.status(400).json({ message: `Stripe status: ${pi.status}` });
    }

    await stripe.paymentIntents.capture(order.paymentIntentId);

    const nextStatus = order.status === "Pending_Confirmation" ? "Pending" : order.status;

    order.paymentStatus = "Paid";
    order.status = nextStatus;
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status: nextStatus,
      note: "Admin approved: payment captured",
      at: new Date(),
    });

    await order.save();

    // ✅ fetch fresh (ensures email always has final data)
    const fresh = await Order.findById(order._id)
      .populate("products.productId", "name images")
      .populate("products.variantId", "price images");

    (async () => {
      try {
        const user = await userModel.findById(fresh.user).select("name email");
        if (user?.email) await emailOrderConfirmed({ to: user.email, order: fresh, user });
      } catch (e) {
        console.error("approveStripeOrder email failed:", e?.message);
      }
    })();

    return res.json({ success: true, message: "Payment captured", order: fresh });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};


export const rejectStripeOrder = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { note } = req.body;

    const order = await Order.findById(req.params.orderId)
      .populate("products.productId", "name images")
      .populate("products.variantId", "price images");

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.paymentMethod !== "STRIPE") {
      return res.status(400).json({ message: "Not a Stripe order" });
    }

    if (order.paymentStatus !== "Authorized") {
      return res.status(400).json({ message: "Order is not authorized" });
    }

    if (!order.paymentIntentId) {
      return res.status(400).json({ message: "Order missing paymentIntentId" });
    }

    const cancelAndRestockAndSave = async (trxSession = null) => {
      await stripe.paymentIntents.cancel(order.paymentIntentId);
      await restock(order.products, trxSession);

      order.paymentStatus = "Cancelled";
      order.status = "Cancelled";
      order.cancelledAt = new Date();

      order.statusHistory = order.statusHistory || [];
      order.statusHistory.push({
        status: "Cancelled",
        note: note || "Admin rejected order",
        at: new Date(),
      });

      await order.save(trxSession ? { session: trxSession } : undefined);
    };

    try {
      await session.withTransaction(async () => {
        await cancelAndRestockAndSave(session);
      });
    } catch (trxErr) {
      const msg = String(trxErr?.message || "");
      if (msg.includes("Transaction numbers are only allowed") || trxErr?.code === 20) {
        await cancelAndRestockAndSave(null);
      } else {
        throw trxErr;
      }
    } finally {
      session.endSession();
    }

    const fresh = await Order.findById(order._id)
      .populate("products.productId", "name images")
      .populate("products.variantId", "price images");

    (async () => {
      try {
        const user = await userModel.findById(fresh.user).select("name email");
        if (user?.email) await emailOrderCancelled({ to: user.email, order: fresh, user });
      } catch (e) {
        console.error("rejectStripeOrder email failed:", e?.message);
      }
    })();

    return res.json({
      success: true,
      message: "Order rejected and authorization cancelled",
      order: fresh,
    });
  } catch (err) {
    session.endSession();
    return res.status(500).json({ message: err.message });
  }
};

