import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Order from "../models/Order.js";
import userModel from "../models/userModel.js";

/**
 * Normalizes phone numbers for fuzzy matching.
 */
export function extractPhoneDigits(phone) {
  if (!phone || typeof phone !== "string") return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 9) {
    return digits.slice(-9);
  }
  return digits;
}

/**
 * Escapes regex special characters.
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Checks whether an authenticated user can access/manage a booking.
 * Strictly verifies ownership via:
 * 1. Admin role, OR
 * 2. Direct customer ownership (booking.customer == user._id), OR
 * 3. Securely associated ownership (booking.associatedWithUser == user._id), OR
 * 4. Valid guest session claim token for unassociated booking.
 *
 * For unassociated guest bookings without claim token, access is permitted
 * ONLY if the user's account is verified AND their verified email exactly matches the booking email.
 *
 * @param {Object} user - Authenticated user object/document
 * @param {Object} booking - Booking document
 * @param {string|null} [claimToken=null] - Secret session claim token
 * @returns {boolean}
 */
export function canUserAccessBooking(user, booking, claimToken = null) {
  if (!booking) return false;
  if (user?.role === "admin") return true;

  const userId = String(user?._id || user?.id || "");
  const bookingCustId = String(booking.customer?._id || booking.customer || "");
  const associatedUserId = String(booking.associatedWithUser?._id || booking.associatedWithUser || "");

  // Direct owner or previously associated owner
  if (userId && (userId === bookingCustId || userId === associatedUserId)) {
    return true;
  }

  // Session claim token match for unassociated guest booking
  if (
    claimToken &&
    typeof claimToken === "string" &&
    booking.isGuestBooking &&
    !booking.associatedWithUser &&
    booking.guestClaimToken === claimToken.trim()
  ) {
    return true;
  }

  // If this is an unassociated guest booking, allow access ONLY if the user has a verified email matching the booking
  if (user?.isAccountVerified && (booking.isGuestBooking || !booking.associatedWithUser)) {
    const userEmail = (user.email || "").toLowerCase().trim();
    const bookingEmail = (booking.customerDetails?.email || booking.serviceAddress?.email || "")
      .toLowerCase()
      .trim();

    if (userEmail && bookingEmail && !bookingEmail.endsWith("@guest.ebuity.com") && userEmail === bookingEmail) {
      return true;
    }
  }

  return false;
}

/**
 * Securely associates eligible guest bookings with the authenticated customer account.
 *
 * Security Requirements:
 * - Verified email ownership is the primary global association mechanism.
 * - Secret session claimToken enables immediate single-booking association right after guest checkout.
 * - Phone number matching alone never authorizes account association.
 * - Never allow users to claim arbitrary bookings using unverified emails or guessable IDs.
 * - Prevent one guest booking from being associated with multiple customer accounts.
 * - Preserve original booking references and booking/payment history.
 *
 * @param {Object} user - Authenticated user document with { _id, email, isAccountVerified }
 * @param {Object} [options={}] - Optional claim options { bookingId, claimToken, bookingIds }
 * @returns {Promise<{ associatedBookings: number, associatedOrders: number, requiresVerification?: boolean, unassociatedCount?: number, message?: string }>}
 */
