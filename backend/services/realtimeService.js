import { Server } from "socket.io";

let io = null;

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://thabioka.xyraco.com/",
  "http://adthabioka.xyraco.com/login",
  "https://www.thabiokaluxurycloset.com",
  "https://roseessence.ae",
  "https://www.roseessence.ae",
];

export function initRealtimeService(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, true);
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on("connection", (socket) => {
    const { role, staffId, userId } = socket.handshake.query || {};

    // Auto-join rooms based on handshake query parameters
    if (role === "admin") {
      socket.join("room:admin");
    }

    if (role === "staff") {
      socket.join("room:staff");
      if (staffId) {
        socket.join(`room:staff_${staffId}`);
      }
    }

    if (userId) {
      socket.join(`room:user_${userId}`);
    }

    // Dynamic join event from frontend
    socket.on("join", (data) => {
      if (!data) return;
      if (data.role === "admin") {
        socket.join("room:admin");
      }
      if (data.role === "staff" || data.staffId) {
        socket.join("room:staff");
        const sId = data.staffId || data.id;
        if (sId) {
          socket.join(`room:staff_${sId}`);
        }
      }
      if (data.userId) {
        socket.join(`room:user_${data.userId}`);
      }
    });

    socket.on("leave", (data) => {
      if (!data) return;
      if (data.room) socket.leave(data.room);
    });

    socket.on("disconnect", () => {
      // Disconnected cleanly
    });
  });

  return io;
}

export function getIO() {
  return io;
}

/**
 * Broadcast booking updates to Admin and assigned Staff in real time
 */
export function broadcastBookingUpdated(booking, extraData = {}) {
  if (!io) return;
  const bookingId = booking._id ? String(booking._id) : String(booking.id || "");
  const payload = {
    booking,
    bookingId,
    status: booking.status,
    scheduledDate: booking.scheduledDate,
    scheduledTime: booking.scheduledTime,
    assignedStaff: booking.assignedStaff,
    ...extraData,
    timestamp: new Date().toISOString(),
  };

  // 1. Notify Admin room
  io.to("room:admin").emit("booking:updated", payload);
  io.to("room:admin").emit("booking:status_changed", payload);

  // 2. Notify assigned staff room
  const staffId = booking.assignedStaff?._id || booking.assignedStaff;
  if (staffId) {
    const sIdStr = String(staffId);
    io.to(`room:staff_${sIdStr}`).emit("booking:updated", payload);
    io.to(`room:staff_${sIdStr}`).emit("booking:status_changed", payload);

    if (extraData.action === "reassigned" || extraData.action === "assigned") {
      io.to(`room:staff_${sIdStr}`).emit("booking:assigned", {
        ...payload,
        title: "Booking Assigned to You",
        message: `Appointment #${booking.bookingNumber || bookingId} on ${booking.scheduledDate} has been assigned to you.`,
      });
    }
  }

  // 3. Notify general staff room as well
  io.to("room:staff").emit("booking:status_changed", payload);
}

/**
 * Broadcast new booking created by customer
 */
export function broadcastBookingCreated(booking) {
  if (!io) return;
  const bookingId = booking._id ? String(booking._id) : String(booking.id || "");
  const payload = {
    booking,
    bookingId,
    bookingNumber: booking.bookingNumber || `BK-${bookingId.slice(-6).toUpperCase()}`,
    clientName: booking.customerDetails?.name || "Client",
    status: booking.status,
    scheduledDate: booking.scheduledDate,
    scheduledTime: booking.scheduledTime,
    totalPrice: booking.totalPrice,
    timestamp: new Date().toISOString(),
  };

  io.to("room:admin").emit("booking:created", payload);
  io.to("room:admin").emit("booking:updated", payload);
  io.to("room:admin").emit("admin:alert", {
    type: "booking",
    title: "New Ritual Booking Order",
    message: `Appointment #${payload.bookingNumber} booked for ${booking.scheduledDate} (${payload.clientName})`,
    link: "/admin/bookings",
    bookingId,
    timestamp: new Date().toISOString(),
  });

  const staffId = booking.assignedStaff?._id || booking.assignedStaff;
  if (staffId) {
    const sIdStr = String(staffId);
    io.to(`room:staff_${sIdStr}`).emit("booking:created", payload);
    io.to(`room:staff_${sIdStr}`).emit("booking:updated", payload);
    io.to(`room:staff_${sIdStr}`).emit("booking:assigned", {
      ...payload,
      title: "New Booking Assigned",
      message: `New appointment #${payload.bookingNumber} on ${booking.scheduledDate} assigned to you.`,
    });
  }
}

/**
 * Broadcast new boutique product order placed by customer
 */
export function broadcastOrderCreated(order) {
  if (!io) return;
  const orderId = order?._id ? String(order._id) : "ORDER";
  const refCode = orderId.length > 8 ? orderId.slice(-6).toUpperCase() : orderId;
  const totalAmount = order?.totalAmount ?? order?.totalPrice ?? 0;
  const customerName = order?.address?.fullName || order?.address?.name || "Boutique Customer";
  const itemsCount = order?.products?.length || 1;

  const payload = {
    orderId,
    orderNumber: refCode,
    totalAmount,
    customerName,
    itemsCount,
    paymentMethod: order?.paymentMethod || "COD",
    paymentStatus: order?.paymentStatus || "Pending",
    timestamp: new Date().toISOString(),
  };

  io.to("room:admin").emit("order:created", payload);
  io.to("room:admin").emit("admin:alert", {
    type: "order",
    title: "New Boutique Product Order",
    message: `Order #${refCode} placed by ${customerName} (AED ${Number(totalAmount).toFixed(2)})`,
    link: "/admin/orders",
    orderId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast general admin alert (e.g. low stock, reschedule, cancellation)
 */
export function broadcastAdminAlert(alertData = {}) {
  if (!io) return;
  io.to("room:admin").emit("admin:alert", {
    type: alertData.type || "general",
    title: alertData.title || "Operations Alert",
    message: alertData.message || "",
    link: alertData.link || "/admin",
    urgency: alertData.urgency || "medium",
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast staff status/availability change
 */
export function broadcastStaffUpdated(staffId, data = {}) {
  if (!io) return;
  const payload = {
    staffId: String(staffId),
    ...data,
    timestamp: new Date().toISOString(),
  };

  io.to("room:admin").emit("staff:updated", payload);
  io.to(`room:staff_${String(staffId)}`).emit("staff:updated", payload);
}

