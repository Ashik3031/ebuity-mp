// backend/controllers/invoice.controller.js
import PDFDocument from "pdfkit";
import Order from "../models/Order.js";

const fmt = (n, cur="INR", loc="en-IN") =>
  new Intl.NumberFormat(loc, { style:"currency", currency:cur }).format(Number(n)||0);

export async function downloadInvoice(req, res) {
  const { orderId } = req.params;
  const userId = req.user?._id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const order = await Order.findOne({ _id: orderId, user: userId })
    .populate("products.productId", "name images defaultPrice price")
    .populate("products.variantId", "price images");
  if (!order) return res.status(404).json({ message: "Order not found" });

  const currency = (order?.pricing?.currency || "INR").toUpperCase();
  const locale = currency === "INR" ? "en-IN" : undefined;

  const created = new Date(order.createdAt);
  const yyyymmdd = created.toISOString().slice(0,10).replace(/-/g,"");
  const tail = String(order._id).slice(-6).toUpperCase();
  const invoiceNo = order.invoiceNumber || `INV-${yyyymmdd}-${tail}`;

  const asAttachment = req.query.download === "1";
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `${asAttachment?"attachment":"inline"}; filename="${invoiceNo}.pdf"`);
  res.setHeader("Cache-Control", "private, no-store");

  const doc = new PDFDocument({ size:"A4", margin:40 });
  doc.pipe(res);

  doc.fontSize(20).text("INVOICE");
  doc.moveDown().fontSize(10).fillColor("#555")
    .text(`Invoice No: ${invoiceNo}`)
    .text(`Order ID: ${order._id}`)
    .text(`Date: ${created.toLocaleDateString(locale)}`);
  doc.moveDown();

  const a = order.address || {};
  const billTo = [a.name, a.street, [a.city,a.state,a.zip].filter(Boolean).join(", "), a.country, a.phone]
    .filter(Boolean).join("\n");
  doc.fillColor("#000").fontSize(12).text("Bill To:");
  doc.fontSize(10).fillColor("#333").text(billTo || "—");
  doc.moveDown();

  const colX = { item:40, qty:360, unit:420, total:500 };
  let y = doc.y + 6;
  doc.fillColor("#000").fontSize(11)
    .text("Item", colX.item, y).text("Qty", colX.qty, y)
    .text("Unit", colX.unit, y, { width:80, align:"right" })
    .text("Total", colX.total, y, { width:80, align:"right" });
  doc.moveTo(40, y+14).lineTo(555, y+14).stroke(); y += 22;

  const lines = (order.products||[]).map(it => {
    const p = it.productId, v = it.variantId;
    const name = it.title || p?.name || "Item";
    const qty = Math.max(1, Number(it.quantity)||1);
    const unit = it.unitPrice ?? v?.price ?? p?.defaultPrice ?? p?.price ?? 0;
    const total = unit * qty;
    const attrs = [it.size && `Size: ${it.size}`, it.color && `Color: ${it.color}`].filter(Boolean).join(" • ");
    return { name, qty, unit, total, attrs };
  });

  for (const ln of lines) {
    doc.fontSize(10).fillColor("#000").text(ln.name, colX.item, y, { width:300 });
    if (ln.attrs) doc.fillColor("#666").text(ln.attrs, colX.item, y+12, { width:300 });
    doc.fillColor("#000")
      .text(String(ln.qty), colX.qty, y)
      .text(fmt(ln.unit, currency, locale), colX.unit, y, { width:80, align:"right" })
      .text(fmt(ln.total, currency, locale), colX.total, y, { width:80, align:"right" });
    y += 28; if (y > 720) { doc.addPage(); y = 60; }
  }

  const pr = order.pricing || {};
  const subtotal = pr.subtotal ?? lines.reduce((s,l)=>s+l.total, 0);
  const shipping = pr.shippingFee || 0;
  const taxAmt   = pr.taxAmount || 0;
  const total    = pr.grandTotal ?? order.totalAmount ?? (subtotal + shipping + taxAmt);

  doc.moveTo(40, y+6).lineTo(555, y+6).stroke(); y += 16;
  const row = (label, val, bold=false) => {
    doc.fontSize(10).fillColor("#666").text(label, 360, y);
    doc.fontSize(bold?12:10).fillColor("#000")
      .text(fmt(val, currency, locale), 480, y, { width:100, align:"right" });
    y += bold?18:14;
  };
  row("Subtotal", subtotal);
  row("Shipping", shipping);
  if (taxAmt) row(pr.taxRate ? `Tax (${pr.taxRate}%)` : "Tax", taxAmt);
  doc.moveTo(360, y+4).lineTo(580, y+4).stroke(); y += 10;
  row("Total", total, true);

  doc.end();
}
