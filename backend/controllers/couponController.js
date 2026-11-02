import Coupon from "../models/Coupon.js";

export const createCoupon = async (req, res) => {
    try {
       
        const { code, discount, expiry, minAmount} = req.body;

        const exists = await Coupon.findOne({ code });
        if (exists)
            return res.status(400).json({ message: "Coupon already exists."});

        const coupon = await Coupon.create({ code, discount, expiry, minAmount});
        res.status(201).json(coupon);
    }catch (err) {
        res.status(500).json({ message: err.message})
    }
};

export const getCoupon = async( req, res) => {
    try {
        const coupons = await Coupon.find().sort({ expiry: 1})
        res.json(coupons);
    } catch (err) {
        res.status(500).json({message : err.message});
    }
};

export const updateCoupon = async (req,res) => {
    try {
        const updated = await Coupon.findByIdAndUpdate(req.params.id, req.body, {new: true});
        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: err.message})
    }
};

export const deleteCoupon = async (req,res) => {
    try {
        await Coupon.findByIdAndDelete(req.params.id);
        res.json({ message: "Coupon Deleted"});
    } catch (err) {
        res.status(500).json({ message: err.message})
    }
};

export const toggleCouponStatus = async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);
        coupon.isActive = !coupon.isActive;
        await coupon.save();
        res.json(coupon);
    } catch (err) {
        res.status(500).json({ message: err.message})
    }
}