// backend/services/email.service.js
import nodemailer from "nodemailer";
import adminModel from "../models/adminModel.js";

const {
  SMTP_HOST, SMTP_PORT, SMTP_SECURE,
  SMTP_USER, SMTP_PASS, SMTP_FROM,
  EMAIL_LOG_ONLY,
  BASE_URL,
  CLIENT_URL,
} = process.env;

const SITE_URL = BASE_URL || CLIENT_URL || "http://localhost:3000";

let transporter = null;
let logOnly = false;

function info(msg, extra) {
  console.log(`[email.service] ${msg}`);
  if (extra) console.log(extra);
}

function createTransport() {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: String(SMTP_SECURE) === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

// ---- init ----
if (EMAIL_LOG_ONLY === "true") {
  logOnly = true;
  info("EMAIL_LOG_ONLY=true -> logging only");
} else if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
  logOnly = true;
  info("SMTP not configured; one or more envs missing", {
    SMTP_HOST: !!SMTP_HOST,
    SMTP_PORT: !!SMTP_PORT,
    SMTP_USER: !!SMTP_USER,
    SMTP_PASS: !!SMTP_PASS,
    SMTP_FROM: !!SMTP_FROM,
  });
} else {
  transporter = createTransport();
  transporter.verify((err) => {
    if (err) {
      logOnly = true;
      info("SMTP verify failed -> logging only: " + err.message);
    } else {
      info("SMTP OK: " + SMTP_HOST);
    }
  });
}

async function sendOrLog({ to, subject, text = "", html = "" }) {
  const msg = { from: SMTP_FROM, to, subject, text, html };

  if (logOnly || !transporter) {
    console.log("----- EMAIL (LOG ONLY) -----");
    console.log("TO:", to);
    console.log("SUBJECT:", subject);
    console.log("TEXT:", text);
    console.log("HTML:\n\n", html, "\n");
    console.log("----------------------------");
    return { logged: true, reason: !transporter ? "NO_TRANSPORTER" : "LOG_ONLY" };
  }

  return transporter.sendMail(msg);
}

// ---------- PUBLIC EMAIL HELPERS ----------

function buildItems(order) {
  return (order?.products || [])
    .map((l) => `${l.quantity || 1} × ${(l.productId?.name || "Item")}`)
    .join(", ");
}

/**
 * ✅ Stripe manual-capture: request received (Authorized)
 */
