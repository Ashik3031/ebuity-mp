import SellRequest from "../models/SellRequest.js";
import sendEmail from "../utils/sendEmail.js"; // ✅ use your existing sendEmail.js

export const createSellRequest = async (req, res) => {
  try {
   const {
  category,
  brand,
  productName,
  model,
  size,
  condition,
  age,
  heardAbout,
  sellerName,
  sellerEmail,
  sellerPhone,
} = req.body;

if (!sellerEmail) {
  return res.status(400).json({ success: false, message: "Email is required" });
}

if (!category || !productName) {
  return res.status(400).json({ success: false, message: "Category and Product Name are required" });
}


    const files = req.files || [];
    const images = files.map((f) => f.path).filter(Boolean);
    const publicIds = files.map((f) => f.filename || f.public_id).filter(Boolean);

    if (!images.length) {
      return res
        .status(400)
        .json({ success: false, message: "At least 1 image is required" });
    }

   const doc = await SellRequest.create({
  sellerName,
  sellerEmail,
  sellerPhone,

  category,
  brand: brand || "",
  productName,
  model: model || "",

  size,
  condition,
  age,
  heardAbout,

  images,
  publicIds,
  status: "new",
});

    return res.status(201).json({ success: true, message: "Submitted", request: doc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const listSellRequests = async (req, res) => {
  try {
    const items = await SellRequest.find().sort({ createdAt: -1 });
    return res.json({ success: true, items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getSellRequestById = async (req, res) => {
  try {
    const item = await SellRequest.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, item });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateSellRequestStatus = async (req, res) => {
  try {
    const { status, adminMessage = "" } = req.body;

    const allowed = ["new", "reviewed", "approved", "rejected"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    // Load item first to compare previous status + get sellerEmail
    const item = await SellRequest.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Not found" });

    const prevStatus = item.status;

    // update fields
    item.status = status;
    item.adminMessage = adminMessage || item.adminMessage || "";
    await item.save();

    // ✅ EMAIL TRIGGER: only when status changes into approved/rejected
    const shouldEmail =
  item.sellerEmail &&
  prevStatus !== status &&
  ["reviewed", "approved", "rejected"].includes(status);


//       console.log("SELL STATUS EMAIL DEBUG:", {
//   id: item._id,
//   prevStatus,
//   newStatus: status,
//   sellerEmail: item.sellerEmail,
//   sellerName: item.sellerName,
//   shouldEmail,
// });


    if (shouldEmail) {
      const subject =
  status === "approved"
    ? "✅ Your sell submission is approved"
    : status === "reviewed"
    ? "👀 Your sell submission is under review"
    : "❌ Update on your sell submission";


          

      const html =
  status === "reviewed"
    ? `
      <div style="font-family:Arial,sans-serif;line-height:1.6">
        <h2>Under Review 👀</h2>
        <p>Hi ${item.sellerName || "there"},</p>
        <p>Your item <b>${item.category} — ${item.brand ? item.brand + " " : ""}${item.productName}${item.model ? " (" + item.model + ")" : ""}
</b> is currently under review by our team.</p>
        <p>We’ll get back to you shortly with an update.</p>
        ${item.adminMessage ? `<p><b>Note from our team:</b><br/>${item.adminMessage}</p>` : ""}
        <p>— Thabioka Closet</p>
      </div>
    `
    : status === "approved"
    ? `
      <div style="font-family:Arial,sans-serif;line-height:1.6">
        <h2>Approved ✅</h2>
        <p>Hi ${item.sellerName || "there"},</p>
        <p>Your item <b>${item.category} — ${item.brand ? item.brand + " " : ""}${item.productName}${item.model ? " (" + item.model + ")" : ""}
</b> has been <b>approved</b>.</p>
        ${item.adminMessage ? `<p><b>Message from our team:</b><br/>${item.adminMessage}</p>` : ""}
        <p>We will contact you soon with next steps.</p>
        <p>— Thabioka Closet</p>
      </div>
    `
    : `
      <div style="font-family:Arial,sans-serif;line-height:1.6">
        <h2>Submission Update</h2>
        <p>Hi ${item.sellerName || "there"},</p>
        <p>We reviewed your item <b>${item.category} — ${item.brand ? item.brand + " " : ""}${item.productName}${item.model ? " (" + item.model + ")" : ""}</b>.</p>
        <p>Unfortunately, it was <b>not accepted</b> at this time.</p>
        ${item.adminMessage ? `<p><b>Reason / Notes:</b><br/>${item.adminMessage}</p>` : ""}
        <p>You can submit again anytime with updated details.</p>
        <p>— Thabioka Closet</p>
      </div>
    `;


// try {
//   console.log("SELL EMAIL: about to send", {
//     to: item.sellerEmail,
//     subject,
//     // show what FROM will be used (useful to debug spam/reject)
//     fromEnv: process.env.MAIL_FROM,
//   });

//   const info = await sendEmail({
//     to: item.sellerEmail,
//     subject,
//     html,
//   });

//   console.log("SELL EMAIL: sendMail success", {
//     messageId: info?.messageId,
//     accepted: info?.accepted,
//     rejected: info?.rejected,
//     response: info?.response,
//   });
// } catch (mailErr) {
//   console.error("SELL EMAIL: sendMail failed FULL", mailErr); // log full error, not only message
// }



      try {
        await sendEmail({
          to: item.sellerEmail,
          subject,
          html,
        });
      } catch (mailErr) {
        console.error("Email failed:", mailErr.message);
        // still return success (status updated)
      }
    }

    return res.json({ success: true, message: "Status updated", item });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteSellRequest = async (req, res) => {
  try {
    const item = await SellRequest.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, message: "Deleted", item });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
