// Live FX rates + 30-day history and "send moment" intelligence.
//
// IMPORTANT HONESTY RULE: we never predict where a rate is going. Nobody can.
// We only state observable facts — where today sits relative to the last 30
// days. "Better than usual" is a fact. "Will go up" would be a lie.
//
// Source: fawazahmed0/exchange-api (free, no key, 200+ currencies, daily data
// via CDN). Falls back to a mirror, then to our simulated table, so this
// endpoint always answers.
import { PER_USD } from "./fx.js";

const cache = new Map(); // key -> { at, data }
const HOUR = 60 * 60 * 1000;
const DAYS = 30;

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

/**
 * Returns:
 *  rate       - today's mid-market rate
 *  history    - [{date, rate}] up to 30 days
 *  change7d   - % change over the last 7 days
 *  avg30      - 30-day average
 *  high30/low30
 *  vsAvg      - % today is above (+) or below (-) the 30-day average
 *  position   - 0..1, where today sits in the 30-day low→high range
 *  verdict    - "good" | "average" | "below"   (observation, NOT prediction)
 *  source     - "live" | "simulated"
 */
export async function getRates(fromCur, toCur) {
  const key = `${fromCur}->${toCur}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < HOUR) return hit.data;

  const from = fromCur.toUpperCase(), to = toCur.toLowerCase();

  // Fetch all days in PARALLEL — 30 sequential requests would be far too slow.
  const tags = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * HOUR);
    tags.push({ i, date: dstr(d), tag: i === 0 ? "latest" : dstr(d) });
  }
  const days = await Promise.all(tags.map(t => fetchDay(from, t.tag)));

  const history = [];
  let live = null;
  days.forEach((day, idx) => {
    const t = tags[idx];
    if (day && day[to] != null) {
      const r = Number(day[to]);
      history.push({ date: t.date, rate: r });
      if (t.i === 0) live = r;
    }
  });
  // If "latest" failed but recent days worked, use the newest point we have.
  if (live == null && history.length) live = history[history.length - 1].rate;

  let source = "live";
  if (live == null) {
    if (!(from in PER_USD) || !(toCur.toUpperCase() in PER_USD)) throw new Error(`Unsupported corridor ${key}`);
    live = PER_USD[toCur.toUpperCase()] / PER_USD[from];
    source = "simulated";
    history.length = 0;
    for (let i = DAYS - 1; i >= 0; i--) history.push({ date: dstr(new Date(Date.now() - i * 24 * HOUR)), rate: live });
  }

  const rates = history.map(h => h.rate);
  const avg30 = rates.reduce((s, r) => s + r, 0) / rates.length;
  const high30 = Math.max(...rates);
  const low30 = Math.min(...rates);
  const span = high30 - low30;

  // 7-day change (keeps the existing sparkline badge working)
  const wk = history.slice(-7);
  const first7 = wk[0]?.rate ?? live;
  const change7d = first7 ? ((live - first7) / first7) * 100 : 0;

  const vsAvg = avg30 ? ((live - avg30) / avg30) * 100 : 0;
  const position = span > 0 ? (live - low30) / span : 0.5;

  // Verdict thresholds. A higher rate = recipient gets MORE, so higher is good.
  // 0.5% is a meaningful move on a remittance-sized transfer; below that is noise.
  let verdict = "average";
  if (vsAvg >= 0.5) verdict = "good";
  else if (vsAvg <= -0.5) verdict = "below";

  const data = {
    from: fromCur.toUpperCase(), to: toCur.toUpperCase(),
    rate: live, history, change7d,
    avg30, high30, low30, vsAvg, position, verdict,
    days: history.length,
    source, updated: new Date().toISOString(),
  };
  cache.set(key, { at: Date.now(), data });
  return data;
}
