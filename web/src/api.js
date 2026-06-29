// Talks to the Conduit backend. In dev, Vite proxies /api to localhost:4000
// (see vite.config.js). Override with VITE_API_BASE for a deployed backend.

const BASE = import.meta.env.VITE_API_BASE || "";

export async function compareQuotes({ fromCur, toCur, amount, method, token }) {
  const res = await fetch(`${BASE}/api/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fromCur, toCur, amount, method, token }),
  });
  if (!res.ok) {
    let msg = `pricing service returned ${res.status}`;
    try { const e = await res.json(); if (e.error) msg = e.error; } catch {}
    throw new Error(msg);
  }
  return res.json(); // { destCur, quotes: [...] }
}
