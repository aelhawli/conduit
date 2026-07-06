import express from "express";
import cors from "cors";
import "dotenv/config";
import { compare } from "./compare.js";
import { wiseConfigured } from "./providers/wise.js";
import { stripeConfigured, createIdentitySession, getIdentityStatus } from "./providers/stripeIdentity.js";
import { getRates } from "./rates.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, wiseLive: wiseConfigured(), identityLive: stripeConfigured() });
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

// --- Stripe Identity (document + selfie) ---
// POST /api/identity/start  body: { returnUrl }  -> { id, url, status }
app.post("/api/identity/start", async (req, res) => {
  const { returnUrl } = req.body || {};
  try {
    const out = await createIdentitySession(returnUrl || "https://conduit.app");
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
});

// GET /api/identity/status?id=vs_...  -> { status, error }
app.get("/api/identity/status", async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "id required" });
  try {
    res.json(await getIdentityStatus(String(id)));
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
});

// GET /api/rates?from=AUD&to=PKR  -> { rate, history, change7d, source }
app.get("/api/rates", async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: "from and to required" });
  try { res.json(await getRates(String(from), String(to))); }
  catch (err) { res.status(500).json({ error: String(err.message || err) }); }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Conduit API on http://localhost:${PORT}  (Wise: ${wiseConfigured()}, Identity: ${stripeConfigured()})`);
});
