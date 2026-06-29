import express from "express";
import cors from "cors";
import "dotenv/config";
import { compare } from "./compare.js";
import { wiseConfigured } from "./providers/wise.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, wiseLive: wiseConfigured() });
});

// POST /api/compare
// body: { fromCur, toCur, amount, method, token }
app.post("/api/compare", async (req, res) => {
  const { fromCur, toCur, amount, method, token } = req.body || {};
  if (!fromCur || (!toCur && method !== "Wallet") || !amount || amount <= 0) {
    return res.status(400).json({ error: "fromCur, toCur and a positive amount are required" });
  }
  try {
    const out = await compare({ fromCur, toCur, amount: Number(amount), method, token });
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Conduit API on http://localhost:${PORT}  (Wise live: ${wiseConfigured()})`);
});
