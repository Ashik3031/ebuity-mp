// import { EventEmitterAsyncResource } from "nodemailer/lib/xoauth2/index.js";
import userModel from "../models/userModel.js";
import mongoose from "mongoose";
const { isValidObjectId } = mongoose;

// const normalizePhone10 = (v) => String(v || "").replace(/\D/g, "").slice(0, 10);
// const isPhone10 = (v) => /^\d{10}$/.test(normalizePhone10(v));

const normalizeIndiaPhone = (v) => String(v || "").replace(/\D/g, "");

const isIndiaPhone = (v) => {
  const p = normalizeIndiaPhone(v);
  return /^[6-9]\d{9}$/.test(p) || /^91[6-9]\d{9}$/.test(p);
};

const toIndiaPhoneE164 = (v) => {
  const p = normalizeIndiaPhone(v);
  if (/^91[6-9]\d{9}$/.test(p)) return `+${p}`;
  if (/^[6-9]\d{9}$/.test(p)) return `+91${p}`;
  return "";
};



export const getUserData = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        isAuthenticated: false,
        userData: null,
        message: "User not logged in"
      });
    }

    // const user = await userModel.findById(userId);

    const user = await userModel.findById(userId).select("name email phone isAccountVerified role");

    if (!user) {
      return res.status(404).json({
        success: false,
        isAuthenticated: false,
        userData: null,
        message: "User not found"
      });
    }

    res.json({
      success: true,
      isAuthenticated: true,
      userData: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        role: user.role || "user",
        isAccountVerified: Boolean(user.isAccountVerified),
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }

}


