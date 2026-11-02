// backend/controllers/orderController.js
import mongoose from "mongoose";
import Order from "../models/Order.js";
import userModel from "../models/userModel.js";
import { emailOrderCancelled, emailOrderConfirmed, emailOrderRequested, emailAdminNewOrder } from "../services/email.service.js";
import { checkAndDecrementStock, restock } from "../utils/stock.util.js";
import { broadcastOrderCreated } from "../services/realtimeService.js";
import Cart from "../models/cartModel.js";
import Stripe from "stripe";
import crypto from "crypto";
// import Setting from "../models/Setting.js";

import { getStoreSettings, computeServerSubtotal, buildPricingSnapshot } from "../utils/pricing.util.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const verifyRazorpaySignature = ({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) return false;

  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature.length !== razorpaySignature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(razorpaySignature)
  );
};

// Helper: remove purchased items from user's cart
async function removePurchasedFromCart(userId, purchased, session = null) {
  const cart = await Cart.findOne({ user: userId }).session(session || null);
  if (!cart) return;

  for (const p of purchased) {
    const vid = String(p.variantId || "");
    const size = String(p.size || ""); // ✅ important

    const idx = cart.items.findIndex((i) => {
      const iVid = String(i.variant || "");
      const iSize = String(i.size || "");
      return iVid === vid && iSize === size;
    });

    if (idx > -1) {
      const newQty = (cart.items[idx].quantity || 0) - Number(p.quantity || 0);
      if (newQty > 0) cart.items[idx].quantity = newQty;
      else cart.items.splice(idx, 1);
    }
  }

  await cart.save({ session: session || undefined });
}




// export const placeOrder = async (req, res) => {
//   const session = await mongoose.startSession();
//   try {
//     const userId = req.user._id;
//     const { products, totalAmount, address, paymentMethod, codConfirmed } = req.body;

//     if (!products?.length || totalAmount == null || !address || !paymentMethod) {
//       return res.status(400).json({ message: "Missing required order data." });
//     }

//     const method = String(paymentMethod).toUpperCase();
//     if (method === "COD" && !codConfirmed) {
//       return res.status(400).json({ message: "COD must be confirmed before placing the order." });
//     }

//     let createdOrder;

//     // Try transactional path first
//     try {
//       await session.withTransaction(async () => {
//         // 1) Atomically check & decrement stock
//         await checkAndDecrementStock(products, session);

//         // 2) Create order in the same transaction
//         const [order] = await Order.create(
//           [{
//             user: userId,
//             products,
//             totalAmount: Number(totalAmount) || 0,
//             paymentMethod: method,
//             paymentStatus: method === "COD" ? "Pending" : "Paid",
//             cod: {
//               confirmed: method === "COD" ? !!codConfirmed : false,
//               confirmedAt: method === "COD" && codConfirmed ? new Date() : undefined,
//             },
//             status: "Pending",
//             address,
//             statusHistory: [{ status: "Pending", note: "Order placed" }],
//           }],
//           { session }
//         );

//         createdOrder = order;

//         // 3) Remove purchased items from user's cart
//         await removePurchasedFromCart(userId, products, session);


//       });
//     } catch (trxErr) {
//       // Fallback when local MongoDB has no replica set / transactions
//       const msg = String(trxErr?.message || "");
//       if (msg.includes("Transaction numbers are only allowed") || trxErr?.code === 20) {
//         try {
//           // Safe non-transaction path (helper does manual rollback on failure)
//           await checkAndDecrementStock(products, null);

//           createdOrder = await Order.create({
//             user: userId,
//             products,
//             totalAmount: Number(totalAmount) || 0,
//             paymentMethod: method,
//             paymentStatus: method === "COD" ? "Pending" : "Paid",
//             cod: {
//               confirmed: method === "COD" ? !!codConfirmed : false,
//               confirmedAt: method === "COD" && codConfirmed ? new Date() : undefined,
//             },
//             status: "Pending",
//             address,
//             statusHistory: [{ status: "Pending", note: "Order placed" }],
//           });
//           // Remove purchased items from user's cart
//           await removePurchasedFromCart(userId, products, null);
//         } catch (fallbackErr) {
//           return res.status(fallbackErr.status || 500).json({
//             message: fallbackErr.message || "Order failed",
//             details: fallbackErr.line ? { line: fallbackErr.line } : undefined,
//           });
//         }
//       } else {
//         throw trxErr;
//       }
//     } finally {
//       session.endSession();
//     }

//     // Fire-and-forget email (do not block HTTP response)
//     (async () => {
//       try {
//         const user = await userModel.findById(userId).select("name email");
//         if (user?.email) {
//           const orderForEmail = await Order.findById(createdOrder._id)
//             .populate("products.productId", "name price")
//             .populate("products.variantId", "price");
//           await emailOrderConfirmed({ to: user.email, order: orderForEmail, user });
//         }
//       } catch (e) {
//         console.error("Order confirmation email failed:", e?.message);
//       }
//     })();