export async function associateGuestBookingsWithAccount(user, options = {}) {
  if (!user || (!user._id && !user.id)) {
    return { associatedBookings: 0, associatedOrders: 0, message: "No authenticated user" };
  }

  const userId = user._id || user.id;
  const userEmail = (user.email || "").toLowerCase().trim();

  // Guard against guest or empty emails
  if (!userEmail || userEmail.endsWith("@guest.ebuity.com")) {
    return { associatedBookings: 0, associatedOrders: 0, message: "Invalid email for association" };
  }

  const emailRegex = new RegExp(`^${escapeRegex(userEmail)}$`, "i");

  let associatedBookings = 0;
  let associatedOrders = 0;

  // -------------------------------------------------------------------------
  // PATHWAY 1: Secure Session Claim Token (Immediate post-checkout association)
  // -------------------------------------------------------------------------
  const { bookingId, claimToken } = options;
  if (bookingId && claimToken && typeof claimToken === "string" && claimToken.trim()) {
    const cleanToken = claimToken.trim();
    let bookingQuery = {
      isGuestBooking: true,
      associatedWithUser: null,
      guestClaimToken: cleanToken,
    };

    if (mongoose.Types.ObjectId.isValid(bookingId)) {
      bookingQuery._id = bookingId;
    } else {
      bookingQuery.bookingNumber = String(bookingId).toUpperCase();
    }

    const targetBooking = await Booking.findOne(bookingQuery);
    if (targetBooking) {
      const bookingEmail = (targetBooking.customerDetails?.email || targetBooking.serviceAddress?.email || "").toLowerCase().trim();
      // Ensure the booking email strictly matches the user account email
      if (bookingEmail && bookingEmail === userEmail) {
        targetBooking.customer = userId;
        targetBooking.associatedWithUser = userId;
        targetBooking.isGuestBooking = false;
        targetBooking.guestClaimToken = null; // one-time claim token consumed
        targetBooking.associatedAt = new Date();
        targetBooking.customerDetails.email = userEmail;
        await targetBooking.save();
        associatedBookings++;
      }
    }
  }

  // -------------------------------------------------------------------------
  // PATHWAY 2: Verified Email Ownership (Global Association for all Past Bookings)
  // -------------------------------------------------------------------------
  if (user.isAccountVerified) {
    // Find any temporary auto-created guest users that share this email
    let guestUserIds = [];
    try {
      const guestUsers = await userModel
        .find({
          _id: { $ne: userId },
          email: emailRegex,
          isGuest: true,
        })
        .select("_id")
        .lean();
      guestUserIds = guestUsers.map((u) => u._id);
    } catch (gErr) {
      console.warn("[associateGuestBookingsWithAccount] Error finding guest users:", gErr.message);
    }

    const bookingFilter = {
      customer: { $ne: userId },
      associatedWithUser: null,
      $or: [
        { isGuestBooking: true },
        { customer: { $in: guestUserIds } },
      ],
      $and: [
        {
          $or: [
            { "customerDetails.email": emailRegex },
            { "serviceAddress.email": emailRegex },
          ],
        },
      ],
    };

    const updateDoc = {
      $set: {
        customer: userId,
        isGuestBooking: false,
        associatedWithUser: userId,
        associatedAt: new Date(),
        guestClaimToken: null,
        "customerDetails.email": userEmail,
      },
    };

    try {
      const result = await Booking.updateMany(bookingFilter, updateDoc);
      associatedBookings += result.modifiedCount || 0;
    } catch (err) {
      console.error("[associateGuestBookingsWithAccount] Error associating bookings:", err.message);
    }

    // 3. Also associate product orders if Order model exists
    try {
      const orderRes = await Order.updateMany(
        {
          user: { $ne: userId },
          "address.email": emailRegex,
        },
        {
          $set: { user: userId, guestToken: null },
        }
      );
      associatedOrders = orderRes.modifiedCount || 0;
    } catch (ordErr) {
      // Non-fatal
    }
  }

  // Check if any unassociated bookings remain for this email that require email OTP verification
  let unassociatedCount = 0;
  if (!user.isAccountVerified) {
    try {
      unassociatedCount = await Booking.countDocuments({
        customer: { $ne: userId },
        associatedWithUser: null,
        $or: [
          { "customerDetails.email": emailRegex },
          { "serviceAddress.email": emailRegex },
        ],
      });
    } catch {
      // ignore
    }
  }

  return {
    associatedBookings,
    associatedOrders,
    requiresVerification: !user.isAccountVerified && unassociatedCount > 0,
    unassociatedCount,
    message: !user.isAccountVerified
      ? "Account email is not verified. Please verify your email to link previous guest bookings."
      : undefined,
  };
}

// Backward-compatible alias
export const claimGuestBookings = associateGuestBookingsWithAccount;
