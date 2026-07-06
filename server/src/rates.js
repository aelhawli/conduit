// Live FX rates + 7-day history for Rate Watch.
// Primary source: fawazahmed0/exchange-api (free, no key, 200+ currencies,
// daily data, served via CDN). Fallback mirror, then our simulated table —
// so this endpoint always answers.
import { PER_USD } from "./fx.js";

const cache = new Map(); // key -> { at, data }
const HOUR = 60 * 60 * 1000;

function dstr(d) { return d.toISOString().slice(0, 10); }

async function fetchDay(base, dateTag) {
  const b = base.toLowerCase();
  const urls = [
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${dateTag}/v1/currencies/${b}.json`,
    `https://${dateTag}.currency-api.pages.dev/v1/currencies/${b}.json`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (res.ok) { const j = await res.json(); if (j && j[b]) return j[b]; }
    } catch (e) { /* try next */ }
  }
  return null;
}

// Returns { rate, history:[{date,rate}x7], change7d, source }
export async function getRates(fromCur, toCur) {
  const key = `${fromCur}->${toCur}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < HOUR) return hit.data;

  const from = fromCur.toUpperCase(), to = toCur.toLowerCase();
  const history = [];
  let live = null;

  // last 7 days (skip gracefully if a day is missing)
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * HOUR);
    const tag = i === 0 ? "latest" : dstr(d);
    const day = await fetchDay(from, tag);
    if (day && day[to] != null) {
      const r = Number(day[to]);
      history.push({ date: dstr(d), rate: r });
      if (i === 0) live = r;
    }
  }

  let source = "live";
  if (live == null) {
    // Fallback: simulated mid-rate from our FX table (flat trend, clearly labeled)
    if (!(from in PER_USD) || !(toCur.toUpperCase() in PER_USD)) throw new Error(`Unsupported corridor ${key}`);
    live = PER_USD[toCur.toUpperCase()] / PER_USD[from];
    source = "simulated";
    for (let i = 6; i >= 0; i--) history.push({ date: dstr(new Date(Date.now() - i * 24 * HOUR)), rate: live });
  }

  const first = history[0]?.rate ?? live;
  const change7d = first ? ((live - first) / first) * 100 : 0;
  const data = { from: fromCur.toUpperCase(), to: toCur.toUpperCase(), rate: live, history, change7d, source, updated: new Date().toISOString() };
  cache.set(key, { at: Date.now(), data });
  return data;
}
