import nodemailer from "nodemailer";
import NotificationLog from "../models/NotificationLog.js";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
  EMAIL_LOG_ONLY,
  WHATSAPP_API_TOKEN,
  WHATSAPP_PHONE_ID,
  BASE_URL,
} = process.env;

const SITE_URL = BASE_URL || "http://localhost:3000";

let transporter = null;
let smtpReady = false;

function initTransporter() {
  if (EMAIL_LOG_ONLY === "true") {
    return null;
  }
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    return null;
  }
  try {
    const t = nodemailer.createTransport({
      host: SMTP_HOST.trim(),
      port: Number(SMTP_PORT) || 587,
      secure: String(SMTP_SECURE) === "true",
      auth: { user: SMTP_USER.trim(), pass: SMTP_PASS.trim() },
      tls: { rejectUnauthorized: false },
    });
    return t;
  } catch (err) {
    console.warn("[notificationService] Transporter init error:", err.message);
    return null;
  }
}

transporter = initTransporter();
if (transporter) {
  transporter.verify((err) => {
    if (err) {
      console.warn("[notificationService] SMTP verify failed (will record failed delivery if attempted):", err.message);
      smtpReady = false;
    } else {
      console.log("[notificationService] SMTP provider verified and ready.");
      smtpReady = true;
    }
  });
}

/**
 * Dispatch an email notification and record verified delivery result
 */
async function dispatchEmail({ to, subject, html, text }) {
  if (!transporter) {
    return {
      confirmed: false,
      status: "logged",
      error: "SMTP provider not configured. Logged to system records.",
      messageId: null,
    };
  }

  try {
    const info = await transporter.sendMail({
      from: SMTP_FROM ? SMTP_FROM.trim() : "Rose Essence <appointments@roseessence.ae>",
      to: to.trim(),
      subject,
      text: text || "",
      html: html || "",
    });

    if (info && info.messageId) {
      return {
        confirmed: true,
        status: "sent",
        messageId: info.messageId,
        error: null,
      };
    }

    return {
      confirmed: false,
      status: "failed",
      error: "No provider delivery confirmation message ID received.",
      messageId: null,
    };
  } catch (err) {
    return {
      confirmed: false,
      status: "failed",
      error: err.message || "Failed to deliver email through SMTP provider.",
      messageId: null,
    };
  }
}

/**
 * Dispatch a WhatsApp notification (checks real provider configuration)
 */
async function dispatchWhatsApp({ to, message }) {
  if (!WHATSAPP_API_TOKEN || !WHATSAPP_PHONE_ID) {
    return {
      confirmed: false,
      status: "failed",
      error: "WhatsApp provider not configured (WHATSAPP_API_TOKEN or WHATSAPP_PHONE_ID missing).",
      messageId: null,
    };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: to.replace(/[^0-9]/g, ""),
          type: "text",
          text: { body: message },
        }),
      }
    );

    const data = await response.json();
    if (response.ok && data?.messages?.[0]?.id) {
      return {
        confirmed: true,
        status: "sent",
        messageId: data.messages[0].id,
        error: null,
      };
    }

    return {
      confirmed: false,
      status: "failed",
      error: data?.error?.message || "WhatsApp provider rejected message.",
      messageId: null,
    };
  } catch (err) {
    return {
      confirmed: false,
      status: "failed",
      error: err.message || "WhatsApp dispatch network failure.",
      messageId: null,
    };
  }
}

/**
 * Log and send a notification with strict provider confirmation rules
 */
export async function sendNotification({
  bookingId = null,
  recipient,
  recipientRole = "customer",
  channel = "email",
  eventType,
  subject = "",
  content = "",
  metadata = {},
}) {
  if (!recipient) {
    console.warn("[notificationService] Missing recipient for event:", eventType);
    return null;
  }

  let deliveryResult = { confirmed: false, status: "pending", error: null, messageId: null };

  if (channel === "email") {
    deliveryResult = await dispatchEmail({
      to: recipient,
      subject,
      html: content,
      text: content.replace(/<[^>]*>/g, ""),
    });
  } else if (channel === "whatsapp") {
    deliveryResult = await dispatchWhatsApp({
      to: recipient,
      message: `${subject}\n\n${content}`,
    });
  }

  try {
    const log = await NotificationLog.create({
      bookingId,
      recipient,
      recipientRole,
      channel,
      eventType,
      subject,
      content,
      status: deliveryResult.status,
      provider: channel === "email" ? "smtp" : "meta_whatsapp",
      providerMessageId: deliveryResult.messageId,
      errorMessage: deliveryResult.error,
      retryCount: 0,
      maxRetries: 3,
      persistentFailure: false,
      lastAttemptAt: new Date(),
      confirmedAt: deliveryResult.confirmed ? new Date() : null,
      metadata,
    });
    return log;
  } catch (logErr) {
    console.error("[notificationService] Failed to persist NotificationLog:", logErr.message);
    return null;
  }
}

