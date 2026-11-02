import Order from "../models/Order.js";
import mongoose from "mongoose";
import { restock } from "../utils/stock.util.js";

export const adminListOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      paymentMethod,
      paymentStatus,
      q,
      sort = "-createdAt",
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (paymentMethod) filter.paymentMethod = paymentMethod.toUpperCase();
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    const query = Order.find(filter)
      .populate("user", "email name")
      .populate("products.productId", "name images")
      .populate("products.variantId", "images price");

    const total = await Order.countDocuments(filter);
    const orders = await query
      .sort(sort)
      .skip((page - 1) * Number(limit))
      .limit(Number(limit));

    // naive search by id or user email (small result sets)
    let data = orders;
    if (q?.trim()) {
      const term = q.trim().toLowerCase();
      data = orders.filter(
        (o) =>
          o._id.toString().includes(term) ||
          o.user?.email?.toLowerCase().includes(term)
      );
    }

    res.json({ page: Number(page), limit: Number(limit), total, orders: data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const adminGetOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate("user", "email name")
      .populate("products.productId", "name images price")
      .populate("products.variantId", "images price");
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// export const adminUpdateStatus = async (req, res) => {
//   try {
//     const { status, note } = req.body;
//     const order = await Order.findById(req.params.orderId);
//     if (!order) return res.status(404).json({ message: "Order not found" });

//     order.status = status;
//     order.statusHistory = order.statusHistory || [];
//     order.statusHistory.push({ status, note });

//     // auto mark COD as Paid on Delivered (optional)
//     if (order.paymentMethod === "COD" && status === "Delivered") {
//       order.paymentStatus = "Paid";
//     }

//     await order.save();
//     res.json({ message: "Status updated", order });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

//new code - archana

export const adminUpdateStatus = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { status, note } = req.body;
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const nextStatus = status;

if (
  order.paymentMethod === "STRIPE" &&
  order.paymentStatus !== "Paid" &&
  ["Shipped", "Delivered"].includes(nextStatus)
) {
  return res.status(400).json({
    message: "Capture payment first before marking Stripe order as Shipped/Delivered.",
  });
}


    if (
      status === "Cancelled" &&
      order.paymentMethod === "STRIPE" &&
      order.paymentStatus === "Paid"
    ) {
      return res
        .status(400)
        .json({
          message: "Cannot cancel a paid Stripe order. Use refund flow.",
        });
    }

    const prevStatus = order.status;

    let updated;
    if (
      status === "Cancelled" &&
      (prevStatus === "Pending" || prevStatus === "Pending_Confirmation")
    ) {
      // do a transactional restock + cancel
      try {
        await session.withTransaction(async () => {
          await restock(order.products, session);
          order.status = "Cancelled";
          order.cancelledAt = new Date();
          order.statusHistory = order.statusHistory || [];
          order.statusHistory.push({ status, note });
          updated = await order.save({ session });
        });
      } catch (e) {
        return res.status(500).json({ message: e.message });
      } finally {
        session.endSession();
      }
    } else {
      // normal status change
      order.status = status;
      order.statusHistory = order.statusHistory || [];
      order.statusHistory.push({ status, note });

      if (order.paymentMethod === "COD" && status === "Delivered") {
        order.paymentStatus = "Paid";
      }
      updated = await order.save();
    }

    res.json({ message: "Status updated", order: updated });
  } catch (err) {
    session.endSession();
    res.status(500).json({ message: err.message });
  }
};

export const adminUpdateTracking = async (req, res) => {
  try {
    const { carrier, trackingNumber, eta } = req.body;
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.tracking = {
      carrier: carrier ?? order.tracking?.carrier,
      trackingNumber: trackingNumber ?? order.tracking?.trackingNumber,
      eta: eta ? new Date(eta) : order.tracking?.eta,
    };

    // bump to Shipped when tracking is set (optional)
    if (order.status === "Pending" && carrier && trackingNumber) {
      order.status = "Shipped";
      order.statusHistory = order.statusHistory || [];
      order.statusHistory.push({ status: "Shipped", note: "Tracking added" });
    }

    await order.save();
    res.json({ message: "Tracking updated", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const adminUpdatePayment = async (req, res) => {
  try {
    const { paymentStatus } = req.body; // "Pending" | "Paid" | "Failed" | "Refunded"
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.paymentStatus = paymentStatus;
    await order.save();
    res.json({ message: "Payment updated", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
