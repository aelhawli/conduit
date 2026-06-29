// Live Wise integration (sandbox by default).
// Docs: https://docs.wise.com/api-reference/quote/quotecreate
//
// Activate by setting in server/.env:
//   WISE_API_TOKEN=<your sandbox user access token>
//   WISE_PROFILE_ID=<your sandbox profile id>
//   WISE_API_BASE=https://api.sandbox.transferwise.tech   (default)
//
// If no token is configured, callers should fall back to the simulated quote.

import { CONDUIT_FEE, midRate } from "../fx.js";

const BASE = process.env.WISE_API_BASE || "https://api.sandbox.transferwise.tech";
const TOKEN = process.env.WISE_API_TOKEN || "";
const PROFILE = process.env.WISE_PROFILE_ID || "";

export function wiseConfigured() {
  return Boolean(TOKEN && PROFILE);
}

// Returns a quote in the same shape as simulatedQuote(), or throws.
export async function wiseQuote(amount, fromCur, destCur) {
  if (!wiseConfigured()) throw new Error("Wise not configured");

  const url = `${BASE}/v3/profiles/${PROFILE}/quotes`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sourceCurrency: fromCur,
      targetCurrency: destCur,
      sourceAmount: amount,
      payOut: "BANK_TRANSFER",
      preferredPayIn: "BANK_TRANSFER",
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Wise API ${res.status}: ${text.slice(0, 200)}`);
  }

  const q = await res.json();

  // Pick the bank-transfer pay-in option (the one we asked to be surfaced first).
  const opt = (q.paymentOptions || []).find(o => !o.disabled && o.payIn === "BANK_TRANSFER")
    || (q.paymentOptions || []).find(o => !o.disabled)
    || (q.paymentOptions || [])[0];

  // Wise gives us the real mid-ish rate and the provider fee directly.
  const wiseFee = opt?.price?.total?.value?.amount ?? opt?.fee?.total ?? 0;
  const wiseTarget = q.targetAmount; // what recipient gets after Wise fee, at Wise's rate
  const mid = midRate(fromCur, destCur); // our reference mid for cost calc

  // Conduit's own 1% is taken on top of the send amount, before the provider runs.
  const conduitFee = amount * CONDUIT_FEE;
  // Scale Wise's quoted target down by the share Conduit skims, so the displayed
  // received amount reflects (amount - conduitFee) going through Wise.
  const received = wiseTarget != null
    ? wiseTarget * ((amount - conduitFee) / amount)
    : (amount - conduitFee - wiseFee) * mid;
  const totalCost = amount - received / mid;

  return {
    mid,
    conduitFee,
    providerFee: wiseFee,
    received,
    totalCost,
    rate: q.rate,
    source: "wise-live",
  };
}
