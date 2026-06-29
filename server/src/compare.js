// The comparison engine: for a given route + delivery method, gather quotes
// from every provider in the pool, ranked best-received first.
// Wise is fetched LIVE when configured; everything else is simulated for now.

import { PROVIDERS, POOL, simulatedQuote, providerMeta } from "./fx.js";
import { wiseQuote, wiseConfigured } from "./providers/wise.js";

export async function compare({ fromCur, toCur, amount, method = "Bank", token = "USDC" }) {
  const destCur = method === "Wallet" ? token : toCur;
  const ids = POOL[method] || POOL.Bank;

  const results = await Promise.all(ids.map(async (id) => {
    const p = PROVIDERS[id];
    let q;
    if (id === "wise" && method === "Bank" && wiseConfigured()) {
      try {
        q = await wiseQuote(amount, fromCur, destCur);
      } catch (err) {
        // Live call failed (bad token, route unsupported in sandbox, etc.) —
        // fall back to a simulated Wise quote so the app still works.
        q = { ...simulatedQuote(amount, fromCur, destCur, p), source: "wise-fallback", error: String(err.message || err) };
      }
    } else {
      q = simulatedQuote(amount, fromCur, destCur, p);
    }
    return { p: providerMeta(p), ...q };
  }));

  results.sort((a, b) => b.received - a.received);
  return { destCur, quotes: results };
}
