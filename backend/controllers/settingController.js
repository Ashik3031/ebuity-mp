// backend/controllers/settingController.js
import Setting from "../models/Setting.js";

export const getPublicSettings = async (_req, res) => {
  try {
    let s = await Setting.findOne({});
    if (!s) {
      s = await Setting.create({
        shipping: {
          freeOver: 199,
          defaultMethodCode: "standard",
          methods: [
            { code: "standard", label: "Standard", amount: 15, etaDaysMin: 2, etaDaysMax: 4, active: true },
            { code: "express", label: "Express", amount: 35, etaDaysMin: 1, etaDaysMax: 2, active: true }
          ]
        },
        tax: { rate: 5, displayMode: "tax_exclusive" } // <-- 5 percent
      });
    }
    return res.json({
      shipping: s.shipping,
      tax: s.tax,
      updatedAt: s.updatedAt
    });
  } catch (e) {
    return res.status(500).json({ message: "Failed to load settings", error: e.message });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const { shipping, tax } = req.body;

    // (optional) basic validation to avoid breaking defaults
    if (shipping?.defaultMethodCode && shipping?.methods?.length) {
      const exists = shipping.methods.some(m => m.code === shipping.defaultMethodCode && m.active !== false);
      if (!exists) {
        return res.status(400).json({ message: "defaultMethodCode must refer to an active method" });
      }
    }

    const s = await Setting.findOneAndUpdate(
      {},
      { ...(shipping ? { shipping } : {}), ...(tax ? { tax } : {}) },
      { new: true, upsert: true }
    );
    return res.json(s);
  } catch (e) {
    return res.status(500).json({ message: "Failed to update settings", error: e.message });
  }
};