export async function emailOrderRequested({ to, order, user }) {
  const id = order?._id || "";
  const items = buildItems(order);
  const link = `${SITE_URL}/orders/${id}`;

  const subject = `Order request received #${id}`;
  const text =
`Hi ${user?.name || ""},

We received your order request.
Payment is authorized (not charged yet). We’ll confirm availability and then capture the payment.

Order #${id}
Items: ${items || "-"}
Total: ${order?.totalAmount ?? "-"}

View your order: ${link}`;

  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111;font-size:14px">
    <h2>Order request received ✅</h2>
    <p>We received your order request for <strong>#${id}</strong>.</p>
    <p><strong>Payment status:</strong> Authorized (not charged yet)</p>
    <p>We’ll confirm availability and then capture the payment.</p>
    <p><strong>Items:</strong> ${items || "-"}</p>
    <p><strong>Total:</strong> ${order?.totalAmount ?? "-"}</p>
    <p>
      <a href="${link}" style="display:inline-block;padding:10px 14px;background:#111;color:#fff;text-decoration:none;border-radius:6px">
        View order
      </a>
    </p>
  </div>`;

  return sendOrLog({ to, subject, text, html });
}

/**
 * ✅ COD confirmed OR Stripe captured: order confirmed
 */
export async function emailOrderConfirmed({ to, order, user }) {
  const id = order?._id || "";
  const items = buildItems(order);
  const link = `${SITE_URL}/orders/${id}`;

  const subject = `Order confirmed #${id}`;
  const text =
`Hi ${user?.name || ""},

Thanks for your order!
Order #${id}
Items: ${items || "-"}
Total: ${order?.totalAmount ?? "-"}

Track your order: ${link}`;

  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111;font-size:14px">
    <h2>Order confirmed 🎉</h2>
    <p><strong>Order #${id}</strong> has been confirmed.</p>
    <p><strong>Items:</strong> ${items || "-"}</p>
    <p><strong>Total:</strong> ${order?.totalAmount ?? "-"}</p>
    <p>
      <a href="${link}" style="display:inline-block;padding:10px 14px;background:#111;color:#fff;text-decoration:none;border-radius:6px">
        View order
      </a>
    </p>
  </div>`;

  return sendOrLog({ to, subject, text, html });
}

export async function emailOrderCancelled({ to, order, user }) {
  const id = order?._id || "";
  const link = `${SITE_URL}/orders/${id}`;

  const subject = `Order cancelled #${id}`;
  const text =
`Hi ${user?.name || ""},

Your order #${id} has been cancelled.
View details: ${link}`;

  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111;font-size:14px">
    <h2>Order cancelled</h2>
    <p>Your order <strong>#${id}</strong> has been cancelled.</p>
    <p>
      <a href="${link}" style="display:inline-block;padding:10px 14px;background:#111;color:#fff;text-decoration:none;border-radius:6px">
        View details
      </a>
    </p>
  </div>`;

  return sendOrLog({ to, subject, text, html });
}

export async function emailBackInStock({ to, product, linkBase = SITE_URL }) {
  const subject = `Back in stock: ${product?.name || "Product"}`;
  const link = `${linkBase}/product/${product?._id || ""}`;
  const text = `Good news!
${product?.name || "Product"} is now available.
View: ${link}`;

  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111;font-size:14px">
    <h2>Good news 🎉</h2>
    <p><strong>${product?.name || "This product"}</strong> is now available.</p>
    <p>
      <a href="${link}" style="display:inline-block;padding:10px 14px;background:#111;color:#fff;text-decoration:none;border-radius:6px">
        View product
      </a>
    </p>
    <p style="color:#666">If you no longer want these alerts, just ignore this email.</p>
  </div>`;

  return sendOrLog({ to, subject, text, html });
}

/**
 * Send an email notification to Admin when a new boutique product order is placed
 */