/**
 * Retry failed notifications safely with a retry cap
 */
export async function retryFailedNotifications(filterBookingId = null) {
  const query = {
    status: "failed",
    retryCount: { $lt: 3 },
    persistentFailure: false,
  };

  if (filterBookingId) {
    query.bookingId = filterBookingId;
  }

  const failedLogs = await NotificationLog.find(query).limit(20);
  const results = [];

  for (const log of failedLogs) {
    log.retryCount += 1;
    log.lastAttemptAt = new Date();

    let retryResult = { confirmed: false, status: "failed", error: null, messageId: null };
    if (log.channel === "email") {
      retryResult = await dispatchEmail({
        to: log.recipient,
        subject: log.subject,
        html: log.content,
      });
    } else if (log.channel === "whatsapp") {
      retryResult = await dispatchWhatsApp({
        to: log.recipient,
        message: log.content,
      });
    }

    if (retryResult.confirmed) {
      log.status = "sent";
      log.providerMessageId = retryResult.messageId;
      log.confirmedAt = new Date();
      log.errorMessage = null;
    } else {
      log.errorMessage = retryResult.error;
      if (log.retryCount >= log.maxRetries) {
        log.persistentFailure = true;
        // Trigger admin alert for persistent failure
        await sendNotification({
          bookingId: log.bookingId,
          recipient: SMTP_FROM || "admin@roseessence.ae",
          recipientRole: "admin",
          channel: "email",
          eventType: "admin_alert",
          subject: `[ALERT] Persistent Notification Delivery Failure: ${log.eventType}`,
          content: `<p>A notification to <strong>${log.recipient}</strong> (${log.channel}) failed after ${log.retryCount} retries.</p><p>Error: ${log.errorMessage}</p>`,
          metadata: { originalLogId: log._id },
        }).catch(() => null);
      }
    }

    await log.save();
    results.push(log);
  }

  return { retried: results.length, logs: results };
}

// ==========================================
// Specific Business Workflow Notification Triggers
// ==========================================