//     return res.status(201).json(createdOrder);
//   } catch (err) {
//     session.endSession();
//     return res.status(500).json({ message: err.message });
//   }
// };

// /**
//  * GET /api/order
//  * - Returns the current user's orders (most recent first)
//  */
 export const getUserOrders = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const orders = await Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate("products.productId")
      .populate("products.variantId");

    return res.status(200).json(orders);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
 }




// ✅ UPDATED placeOrder (supports guest + logged-in)

export const placeOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    // ✅ allow guest (optionalAuth will set req.user if token exists)
    const userId = req.user?._id || req.user?.id || null;


    // generate token only for guest
const guestToken = !userId ? crypto.randomBytes(24).toString("hex") : null;

    const {
      products,
      address,
      paymentMethod,
      codConfirmed,
      paymentIntentId,
      paymentData,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

      // ✅ normalize email into address (for guest + safety)
const addressEmail =
  String(address?.email || "").trim().toLowerCase() ||
  (userId ? "" : String(req.body?.address?.email || "").trim().toLowerCase());

const normalizedAddress = {
  ...address,
  email: addressEmail,
};


    if (!products?.length || !address || !paymentMethod) {
      return res.status(400).json({ message: "Missing required order data." });
    }

    const method = String(paymentMethod).toUpperCase();

    // COD requires confirm
    if (method === "COD" && !codConfirmed) {
      return res
        .status(400)
        .json({ message: "COD must be confirmed before placing the order." });
    }

    // Stripe requires paymentIntentId
    if (method === "STRIPE" && !paymentIntentId) {
      return res
        .status(400)
        .json({ message: "Missing paymentIntentId for Stripe order." });
    }

    // Razorpay requires signature details
    if (method === "RAZORPAY") {
      const razorpayPayload = paymentData || {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      };

      const isSignatureValid = verifyRazorpaySignature(razorpayPayload);
      if (!isSignatureValid) {
        return res.status(400).json({ message: "Invalid Razorpay payment signature." });
      }
    }

    // 1) Compute server-side pricing
    const [settings, subtotal] = await Promise.all([
      getStoreSettings(),
      computeServerSubtotal(products),
    ]);
    const pricing = buildPricingSnapshot({ subtotal, settings });
    const totalAmount = pricing.grandTotal;

    // 2) Decide status/payment fields by method
    let status = "Pending";
    let paymentStatus = "Pending";
    let cod = { confirmed: false };
    let stripeFields = {};
    let razorpayFields = {};

    if (method === "COD") {
      cod = {
        confirmed: !!codConfirmed,
        confirmedAt: codConfirmed ? new Date() : undefined,
      };
    }

    if (method === "STRIPE") {
      // ✅ verify this intent is truly authorized (manual capture)
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (pi.status !== "requires_capture") {
        return res
          .status(400)
          .json({ message: `Stripe not authorized: ${pi.status}` });
      }

      const expected = Math.round(Number(totalAmount) * 100);
      if (pi.amount !== expected) {
        return res.status(400).json({ message: "Payment amount mismatch" });
      }

      status = "Pending_Confirmation";
      paymentStatus = "Authorized";
      stripeFields = { paymentIntentId };
    }

    if (method === "RAZORPAY") {
      const razorpayPayload = paymentData || {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      };

      status = "Pending";
      paymentStatus = "Paid";
      razorpayFields = {
        paymentIntentId: razorpayPayload.razorpayPaymentId || razorpayPayload.paymentId || "",
      };
    }

    // ✅ Build base payload AFTER status is final
    const base = {
      user: userId , 
      guestToken,
      products,
      totalAmount,
      paymentMethod: method,
      address: normalizedAddress,

      pricing,
      statusHistory: [{ status, note: "Order placed" }],
      cod,
      paymentStatus,
      ...stripeFields,
      ...razorpayFields,
      status,
    };

    let createdOrder;

    // 3) Transaction first
    try {
      await session.withTransaction(async () => {
        await checkAndDecrementStock(products, session);

        const [order] = await Order.create([base], { session });
        createdOrder = order;

        // ✅ only logged-in has a server cart
        if (userId) {
          await removePurchasedFromCart(userId, products, session);
        }
      });
    } catch (trxErr) {
      const msg = String(trxErr?.message || "");
      if (
        msg.includes("Transaction numbers are only allowed") ||
        trxErr?.code === 20
      ) {
        // 4) Fallback without transactions
        await checkAndDecrementStock(products, null);

        createdOrder = await Order.create(base);

        // ✅ only logged-in has a server cart
        if (userId) {
          await removePurchasedFromCart(userId, products, null);
        }
      } else {
        throw trxErr;
      }
    } finally {
      session.endSession();
    }

    // 5) Email async (only for logged-in users)
    // 5) Email async (guest + logged-in)
(async () => {
  try {
    let toEmail = null;
    let name = "";

    // ✅ If logged in -> use user email from DB
    if (userId) {
      const user = await userModel.findById(userId).select("name email");
      toEmail = user?.email || null;
      name = user?.name || "";
    } else {
      // ✅ Guest -> take email from address payload
      toEmail = req.body?.address?.email || null;
      name = req.body?.address?.fullName || "";
    }

    if (!toEmail) {
      console.warn("Order email skipped: missing recipient email");
      return;
    }

    const orderForEmail = await Order.findById(createdOrder._id)
      .populate("products.productId", "name images")
      .populate("products.variantId", "price");

    const isStripeRequest =
      createdOrder.paymentMethod === "STRIPE" &&
      createdOrder.paymentStatus === "Authorized" &&
      createdOrder.status === "Pending_Confirmation";

    if (isStripeRequest) {
      await emailOrderRequested({
        to: toEmail,
        order: orderForEmail,
        user: { name, email: toEmail },
      });
    } else {
      await emailOrderConfirmed({
        to: toEmail,
        order: orderForEmail,
        user: { name, email: toEmail },
      });
    }

    console.log("✅ Order email sent to customer:", toEmail);

    // ✅ Notify Admin via Email about the new order
    await emailAdminNewOrder({
      order: orderForEmail || createdOrder,
      user: { name, email: toEmail },
      address: createdOrder.address || req.body?.address,
    });
    console.log("✅ Admin order email notification dispatched.");

    // ✅ Broadcast order creation in real time to Admin Dashboard
    broadcastOrderCreated(orderForEmail || createdOrder);
  } catch (e) {
    console.error("❌ Order notification dispatch failed:", e);
  }
})();



return res.status(201).json({
  ...createdOrder.toObject(),
  guestToken,
});

  } catch (err) {
    session.endSession();
    console.error("placeOrder error:", err);
    return res.status(500).json({ message: err.message || "Order failed" });
  }
};



