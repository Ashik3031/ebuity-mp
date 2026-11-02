import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true
    },
    discount: {
        type: Number,
        required: true,
    },
    expiry: {
        type: Date,
        required: true,
    },
    minAmount: {
        type: Number,
        default:0,
    },
    isActive: {
        type: Boolean,
        default: true,
    }

})


export default mongoose.model("Coupon", couponSchema);