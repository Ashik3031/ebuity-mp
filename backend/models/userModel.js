import mongoose from "mongoose";



// Sub-schema for Address
const addressSchema = new mongoose.Schema({
  label: { type: String, trim: true, default: "Home" }, // Home / Office

    fullName: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: "" },

    phone: { type: String, required: true, trim: true },

    addressType: {
      type: String,
      enum: ["apartment", "villa", "office"],
      default: "apartment",
    },

    unitNumber: { type: String, required: true, trim: true }, // Flat/Villa/Office no.
    buildingName: { type: String, required: true, trim: true }, // Tower/Building/Community

    area: { type: String, required: true, trim: true }, // Marina, Deira, JLT, etc.
    city: { type: String, required: true, trim: true }, // Dubai / Abu Dhabi

    state: {
      type: String,
      required: true,
      trim: true,
    },

    street: { type: String, trim: true, default: "" }, // optional
    landmark: { type: String, trim: true, default: "" }, // optional
    poBox: { type: String, trim: true, default: "" }, // optional
    postalCode: { type: String, trim: true, default: "" }, // optional in UAE

    coordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    accessInstructions: { type: String, trim: true, default: "" },

    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Sub-schema for Order
const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
    }
  ],
  status: { type: String, enum: ["pending", "completed", "cancelled"], default: "pending" },
  totalPrice: { type: Number, required: true },
  orderDate: { type: Date, default: Date.now },
});




const userSchema = new mongoose.Schema({
    name: { type: String, required: true },  // Ensure 'name' matches register function
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, default: "" },
    avatar: { type: String, default: "" },
    verifyOtp: { type: String, default: "" },
    verifyOtpExpiry: { type: Date, default: 0 },
    isAccountVerified: { type: Boolean, default: false },
    resetOtp: { type: String, default: "" }, 
    resetOtpExpiryAt: { type: Number, default: 0 },
    //to check isAdmin
    // isAdmin: { type:Boolean, default:false}
    role: { type: String, enum: ['user', 'admin'], default:'user'},
    isBlocked: { type: Boolean, default: false },
 
    // New fields
  addresses: [addressSchema],   // Array of addresses
  orders: [orderSchema],         // Array of orders

});

const userModel = mongoose.models.User || mongoose.model("User", userSchema, "users"); 

export default userModel;
