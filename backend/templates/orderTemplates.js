// backend/templates/orderTemplates.js

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const inr = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const renderLines = (order) =>
  (order.products || [])
    .map((l) => {
      const name = l?.productId?.name ?? "Product";
      const qty = l?.quantity ?? 0;
      const price = l?.variantId?.price ?? l?.productId?.price ?? 0;
      return `
        <tr>
          <td style="padding:8px 0;color:#111;">${name}</td>
          <td style="padding:8px 0;color:#555;text-align:center;">${qty}</td>
          <td style="padding:8px 0;color:#111;text-align:right;">${inr(price)}</td>
        </tr>
      `;
    })
    .join("");

const shell = (title, body) => `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:640px;margin:auto;padding:24px;">
    <h2 style="margin:0 0 12px;">${title}</h2>
    ${body}
    <p style="margin:24px 0 0;color:#666;">— ${process.env.FROM_NAME || "ThabiokaCloset"}</p>
  </div>
`;

export function orderConfirmationTemplate({ order, user }) {
  const subject = `Order #${order._id} confirmed`;
  const orderUrl = `${CLIENT_URL}/orders/${order._id}`;

  const body = `
    <p style="margin:0 0 16px;">Hi ${user?.name || ""}, we’ve received your order <b>#${order._id}</b>.</p>

    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <thead>
        <tr>
          <th style="text-align:left;color:#666;padding-bottom:6px;border-bottom:1px solid #eee;">Item</th>
          <th style="text-align:center;color:#666;padding-bottom:6px;border-bottom:1px solid #eee;">Qty</th>
          <th style="text-align:right;color:#666;padding-bottom:6px;border-bottom:1px solid #eee;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${renderLines(order) || `<tr><td colspan="3" style="padding:12px 0;color:#555;">No items</td></tr>`}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding-top:10px;color:#111;font-weight:600;text-align:right;">Total</td>
          <td style="padding-top:10px;color:#111;font-weight:700;text-align:right;">${inr(order.totalAmount)}</td>
        </tr>
      </tfoot>
    </table>

    <p style="margin:16px 0;">
      <b>Payment:</b> ${order.paymentMethod || "-"} · ${order.paymentStatus || "-"}
    </p>

    // <div style="margin:16px 0;">
    //   <b>Shipping Address</b>
    //   <div style="color:#333;line-height:1.4;margin-top:6px;">
    //     ${order.address?.street || ""}<br/>
    //     ${order.address?.city || ""} ${order.address?.state || ""} ${order.address?.zip || ""}<br/>
    //     ${order.address?.country || ""}
    //   </div>
    // </div>

    <div style="margin:16px 0;">
  <b>Shipping Address</b>
  <div style="color:#333;line-height:1.4;margin-top:6px;">
    <div style="font-weight:600;color:#111;">
      ${order.address?.fullName || ""}
      ${order.address?.phone ? ` · ${order.address.phone}` : ""}
    </div>

    ${order.address?.addressType ? `<div style="color:#666;">${order.address.addressType}</div>` : ""}

    <div>
      ${order.address?.unitNumber ? `${order.address.unitNumber}, ` : ""}
      ${order.address?.buildingName || ""}
    </div>

    <div>
      ${order.address?.street ? `${order.address.street}, ` : ""}
      ${order.address?.area ? `${order.address.area}, ` : ""}
      ${order.address?.city || ""}
    </div>

    <div>
      ${order.address?.state || ""}${order.address?.postalCode ? ` · ${order.address.postalCode}` : ""}
    </div>

    ${order.address?.landmark ? `<div><b>Landmark:</b> ${order.address.landmark}</div>` : ""}
    ${order.address?.poBox ? `<div><b>PO Box:</b> ${order.address.poBox}</div>` : ""}
  </div>
</div>


    <p style="margin:16px 0;">Track your order:</p>
    <p><a href="${orderUrl}" style="color:#0b62f5" target="_blank" rel="noreferrer">${orderUrl}</a></p>
  `;

  const html = shell("Thanks for your order 🎉", body);
  const text = `Hi ${user?.name || ""}, your order #${order._id} is confirmed. Total: ${inr(
    order.totalAmount
  )}. Track it at ${orderUrl}`;

  return { subject, html, text };
}

export function orderCancelledTemplate({ order, user }) {
  const subject = `Order #${order._id} cancelled`;

  const body = `
    <p style="margin:0 0 12px;">Hi ${user?.name || ""},</p>
    <p style="margin:0 0 16px;">Your order <b>#${order._id}</b> has been cancelled.</p>
    <p style="margin:0 0 6px;"><b>Total:</b> ${inr(order.totalAmount)}</p>
    <p style="margin:0;">Status: ${order.status}</p>
  `;

  const html = shell("Order Cancelled", body);
  const text = `Hi ${user?.name || ""}, your order #${order._id} has been cancelled. Total: ${inr(
    order.totalAmount
  )}.`;

  return { subject, html, text };
}