export async function emailAdminNewOrder({ order, user, address }) {
  try {
    const adminEmails = new Set();
    if (process.env.ADMIN_NOTIFICATION_EMAIL) {
      process.env.ADMIN_NOTIFICATION_EMAIL.split(",").forEach((e) => adminEmails.add(e.trim()));
    }
    if (process.env.ADMIN_EMAIL) {
      process.env.ADMIN_EMAIL.split(",").forEach((e) => adminEmails.add(e.trim()));
    }
    if (SMTP_FROM) {
      adminEmails.add(SMTP_FROM.trim());
    }
    try {
      const dbAdmins = await adminModel.find({}).select("email").lean();
      if (Array.isArray(dbAdmins)) {
        dbAdmins.forEach((a) => {
          if (a?.email) adminEmails.add(a.email.trim());
        });
      }
    } catch (_dbErr) {
      // Ignore database lookup failure
    }

    const recipients = Array.from(adminEmails).filter(Boolean);
    if (recipients.length === 0) {
      recipients.push("admin@roseessence.ae");
    }

    const orderId = order?._id ? String(order._id) : "NEW-ORDER";
    const total = order?.totalAmount ?? order?.totalPrice ?? 0;
    const currency = order?.currency || "AED";
    const paymentMethod = order?.paymentMethod || "Cash on Delivery";
    const paymentStatus = order?.paymentStatus || "Pending";
    const customerName = user?.name || address?.fullName || address?.name || "Boutique Customer";
    const customerEmail = user?.email || address?.email || "N/A";
    const customerPhone = user?.phone || address?.phone || address?.phoneNumber || "N/A";
    const shippingAddress = [
      address?.addressLine1 || address?.streetAddress,
      address?.addressLine2 || address?.buildingName,
      address?.area,
      address?.city || "Dubai",
      address?.country || "United Arab Emirates",
    ].filter(Boolean).join(", ") || "Standard Delivery Address";

    const itemsHtml = (order?.products || [])
      .map((p) => {
        const title = p.productId?.name || p.name || "Boutique Item";
        const qty = p.quantity || 1;
        const price = p.variantId?.price || p.price || 0;
        return `
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #F0E6DD; color: #292525; font-size: 13px;">${title}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #F0E6DD; color: #746D69; font-size: 13px; text-align: center;">${qty}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #F0E6DD; color: #292525; font-size: 13px; text-align: right; font-weight: 600;">${currency} ${(price * qty).toFixed(2)}</td>
          </tr>
        `;
      })
      .join("");

    const adminLink = `${SITE_URL}/admin/orders`;
    const subject = `[New Order Alert] #${orderId.slice(-6).toUpperCase()} - ${currency} ${Number(total).toFixed(2)} from ${customerName}`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF7F2; padding: 24px; color: #292525;">
        <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #E8D8C8; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.03);">
          <div style="background: linear-gradient(135deg, #CF565D 0%, #A83840 100%); padding: 24px 28px; text-align: left; color: #ffffff;">
            <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.9;">Rose Essence Luxury Boutique</p>
            <h1 style="margin: 6px 0 0; font-size: 22px; font-weight: 700;">New Customer Order Received 🛍️</h1>
          </div>

          <div style="padding: 24px 28px;">
            <div style="background: #FCF4F2; border-left: 4px solid #CF565D; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
              <span style="font-size: 13px; font-weight: 600; color: #CF565D;">Action Required:</span>
              <span style="font-size: 13px; color: #292525;"> A new boutique order has been placed and requires fulfillment processing.</span>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
              <tr>
                <td style="padding: 6px 0; color: #746D69; width: 140px;">Order Reference:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #292525;">#${orderId}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #746D69;">Customer:</td>
                <td style="padding: 6px 0; font-weight: 600; color: #292525;">${customerName} (${customerEmail})</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #746D69;">Phone:</td>
                <td style="padding: 6px 0; color: #292525;">${customerPhone}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #746D69;">Delivery Address:</td>
                <td style="padding: 6px 0; color: #292525;">${shippingAddress}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #746D69;">Payment:</td>
                <td style="padding: 6px 0; color: #292525;"><span style="background: #FAF7F2; border: 1px solid #E8D8C8; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">${paymentMethod} • ${paymentStatus}</span></td>
              </tr>
            </table>

            <h3 style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #746D69; margin: 20px 0 10px; border-bottom: 1px solid #F0E6DD; padding-bottom: 6px;">Ordered Items</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
              <thead>
                <tr style="background: #FAF7F2;">
                  <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #746D69;">Item</th>
                  <th style="padding: 8px 12px; text-align: center; font-size: 11px; text-transform: uppercase; color: #746D69;">Qty</th>
                  <th style="padding: 8px 12px; text-align: right; font-size: 11px; text-transform: uppercase; color: #746D69;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml || '<tr><td colspan="3" style="padding: 12px; text-align: center; color: #746D69;">Standard Order Items</td></tr>'}
              </tbody>
            </table>

            <div style="background: #FAF7F2; border: 1px solid #E8D8C8; border-radius: 12px; padding: 14px 18px; margin-top: 16px; text-align: right;">
              <span style="font-size: 13px; color: #746D69; margin-right: 12px;">Total Order Value:</span>
              <span style="font-size: 20px; font-weight: 800; color: #292525;">${currency} ${Number(total).toFixed(2)}</span>
            </div>

            <div style="text-align: center; margin-top: 28px;">
              <a href="${adminLink}" style="display: inline-block; background: #292525; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 13px; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                Open Order in Admin Dashboard →
              </a>
            </div>
          </div>

          <div style="background: #FAF7F2; border-top: 1px solid #E8D8C8; padding: 14px 28px; text-align: center; font-size: 11px; color: #746D69;">
            Rose Essence Wellness & Beauty LLC • Dubai, UAE • Automated Admin Notification
          </div>
        </div>
      </div>
    `;

    for (const recipient of recipients) {
      await sendOrLog({
        to: recipient,
        subject,
        html,
        text: `New Order #${orderId} for ${currency} ${Number(total).toFixed(2)} by ${customerName}. View: ${adminLink}`,
      });
    }
  } catch (err) {
    console.error("[emailAdminNewOrder] Error:", err.message);
  }
}
