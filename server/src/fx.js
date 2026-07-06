// Shared FX + provider model for Conduit's comparison engine.
// PER_USD = units of each currency per 1 USD (illustrative mid-market).
// Stablecoins (USDC/USDT) peg to USD.

export const PER_USD = {
  USD: 1, AUD: 1.52, GBP: 0.79, EUR: 0.92, CAD: 1.37, USDC: 1, USDT: 1,
  PKR: 278, INR: 83.5, PHP: 56, BDT: 118, NGN: 1600, VND: 25400, MXN: 17, GTQ: 7.8, PEN: 3.75, DOP: 59, HNL: 24.7,
  KES: 129, GHS: 15.3, ZAR: 18.2, LKR: 300, NPR: 133, THB: 36.5, IDR: 16200,
  EGP: 49, MAD: 9.9, TRY: 32.5, BRL: 5.4, COP: 4100, KRW: 1370, AED: 3.67, SAR: 3.75,
};

export const CONDUIT_FEE = 0.01; // 1% take rate

// Provider catalogue. `fee` is a function of send amount (in source currency).
// These are the SIMULATED defaults; Wise can be overridden by a live API call.
export const PROVIDERS = {
  circle: { id: "circle", name: "Circle", rail: "USDC stablecoin", initials: "C", color: "#1A6BE0", fee: a => Math.max(1, a * 0.005), fxMargin: 0.002, mins: 10, speed: "~10 min", methods: ["Bank", "Wallet"] },
  ramp:   { id: "ramp", name: "Ramp", rail: "Stablecoin on/off-ramp", initials: "R", color: "#21BF73", fee: a => Math.max(1, a * 0.004), fxMargin: 0.003, mins: 15, speed: "~15 min", methods: ["Wallet"] },
  wise:   { id: "wise", name: "Wise", rail: "Bank transfer", initials: "W", color: "#163300", fee: a => Math.max(1.5, a * 0.008), fxMargin: 0.0055, mins: 1440, speed: "1–2 days", methods: ["Bank"] },
  nium:   { id: "nium", name: "Nium", rail: "Local payout", initials: "N", color: "#E5006D", fee: () => 2.0, fxMargin: 0.009, mins: 360, speed: "Same day", methods: ["Bank"] },
  stripe: { id: "stripe", name: "Stripe", rail: "Global payout", initials: "S", color: "#635BFF", fee: () => 2.5, fxMargin: 0.011, mins: 1800, speed: "1–2 days", methods: ["Bank"] },
  wu:     { id: "wu", name: "Western Union", rail: "Cash pickup", initials: "WU", color: "#FFD200", textColor: "#0B2027", fee: () => 4.9, fxMargin: 0.018, mins: 30, speed: "Minutes (cash)", methods: ["Cash"] },
};

// Which providers serve which delivery method.
export const POOL = {
  Bank: ["circle", "wise", "nium", "stripe"],
  Cash: ["wu"],
  Wallet: ["circle", "ramp"],
};

export function midRate(fromCur, destCur) {
  if (!(fromCur in PER_USD) || !(destCur in PER_USD)) {
    throw new Error(`Unsupported currency pair ${fromCur}->${destCur}`);
  }
  return PER_USD[destCur] / PER_USD[fromCur];
}

// Simulated quote for a provider, matching the frontend's expected shape.
export function simulatedQuote(amount, fromCur, destCur, p) {
  const mid = midRate(fromCur, destCur);
  const conduitFee = amount * CONDUIT_FEE;
  const providerFee = p.fee(amount);
  const sendable = Math.max(0, amount - conduitFee - providerFee);
  const received = sendable * mid * (1 - p.fxMargin);
  const totalCost = amount - received / mid;
  return { mid, conduitFee, providerFee, received, totalCost, source: "simulated" };
}

// Public-facing provider meta (no functions) for the API response.
export function providerMeta(p) {
  return { id: p.id, name: p.name, rail: p.rail, initials: p.initials, color: p.color, textColor: p.textColor, speed: p.speed, mins: p.mins, methods: p.methods };
}