//Get All the user data
export const getAllUsers = async (req, res) => {
  try {
    const users = await userModel.find();

    res.status(200).json({
      success: true,
      users: users.map(user => {
        const primaryAddress = Array.isArray(user.addresses) && user.addresses.length > 0
          ? (user.addresses.find(a => a.isDefault) || user.addresses[0])
          : null;
        const phone = primaryAddress?.phone || "";
        const createdAt = user.createdAt || (user._id?.getTimestamp ? user._id.getTimestamp() : new Date());

        return {
          userId: user._id,
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone || phone,
          role: user.role || "user",
          isBlocked: Boolean(user.isBlocked),
          isAccountVerified: Boolean(user.isAccountVerified),
          addresses: user.addresses || [],
          createdAt: createdAt
        };
      })
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single user by ID
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid customer ID" });
    }

    const user = await userModel.findById(id).select("-password -verifyOtp -resetOtp");
    if (!user) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    const userObj = user.toObject();
    userObj.userId = userObj._id;
    userObj.createdAt = userObj.createdAt || (user._id?.getTimestamp ? user._id.getTimestamp() : new Date());
    const primaryAddress = Array.isArray(user.addresses) && user.addresses.length > 0
      ? (user.addresses.find(a => a.isDefault) || user.addresses[0])
      : null;
    userObj.phone = primaryAddress?.phone || "";

    res.status(200).json({
      success: true,
      user: userObj
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//Update user block status

export const updateBlockStatus = async (req, res) => {
  try {

    let { userId, block } = req.body;

    // Convert "true"/"false" string to actual boolean
    if (typeof block === 'string') {
      block = block.toLowerCase() === 'true';
    }

    if (!userId || typeof block !== 'boolean') {
      return res.status(400).json({ success: false, message: "userId and block (boolean) are required" });
    }

    const user = await userModel.findByIdAndUpdate(userId, { isBlocked: block }, { new: true });

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.json({ success: true, message: `User has been ${block ? "blocked" : "unblocked"}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};




//  Get User Profile
export const getUserProfile = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.status(200).json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

//  Edit User Profile
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { name, email, phone } = req.body;
    const update = {};

    if (name !== undefined) {
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: "Name cannot be empty" });
      }
      update.name = name.trim();
    }

    if (email !== undefined) {
      const cleanEmail = String(email || "").trim().toLowerCase();
      if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
        return res.status(400).json({ success: false, message: "Valid email address is required" });
      }
      const existing = await userModel.findOne({ email: cleanEmail, _id: { $ne: userId } });
      if (existing) {
        return res.status(400).json({ success: false, message: "Email is already registered with another account" });
      }
      update.email = cleanEmail;
    }

    if (phone !== undefined) {
      const cleanPhone = String(phone || "").trim();
      if (cleanPhone) {
        const digits = cleanPhone.replace(/\D/g, "");
        if (digits.length < 7) {
          return res.status(400).json({ success: false, message: "Please provide a valid phone number (at least 7 digits)" });
        }
      }
      update.phone = cleanPhone;
    }

    const user = await userModel.findByIdAndUpdate(userId, update, { new: true })
      .select("-password -verifyOtp -resetOtp");

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        role: user.role || "user",
        isAccountVerified: Boolean(user.isAccountVerified),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Set Default Address
export const setDefaultAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const addressId = req.params.id;

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Loop through addresses and set isDefault
    user.addresses.forEach(address => {
      address.isDefault = address._id.toString() === addressId;
    });

    await user.save();

    res.status(200).json({ success: true, message: "Default address set", addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


//  Add Address
export const addAddress = async (req, res) => {
  try {
    const {
      label,
      fullName,
      email,
      phone,
      addressType,
      unitNumber,
      buildingName,
      area,
      city,
      state,
      street,
      landmark,
      poBox,
      postalCode,
      coordinates,
      accessInstructions,
      isDefault,
    } = req.body;

    // Required checks
    if (!fullName || !phone || !unitNumber || !buildingName || !area) {
      return res.status(400).json({ success: false, message: "Missing required address fields (fullName, phone, unitNumber, buildingName, area)" });
    }

    const cleanPhoneDigits = String(phone).replace(/\D/g, "");
    if (cleanPhoneDigits.length < 7) {
      return res.status(400).json({ success: false, message: "Please provide a valid phone number" });
    }

    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // If new address is default → unset previous defaults
    const makeDefault = isDefault === true || user.addresses.length === 0;
    if (makeDefault) {
      user.addresses.forEach((a) => (a.isDefault = false));
    }

    user.addresses.push({
      label: label || "Home",
      fullName: fullName.trim(),
      email: (email || "").trim().toLowerCase(),
      phone: String(phone).trim(),
      addressType: addressType || "apartment",
      unitNumber: unitNumber.trim(),
      buildingName: buildingName.trim(),
      area: area.trim(),
      city: (city || "Dubai").trim(),
      state: (state || "Dubai").trim(),
      street: street ? street.trim() : "",
      landmark: landmark ? landmark.trim() : "",
      poBox: poBox ? poBox.trim() : "",
      postalCode: postalCode ? postalCode.trim() : "",
      coordinates: coordinates && typeof coordinates === "object" ? {
        lat: Number(coordinates.lat) || null,
        lng: Number(coordinates.lng) || null,
      } : { lat: null, lng: null },
      accessInstructions: accessInstructions ? accessInstructions.trim() : "",
      isDefault: makeDefault,
    });

    await user.save();
    res.status(201).json({ success: true, message: "Address added", addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


//  Get Addresses
export const getAddresses = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id).select("addresses");
    res.status(200).json({ success: true, addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


export const updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    if (!isValidObjectId(addressId)) {
      return res.status(400).json({ success: false, message: "Invalid address id" });
    }

    const {
      label,
      fullName,
      email,
      phone,
      addressType,
      unitNumber,
      buildingName,
      area,
      city,
      state,
      street,
      landmark,
      poBox,
      postalCode,
      isDefault,
    } = req.body;

    const set = {};

    if (label !== undefined) set["addresses.$.label"] = label;
    if (fullName !== undefined) set["addresses.$.fullName"] = fullName;
    if (email !== undefined) set["addresses.$.email"] = String(email || "").trim().toLowerCase();


    if (phone !== undefined) {
      if (phone === "") set["addresses.$.phone"] = "";
      else {
        const cleanDigits = String(phone).replace(/\D/g, "");
        if (cleanDigits.length < 7) {
          return res.status(400).json({ success: false, message: "Please provide a valid phone number" });
        }
        set["addresses.$.phone"] = String(phone).trim();
      }
    }

    if (addressType !== undefined) set["addresses.$.addressType"] = addressType;
    if (unitNumber !== undefined) set["addresses.$.unitNumber"] = unitNumber;
    if (buildingName !== undefined) set["addresses.$.buildingName"] = buildingName;
    if (area !== undefined) set["addresses.$.area"] = area;
    if (city !== undefined) set["addresses.$.city"] = city;
    if (state !== undefined) set["addresses.$.state"] = state;

    if (street !== undefined) set["addresses.$.street"] = street;
    if (landmark !== undefined) set["addresses.$.landmark"] = landmark;
    if (poBox !== undefined) set["addresses.$.poBox"] = poBox;
    if (postalCode !== undefined) set["addresses.$.postalCode"] = postalCode;

    if (coordinates !== undefined && typeof coordinates === "object") {
      set["addresses.$.coordinates"] = {
        lat: Number(coordinates.lat) || null,
        lng: Number(coordinates.lng) || null,
      };
    }
    if (accessInstructions !== undefined) {
      set["addresses.$.accessInstructions"] = String(accessInstructions).trim();
    }

    // If setting default, unset others first (atomic-ish using two operations)
    if (isDefault === true) {
      await userModel.updateOne(
        { _id: req.user.id },
        { $set: { "addresses.$[].isDefault": false } }
      );
      set["addresses.$.isDefault"] = true;
    } else if (isDefault === false) {
      set["addresses.$.isDefault"] = false;
    }

    const result = await userModel.updateOne(
      { _id: req.user.id, "addresses._id": addressId },
      { $set: set }
    );

    const matched = result.matchedCount ?? result.n ?? 0;
    if (matched === 0) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }

    const user = await userModel.findById(req.user.id).select("addresses");
    return res.status(200).json({ success: true, message: "Address updated", addresses: user.addresses });
  } catch (err) {
    console.error("[updateAddress] error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


// Delete Address
export const deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    const user = await userModel.findById(req.user.id);

    // Check if the address exists
    const address = user.addresses.id(addressId);
    if (!address) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }

    // Remove the address
    const wasDefault = address.isDefault;
    user.addresses.pull({ _id: addressId });
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }
    await user.save();

    res.status(200).json({ success: true, message: "Address deleted", addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// Cancel Order
export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const user = await userModel.findById(req.user.id);

    const order = user.orders.find(order => order.orderId === orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.status !== "pending") {
      return res.status(400).json({ success: false, message: "Only pending orders can be cancelled" });
    }

    // Update order status
    order.status = "cancelled";
    await user.save();

    res.status(200).json({ success: true, message: "Order cancelled successfully" });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};