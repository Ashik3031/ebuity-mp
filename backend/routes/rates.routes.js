// routes/rates.routes.js
import express from "express";
import axios from "axios";

const router = express.Router();

// 6 hours cache
let cache = { data: null, expiresAt: 0 };

router.get("/latest", async (req, res) => {
  try {
    const now = Date.now();

    if (cache.data && cache.expiresAt > now) {
      return res.json({ success: true, cached: true, ...cache.data });
    }

    const key = process.env.EXCHANGE_RATE_API_KEY;
    if (!key) {
      return res.status(500).json({
        success: false,
        message: "Missing EXCHANGE_RATE_API_KEY in .env",
      });
    }

    // ✅ Base = INR, fetch your currencies
    const url = `https://v6.exchangerate-api.com/v6/${key}/latest/INR`;
    const resp = await axios.get(url, { timeout: 10000 });
    const data = resp.data;

    // ExchangeRate-API returns rates in: data.conversion_rates
    const r = data.conversion_rates || {};

    // ✅ Only keep what you want
    const rates = {
      INR: 1,
      USD: r.USD ?? 0,
      EUR: r.EUR ?? 0,
      GBP: r.GBP ?? 0,
      RUB: r.RUB ?? 0,
    };

    const payload = {
      base: "INR",
      date: data.time_last_update_utc || new Date().toISOString(),
      rates,
    };

    cache = { data: payload, expiresAt: now + 6 * 60 * 60 * 1000 };

    return res.json({ success: true, cached: false, ...payload });
  } catch (err) {
    console.log("Rates API error:", err?.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch rates",
      debug: err?.response?.data || err.message,
    });
  }
});

export default router;