/**
 * GET /api/order/:orderId
 * - Returns one order (owned by the current user)
 */
export const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
   const userId = req.user?._id || req.user?.id || null;

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid orderId" });
    }
    // ✅ Guest token comes from header
    const guestToken =
      req.headers["x-guest-token"] ||
      req.headers["X-Guest-Token"] ||
      null;

    const order = await Order.findById(orderId)
      .populate("products.productId", "name images price")
      .populate("products.variantId", "images price");

    if (!order) return res.status(404).json({ message: "Order not found" });

   // ✅ AUTH CHECK:
    // 1) Logged-in user must own it
    if (userId && order.user && String(order.user) === String(userId)) {
      return res.json(order);
    }

    // 2) Guest must provide matching guestToken
    if (!userId && order.guestToken && guestToken && String(order.guestToken) === String(guestToken)) {
      return res.json(order);
    }

    return res.status(401).json({ message: "Unauthorized" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * PUT /api/order/cancel/:orderId
 * - Only Pending orders can be cancelled by the user
 * - Restocks quantities, updates status/history, emails user
 */
export const cancelOrder = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const userId = req.user?._id || req.user?.id;
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid orderId" });
    }

    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) return res.status(404).json({ message: "Order not found." });

    if (["Shipped", "Delivered", "Cancelled"].includes(order.status)) {
      return res.status(409).json({ message: "Order cannot be cancelled now." });
    }

    if (order.paymentMethod === "STRIPE" && order.paymentStatus === "Authorized" && order.paymentIntentId) {
  try {
    await stripe.paymentIntents.cancel(order.paymentIntentId);
    order.paymentStatus = "Cancelled";
  } catch (e) {
    return res.status(500).json({ message: "Failed to cancel payment authorization" });
  }
}


    let updated;

    // Prefer transactional restock + cancel
    try {
      await session.withTransaction(async () => {
        await restock(order.products, session);
        updated = await Order.findByIdAndUpdate(
          order._id,
          {
            $set: { status: "Cancelled", cancelledAt: new Date() },
            $push: { statusHistory: { status: "Cancelled", note: "Cancelled by user" } },
          },
          { new: true, session }
        );
      });
    } catch {
      // Fallback non-transaction path
      await restock(order.products, null);
      updated = await Order.findByIdAndUpdate(
        order._id,
        {
          $set: { status: "Cancelled", cancelledAt: new Date() },
          $push: { statusHistory: { status: "Cancelled", note: "Cancelled by user" } },
        },
        { new: true }
      );
    } finally {
      session.endSession();
    }

    // Fire-and-forget email
    (async () => {
      try {
        const user = await userModel.findById(userId).select("name email");
        if (user?.email) await emailOrderCancelled({ to: user.email, order: updated, user });
      } catch (e) {
        console.error("Cancel email failed:", e?.message);
      }
    })();

    return res.status(200).json({ message: "Order cancelled.", order: updated });
  } catch (err) {
    session.endSession();
    return res.status(500).json({ message: err.message });
  }
};