export async function notifyBookingConfirmed(booking) {
  if (!booking) return;

  const servicesList = (booking.services || [])
    .map((s) => `<li>${s.name} (${s.durationMinutes} mins) — AED ${s.price}</li>`)
    .join("");

  // 1. Notify Customer
  if (booking.customerDetails?.email) {
    await sendNotification({
      bookingId: booking._id,
      recipient: booking.customerDetails.email,
      recipientRole: "customer",
      channel: "email",
      eventType: "booking_confirmed",
      subject: `Your Rose Essence Appointment is Confirmed: ${booking.bookingNumber}`,
      content: `
        <div style="font-family:sans-serif;color:#292525;line-height:1.6;max-width:600px;">
          <h2 style="color:#CF565D;">Appointment Confirmed 🌹</h2>
          <p>Dear ${booking.customerDetails.name},</p>
          <p>Your at-home ritual has been confirmed for <strong>${booking.scheduledDate}</strong>.</p>
          <p><strong>Appointment Time:</strong> ${new Date(booking.scheduledStartTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – ${new Date(booking.scheduledEndTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
          <p><strong>Location:</strong> ${booking.serviceAddress.unitNumber}, ${booking.serviceAddress.buildingName}, ${booking.serviceAddress.area}, Dubai</p>
          <h3>Selected Rituals:</h3>
          <ul>${servicesList}</ul>
          <p><strong>Total:</strong> AED ${booking.totalPrice.toFixed(2)}</p>
          <p>Track your appointment: <a href="${SITE_URL}/my-bookings" style="color:#CF565D;">View Appointment Details</a></p>
        </div>
      `,
    });
  }

  // 2. Notify Assigned Staff
  if (booking.assignedStaff?.email || (typeof booking.assignedStaff === "object" && booking.assignedStaff?.email)) {
    const staffEmail = booking.assignedStaff.email;
    const staffName = booking.assignedStaff.name || "Therapist";

    await sendNotification({
      bookingId: booking._id,
      recipient: staffEmail,
      recipientRole: "staff",
      channel: "email",
      eventType: "staff_assigned",
      subject: `New Job Assigned: ${booking.bookingNumber} (${booking.scheduledDate})`,
      content: `
        <div style="font-family:sans-serif;color:#292525;line-height:1.6;max-width:600px;">
          <h2 style="color:#CF565D;">New Appointment Assignment</h2>
          <p>Hello ${staffName},</p>
          <p>You have been assigned to an in-home ritual for <strong>${booking.customerDetails?.name || "Client"}</strong> on <strong>${booking.scheduledDate}</strong>.</p>
          <p><strong>Time:</strong> ${booking.scheduledStartTime ? new Date(booking.scheduledStartTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : (booking.scheduledTime || "Scheduled Time")} – ${booking.scheduledEndTime ? new Date(booking.scheduledEndTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</p>
          <p><strong>Location:</strong> ${booking.serviceAddress?.unitNumber || ""}, ${booking.serviceAddress?.buildingName || ""}, ${booking.serviceAddress?.area || "Dubai"}</p>
          <p>Please log in to your staff portal to accept or review this job: <a href="${SITE_URL}/staff" style="color:#CF565D;">Staff Portal</a></p>
        </div>
      `,
    });
  }

  // 3. Notify Admin of New Booking Order
  try {
    const adminRecipients = new Set();
    if (process.env.ADMIN_NOTIFICATION_EMAIL) {
      process.env.ADMIN_NOTIFICATION_EMAIL.split(",").forEach((e) => adminRecipients.add(e.trim()));
    }
    if (process.env.ADMIN_EMAIL) {
      process.env.ADMIN_EMAIL.split(",").forEach((e) => adminRecipients.add(e.trim()));
    }
    if (SMTP_FROM) {
      adminRecipients.add(SMTP_FROM.trim());
    }
    const recipientsList = Array.from(adminRecipients).filter(Boolean);
    if (recipientsList.length === 0) recipientsList.push("admin@roseessence.ae");

    const assignedText = booking.assignedStaff?.name
      ? `Assigned Specialist: ${booking.assignedStaff.name}`
      : "⚠️ UNASSIGNED - Requires Specialist Dispatch!";

    for (const adminEmail of recipientsList) {
      await sendNotification({
        bookingId: booking._id,
        recipient: adminEmail,
        recipientRole: "admin",
        channel: "email",
        eventType: "admin_booking_order",
        subject: `[New Ritual Order] ${booking.bookingNumber} - AED ${booking.totalPrice?.toFixed(2) || "0.00"} (${booking.scheduledDate})`,
        content: `
          <div style="font-family:sans-serif;color:#292525;line-height:1.6;max-width:600px;">
            <div style="background:#292525;color:#fff;padding:16px 20px;border-radius:10px 10px 0 0;">
              <h2 style="margin:0;color:#CF565D;">New Appointment Order Received 🌸</h2>
              <p style="margin:4px 0 0;font-size:12px;opacity:0.8;">Booking Reference: ${booking.bookingNumber}</p>
            </div>
            <div style="border:1px solid #E8D8C8;border-top:none;padding:20px;border-radius:0 0 10px 10px;background:#fff;">
              <p>A new beauty ritual has been booked by <strong>${booking.customerDetails?.name || "Client"}</strong>.</p>
              <p><strong>Scheduled Date & Time:</strong> ${booking.scheduledDate} (${booking.scheduledTime || (booking.scheduledStartTime ? new Date(booking.scheduledStartTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Time TBD")})</p>
              <p><strong>Location:</strong> ${booking.serviceAddress?.unitNumber || ""}, ${booking.serviceAddress?.buildingName || ""}, ${booking.serviceAddress?.area || "Dubai"}</p>
              <p><strong>Client Phone:</strong> ${booking.customerDetails?.phone || "N/A"} | <strong>Email:</strong> ${booking.customerDetails?.email || "N/A"}</p>
              <div style="background:#FAF7F2;border:1px solid #E8D8C8;padding:12px;border-radius:8px;margin:12px 0;">
                <p style="margin:0;font-weight:bold;color:${booking.assignedStaff?.name ? "#10B981" : "#CF565D"};">${assignedText}</p>
              </div>
              <p><strong>Selected Rituals:</strong></p>
              <ul>${servicesList}</ul>
              <p style="font-size:16px;font-weight:bold;">Total Amount: AED ${booking.totalPrice?.toFixed(2) || "0.00"}</p>
              <p><a href="${SITE_URL}/admin/bookings" style="display:inline-block;padding:10px 18px;background:#CF565D;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;margin-top:10px;">Open in Admin Bookings →</a></p>
            </div>
          </div>
        `,
      });
    }
  } catch (adminErr) {
    console.warn("[notifyBookingConfirmed] Admin email dispatch warning:", adminErr.message);
  }
}

