// backend/tests/bookingFlowsUnified.test.js
import mongoose from "mongoose";
import {
  resolveCustomerAndServiceAddress,
  validateBookingServices,
  validateBookingSchedule,
  generateUniqueBookingNumber,
  isValidEmail,
  normalizeEmail,
} from "../services/bookingCreationService.js";
import {
  associateGuestBookingsWithAccount,
  canUserAccessBooking,
  extractPhoneDigits,
} from "../services/bookingClaimService.js";
import userModel from "../models/userModel.js";
import Booking from "../models/Booking.js";
import Service from "../models/Service.js";
import Order from "../models/Order.js";

async function runUnifiedBookingTests() {
  console.log("================================================================");
  console.log(" Rose Essence: Unified Booking Flows & Guest Association Tests");
  console.log("================================================================");

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  async function assertThrowsAsync(fn, expectedErrorMessageSubstring, testName) {
    total++;
    try {
      await fn();
      console.error(`  [FAIL] Expected exception but none was thrown: ${testName}`);
      throw new Error(`Expected exception for: ${testName}`);
    } catch (err) {
      if (err.message.includes(expectedErrorMessageSubstring)) {
        console.log(`  [PASS] Correctly rejected: ${testName} ("${err.message}")`);
        passed++;
      } else {
        console.error(`  [FAIL] Exception message mismatch: got "${err.message}", expected substring "${expectedErrorMessageSubstring}"`);
        throw err;
      }
    }
  }

  // =========================================================================
  // SCENARIO 1: Guest Customer - Valid Booking Data Resolution
  // =========================================================================
  console.log("\n--- Scenario 1: Guest Customer Valid Data Resolution ---");

  // Mock userModel findOne and create for guest user creation
  const originalUserFindOne = userModel.findOne;
  const originalUserCreate = userModel.create;
  const originalUserFindById = userModel.findById;

  const mockGuestId = new mongoose.Types.ObjectId();
  userModel.findOne = async () => null; // Simulate guest not existing yet
  userModel.create = async (doc) => ({
    _id: mockGuestId,
    ...doc,
  });

  const validGuestAddress = {
    fullName: "Fatima Al Mansoori",
    email: "fatima.guest@example.com",
    phone: "+971 50 123 4567",
    unitNumber: "Apt 1402",
    buildingName: "Marina Gate Tower 1",
    area: "Dubai Marina",
    city: "Dubai",
    state: "Dubai",
    label: "Apartment",
    accessInstructions: "Intercom code 1402",
  };

  const guestResolved = await resolveCustomerAndServiceAddress({
    user: null,
    address: validGuestAddress,
  });

  assert(guestResolved.customerId.equals(mockGuestId), "Resolves guest customer ID");
  assert(guestResolved.isGuestBooking === true, "Flags as guest booking (isGuestBooking = true)");
  assert(guestResolved.customerDetails.name === "Fatima Al Mansoori", "Sets customerDetails.name");
  assert(guestResolved.customerDetails.email === "fatima.guest@example.com", "Sets customerDetails.email");
  assert(guestResolved.customerDetails.phone === "+971 50 123 4567", "Sets customerDetails.phone");
  assert(guestResolved.serviceAddress.unitNumber === "Apt 1402", "Preserves serviceAddress.unitNumber");
  assert(guestResolved.serviceAddress.buildingName === "Marina Gate Tower 1", "Preserves serviceAddress.buildingName");
  assert(guestResolved.serviceAddress.area === "Dubai Marina", "Preserves serviceAddress.area");
  assert(guestResolved.serviceAddress.phone === "+971 50 123 4567", "Preserves serviceAddress.phone");
  assert(guestResolved.serviceAddress.fullName === "Fatima Al Mansoori", "Preserves serviceAddress.fullName");

  // =========================================================================
  // SCENARIO 2: Guest Customer - Validation Failures on Missing Fields
  // =========================================================================
  console.log("\n--- Scenario 2: Guest Customer Validation Failures ---");

  // 2A: Missing Full Name
  await assertThrowsAsync(
    () => resolveCustomerAndServiceAddress({
      user: null,
      address: { ...validGuestAddress, fullName: "" },
    }),
    "Full name is required",
    "Guest missing full name"
  );

  // 2B: Missing Email
  await assertThrowsAsync(
    () => resolveCustomerAndServiceAddress({
      user: null,
      address: { ...validGuestAddress, email: "" },
    }),
    "A valid email address is required",
    "Guest missing email address"
  );

  // 2C: Malformed Email
  await assertThrowsAsync(
    () => resolveCustomerAndServiceAddress({
      user: null,
      address: { ...validGuestAddress, email: "invalid-email-format" },
    }),
    "A valid email address is required",
    "Guest with malformed email"
  );

  // 2D: Missing Phone
  await assertThrowsAsync(
    () => resolveCustomerAndServiceAddress({
      user: null,
      address: { ...validGuestAddress, phone: "" },
    }),
    "A contact phone number is required",
    "Guest missing contact phone number"
  );

  // 2E: Missing Unit/Building/Area Address Details
  await assertThrowsAsync(
    () => resolveCustomerAndServiceAddress({
      user: null,
      address: { ...validGuestAddress, unitNumber: "" },
    }),
    "Complete delivery location details",
    "Guest missing unit number"
  );

  await assertThrowsAsync(
    () => resolveCustomerAndServiceAddress({
      user: null,
      address: { ...validGuestAddress, buildingName: "" },
    }),
    "Complete delivery location details",
    "Guest missing building name"
  );

  await assertThrowsAsync(
    () => resolveCustomerAndServiceAddress({
      user: null,
      address: { ...validGuestAddress, area: "" },
    }),
    "Complete delivery location details",
    "Guest missing area"
  );

  // =========================================================================
  // SCENARIO 3: Logged-in Customer - Saved Address Selection (addressId)
  // =========================================================================
  console.log("\n--- Scenario 3: Logged-in Customer with Saved Address (addressId) ---");

  const mockAuthUserId = new mongoose.Types.ObjectId();
  const mockSavedAddressId = new mongoose.Types.ObjectId();

  const mockDbUser = {
    _id: mockAuthUserId,
    name: "Amina Al Zaabi",
    email: "amina@example.com",
    phone: "+971 52 987 6543",
    isAccountVerified: true,
    addresses: [
      {
        _id: mockSavedAddressId,
        label: "Home Villa",
        fullName: "Amina Al Zaabi",
        phone: "+971 52 987 6543",
        unitNumber: "Villa 22",
        buildingName: "Al Barsha 2 Compound",
        area: "Al Barsha",
        city: "Dubai",
        state: "Dubai",
        accessInstructions: "Security gate code 8821",
        isDefault: true,
      },
    ],
  };

  userModel.findById = (id) => ({
    ...mockDbUser,
    addresses: {
      id: (addrId) => (String(addrId) === String(mockSavedAddressId) ? mockDbUser.addresses[0] : null),
      find: (predicate) => mockDbUser.addresses.find(predicate),
    },
  });

  const loggedInWithSavedAddr = await resolveCustomerAndServiceAddress({
    user: { _id: mockAuthUserId, email: "amina@example.com" },
    addressId: String(mockSavedAddressId),
  });

  assert(loggedInWithSavedAddr.customerId.equals(mockAuthUserId), "Uses authenticated customer ID");
  assert(loggedInWithSavedAddr.isGuestBooking === false, "isGuestBooking is false for authenticated user");
  assert(loggedInWithSavedAddr.customerDetails.name === "Amina Al Zaabi", "Populates customerDetails.name from profile");
  assert(loggedInWithSavedAddr.customerDetails.email === "amina@example.com", "Populates customerDetails.email from profile");
  assert(loggedInWithSavedAddr.customerDetails.phone === "+971 52 987 6543", "Populates customerDetails.phone from saved address");
  assert(loggedInWithSavedAddr.serviceAddress.unitNumber === "Villa 22", "Resolves saved unitNumber");
  assert(loggedInWithSavedAddr.serviceAddress.buildingName === "Al Barsha 2 Compound", "Resolves saved buildingName");
  assert(loggedInWithSavedAddr.serviceAddress.area === "Al Barsha", "Resolves saved area");
  assert(loggedInWithSavedAddr.serviceAddress.phone === "+971 52 987 6543", "Resolves saved address phone");

  // Non-existent addressId should throw 404
  await assertThrowsAsync(
    () => resolveCustomerAndServiceAddress({
      user: { _id: mockAuthUserId, email: "amina@example.com" },
      addressId: new mongoose.Types.ObjectId().toString(),
    }),
    "Selected saved address was not found",
    "Invalid addressId throws not found error"
  );

  // =========================================================================
  // SCENARIO 4: Logged-in Customer - New Address Entry at Checkout
  // =========================================================================
  console.log("\n--- Scenario 4: Logged-in Customer with New Address Entry ---");

  const newAddressPayload = {
    label: "Downtown Office",
    fullName: "Amina Al Zaabi",
    phone: "+971 52 987 6543",
    unitNumber: "Suite 501",
    buildingName: "Boulevard Plaza Tower 2",
    area: "Downtown Dubai",
    city: "Dubai",
    state: "Dubai",
  };

  const loggedInWithNewAddr = await resolveCustomerAndServiceAddress({
    user: { _id: mockAuthUserId, email: "amina@example.com" },
    address: newAddressPayload,
  });

  assert(loggedInWithNewAddr.customerId.equals(mockAuthUserId), "Uses authenticated customer ID for new address");
  assert(loggedInWithNewAddr.customerDetails.name === "Amina Al Zaabi", "Preserves name");
  assert(loggedInWithNewAddr.customerDetails.email === "amina@example.com", "Preserves verified email");
  assert(loggedInWithNewAddr.customerDetails.phone === "+971 52 987 6543", "Uses phone from new address");
  assert(loggedInWithNewAddr.serviceAddress.buildingName === "Boulevard Plaza Tower 2", "Preserves buildingName");
  assert(loggedInWithNewAddr.serviceAddress.area === "Downtown Dubai", "Preserves area");

  // Missing phone when entering new address should be rejected
  await assertThrowsAsync(
    () => {
      userModel.findById = () => ({
        _id: mockAuthUserId,
        name: "Amina",
        email: "amina@example.com",
        phone: "", // No phone saved on user profile
      });
      return resolveCustomerAndServiceAddress({
        user: { _id: mockAuthUserId, email: "amina@example.com" },
        address: { ...newAddressPayload, phone: "" },
      });
    },
    "A contact phone number is required",
    "Logged-in user entering new address without phone is rejected"
  );

  // =========================================================================
  // SCENARIO 5: Service Validation & Pricing Calculations
  // =========================================================================
  console.log("\n--- Scenario 5: Service Selection Validation & Pricing ---");

  const originalServiceFind = Service.find;
  const mockService1Id = new mongoose.Types.ObjectId();
  const mockService2Id = new mongoose.Types.ObjectId();

  Service.find = () => ({
    lean: async () => [
      {
        _id: mockService1Id,
        name: "Classic Gel Manicure",
        slug: "classic-gel-manicure",
        price: 150,
        dealPrice: null,
        durationMinutes: 45,
        currency: "AED",
        isActive: true,
      },
      {
        _id: mockService2Id,
        name: "Deep Cleansing Facial",
        slug: "deep-cleansing-facial",
        price: 350,
        isExclusiveDeal: true,
        dealPrice: 280, // Deal price should be preferred
        durationMinutes: 60,
        currency: "AED",
        isActive: true,
      },
    ],
  });

  const validatedServices = await validateBookingServices([
    mockService1Id.toString(),
    mockService2Id.toString(),
  ]);

  assert(validatedServices.totalDurationMinutes === 105, "Calculates combined duration: 45 + 60 = 105 mins");
  assert(validatedServices.totalPrice === 430, "Calculates price including deal: 150 + 280 = 430 AED");
  assert(validatedServices.serviceSnapshots.length === 2, "Creates 2 snapshot items");
  assert(validatedServices.serviceSnapshots[1].price === 280, "Applies dealPrice correctly");

  // Rejection on empty services array
  await assertThrowsAsync(
    () => validateBookingServices([]),
    "Please select at least one treatment service",
    "Empty service selection is rejected"
  );

  // =========================================================================
  // SCENARIO 6: Schedule Validation (Time Normalization & Start/End Dates)
  // =========================================================================
  console.log("\n--- Scenario 6: Schedule Date & Time Normalization ---");

  // 12-hour AM/PM normalization
  const sched1 = validateBookingSchedule({
    scheduledDate: "2026-12-05",
    rawScheduledTime: "2:30 PM",
    totalDurationMinutes: 90,
  });
  assert(sched1.scheduledTime === "14:30", "Normalizes '2:30 PM' to '14:30'");
  assert(sched1.scheduledStartTime.toISOString().startsWith("2026-12-05T10:30:00"), "Start time in UTC for UAE GST (UTC+4): 14:30 - 4h = 10:30 UTC");
  assert(sched1.scheduledEndTime.getTime() - sched1.scheduledStartTime.getTime() === 90 * 60000, "End time is exactly 90 minutes after start time");

  // 24-hour normalization
  const sched2 = validateBookingSchedule({
    scheduledDate: "2026-12-05",
    rawScheduledTime: "09:15",
    totalDurationMinutes: 60,
  });
  assert(sched2.scheduledTime === "09:15", "Preserves 24-hour '09:15'");

  // Rejection of invalid time
  assert(
    (() => {
      try {
        validateBookingSchedule({
          scheduledDate: "2026-12-05",
          rawScheduledTime: "not-a-time",
          totalDurationMinutes: 60,
        });
        return false;
      } catch (err) {
        return err.message.includes("Invalid appointment time format");
      }
    })(),
    "Rejects invalid appointment time format"
  );

  // Booking number format test
  const bookingNum = generateUniqueBookingNumber("2026-12-05");
  assert(/^RB-20261205-[A-Z0-9]{4}$/.test(bookingNum), `Generated booking number matches format: ${bookingNum}`);

  // =========================================================================
  // SCENARIO 7: Secure Guest Booking Account Association
  // =========================================================================
  console.log("\n--- Scenario 7: Guest Booking Account Association Security ---");

  const originalBookingUpdateMany = Booking.updateMany;
  const originalOrderUpdateMany = Order.updateMany;
  const originalUserFind = userModel.find;
  const originalBookingCountDocuments = Booking.countDocuments;
  Booking.countDocuments = async () => 0;

  // 7A: Unverified account CANNOT claim guest bookings
  const unverifiedUser = {
    _id: new mongoose.Types.ObjectId(),
    email: "unverified@example.com",
    isAccountVerified: false,
  };

  const unverifiedResult = await associateGuestBookingsWithAccount(unverifiedUser);
  assert(unverifiedResult.associatedBookings === 0, "Unverified user association returns 0 associated bookings");
  assert(unverifiedResult.message.includes("not verified"), "Returns security notice for unverified accounts");

  // 7B: Verified account successfully and atomically associates guest bookings
  const verifiedUser = {
    _id: new mongoose.Types.ObjectId(),
    email: "verified.customer@example.com",
    isAccountVerified: true,
  };

  let capturedFilter = null;
  let capturedUpdate = null;

  Booking.updateMany = async (filter, update) => {
    capturedFilter = filter;
    capturedUpdate = update;
    return { modifiedCount: 3 };
  };

  Order.updateMany = async () => ({ modifiedCount: 1 });
  userModel.find = () => ({
    select: () => ({
      lean: async () => [{ _id: new mongoose.Types.ObjectId() }],
    }),
  });

  const verifiedResult = await associateGuestBookingsWithAccount(verifiedUser);
  assert(verifiedResult.associatedBookings === 3, "Associates 3 eligible guest bookings");
  assert(verifiedResult.associatedOrders === 1, "Associates 1 product order");
  assert(capturedFilter.associatedWithUser === null, "Filter strictly requires associatedWithUser: null (unassociated)");
  assert(capturedFilter.customer.$ne.equals(verifiedUser._id), "Filter prevents self-association");
  assert(capturedUpdate.$set.customer.equals(verifiedUser._id), "Updates booking.customer to verified user's _id");
  assert(capturedUpdate.$set.associatedWithUser.equals(verifiedUser._id), "Records booking.associatedWithUser = user._id");
  assert(capturedUpdate.$set.isGuestBooking === false, "Clears isGuestBooking = false");
  assert(capturedUpdate.$set.associatedAt instanceof Date, "Records associatedAt timestamp");
  assert(capturedUpdate.$set["customerDetails.email"] === "verified.customer@example.com", "Updates customerDetails.email to verified user's email");

  // 7C: Idempotency check: running again when no unassociated bookings exist
  Booking.updateMany = async () => ({ modifiedCount: 0 });
  const secondRunResult = await associateGuestBookingsWithAccount(verifiedUser);
  assert(secondRunResult.associatedBookings === 0, "Idempotent re-run returns 0 without errors");

  // 7D: Pathway 1 - Immediate post-checkout claim using secure session claimToken
  const originalBookingFindOne = Booking.findOne;
  const newGuestUser = {
    _id: new mongoose.Types.ObjectId(),
    email: "postcheckout.guest@example.com",
    isAccountVerified: false, // Unverified new account right after checkout!
  };

  const mockGuestBooking = {
    _id: new mongoose.Types.ObjectId(),
    bookingNumber: "RB-20261120-TEST",
    isGuestBooking: true,
    associatedWithUser: null,
    guestClaimToken: "crypto_claim_token_abc123",
    customer: new mongoose.Types.ObjectId(),
    customerDetails: { email: "postcheckout.guest@example.com" },
    save: async function() { return this; },
  };

  Booking.findOne = async (query) => {
    if (query.guestClaimToken === "crypto_claim_token_abc123" && query.isGuestBooking === true) {
      return mockGuestBooking;
    }
    return null;
  };

  const tokenClaimResult = await associateGuestBookingsWithAccount(newGuestUser, {
    bookingId: mockGuestBooking._id.toString(),
    claimToken: "crypto_claim_token_abc123",
  });

  assert(tokenClaimResult.associatedBookings === 1, "Pathway 1: Successfully claims booking with valid claimToken even if unverified");
  assert(mockGuestBooking.customer.equals(newGuestUser._id), "Pathway 1: Booking customer updated to registered user's _id");
  assert(mockGuestBooking.associatedWithUser.equals(newGuestUser._id), "Pathway 1: Booking associatedWithUser updated to registered user's _id");
  assert(mockGuestBooking.isGuestBooking === false, "Pathway 1: isGuestBooking set to false");
  assert(mockGuestBooking.guestClaimToken === null, "Pathway 1: guestClaimToken is invalidated/consumed (null)");

  // 7E: Pathway 1 Security - Mismatched email cannot claim booking even with token
  const imposterUser = {
    _id: new mongoose.Types.ObjectId(),
    email: "imposter@example.com",
    isAccountVerified: false,
  };
  const imposterBooking = {
    _id: new mongoose.Types.ObjectId(),
    isGuestBooking: true,
    associatedWithUser: null,
    guestClaimToken: "stolen_token",
    customerDetails: { email: "victim@example.com" },
    save: async function() { return this; },
  };
  Booking.findOne = async () => imposterBooking;
  const imposterClaimResult = await associateGuestBookingsWithAccount(imposterUser, {
    bookingId: imposterBooking._id.toString(),
    claimToken: "stolen_token",
  });
  assert(imposterClaimResult.associatedBookings === 0, "Pathway 1 Security: Rejects claim if registered email does not match booking email");

  // 7F: Pathway 1 Security - Consumed / invalid claimToken returns 0
  Booking.findOne = async () => null;
  const consumedTokenResult = await associateGuestBookingsWithAccount(newGuestUser, {
    bookingId: mockGuestBooking._id.toString(),
    claimToken: "already_consumed_token",
  });
  assert(consumedTokenResult.associatedBookings === 0, "Pathway 1 Security: Consumed or invalid claim token cannot claim booking");

  // =========================================================================
  // SCENARIO 8: Access Authorization Checks (canUserAccessBooking)
  // =========================================================================
  console.log("\n--- Scenario 8: Access Authorization Rules ---");

  const ownerUser = {
    _id: new mongoose.Types.ObjectId(),
    email: "owner@example.com",
    role: "user",
    isAccountVerified: true,
  };

  const bookingDirectOwned = {
    customer: ownerUser._id,
    customerDetails: { email: "owner@example.com" },
    isGuestBooking: false,
  };

  const bookingAssociated = {
    customer: new mongoose.Types.ObjectId(), // original guest id
    associatedWithUser: ownerUser._id,
    customerDetails: { email: "owner@example.com" },
    isGuestBooking: false,
  };

  const unassociatedGuestBooking = {
    customer: new mongoose.Types.ObjectId(),
    associatedWithUser: null,
    customerDetails: { email: "owner@example.com" },
    isGuestBooking: true,
  };

  const strangerUser = {
    _id: new mongoose.Types.ObjectId(),
    email: "stranger@example.com",
    role: "user",
    isAccountVerified: true,
  };

  const adminAccount = {
    _id: new mongoose.Types.ObjectId(),
    email: "admin@ebuity.com",
    role: "admin",
  };

  assert(canUserAccessBooking(ownerUser, bookingDirectOwned) === true, "Direct owner has access");
  assert(canUserAccessBooking(ownerUser, bookingAssociated) === true, "Associated owner has access");
  assert(canUserAccessBooking(ownerUser, unassociatedGuestBooking) === true, "Verified user with matching email has access to their unassociated guest booking");
  assert(canUserAccessBooking(strangerUser, unassociatedGuestBooking) === false, "Stranger is strictly denied access to someone else's guest booking");
  assert(canUserAccessBooking(strangerUser, bookingDirectOwned) === false, "Stranger is strictly denied access to another customer's booking");
  assert(canUserAccessBooking(adminAccount, bookingDirectOwned) === true, "Admin has access to any booking");

  // An unverified user cannot access even if email matches
  const unverifiedMatchingUser = {
    _id: new mongoose.Types.ObjectId(),
    email: "owner@example.com",
    role: "user",
    isAccountVerified: false,
  };
  assert(canUserAccessBooking(unverifiedMatchingUser, unassociatedGuestBooking) === false, "Unverified user CANNOT access unassociated guest booking even if email matches");

  // But an unverified user WITH the matching guestClaimToken CAN access their own guest booking
  const guestBookingWithToken = {
    customer: new mongoose.Types.ObjectId(),
    associatedWithUser: null,
    customerDetails: { email: "owner@example.com" },
    isGuestBooking: true,
    guestClaimToken: "valid_session_token_xyz",
  };
  assert(canUserAccessBooking(unverifiedMatchingUser, guestBookingWithToken, "valid_session_token_xyz") === true, "Unverified user WITH valid session claimToken CAN access unassociated guest booking");
  assert(canUserAccessBooking(unverifiedMatchingUser, guestBookingWithToken, "wrong_token_123") === false, "Unverified user with WRONG session claimToken is strictly denied access");

  // =========================================================================
  // SCENARIO 9: Noon Payment Initiation Reference Generation
  // =========================================================================
  console.log("\n--- Scenario 9: Noon Payment Initiation References ---");

  const noonBkgNumber = generateUniqueBookingNumber("2026-11-20");
  const noonMerchantRef = `BKG-${noonBkgNumber}`;
  assert(noonMerchantRef.startsWith("BKG-RB-20261120-"), `Merchant reference format: ${noonMerchantRef}`);

  // Restore all mocked functions
  userModel.findOne = originalUserFindOne;
  userModel.create = originalUserCreate;
  userModel.findById = originalUserFindById;
  userModel.find = originalUserFind;
  Booking.findOne = originalBookingFindOne;
  Booking.countDocuments = originalBookingCountDocuments;
  Booking.updateMany = originalBookingUpdateMany;
  Order.updateMany = originalOrderUpdateMany;
  Service.find = originalServiceFind;

  console.log("\n================================================================");
  console.log(` ALL TESTS COMPLETED: ${passed} / ${total} assertions passed successfully!`);
  console.log("================================================================");
}

runUnifiedBookingTests().catch((err) => {
  console.error("Test Suite Execution Failed:", err);
  process.exit(1);
});