export async function notifyJobStatusChange(booking, status, staffName = "") {
  if (!booking || !booking.customerDetails?.email) return;

  const statusTitles = {
    on_the_way: "Your Specialist is on the Way 🚗",
    arrived: "Your Specialist has Arrived 🌸",
    in_progress: "Your Treatment is in Progress ✨",
    completed: "Your Appointment is Completed 💖",
  };

  const title = statusTitles[status] || `Appointment Update: ${status}`;

  await sendNotification({
    bookingId: booking._id,
    recipient: booking.customerDetails.email,
    recipientRole: "customer",
    channel: "email",
    eventType: `job_${status}`,
    subject: `Rose Essence Update: ${title} (${booking.bookingNumber})`,
    content: `
      <div style="font-family:sans-serif;color:#292525;line-height:1.6;max-width:600px;">
        <h2 style="color:#CF565D;">${title}</h2>
        <p>Dear ${booking.customerDetails.name},</p>
        <p>Status update for appointment <strong>${booking.bookingNumber}</strong>:</p>
        <p style="padding:12px;background:#FAF7F2;border-left:4px solid #CF565D;font-weight:bold;">
          ${status.replace(/_/g, " ").toUpperCase()}
        </p>
        ${staffName ? `<p>Specialist: <strong>${staffName}</strong></p>` : ""}
        <p>View live details in your portal: <a href="${SITE_URL}/my-bookings" style="color:#CF565D;">My Appointments</a></p>
      </div>
    `,
  });
}

export async function notifyRescheduleOutcome(booking, approved, adminNote = "") {
  if (!booking || !booking.customerDetails?.email) return;

  const subject = approved
    ? `Reschedule Confirmed: ${booking.bookingNumber}`
    : `Reschedule Request Update: ${booking.bookingNumber}`;

  await sendNotification({
    bookingId: booking._id,
    recipient: booking.customerDetails.email,
    recipientRole: "customer",
    channel: "email",
    eventType: approved ? "reschedule_approved" : "reschedule_rejected",
    subject,
    content: `
      <div style="font-family:sans-serif;color:#292525;line-height:1.6;max-width:600px;">
        <h2 style="color:${approved ? "#10B981" : "#EF4444"};">
          ${approved ? "Rescheduling Approved ✅" : "Reschedule Request Declined"}
        </h2>
        <p>Dear ${booking.customerDetails.name},</p>
        <p>Your request to reschedule appointment <strong>${booking.bookingNumber}</strong> has been ${approved ? "approved and updated in our system" : "reviewed"}.</p>
        ${approved ? `<p><strong>New Appointment Date & Time:</strong> ${booking.scheduledDate} (${new Date(booking.scheduledStartTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})</p>` : ""}
        ${adminNote ? `<p><strong>Note:</strong> ${adminNote}</p>` : ""}
        <p>View your appointments: <a href="${SITE_URL}/my-bookings" style="color:#CF565D;">My Bookings</a></p>
      </div>
    `,
  });
}

export async function notifyCancellation(booking, reason = "", cancelledBy = "Client") {
  if (!booking) return;

  // 1. Notify Customer
  if (booking.customerDetails?.email) {
    await sendNotification({
      bookingId: booking._id,
      recipient: booking.customerDetails.email,
      recipientRole: "customer",
      channel: "email",
      eventType: "cancellation_approved",
      subject: `Appointment Cancelled: ${booking.bookingNumber}`,
      content: `
        <div style="font-family:sans-serif;color:#292525;line-height:1.6;max-width:600px;">
          <h2 style="color:#CF565D;">Appointment Cancelled</h2>
          <p>Dear ${booking.customerDetails.name},</p>
          <p>Your appointment <strong>${booking.bookingNumber}</strong> scheduled for <strong>${booking.scheduledDate}</strong> has been cancelled.</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
          <p>Cancelled By: ${cancelledBy}</p>
          <p>We hope to welcome you back soon. <a href="${SITE_URL}/book" style="color:#CF565D;">Book a New Ritual</a></p>
        </div>
      `,
    });
  }

  // 2. Notify Assigned Staff if any
  if (booking.assignedStaff?.email) {
    await sendNotification({
      bookingId: booking._id,
      recipient: booking.assignedStaff.email,
      recipientRole: "staff",
      channel: "email",
      eventType: "cancellation_approved",
      subject: `Job Cancelled: ${booking.bookingNumber} (${booking.scheduledDate})`,
      content: `
        <div style="font-family:sans-serif;color:#292525;line-height:1.6;max-width:600px;">
          <h2 style="color:#CF565D;">Job Cancelled</h2>
          <p>The appointment <strong>${booking.bookingNumber}</strong> for ${booking.customerDetails.name} on ${booking.scheduledDate} has been cancelled.</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
          <p>Your schedule has been freed for this time slot.</p>
        </div>
      `,
    });
  }
}
