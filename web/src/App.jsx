import React, { useState, useEffect, useRef } from "react";
import { compareQuotes } from "./api.js";
import {
  Globe, ArrowRight, ArrowLeft, Check, Clock, Building2, Wallet, Banknote,
  Zap, Send, ChevronLeft, ChevronRight, Sparkles, ShieldCheck, RotateCcw,
  Users, History, Plus, Trash2, UserPlus, User, BadgeCheck, CreditCard,
  Landmark, Smartphone, Camera, FileText, Settings, LogOut, Bell, Lock, Mail, X, MapPin, TrendingUp
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Conduit — AI-guided money transfer (front-end prototype)          */
/*  Simulated. Onboarding/KYC, funding, recipients & history are mock */
/*  and live for the session only.                                    */
/* ------------------------------------------------------------------ */

const C = {
  ink: "#0B2027", teal: "#028090", sea: "#00A896", mint: "#02C39A",
  cloud: "#F2F7F8", charcoal: "#1E2D33", muted: "#5C7079", line: "#E1EAEC", paper: "#FFFFFF",
  amber: "#F5A623",
};

function Logo({ size = 30, ringA = "#16A7B3", ringB = "#3FD9C7", arrow = "#F5A623" }) {
  return (
    <svg width={size} height={size * 0.7} viewBox="0 0 64 44" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
      <circle cx="20" cy="22" r="15" stroke={ringA} strokeWidth="4.2" />
      <circle cx="36" cy="22" r="15" stroke={ringB} strokeWidth="4.2" opacity="0.92" />
      <path d="M3 22 H41" stroke={arrow} strokeWidth="4.6" strokeLinecap="round" />
      <path d="M35 12.5 L47 22 L35 31.5" stroke={arrow} strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const PER_USD = {
  USD: 1, AUD: 1.52, GBP: 0.79, EUR: 0.92, CAD: 1.37, USDC: 1, USDT: 1,
  PKR: 278, INR: 83.5, PHP: 56, BDT: 118, NGN: 1600, VND: 25400, MXN: 17, GTQ: 7.8, PEN: 3.75, DOP: 59, HNL: 24.7,
  KES: 129, GHS: 15.3, ZAR: 18.2, LKR: 300, NPR: 133, THB: 36.5, IDR: 16200,
  EGP: 49, MAD: 9.9, TRY: 32.5, BRL: 5.4, COP: 4100, KRW: 1370, AED: 3.67, SAR: 3.75,
};
const CUR_LIST = ["PKR","INR","PHP","BDT","NGN","VND","MXN","KES","GHS","ZAR","LKR","NPR","THB","IDR","EGP","MAD","TRY","BRL","COP","KRW","AED","SAR","USD","GBP","EUR","CAD"];

const SOURCES = [
  { code: "AUD", flag: "🇦🇺", label: "Australia" },
  { code: "GBP", flag: "🇬🇧", label: "United Kingdom" },
  { code: "USD", flag: "🇺🇸", label: "United States" },
  { code: "CAD", flag: "🇨🇦", label: "Canada" },
  { code: "EUR", flag: "🇪🇺", label: "Europe" },
];
const DESTS = [
  { country: "Mexico", cur: "MXN", flag: "🇲🇽" },
  { country: "Colombia", cur: "COP", flag: "🇨🇴" },
  { country: "Guatemala", cur: "GTQ", flag: "🇬🇹" },
  { country: "Brazil", cur: "BRL", flag: "🇧🇷" },
  { country: "Peru", cur: "PEN", flag: "🇵🇪" },
  { country: "Dominican Republic", cur: "DOP", flag: "🇩🇴" },
  { country: "Pakistan", cur: "PKR", flag: "🇵🇰" },
  { country: "India", cur: "INR", flag: "🇮🇳" },
  { country: "Philippines", cur: "PHP", flag: "🇵🇭" },
  { country: "Bangladesh", cur: "BDT", flag: "🇧🇩" },
  { country: "Nigeria", cur: "NGN", flag: "🇳🇬" },
  { country: "Vietnam", cur: "VND", flag: "🇻🇳" },
  { country: "United Kingdom", cur: "GBP", flag: "🇬🇧" },
];
// Pricing/comparison now comes from the Conduit API (see src/api.js + server/).
const METHOD_ICON = { Bank: Building2, Cash: Banknote, Wallet: Wallet };
const METHOD_LABEL = { Bank: "Bank account", Cash: "Cash pickup", Wallet: "Crypto wallet" };
const FUND_ICON = { payid: Landmark, card: CreditCard, applepay: Smartphone };
const FUNDING = [
  { id: "payid", label: "PayID / Bank transfer", sub: "Free · instant", feePct: 0 },
  { id: "card", label: "Visa debit •••• 4242", sub: "1% card fee · instant", feePct: 0.01 },
  { id: "applepay", label: "Apple Pay", sub: "1% · instant", feePct: 0.01 },
];

function fmt(n, cur) {
  const dp = ["PKR", "VND", "NGN", "BDT", "IDR", "COP", "KRW", "LKR"].includes(cur) ? 0 : 2;
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp }).format(n);
}
function shortDetail(s = "") { if (!s) return ""; return s.length <= 6 ? s : "…" + s.slice(-4); }
function toBase(amount, fromCur, base = "USD") { return amount / PER_USD[fromCur] * PER_USD[base]; }
const COUNTRY_SRC = { Australia: "AUD", "United Kingdom": "GBP", "United States": "USD", Canada: "CAD", Germany: "EUR", France: "EUR" };
function countryToSource(country) { const code = COUNTRY_SRC[country] || "AUD"; return SOURCES.find(s => s.code === code) || SOURCES[0]; }
function greeting() { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; }

// --- Recipient detail validation (format/checksum only; not a real existence check) ---
function ibanValid(raw) {
  const s = (raw || "").replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(s)) return false;
  const rearranged = s.slice(4) + s.slice(0, 4);
  const expanded = rearranged.replace(/[A-Z]/g, c => (c.charCodeAt(0) - 55).toString());
  let rem = 0;
  for (const ch of expanded) rem = (rem * 10 + (ch.charCodeAt(0) - 48)) % 97;
  return rem === 1; // valid IBAN ⇔ mod 97 == 1
}
function looksLikeIban(v) { return /^[A-Za-z]{2}[0-9]{2}/.test((v || "").replace(/\s+/g, "")); }
const isEvmAddr = s => /^0x[0-9a-fA-F]{40}$/.test((s || "").trim());
const isTronAddr = s => /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test((s || "").trim());

// Returns { level: 'idle'|'ok'|'warn'|'error', msg }
function validateDetail(method, token, value) {
  const v = (value || "").trim();
  if (!v) return { level: "idle", msg: "" };
  if (method === "Wallet") {
    if (isEvmAddr(v)) return { level: "ok", msg: `Valid ${token} address (Ethereum)` };
    if (isTronAddr(v)) return { level: "ok", msg: `Valid ${token} address (Tron)` };
    if (/^0x/i.test(v)) return { level: "error", msg: "Ethereum address must be 0x followed by 40 hex characters" };
    if (/^T/.test(v)) return { level: "error", msg: "Tron address must be 34 characters starting with T" };
    return { level: "error", msg: "Not a recognised wallet address — double-check it" };
  }
  if (method === "Cash") {
    const digits = v.replace(/[^0-9]/g, "");
    if (digits.length < 7) return { level: "error", msg: "Phone number looks too short" };
    if (digits.length > 15) return { level: "error", msg: "Phone number looks too long" };
    return { level: "ok", msg: "Phone number format looks valid" };
  }
  // Bank
  if (looksLikeIban(v)) {
    return ibanValid(v)
      ? { level: "ok", msg: "IBAN checksum valid" }
      : { level: "error", msg: "IBAN checksum failed — there's likely a typo" };
  }
  const digits = v.replace(/[^0-9]/g, "");
  if (digits.length < 6) return { level: "warn", msg: "Account number looks short — please double-check" };
  if (digits.length > 20) return { level: "warn", msg: "Account number looks long — please double-check" };
  return { level: "ok", msg: "Account number format looks valid" };
}

/* ============================== ROOT ============================== */
/* ============================== DATABASE (Supabase REST) ============================== */
const SB_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SB_KEY = import.meta.env.VITE_SUPABASE_KEY || "";
export const sbOn = () => Boolean(SB_URL && SB_KEY);

/* ---------- Auth (magic link) ---------- */
const TOK_KEY = "conduit_session";
function saveSession(sess) { try { localStorage.setItem(TOK_KEY, JSON.stringify(sess)); } catch (e) {} }
function loadSession() { try { return JSON.parse(localStorage.getItem(TOK_KEY) || "null"); } catch (e) { return null; } }
function clearSession() { try { localStorage.removeItem(TOK_KEY); } catch (e) {} }

// If the page was opened from a magic-link email, the session arrives in the URL hash.
function sessionFromUrl() {
  const h = window.location.hash;
  if (!h || !h.includes("access_token=")) return null;
  const p = new URLSearchParams(h.slice(1));
  const access_token = p.get("access_token"), refresh_token = p.get("refresh_token");
  if (!access_token) return null;
  window.history.replaceState(null, "", window.location.pathname); // tidy the URL
  return { access_token, refresh_token };
}
// A used/expired magic link arrives as #error=...&error_description=...
function authErrorFromUrl() {
  const h = window.location.hash;
  if (!h || !h.includes("error")) return null;
  const p = new URLSearchParams(h.slice(1));
  const desc = p.get("error_description") || p.get("error");
  if (!desc) return null;
  window.history.replaceState(null, "", window.location.pathname);
  return desc.replace(/\+/g, " ");
}
// Access tokens expire (~1h); trade the refresh token for a fresh session.
async function refreshSession(refresh_token) {
  try {
    const res = await fetch(`${SB_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { apikey: SB_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token }),
    });
    if (!res.ok) return null;
    const d = await res.json();
    return d?.access_token ? { access_token: d.access_token, refresh_token: d.refresh_token || refresh_token } : null;
  } catch (e) { return null; }
}

async function sendMagicLink(email) {
  const res = await fetch(`${SB_URL}/auth/v1/otp`, {
    method: "POST",
    headers: { apikey: SB_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, create_user: true, options: { email_redirect_to: window.location.origin } }),
  });
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.msg || d.error_description || `Sign-in failed (${res.status})`); }
}
async function fetchAuthedUser(access_token) {
  const res = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${access_token}` } });
  if (!res.ok) return null;
  return res.json();
}

let USER_TOKEN = null; // the logged-in user's token; DB calls use it so RLS applies
export function setUserToken(t) { USER_TOKEN = t; }
function sbHeaders(extra = {}) {
  return { apikey: SB_KEY, Authorization: `Bearer ${USER_TOKEN || SB_KEY}`, "Content-Type": "application/json", ...extra };
}
async function sbSelect(table, query = "") {
  const res = await fetch(`${SB_URL}/rest/v1/${table}?select=*${query}`, { headers: sbHeaders() });
  if (!res.ok) throw new Error(`Supabase ${table} read ${res.status}`);
  return res.json();
}
async function sbInsert(table, row) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}`, { method: "POST", headers: sbHeaders({ Prefer: "return=representation" }), body: JSON.stringify(row) });
  if (!res.ok) throw new Error(`Supabase ${table} insert ${res.status}`);
  return (await res.json())[0];
}
async function sbDelete(table, id) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: sbHeaders() });
  if (!res.ok) throw new Error(`Supabase ${table} delete ${res.status}`);
}
async function sbUpdate(table, id, patch) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: sbHeaders({ Prefer: "return=representation" }), body: JSON.stringify(patch) });
  if (!res.ok) throw new Error(`Supabase ${table} update ${res.status}`);
  return (await res.json())[0];
}
async function sbGetProfile() {
  const rows = await sbSelect("profiles", "");
  return rows[0] || null;
}
async function sbSaveProfile(p) {
  const res = await fetch(`${SB_URL}/rest/v1/profiles`, {
    method: "POST",
    headers: sbHeaders({ Prefer: "resolution=merge-duplicates,return=representation" }),
    body: JSON.stringify({ name: p.name, email: p.email, country: p.country, verified: true }),
  });
  if (!res.ok) throw new Error(`profile save ${res.status}`);
  return (await res.json())[0];
}

// Rebuild provider badge (colour + initials) from just the stored name.
const PROVIDER_META = {
  "Remitly": { initials: "R", color: "#3B4FE4" },
  "WorldRemit": { initials: "WR", color: "#5A00E0" },
  "Xoom": { initials: "X", color: "#0070BA" },
  "MoneyGram": { initials: "MG", color: "#DA291C" },
  "Circle": { initials: "C", color: "#1A6BE0" },
  "Ramp": { initials: "R", color: "#21BF73" },
  "Wise": { initials: "W", color: "#163300" },
  "Nium": { initials: "N", color: "#E5006D" },
  "Stripe": { initials: "S", color: "#635BFF" },
  "Western Union": { initials: "WU", color: "#FFD200", textColor: "#0B2027" },
};
function providerFromName(name) {
  const m = PROVIDER_META[name] || { initials: (name || "?")[0].toUpperCase(), color: "#028090" };
  return { name, ...m };
}
function curForCountry(c) { const d = DESTS.find(x => x.country === c); return d ? d.cur : "USD"; }

// app-shape <-> db-row mappers
const rcpToDb = r => ({ name: r.name, country: r.country, method: r.method, detail: r.detail, token: r.token || null, flag: r.flag || null });
const rcpFromDb = d => ({ id: d.id, name: d.name, country: d.country, cur: curForCountry(d.country), flag: d.flag, method: d.method, detail: d.detail, token: d.token || undefined });
const xferToDb = t => ({ recipient_name: t.recipientName, provider: t.provider?.name || String(t.provider || ""), amount: t.amount, from_currency: t.from, to_currency: t.destCur, received: t.received, status: t.status || "Delivered", flag: t.flag || null });
const xferFromDb = d => ({ id: d.id, date: new Date(d.created_at), provider: providerFromName(d.provider), from: d.from_currency, amount: Number(d.amount), destCur: d.to_currency, received: Number(d.received), flag: d.flag, recipientName: d.recipient_name, status: d.status, ref: "" });

/* ---------------- Legal: Terms + Privacy ---------------- */
function Legal({ tab = "terms", onBack }) {
  const [view, setView] = useState(tab);
  const eff = "Effective 6 July 2026";
  return (
    <div className="cd-legal">
      <div className="cd-lg-bar">
        <button className="cd-lg-back" onClick={onBack}><ArrowLeft size={18} /></button>
        <div className="cd-brandrow"><div className="cd-logomark"><Logo size={26} /></div><span className="cd-lg-word">Conduit</span></div>
      </div>
      <div className="cd-lg-tabs">
        <button className={`cd-lg-tab ${view === "terms" ? "on" : ""}`} onClick={() => setView("terms")}>Terms of Service</button>
        <button className={`cd-lg-tab ${view === "privacy" ? "on" : ""}`} onClick={() => setView("privacy")}>Privacy Policy</button>
      </div>

      {view === "terms" ? (
        <div className="cd-lg-body">
          <h1>Terms of Service</h1>
          <p className="cd-lg-eff">{eff}</p>

          <h3>1. What Conduit is</h3>
          <p>Conduit is a comparison and information service. We help you compare the estimated cost, exchange rate, speed and payout options of independent third-party money-transfer providers (such as Wise, Remitly, WorldRemit, Xoom, MoneyGram, Western Union, and others) for a given transfer. Conduit is <b>not</b> a bank, money transmitter, money services business, or payment provider, and we do <b>not</b> hold, send, receive, or move your money at any point.</p>

          <h3>2. How transfers actually happen</h3>
          <p>When you choose a provider in Conduit, we direct you to that provider's own website or app to create and complete your transfer directly with them. Your transfer — including payment, identity checks, delivery, and support — is governed entirely by that provider's own terms and privacy policy. Conduit is not a party to your transaction with them and is not responsible for their service, rates, fees, delays, or outcomes.</p>

          <h3>3. Estimates vs. live quotes</h3>
          <p>Unless a quote is clearly marked "Live," the figures Conduit shows are <b>estimates</b> modelled from each provider's publicly available pricing. Real rates and fees are set by the provider at the moment you transact and may differ. Always confirm the final amount on the provider's own site before sending. We work to keep estimates accurate but do not guarantee them.</p>

          <h3>4. How Conduit makes money</h3>
          <p>Conduit is free to use. We may earn a referral commission from some providers when you click through to them or complete a transfer. This never adds any cost to you and does not change the price you pay the provider. We rank results by value to you (typically the amount your recipient receives), not by what we may earn.</p>

          <h3>5. Your account and eligibility</h3>
          <p>You must be at least 18 and able to form a binding contract. You're responsible for keeping access to the email you use to sign in, and for the accuracy of the recipient details you enter. Sign-in links are single-use and time-limited.</p>

          <h3>6. Acceptable use</h3>
          <p>Don't use Conduit for anything unlawful, to attempt to break or overload the service, to scrape it at scale, or to misrepresent it. We may suspend access for misuse.</p>

          <h3>7. Identity verification</h3>
          <p>Some features use Stripe Identity to verify who you are. That verification is provided by Stripe under its own terms; Conduit receives only the result (verified or not), not your identity documents.</p>

          <h3>8. No warranty; limitation of liability</h3>
          <p>Conduit is provided "as is," without warranties of any kind. To the fullest extent permitted by law, Conduit and its operators are not liable for any indirect, incidental, or consequential loss, or for any loss arising from a third-party provider's service or from your reliance on an estimated quote.</p>

          <h3>9. Changes</h3>
          <p>We may update these terms as the product evolves. Material changes will be reflected by a new effective date here. Continued use means you accept the current version.</p>

          <h3>10. Contact</h3>
          <p>Questions about these terms: <a href="mailto:legal@conduitco.io">legal@conduitco.io</a>.</p>
        </div>
      ) : (
        <div className="cd-lg-body">
          <h1>Privacy Policy</h1>
          <p className="cd-lg-eff">{eff}</p>

          <h3>1. Our approach</h3>
          <p>We collect the minimum needed to run a money-transfer comparison service, and we never sell your personal information. Because your actual transfer happens on the provider's site, Conduit never sees your card numbers, bank credentials, or the funds themselves.</p>

          <h3>2. What we collect</h3>
          <p>Account basics you give us: your name, email, and country. Recipients you save: their name, destination country, and payout detail (e.g. an account or wallet reference) so you don't re-enter them. Activity: records of comparisons you run and transfers you hand off, so we can show your history and features like streaks and goals. Technical data: basic, standard app and device information needed to operate and secure the service.</p>

          <h3>3. What we don't collect</h3>
          <p>We do not collect or store your payment card details, online banking logins, or the money being sent — those stay between you and your chosen provider. Identity documents submitted for verification go to Stripe, not to us; we receive only a pass/fail result.</p>

          <h3>4. How we use it</h3>
          <p>To provide and personalise the service (show your recipients, history, rate alerts, and progress), to keep it secure, to improve our comparison accuracy, and to send you the sign-in and service emails you request. We use your email for authentication — not for marketing unless you opt in.</p>

          <h3>5. Who we share it with</h3>
          <p>Only the service providers that make Conduit work: Supabase (database and authentication), Resend (sending your sign-in emails), Stripe (identity verification), and our hosting providers. When you choose to continue to a transfer provider, you leave Conduit and their privacy policy applies. We may share information if required by law.</p>

          <h3>6. Data location</h3>
          <p>Conduit operates from the United States and stores data with reputable cloud providers. If you access Conduit from outside the U.S., your information may be processed there.</p>

          <h3>7. Your choices</h3>
          <p>You can view and edit your recipients and profile in the app, delete a transfer from your history, and request deletion of your account and associated data by emailing us. Deleting your account removes your saved data from our systems.</p>

          <h3>8. Security</h3>
          <p>We use passwordless sign-in (single-use email links), encrypted connections, and per-user access rules so you can only see your own data. No system is perfectly secure, but we design to minimise what we hold in the first place.</p>

          <h3>9. Children</h3>
          <p>Conduit is not for anyone under 18 and we don't knowingly collect their information.</p>

          <h3>10. Changes & contact</h3>
          <p>We'll update this policy as needed and revise the effective date above. Privacy questions or data requests: <a href="mailto:privacy@conduitco.io">privacy@conduitco.io</a>.</p>
        </div>
      )}
      <button className="cd-lg-done" onClick={onBack}>Back</button>
    </div>
  );
}

/* ---------------- Landing: Apple-simple front door ---------------- */
function LandingRate({ baseCur = "USD", cur = "MXN" }) {
  const API = import.meta.env.VITE_API_BASE || "";
  const [data, setData] = useState(null);
  useEffect(() => {
    let dead = false;
    fetch(`${API}/api/rates?from=${baseCur}&to=${cur}`)
      .then(r => r.json()).then(d => !dead && d.rate && setData(d)).catch(() => {});
    return () => { dead = true; };
  }, []);
  if (!data) return null;
  const up = data.change7d >= 0;
  return (
    <div className="cd-ld-rate">
      <Sparkline points={data.history.map(h => h.rate)} up={up} />
      <div className="cd-ld-rate-line">1 {baseCur} = {data.rate >= 100 ? data.rate.toFixed(2) : data.rate.toFixed(4)} {cur}</div>
      <div className="cd-ld-rate-sub"><span className={up ? "cd-ld-up" : "cd-ld-dn"}>{up ? "▲" : "▼"} {Math.abs(data.change7d).toFixed(2)}%</span> this week · live rate</div>
    </div>
  );
}

function Landing({ onStart, onLogin, onLegal }) {
  return (
    <div className="cd-ld">
      <div className="cd-ld-bar">
        <div className="cd-brandrow"><div className="cd-logomark"><Logo size={30} /></div><span className="cd-ld-word">Conduit</span></div>
        <button className="cd-ld-login" onClick={onLogin}>Log in</button>
      </div>

      <h1 className="cd-ld-h1">Send money<br />for less.</h1>
      <p className="cd-ld-sub">One app compares Wise, Remitly, Western Union and more — live — and routes you to the best deal. Free to use. Nothing hidden.</p>
      <button className="cd-ld-cta" onClick={onStart}>Get started</button>
      <div className="cd-ld-micro">Free to join · No card required</div>

      <div className="cd-ld-mock">
        <div className="cd-ld-mock-line"><span>You send</span><b>USD 500.00</b></div>
        <div className="cd-ld-mock-line big"><span>They receive</span><b>MXN 8,364</b></div>
        <div className="cd-ld-mock-prov">
          <span className="cd-prov-badge" style={{ background: "#1A6BE0", color: "#fff" }}>C</span>
          <span className="cd-ld-mock-via">via <b>Circle</b> · Best value · ~10 min</span>
        </div>
        <div className="cd-ld-mock-save">USD 4.85 cheaper than the next option</div>
      </div>

      <LandingRate />

      <div className="cd-ld-props">
        <div className="cd-ld-prop"><b>Every provider. One answer.</b><span>Live quotes, ranked by what your family actually receives.</span></div>
        <div className="cd-ld-prop"><b>Bank, wallet, or cash pickup.</b><span>Your recipient chooses how the money lands.</span></div>
        <div className="cd-ld-prop"><b>Verify once. Send in minutes.</b><span>Stripe-powered identity. Trusted, regulated rails.</span></div>
      </div>

      <button className="cd-ld-cta cd-ld-cta2" onClick={onStart}>Create your free account</button>
      <div className="cd-ld-foot">Already with us? <span onClick={onLogin}>Log in</span></div>
      <div className="cd-ld-legal"><span onClick={() => onLegal("terms")}>Terms</span> · <span onClick={() => onLegal("privacy")}>Privacy</span></div>
    </div>
  );
}

function LoginScreen({ onLoggedIn, onNewUser, notice = "" }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | sent | error
  const [err, setErr] = useState("");
  async function send() {
    const e = email.trim();
    if (!/.+@.+\..+/.test(e)) { setErr("Enter a valid email"); setState("error"); return; }
    setState("sending"); setErr("");
    try { await sendMagicLink(e); setState("sent"); }
    catch (ex) { setErr(String(ex.message || ex)); setState("error"); }
  }
  return (
    <div className="cd-onb">
      <div className="cd-onb-head">
        <div className="cd-logomark big"><Logo size={66} /></div>
        <div className="cd-onb-word">Conduit</div>
        <div className="cd-onb-tag">Money moves. Brains guide it.</div>
      </div>
      <div className="cd-onb-card welcome cd-login-card">
        {state === "sent" ? (
          <>
            <div className="cd-login-sent"><span className="cd-login-sent-ic"><Mail size={26} color="#028090" /></span></div>
            <h3 className="cd-onb-h" style={{ textAlign: "center" }}>Check your email</h3>
            <p className="cd-onb-p" style={{ textAlign: "center" }}>We sent a secure sign-in link to<br /><b>{email.trim()}</b></p>
            <p className="cd-onb-p" style={{ textAlign: "center", fontSize: "12px" }}>Open it on this device and you'll land back here, signed in. Give it a minute — and check spam.</p>
            <button className="cd-ghost full" onClick={() => setState("idle")}>Use a different email</button>
          </>
        ) : (
          <>
            <h3 className="cd-onb-h">Welcome back</h3>
            {notice && <div className="cd-login-notice">{notice}</div>}
            <p className="cd-onb-p">No passwords here — we'll email you a secure one-tap sign-in link.</p>
            <div className="cd-form" style={{ marginTop: 6 }}>
              <label className="cd-fl">Email</label>
              <div className="cd-inwrap"><Mail size={15} color={C.muted} /><input className="cd-input bare" type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} autoFocus /></div>
              {state === "error" && <div className="cd-valmsg error"><X size={13} /> {err}</div>}
              <button className="cd-primary full big" onClick={send} disabled={state === "sending"}>{state === "sending" ? <><span className="cd-spin" /> Sending…</> : <>Email me a sign-in link <ArrowRight size={16} /></>}</button>
            </div>
            <div className="cd-trust" style={{ marginTop: 12 }}><Lock size={12} /> 256-bit encryption · regulated partners</div>
          </>
        )}
        <div className="cd-login-split"><span /></div>
        <p className="cd-onb-p" style={{ textAlign: "center", margin: 0 }}>New to Conduit? <span style={{ color: "#028090", fontWeight: 700, cursor: "pointer" }} onClick={onNewUser}>Create your account</span></p>
      </div>
    </div>
  );
}

export default function ConduitApp() {
  const [profile, setProfile] = useState(null); // null = signed out
  const [authStage, setAuthStage] = useState(sbOn() ? "checking" : "open");
  const [authNotice, setAuthNotice] = useState("");
  const [legalTab, setLegalTab] = useState(null); // checking | login | signup | in | open
  // On load: magic-link in URL? saved session? -> restore, load profile, log in.
  useEffect(() => {
    if (!sbOn()) return;
    (async () => {
      const linkErr = authErrorFromUrl();
      if (linkErr) {
        setAuthNotice("That sign-in link has already been used or has expired. Enter your email and we'll send a fresh one.");
        setAuthStage("login");
        return;
      }
      let sess = sessionFromUrl();
      if (sess) saveSession(sess); else sess = loadSession();
      if (!sess?.access_token) { setAuthStage("landing"); return; }
      let user = await fetchAuthedUser(sess.access_token);
      if (!user?.id && sess.refresh_token) {
        const fresh = await refreshSession(sess.refresh_token);
        if (fresh) { sess = fresh; saveSession(fresh); user = await fetchAuthedUser(fresh.access_token); }
      }
      if (!user?.id) { clearSession(); setAuthStage("landing"); return; }
      setUserToken(sess.access_token);
      try {
        const p = await sbGetProfile();
        if (p) {
          setProfile({ name: p.name, email: p.email || user.email, country: p.country, initials: (p.name || "U").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(), tier: "Tier 1", status: p.verified ? "Verified" : "Pending", limitMax: 15000, currency: COUNTRY_SRC[p.country] || "USD" });
          setAuthStage("in");
        } else { setAuthStage("signup"); } // logged in but no profile yet -> onboard once
      } catch (e) { setAuthStage("signup"); }
    })();
  }, []);
  async function completeOnboarding(p) {
    setProfile(p);
    setAuthStage("in");
    if (sbOn() && USER_TOKEN) { try { await sbSaveProfile(p); } catch (e) {} }
  }
  function signOut() { clearSession(); setUserToken(null); setProfile(null); setTab("send"); setAuthStage(sbOn() ? "login" : "open"); }
  const [tab, setTab] = useState("send");
  const [recipients, setRecipients] = useState([
    { id: "r1", name: "María González", country: "Mexico", cur: "MXN", flag: "🇲🇽", method: "Bank", detail: "002010077777777771" },
    { id: "r2", name: "Valentina Rojas", country: "Colombia", cur: "COP", flag: "🇨🇴", method: "Cash", detail: "+57 300 555 0198" },
  ]);
  const [history, setHistory] = useState([]);

  // On load, pull recipients + history from the database (if configured).
  // First run seeds two sample recipients so the demo isn't empty.
  useEffect(() => {
    if (!sbOn() || authStage !== "in") return;
    (async () => {
      try {
        const [rcps, xfers] = await Promise.all([
          sbSelect("recipients", "&order=created_at.asc"),
          sbSelect("transfers", "&order=created_at.desc"),
        ]);
        let list = rcps;
        if (rcps.length === 0) {
          const seeds = [
            { name: "María González", country: "Mexico", method: "Bank", detail: "002010077777777771", flag: "🇲🇽" },
            { name: "Valentina Rojas", country: "Colombia", method: "Cash", detail: "+57 300 555 0198", flag: "🇨🇴" },
          ];
          const inserted = [];
          for (const s of seeds) { try { inserted.push(await sbInsert("recipients", s)); } catch (e) {} }
          list = inserted;
        }
        setRecipients(list.map(rcpFromDb));
        setHistory(xfers.map(xferFromDb));
      } catch (e) { /* keep in-memory seed if the DB is unreachable */ }
    })();
  }, [authStage]);

  async function addRecipient(r) {
    if (!sbOn()) { setRecipients(rs => [...rs, r]); return; }
    try { const row = await sbInsert("recipients", rcpToDb(r)); setRecipients(rs => [...rs, rcpFromDb(row)]); }
    catch (e) { setRecipients(rs => [...rs, r]); }
  }
  async function removeRecipient(id) {
    setRecipients(rs => rs.filter(x => x.id !== id));
    if (sbOn()) { try { await sbDelete("recipients", id); } catch (e) {} }
  }
  async function addTransfer(t) {
    if (!sbOn()) { setHistory(h => [t, ...h]); return; }
    try { const row = await sbInsert("transfers", xferToDb(t)); setHistory(h => [xferFromDb(row), ...h]); }
    catch (e) { setHistory(h => [t, ...h]); }
  }
  async function updateTransfer(id, status) {
    setHistory(h => h.map(x => x.id === id ? { ...x, status } : x)); // optimistic
    if (sbOn()) { try { await sbUpdate("transfers", id, { status }); } catch (e) {} }
  }
  async function removeTransfer(id) {
    setHistory(h => h.filter(x => x.id !== id));
    if (sbOn()) { try { await sbDelete("transfers", id); } catch (e) {} }
  }

  if (authStage === "checking") {
    return (<div className="cd-root"><style>{css}</style><div className="cd-onb"><div className="cd-onb-head"><div className="cd-logomark big"><Logo size={66} /></div><div className="cd-onb-word">Conduit</div><div className="cd-onb-tag"><span className="cd-spin" style={{ marginRight: 6 }} /> Signing you in…</div></div></div></div>);
  }
  if (legalTab) {
    return (<div className="cd-root"><style>{css}</style><Legal tab={legalTab} onBack={() => setLegalTab(null)} /></div>);
  }
  if (authStage === "landing") {
    return (<div className="cd-root"><style>{css}</style><Landing onStart={() => setAuthStage("signup")} onLogin={() => setAuthStage("login")} onLegal={(t) => setLegalTab(t)} /><div className="cd-caption">Conduit · Money moves. Brains guide it.</div></div>);
  }
  if (authStage === "login") {
    return (<div className="cd-root"><style>{css}</style><LoginScreen notice={authNotice} onLoggedIn={() => {}} onNewUser={() => setAuthStage("signup")} /><div className="cd-caption">Conduit · sign in with a magic link</div></div>);
  }
  if (!profile) {
    return (<div className="cd-root"><style>{css}</style><Onboarding onDone={completeOnboarding} onLogin={() => setAuthStage("login")} hasSession={authStage === "signup"} startEmail={""} /><div className="cd-caption">Conduit · interactive prototype</div></div>);
  }

  return (
    <div className="cd-root">
      <style>{css}</style>
      <div className="cd-frame">
        <Header profile={profile} />
        <div className="cd-body">
          {tab === "send" && <SendTab profile={profile} recipients={recipients} setRecipients={setRecipients} setHistory={setHistory} history={history} addRecipient={addRecipient} addTransfer={addTransfer} goActivity={() => setTab("activity")} goPeople={() => setTab("people")} goProfile={() => setTab("profile")} />}
          {tab === "people" && <People recipients={recipients} setRecipients={setRecipients} addRecipient={addRecipient} removeRecipient={removeRecipient} />}
          {tab === "activity" && <Activity history={history} startSend={() => setTab("send")} updateTransfer={updateTransfer} removeTransfer={removeTransfer} />}
          {tab === "profile" && <Profile profile={profile} history={history} onSignOut={signOut} onLegal={(t) => setLegalTab(t)} />}
        </div>
        <nav className="cd-nav">
          <NavBtn active={tab === "send"} onClick={() => setTab("send")} icon={Send} label="Send" />
          <NavBtn active={tab === "people"} onClick={() => setTab("people")} icon={Users} label="People" />
          <NavBtn active={tab === "activity"} onClick={() => setTab("activity")} icon={History} label="Activity" />
          <NavBtn active={tab === "profile"} onClick={() => setTab("profile")} icon={User} label="Profile" />
        </nav>
      </div>
      <div className="cd-caption">Conduit · interactive prototype · simulated provider quotes</div>
    </div>
  );
}

function Header({ profile }) {
  return (
    <div className="cd-head">
      <div className="cd-brandrow">
        <div className="cd-logomark"><Logo size={34} /></div>
        <div><div className="cd-word">Conduit</div><div className="cd-tag">Money moves. Brains guide it.</div></div>
      </div>
      <div className="cd-headava" title={profile.name}>{profile.initials}</div>
    </div>
  );
}
function NavBtn({ active, onClick, icon: Icon, label }) {
  return <button className={`cd-navbtn ${active ? "on" : ""}`} onClick={onClick}><Icon size={19} /><span>{label}</span></button>;
}

/* ============================ ONBOARDING ============================ */
// --- Verified street-address autocomplete ---
// Default provider: OpenStreetMap Nominatim (free, no key — fine for demo traffic).
// To use Google/Loqate/Smarty in production, replace fetchAddressSuggestions() below.
async function fetchAddressSuggestions(term, signal) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(term)}`;
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("address lookup failed");
  const data = await res.json();
  return Array.isArray(data) ? data.map(d => ({ id: d.place_id, label: d.display_name })) : [];
}

function AddressAutocomplete({ value, onChange, placeholder = "Start typing your address…" }) {
  const [q, setQ] = useState(value || "");
  const [sugs, setSugs] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (verified) return;
    const term = q.trim();
    if (term.length < 5) { setSugs([]); setOpen(false); return; }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      try { const r = await fetchAddressSuggestions(term, ctrl.signal); setSugs(r); setOpen(true); }
      catch (e) { if (e.name !== "AbortError") setSugs([]); }
      finally { setLoading(false); }
    }, 500); // debounce — keeps us within the free service's fair-use limits
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q, verified]);

  function choose(s) { setQ(s.label); onChange(s.label); setVerified(true); setSugs([]); setOpen(false); }
  function onType(e) { const v = e.target.value; setQ(v); onChange(v); if (verified) setVerified(false); }

  const showHint = !loading && open && sugs.length === 0 && q.trim().length >= 5 && !verified;
  return (
    <div className="cd-addr">
      <input className={`cd-input ${verified ? "dv-ok" : ""}`} placeholder={placeholder} value={q}
        onChange={onType} onFocus={() => sugs.length && setOpen(true)} autoComplete="off" />
      {verified && <div className="cd-valmsg ok"><Check size={13} /> Verified address</div>}
      {open && !verified && sugs.length > 0 && (
        <div className="cd-addr-list">
          {sugs.map(s => (
            <button type="button" key={s.id} className="cd-addr-opt" onClick={() => choose(s)}>
              <MapPin size={14} color={C.teal} style={{ flexShrink: 0, marginTop: 1 }} /><span>{s.label}</span>
            </button>
          ))}
        </div>
      )}
      {loading && !verified && q.trim().length >= 5 && <div className="cd-addr-hint">Searching addresses…</div>}
      {showHint && <div className="cd-addr-hint">No matches — you can type it manually.</div>}
    </div>
  );
}

function Onboarding({ onDone, onLogin = () => {}, hasSession = false, startEmail = "" }) {
  const [step, setStep] = useState(hasSession ? 1 : 0);
  const [email, setEmail] = useState(startEmail);
  const [name, setName] = useState("");
  const [linkState, setLinkState] = useState("idle"); // idle | sending | sent | error
  const [linkErr, setLinkErr] = useState("");
  async function sendSignupLink() {
    const e = email.trim();
    if (!/.+@.+\..+/.test(e)) { setLinkErr("Enter a valid email"); setLinkState("error"); return; }
    setLinkState("sending"); setLinkErr("");
    try { await sendMagicLink(e); setLinkState("sent"); }
    catch (ex) { setLinkErr(String(ex.message || ex)); setLinkState("error"); }
  }
  const [dob, setDob] = useState("");
  const [addr, setAddr] = useState("");
  const [country, setCountry] = useState("United States");
  const [idType, setIdType] = useState(null);
  const [idDone, setIdDone] = useState(false);
  const [selfieDone, setSelfieDone] = useState(false);
  const [started, setStarted] = useState(false);
  const [idStatus, setIdStatus] = useState("idle"); // idle | opening | pending | verified | failed
  const [idErr, setIdErr] = useState("");
  const pollRef = useRef({ stop: false });
  const API = import.meta.env.VITE_API_BASE || "";

  async function startStripeVerify() {
    setIdErr(""); setIdStatus("opening");
    try {
      const r = await fetch(`${API}/api/identity/start`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnUrl: window.location.origin }),
      });
      const d = await r.json();
      if (!r.ok || !d.url) throw new Error(d.error || "Could not start verification");
      window.open(d.url, "_blank", "noopener,noreferrer");
      setIdStatus("pending");
      pollRef.current.stop = false;
      pollIdentity(d.id);
    } catch (e) { setIdStatus("failed"); setIdErr(String(e.message || e)); }
  }
  function pollIdentity(id) {
    const tick = async () => {
      if (pollRef.current.stop) return;
      try {
        const r = await fetch(`${API}/api/identity/status?id=${encodeURIComponent(id)}`);
        const d = await r.json();
        if (d.status === "verified") { setIdStatus("verified"); setIdDone(true); setSelfieDone(true); setIdType("Verified via Stripe"); return; }
        if (d.status === "canceled") { setIdStatus("failed"); setIdErr(d.error || "Verification was canceled"); return; }
      } catch (e) { /* transient — keep polling */ }
      if (!pollRef.current.stop) setTimeout(tick, 3500);
    };
    setTimeout(tick, 3500);
  }
  useEffect(() => () => { pollRef.current.stop = true; }, []);

  const steps = ["Account", "Details", "ID", "Selfie", "Review"];

  function finish() {
    const initials = (name.trim() || "You").split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
    onDone({ name: name.trim() || "New user", email: email.trim() || "you@email.com", country, initials, tier: "Tier 1", status: "Verified", limitMax: 15000, currency: COUNTRY_SRC[country] || "USD" });
  }

  const canNext = [
    email.includes("@"),
    name.trim() && dob && addr.trim(),
    idDone,
    selfieDone,
    true,
  ][step];

  if (!started) {
    return (
      <div className="cd-onb">
        <div className="cd-onb-head">
          <div className="cd-logomark big"><Logo size={66} /></div>
          <div className="cd-onb-word">Conduit</div>
          <div className="cd-onb-tag">Money moves. Brains guide it.</div>
        </div>
        <div className="cd-onb-card welcome">
          <h3 className="cd-onb-h">Send money anywhere, for less.</h3>
          <p className="cd-onb-p">Conduit's AI compares every provider and routes your money the cheapest, fastest way — in one tap.</p>
          <div className="cd-vprops">
            <div className="cd-vprop"><span className="cd-vprop-ic"><Sparkles size={18} color={C.teal} /></span><span className="cd-vprop-txt">Every provider compared instantly</span></div>
            <div className="cd-vprop"><span className="cd-vprop-ic"><Wallet size={18} color={C.teal} /></span><span className="cd-vprop-txt">Bank, crypto wallet, or cash pickup</span></div>
            <div className="cd-vprop"><span className="cd-vprop-ic"><ShieldCheck size={18} color={C.teal} /></span><span className="cd-vprop-txt">Verified once. Send in minutes.</span></div>
          </div>
          <button className="cd-primary full big" onClick={() => setStarted(true)}>Get started</button>
          <div className="cd-onb-foot">Already have an account? <span>Log in</span></div>
        </div>
      </div>
    );
  }

  return (
    <div className="cd-onb">
      <div className="cd-onb-head">
        <div className="cd-logomark big"><Logo size={62} /></div>
        <div className="cd-onb-word">Conduit</div>
        <div className="cd-onb-tag">Money moves. Brains guide it.</div>
      </div>
      <div className="cd-onb-card">
        <div className="cd-prog">{steps.map((s, i) => (
          <div key={s} className={`cd-prog-seg ${i <= step ? "on" : ""}`} />
        ))}</div>
        <div className="cd-onb-stepname">Step {step + 1} of {steps.length} · {steps[step]}</div>

        {step === 0 && (
          <>
            <h3 className="cd-onb-h">Create your account</h3>
            {sbOn() ? (
              linkState === "sent" ? (
                <>
                  <div className="cd-idverified"><Mail size={18} color="#0a7d52" /> Check your email</div>
                  <p className="cd-onb-p" style={{ marginTop: 10 }}>We sent a secure link to <b>{email.trim()}</b>. Open it on this device — you'll come back here signed in, and we'll finish setting up your account.</p>
                </>
              ) : (
                <>
                  <p className="cd-onb-p">No passwords. Enter your email and we'll send a secure sign-up link.</p>
                  <label className="cd-fl">Email</label>
                  <div className="cd-inwrap"><Mail size={15} color={C.muted} /><input className="cd-input bare" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} /></div>
                  {linkState === "error" && <div className="cd-valmsg error"><X size={13} /> {linkErr}</div>}
                  <button className="cd-primary full" onClick={sendSignupLink} disabled={linkState === "sending"}>{linkState === "sending" ? "Sending…" : "Email me a sign-up link"}</button>
                  <div className="cd-trust"><Lock size={12} /> 256-bit encryption · regulated partners</div>
                </>
              )
            ) : (
              <>
                <p className="cd-onb-p">Send money in minutes. We verify your identity once to keep transfers safe and compliant.</p>
                <label className="cd-fl">Email</label>
                <div className="cd-inwrap"><Mail size={15} color={C.muted} /><input className="cd-input bare" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} /></div>
                <div className="cd-trust"><Lock size={12} /> 256-bit encryption · regulated partners</div>
              </>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <h3 className="cd-onb-h">Your details</h3>
            <p className="cd-onb-p">Use your legal name exactly as it appears on your ID.</p>
            <label className="cd-fl">Full legal name</label>
            <input className="cd-input" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} />
            <label className="cd-fl">Date of birth</label>
            <input className="cd-input" placeholder="DD / MM / YYYY" value={dob} onChange={e => setDob(e.target.value)} />
            <label className="cd-fl">Residential address</label>
            <AddressAutocomplete value={addr} onChange={setAddr} placeholder="Street, suburb, postcode" />
            <label className="cd-fl">Country of residence</label>
            <select className="cd-input" value={country} onChange={e => setCountry(e.target.value)}>
              {["United States", "Canada", "Australia", "United Kingdom", "Germany", "France"].map(c => <option key={c}>{c}</option>)}
            </select>
          </>
        )}

        {step === 2 && (
          <>
            <h3 className="cd-onb-h">Verify your identity</h3>
            <p className="cd-onb-p">Stripe checks a photo ID and a live selfie. It opens in a secure tab — finish there, then come back; this updates on its own.</p>
            {idStatus === "verified" ? (
              <div className="cd-idverified"><BadgeCheck size={20} color="#0a7d52" /> Identity verified by Stripe</div>
            ) : (
              <>
                <button className="cd-upload" onClick={startStripeVerify} disabled={idStatus === "opening" || idStatus === "pending"}>
                  {idStatus === "opening" ? <>Starting secure check…</>
                    : idStatus === "pending" ? <><span className="cd-spin" /> Waiting for you to finish…</>
                    : <><ShieldCheck size={18} /> Verify with Stripe</>}
                </button>
                {idStatus === "pending" && <p className="cd-onb-p" style={{ marginTop: 10 }}>Complete the steps in the Stripe tab. When it's done, this screen ticks over automatically.</p>}
                {idStatus === "failed" && <div className="cd-valmsg error" style={{ marginTop: 8 }}><X size={13} /> {idErr || "That didn't complete"} — <span style={{ textDecoration: "underline", cursor: "pointer" }} onClick={startStripeVerify}>try again</span></div>}
              </>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <h3 className="cd-onb-h">Selfie check</h3>
            {selfieDone ? (
              <>
                <button className="cd-selfie done"><Check size={30} /></button>
                <div className="cd-selfie-lbl">Selfie verified by Stripe</div>
              </>
            ) : (
              <>
                <p className="cd-onb-p">Your selfie is captured as part of the Stripe identity step. Head back and complete it first.</p>
                <button className="cd-selfie scanning" onClick={() => setStep(2)}><Camera size={30} /></button>
                <div className="cd-selfie-lbl">Back to verification</div>
              </>
            )}
          </>
        )}

        {step === 4 && (
          <div className="cd-review">
            <div className="cd-verified-ic"><BadgeCheck size={40} color="#fff" /></div>
            <h3 className="cd-onb-h center">You're verified</h3>
            <p className="cd-onb-p center">Tier 1 approved — you can send up to AUD 15,000 / month. Higher limits unlock with extra verification.</p>
            <div className="cd-rev-rows">
              <div className="cd-rev"><span>Name</span><span>{name || "—"}</span></div>
              <div className="cd-rev"><span>Email</span><span>{email || "—"}</span></div>
              <div className="cd-rev"><span>Document</span><span>{idType || "—"}</span></div>
              <div className="cd-rev"><span>Status</span><span className="cd-okpill">Verified</span></div>
            </div>
          </div>
        )}

        {!(sbOn() && step === 0) && (
          <button className="cd-primary full big" disabled={!canNext} onClick={() => step < 4 ? setStep(step + 1) : finish()}>
            {step === 4 ? "Enter Conduit" : "Continue"}
          </button>
        )}
        {step === 0 && !hasSession && <div className="cd-onb-foot">Already have an account? <span style={{ cursor: "pointer" }} onClick={onLogin}>Log in</span></div>}
      </div>
    </div>
  );
}

/* ============================== SEND TAB (home + flow) ============================== */
/* ---------------- Rate Watch: live corridor rate + trend + target alerts ---------------- */
function Sparkline({ points, up }) {
  if (!points || points.length < 2) return null;
  const w = 120, h = 30, min = Math.min(...points), max = Math.max(...points);
  const span = max - min || 1;
  const xy = points.map((p, i) => `${(i / (points.length - 1)) * w},${h - 3 - ((p - min) / span) * (h - 8)}`);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="cd-rw-spark">
      <polyline points={xy.join(" ")} fill="none" stroke={up ? "#02C39A" : "#e07a73"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xy[xy.length - 1].split(",")[0]} cy={xy[xy.length - 1].split(",")[1]} r="3" fill={up ? "#02C39A" : "#e07a73"} />
    </svg>
  );
}

const ALERT_KEY = "conduit_rate_alerts";
function loadAlerts() { try { return JSON.parse(localStorage.getItem(ALERT_KEY) || "{}"); } catch (e) { return {}; } }
function saveAlerts(a) { try { localStorage.setItem(ALERT_KEY, JSON.stringify(a)); } catch (e) {} }

function RateWatch({ recipients, baseCur = "AUD" }) {
  const API = import.meta.env.VITE_API_BASE || "";
  const corridors = [...new Set([...(recipients || []).map(r => r.cur), "MXN"])].filter(Boolean).slice(0, 4);
  const [cur, setCur] = useState(corridors[0] || "PKR");
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);
  const [alerts, setAlerts] = useState(loadAlerts());
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState("");

  useEffect(() => {
    let dead = false;
    setData(null); setErr(false);
    fetch(`${API}/api/rates?from=${baseCur}&to=${cur}`)
      .then(r => r.json())
      .then(d => { if (!dead) (d.rate ? setData(d) : setErr(true)); })
      .catch(() => !dead && setErr(true));
    return () => { dead = true; };
  }, [cur]);

  const myTarget = alerts[`${baseCur}-${cur}`];
  const hit = data && myTarget && data.rate >= myTarget;
  function setAlert() {
    const t = parseFloat(target);
    if (!t || t <= 0) return;
    const next = { ...alerts, [`${baseCur}-${cur}`]: t };
    setAlerts(next); saveAlerts(next); setEditing(false); setTarget("");
  }
  function clearAlert() {
    const next = { ...alerts }; delete next[`${baseCur}-${cur}`];
    setAlerts(next); saveAlerts(next);
  }
  const up = data ? data.change7d >= 0 : true;
  return (
    <div className="cd-rw">
      <div className="cd-rw-head">
        <span className="cd-rw-lbl"><TrendingUp size={12} /> Rate watch</span>
        <div className="cd-rw-chips">
          {corridors.map(c => (
            <button key={c} className={`cd-rw-chip ${c === cur ? "on" : ""}`} onClick={() => setCur(c)}>{c}</button>
          ))}
        </div>
      </div>
      {err ? (
        <div className="cd-rw-err">Rates unavailable right now — try again shortly.</div>
      ) : !data ? (
        <div className="cd-rw-load"><span className="cd-spin" /> Fetching live rate…</div>
      ) : (
        <>
          <div className="cd-rw-main">
            <div>
              <div className="cd-rw-rate">1 {baseCur} = {data.rate >= 100 ? data.rate.toFixed(2) : data.rate.toFixed(4)} {cur}</div>
              <div className="cd-rw-sub">
                <span className={`cd-rw-chg ${up ? "up" : "down"}`}>{up ? "▲" : "▼"} {Math.abs(data.change7d).toFixed(2)}%</span>
                <span>7 days · {data.source === "live" ? "live rate" : "indicative"}</span>
              </div>
            </div>
            <Sparkline points={data.history.map(h => h.rate)} up={up} />
          </div>
          {hit ? (
            <div className="cd-rw-hit"><Bell size={13} /> Target {myTarget} hit — great time to send! <span className="cd-rw-x" onClick={clearAlert}>dismiss</span></div>
          ) : editing ? (
            <div className="cd-rw-alertrow">
              <input className="cd-input cd-rw-in" type="number" placeholder={`Alert me at… e.g. ${(data.rate * 1.01).toFixed(2)}`} value={target} onChange={e => setTarget(e.target.value)} onKeyDown={e => e.key === "Enter" && setAlert()} autoFocus />
              <button className="cd-rw-set" onClick={setAlert}>Set</button>
            </div>
          ) : (
            <button className="cd-rw-alertbtn" onClick={() => setEditing(true)}>
              <Bell size={13} /> {myTarget ? `Alert set at ${myTarget} — change` : "Alert me when the rate hits my target"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- Progress: streaks, sending goals, milestones ---------------- */
// Consecutive months (ending now, or last month if none yet this month) with >=1 transfer.
function calcStreak(history) {
  if (!history.length) return { months: 0, activeThisMonth: false };
  const keys = new Set(history.map(h => { const d = new Date(h.date); return d.getFullYear() * 12 + d.getMonth(); }));
  const now = new Date(); let k = now.getFullYear() * 12 + now.getMonth();
  const activeThisMonth = keys.has(k);
  if (!activeThisMonth) k -= 1; // grace: streak survives until this month ends
  let months = 0;
  while (keys.has(k)) { months++; k--; }
  return { months, activeThisMonth };
}

const GOAL_KEY = "conduit_goal";
function loadGoal() { try { return JSON.parse(localStorage.getItem(GOAL_KEY) || "null"); } catch (e) { return null; } }
function saveGoal(g) { try { g ? localStorage.setItem(GOAL_KEY, JSON.stringify(g)) : localStorage.removeItem(GOAL_KEY); } catch (e) {} }
function goalProgress(goal, history) {
  if (!goal) return 0;
  return history.filter(h => new Date(h.date) >= new Date(goal.start)).reduce((s, h) => s + toBase(h.amount, h.from, goal.cur || "USD"), 0);
}

function calcBadges(history, profile, streak, goalDone) {
  const corridors = new Set(history.map(h => h.destCur));
  return [
    { id: "first", label: "First transfer", icon: "🚀", earned: history.length >= 1 },
    { id: "verified", label: "ID verified", icon: "🛡️", earned: profile?.status === "Verified" },
    { id: "regular", label: "Regular sender", icon: "📅", earned: history.length >= 5 },
    { id: "multi", label: "Multi-corridor", icon: "🌏", earned: corridors.size >= 2 },
    { id: "streak3", label: "3-month streak", icon: "🔥", earned: streak >= 3 },
    { id: "goal", label: "Goal reached", icon: "🏆", earned: goalDone },
  ];
}

// Slim strip on Home: streak + active goal at a glance.
function ProgressStrip({ history, goToProfile }) {
  const { months, activeThisMonth } = calcStreak(history);
  const goal = loadGoal();
  const done = goal ? goalProgress(goal, history) : 0;
  if (!months && !goal) return null;
  const pct = goal ? Math.min(100, (done / goal.target) * 100) : 0;
  return (
    <button className="cd-ps" onClick={goToProfile}>
      {months > 0 && (
        <span className={`cd-ps-streak ${activeThisMonth ? "" : "risk"}`}>🔥 {months}-month streak{activeThisMonth ? "" : " · send to keep it"}</span>
      )}
      {goal && (
        <span className="cd-ps-goal">
          <span className="cd-ps-goal-lbl">{goal.name}</span>
          <span className="cd-ps-bar"><span className="cd-ps-fill" style={{ width: pct + "%" }} /></span>
          <span className="cd-ps-amt">{Math.round(pct)}%</span>
        </span>
      )}
    </button>
  );
}

// Full section on Profile: streak card, goal (set/edit), badges.
function ProgressSection({ history, profile }) {
  const { months, activeThisMonth } = calcStreak(history);
  const [goal, setGoal] = useState(loadGoal());
  const [editing, setEditing] = useState(false);
  const [gName, setGName] = useState(goal?.name || "");
  const [gTarget, setGTarget] = useState(goal?.target || "");
  const done = goal ? goalProgress(goal, history) : 0;
  const reached = goal && done >= goal.target;
  const badges = calcBadges(history, profile, months, Boolean(reached));
  const pct = goal ? Math.min(100, (done / goal.target) * 100) : 0;

  function save() {
    const t = parseFloat(gTarget);
    if (!gName.trim() || !t || t <= 0) return;
    const g = { name: gName.trim(), target: t, cur: profile.currency, start: goal?.start || new Date().toISOString() };
    setGoal(g); saveGoal(g); setEditing(false);
  }
  function clear() { setGoal(null); saveGoal(null); setEditing(false); setGName(""); setGTarget(""); }

  return (
    <>
      <div className="cd-sec-lbl">Your progress</div>
      <div className="cd-card2 cd-pg-streakcard">
        <div className="cd-pg-flame">🔥</div>
        <div className="cd-pg-streaktxt">
          <b>{months > 0 ? `${months}-month sending streak` : "Start your streak"}</b>
          <span>{months > 0 ? (activeThisMonth ? "You've supported family this month. Keep it going!" : "Send this month to keep your streak alive.") : "Send once a month to build a streak — steady support matters more than size."}</span>
        </div>
      </div>

      <div className="cd-card2">
        {goal && !editing ? (
          <>
            <div className="cd-card2-h"><span>🎯 {goal.name}</span><span className="cd-card2-v">{goal.cur || profile.currency} {fmt(done, goal.cur || profile.currency)} / {fmt(goal.target, goal.cur || profile.currency)}</span></div>
            <div className="cd-bar"><div className="cd-bar-fill" style={{ width: pct + "%" }} /></div>
            {reached ? (
              <div className="cd-pg-done">🏆 Goal reached — brilliant. Set a new one when you're ready.</div>
            ) : (
              <div className="cd-card2-sub">{Math.round(pct)}% there. Counted from your transfers since you set it.</div>
            )}
            <div className="cd-pg-actions"><span onClick={() => { setGName(goal.name); setGTarget(goal.target); setEditing(true); }}>Edit</span> · <span onClick={clear}>Remove</span></div>
          </>
        ) : editing || !goal ? (
          <>
            <div className="cd-card2-h"><span>🎯 Sending goal</span></div>
            {!editing && <div className="cd-card2-sub" style={{ marginTop: 6 }}>Saving toward something — a quinceañera, Mamá's new roof, school fees back home? Set a target and watch your transfers fill it.</div>}
            {editing || !goal ? (
              !editing && !goal ? (
                <button className="cd-pg-setbtn" onClick={() => setEditing(true)}>Set a goal</button>
              ) : (
                <div className="cd-pg-form">
                  <input className="cd-input" placeholder="Goal name — e.g. Quinceañera fund" value={gName} onChange={e => setGName(e.target.value)} />
                  <input className="cd-input" type="number" placeholder={`Target amount (${profile.currency})`} value={gTarget} onChange={e => setGTarget(e.target.value)} />
                  <div className="cd-pg-formrow">
                    <button className="cd-pg-save" onClick={save}>Save goal</button>
                    <button className="cd-pg-cancel" onClick={() => { setEditing(false); if (!goal) { setGName(""); setGTarget(""); } }}>Cancel</button>
                  </div>
                </div>
              )
            ) : null}
          </>
        ) : null}
      </div>

      <div className="cd-card2">
        <div className="cd-card2-h"><span>Milestones</span><span className="cd-card2-v">{badges.filter(b => b.earned).length} / {badges.length}</span></div>
        <div className="cd-pg-badges">
          {badges.map(b => (
            <div key={b.id} className={`cd-pg-badge ${b.earned ? "on" : ""}`}><span className="cd-pg-bicon">{b.icon}</span><span className="cd-pg-blbl">{b.label}</span></div>
          ))}
        </div>
      </div>
    </>
  );
}

function SendTab({ profile, recipients, setRecipients, setHistory, history, addRecipient, addTransfer, goActivity, goPeople, goProfile }) {
  const [mode, setMode] = useState("home");
  const [initRcp, setInitRcp] = useState(null);
  const [initFrom, setInitFrom] = useState(null);
  const home = () => { setMode("home"); setInitRcp(null); setInitFrom(null); };
  const startFresh = () => { setInitRcp(null); setInitFrom(null); setMode("flow"); };
  const quickSend = (r) => { setInitRcp(r); setInitFrom(countryToSource(profile.country)); setMode("flow"); };
  if (mode === "home")
    return <Home profile={profile} recipients={recipients} history={history} onSend={startFresh} onQuick={quickSend} goActivity={goActivity} goPeople={goPeople} goProfile={goProfile} />;
  return <SendFlow key={initRcp ? "q" + initRcp.id : "fresh"} profile={profile} recipients={recipients} setRecipients={setRecipients} setHistory={setHistory} addRecipient={addRecipient} addTransfer={addTransfer} goActivity={goActivity} initialRecipient={initRcp} initialFrom={initFrom} onExit={home} />;
}

function Home({ profile, recipients, history, onSend, onQuick, goActivity, goPeople, goProfile }) {
  const usedAUD = history.reduce((s, h) => s + toBase(h.amount, h.from, profile.currency), 0);
  const pct = Math.min(100, (usedAUD / profile.limitMax) * 100);
  return (
    <div className="cd-home">
      <div className="cd-greet">{greeting()}, {profile.name.split(" ")[0]}</div>
      <div className="cd-greet-sub">Where's your money going today?</div>

      <button className="cd-bigsend" onClick={onSend}>
        <span className="cd-bigsend-ic"><ArrowRight size={20} color={C.amber} strokeWidth={2.6} /></span>
        <span className="cd-bigsend-txt"><span className="cd-bigsend-h">Send money</span><span className="cd-bigsend-s">Compare every provider in one tap</span></span>
        <ChevronRight size={20} color="rgba(255,255,255,.8)" />
      </button>

      <div className="cd-limit-mini">
        <div className="cd-lm-row"><span>Sent this month</span><span className="cd-lm-v">{profile.currency} {fmt(usedAUD, profile.currency)} / {fmt(profile.limitMax, profile.currency)}</span></div>
        <div className="cd-bar"><div className="cd-bar-fill" style={{ width: pct + "%" }} /></div>
      </div>

      <RateWatch recipients={recipients} />

      <ProgressStrip history={history} goToProfile={goProfile} />

      <div className="cd-home-sec">
        <div className="cd-home-sec-h"><span>Quick send</span><button className="cd-seeall" onClick={goPeople}>Manage</button></div>
        <div className="cd-quickrow">
          {recipients.slice(0, 6).map(r => (
            <button key={r.id} className="cd-quick" onClick={() => onQuick(r)}>
              <span className="cd-quick-ava">{r.flag}</span>
              <span className="cd-quick-name">{r.name.split(" ")[0]}</span>
            </button>
          ))}
          <button className="cd-quick" onClick={goPeople}>
            <span className="cd-quick-ava add"><Plus size={20} color={C.teal} /></span>
            <span className="cd-quick-name">New</span>
          </button>
        </div>
      </div>

      <div className="cd-home-sec">
        <div className="cd-home-sec-h"><span>Recent activity</span>{history.length > 0 && <button className="cd-seeall" onClick={goActivity}>See all</button>}</div>
        {history.length === 0 ? (
          <div className="cd-home-empty">No transfers yet — your first send will show up here.</div>
        ) : (
          <div className="cd-list">
            {history.slice(0, 3).map(h => (
              <div key={h.id} className="cd-hrow">
                <span className="cd-prov-badge" style={{ background: h.provider.color, color: h.provider.textColor || "#fff" }}>{h.provider.initials}</span>
                <div className="cd-rmain"><div className="cd-rname">{h.recipientName} <span className="cd-hflag">{h.flag}</span></div><div className="cd-rsub">{h.provider.name} · {h.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div></div>
                <div className="cd-hamt"><div className="cd-hsent">{h.from} {fmt(h.amount, h.from)}</div><span className={`cd-status ${h.status === "In progress" ? "prog" : ""}`}>{h.status || "Delivered"}</span></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================== SEND FLOW ============================== */
function SendFlow({ profile, recipients, setRecipients, setHistory, addRecipient, addTransfer, goActivity, initialRecipient = null, initialFrom = null, onExit }) {
  const quick = !!(initialRecipient && initialFrom);
  const [step, setStep] = useState(quick ? "amount" : "from");
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialRecipient ? { country: initialRecipient.country, cur: initialRecipient.cur, flag: initialRecipient.flag } : null);
  const [method, setMethod] = useState(initialRecipient ? initialRecipient.method : null);
  const [token, setToken] = useState(initialRecipient?.token || "USDC");
  const [rcpName, setRcpName] = useState(initialRecipient ? initialRecipient.name : "");
  const [rcpDetail, setRcpDetail] = useState(initialRecipient ? initialRecipient.detail : "");
  const [savedRcp, setSavedRcp] = useState(initialRecipient);
  const [saveNew, setSaveNew] = useState(true);
  const [amount, setAmount] = useState(0);
  const [custom, setCustom] = useState("");
  const [chosen, setChosen] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [funding, setFunding] = useState("payid");
  const [log, setLog] = useState(quick
    ? [{ who: "agent", text: `Sending to ${initialRecipient.name} from ${initialFrom.label}. How much would you like to send? (in ${initialFrom.code})` }]
    : [{ who: "agent", text: `Hi ${profile.name.split(" ")[0]}, I'm Conduit. I'll find the cheapest, fastest way to send your money — and send it. Where are you sending from?` }]);
  const scrollRef = useRef(null);
  const resultsRef = useRef(null);
  const confirmRef = useRef(null);
  const doneRef = useRef(null);
  const [showCustom, setShowCustom] = useState(false);
  const [cName, setCName] = useState(""); const [cCur, setCCur] = useState("PKR");

  const [hist, setHist] = useState([]);
  const push = (who, text) => setLog(l => [...l, { who, text }]);
  // Record where we are (and how long the chat is) before moving forward,
  // so Back can return to this exact point and remove the bubbles added since.
  const remember = () => setHist(h => [...h, { step, logLen: log.length }]);
  function back() {
    if (!hist.length) return;
    const prev = hist[hist.length - 1];
    setHist(h => h.slice(0, -1));
    setLog(l => l.slice(0, prev.logLen));
    setStep(prev.step);
    setShowCustom(false);
  }
  useEffect(() => {
    const t = setTimeout(() => {
      if (step === "results" && resultsRef.current) {
        // Bring the price options to the top of the view — front and centre.
        resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (step === "confirm" && confirmRef.current) {
        // They've picked a provider — take them DOWN to the summary + payment options.
        confirmRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (step === "done" && doneRef.current) {
        doneRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }, 60);
    return () => clearTimeout(t);
  }, [log, step]);
  const destCur = method === "Wallet" ? token : (to ? to.cur : "USD");

  function pickFrom(s) {
    remember();
    setFrom(s); push("user", `${s.flag} ${s.label}`);
    if (recipients.length) { push("agent", "Who are you sending to?"); setStep("recipientPick"); }
    else { push("agent", "Which country is the money going to?"); setStep("to"); }
  }
  function pickSaved(r) {
    remember();
    setSavedRcp(r); setTo({ country: r.country, cur: r.cur, flag: r.flag }); setMethod(r.method);
    setRcpName(r.name); setRcpDetail(r.detail); if (r.method === "Wallet") setToken(r.token || "USDC");
    push("user", `${r.flag} ${r.name}`); push("agent", `How much would you like to send to ${r.name}? (in ${from.code})`); setStep("amount");
  }
  function pickTo(d) { remember(); setTo(d); push("user", `${d.flag} ${d.country}`); push("agent", "How should they receive it?"); setStep("method"); }
  function submitCustom() { if (!cName.trim()) return; setShowCustom(false); pickTo({ country: cName.trim(), cur: cCur, flag: "🌐", custom: true }); }
  function pickMethod(m) {
    remember();
    setMethod(m); push("user", METHOD_LABEL[m]);
    if (savedRcp) { push("agent", `How much? (in ${from.code})`); setStep("amount"); return; }
    push("agent", m === "Wallet" ? "Recipient's name and wallet address?" : m === "Cash" ? "Recipient's name and mobile for pickup?" : "Recipient's name and account number?");
    setStep("details");
  }
  function submitDetails() {
    if (!rcpName.trim() || !rcpDetail.trim()) return;
    if (validateDetail(method, token, rcpDetail).level === "error") return;
    remember();
    push("user", `${rcpName} · ${method === "Wallet" ? token + " " + shortDetail(rcpDetail) : shortDetail(rcpDetail)}`);
    push("agent", `How much would you like to send? (in ${from.code})`); setStep("amount");
  }
  async function submitAmount(val) {
    const a = parseFloat(val); if (!a || a <= 0) return;
    remember();
    setAmount(a); push("user", `${from.code} ${fmt(a, from.code)}`); setStep("thinking");
    push("agent", "Checking every provider for this route…");
    try {
      const dc = method === "Wallet" ? token : to.cur;
      const { quotes: qs } = await compareQuotes({ fromCur: from.code, toCur: to.cur, amount: a, method, token });
      if (!qs || !qs.length) throw new Error("No providers available for this route.");
      setQuotes(qs); setStep("results");
      const best = qs[0]; const fastest = [...qs].sort((x, y) => x.p.mins - y.p.mins)[0];
      push("agent", `Best value is ${best.p.name} — they receive ${dc} ${fmt(best.received, dc)} for a total cost of ${from.code} ${fmt(best.totalCost, from.code)}. ${fastest.p.id !== best.p.id ? `${fastest.p.name} is fastest (${fastest.p.speed}).` : "It's also the fastest."} Pick one to send.`);
    } catch (err) {
      setStep("amount");
      push("agent", `I couldn't reach the pricing service — ${String(err.message || err)}. Make sure the Conduit API is running, then try again.`);
    }
  }
  function confirmSend() {
    const dc = method === "Wallet" ? token : to.cur;
    const rec = { id: "h" + Date.now(), date: new Date(), provider: chosen.p, from: from.code, amount, destCur: dc, received: chosen.received, country: to.country, flag: to.flag, method, status: "In progress", recipientName: rcpName || "Recipient", ref: "CDT-" + Math.random().toString(36).slice(2, 8).toUpperCase() };
    addTransfer(rec);
    if (chosen.p.url) window.open(chosen.p.url, "_blank", "noopener,noreferrer");
    if (!savedRcp && saveNew && rcpName.trim()) addRecipient({ id: "r" + Date.now(), name: rcpName.trim(), country: to.country, cur: to.cur, flag: to.flag, method, detail: rcpDetail, token: method === "Wallet" ? token : undefined });
    setChosen(c => ({ ...c, ref: rec.ref })); setStep("done");
  }
  function reset() {
    setHist([]);
    setStep("from"); setFrom(null); setTo(null); setMethod(null); setSavedRcp(null); setRcpName(""); setRcpDetail(""); setAmount(0); setCustom(""); setChosen(null); setQuotes([]); setSaveNew(true); setFunding("payid");
    setLog([{ who: "agent", text: "New transfer. Where are you sending from?" }]);
  }

  const presets = from ? ({ AUD: [200, 500, 1000], GBP: [150, 400, 800], USD: [200, 500, 1000], CAD: [200, 600, 1200], EUR: [150, 400, 900] }[from.code] || [200, 500, 1000]) : [];
  const bestId = quotes[0]?.p.id;
  const fastestId = quotes.length ? [...quotes].sort((x, y) => x.p.mins - y.p.mins)[0].p.id : null;
  const fund = FUNDING.find(f => f.id === funding);
  const payInFee = chosen ? amount * fund.feePct : 0;
  const grandTotal = chosen ? chosen.totalCost + payInFee : 0;

  return (
    <div className="cd-flow">
      {step !== "done" && (
        <div className="cd-flowtop">
          <div style={{ display: "flex", gap: 8 }}>
            <button className="cd-flowback" onClick={onExit}><ChevronLeft size={16} /> Home</button>
            {hist.length > 0 && step !== "thinking" && step !== "confirm" && (
              <button className="cd-flowback" onClick={back}><ChevronLeft size={16} /> Back</button>
            )}
          </div>
          {step !== "from" && <button className="cd-reset" onClick={reset}><RotateCcw size={13} /> Start over</button>}
        </div>
      )}

      {step !== "done" && (
        <div className="cd-chat" ref={scrollRef}>
          {log.map((m, i) => (
            <div key={i} className={`cd-bubble ${m.who}`}>
              {m.who === "agent" && <div className="cd-ava"><Sparkles size={13} color="#fff" /></div>}
              <div className="cd-bub-txt">{m.text}</div>
            </div>
          ))}
          {step === "thinking" && (<div className="cd-bubble agent"><div className="cd-ava"><Sparkles size={13} color="#fff" /></div><div className="cd-bub-txt"><span className="cd-dots"><i /><i /><i /></span></div></div>)}
        </div>
      )}

      {step === "from" && (
        <div className="cd-panel">
          {SOURCES.map(s => (<button key={s.code} className="cd-opt" onClick={() => pickFrom(s)}><span className="cd-flag">{s.flag}</span><span className="cd-opt-main">{s.label}</span><span className="cd-opt-sub">{s.code}</span></button>))}
        </div>
      )}

      {step === "recipientPick" && (
        <div className="cd-panel">
          {recipients.map(r => (<button key={r.id} className="cd-opt" onClick={() => pickSaved(r)}><span className="cd-flag">{r.flag}</span><span className="cd-opt-main">{r.name}<em className="cd-opt-em">{r.country} · {METHOD_LABEL[r.method]}</em></span><ChevronRight size={16} color={C.muted} /></button>))}
          <button className="cd-opt" onClick={() => { remember(); push("user", "Someone new"); push("agent", "Which country is the money going to?"); setStep("to"); }}>
            <span className="cd-newicon"><UserPlus size={16} color="#fff" /></span><span className="cd-opt-main">Send to someone new</span><ChevronRight size={16} color={C.muted} />
          </button>
        </div>
      )}

      {step === "to" && (
        <div className="cd-panel">
          {!showCustom ? (
            <>
              <div className="cd-grid">{DESTS.map(d => (<button key={d.country} className="cd-chip" onClick={() => pickTo(d)}><span className="cd-flag">{d.flag}</span>{d.country}</button>))}</div>
              <button className="cd-custombtn" onClick={() => setShowCustom(true)}><Globe size={15} /> Other country…</button>
            </>
          ) : (
            <div className="cd-form">
              <label className="cd-fl">Country</label><input className="cd-input" placeholder="e.g. Sri Lanka" value={cName} onChange={e => setCName(e.target.value)} />
              <label className="cd-fl">Currency they receive</label>
              <select className="cd-input" value={cCur} onChange={e => setCCur(e.target.value)}>{CUR_LIST.map(c => <option key={c} value={c}>{c}</option>)}</select>
              <div className="cd-formrow"><button className="cd-ghost" onClick={() => setShowCustom(false)}>Cancel</button><button className="cd-primary" onClick={submitCustom} disabled={!cName.trim()}>Continue</button></div>
            </div>
          )}
        </div>
      )}

      {step === "method" && (
        <div className="cd-panel">
          {["Bank", "Wallet", "Cash"].map(m => { const Ic = METHOD_ICON[m]; return (
            <button key={m} className="cd-opt" onClick={() => pickMethod(m)}>
              <span className="cd-methodicon"><Ic size={17} color="#fff" /></span>
              <span className="cd-opt-main">{METHOD_LABEL[m]}<em className="cd-opt-em">{m === "Wallet" ? "USDC / USDT · ~10 min" : m === "Cash" ? "500k+ agents · minutes" : "Local bank · same day"}</em></span>
              <ChevronRight size={16} color={C.muted} />
            </button>); })}
        </div>
      )}

      {step === "details" && (
        <div className="cd-panel"><div className="cd-form">
          <label className="cd-fl">Recipient name</label><input className="cd-input" placeholder="Full name" value={rcpName} onChange={e => setRcpName(e.target.value)} />
          {method === "Wallet" && (<><label className="cd-fl">Token</label><div className="cd-toggle">{["USDC", "USDT"].map(t => <button key={t} className={`cd-tog ${token === t ? "on" : ""}`} onClick={() => setToken(t)}>{t}</button>)}</div></>)}
          <label className="cd-fl">{method === "Wallet" ? "Wallet address" : method === "Cash" ? "Mobile number" : "Account / IBAN"}</label>
          <input className={`cd-input ${rcpDetail.trim() ? `dv-${validateDetail(method, token, rcpDetail).level}` : ""}`} placeholder={method === "Wallet" ? "0x… or wallet ID" : method === "Cash" ? "+00 000 000 000" : "Account number or IBAN"} value={rcpDetail} onChange={e => setRcpDetail(e.target.value)} />
          {(() => { const dv = validateDetail(method, token, rcpDetail); return dv.level !== "idle" && <div className={`cd-valmsg ${dv.level}`}>{dv.level === "ok" ? <Check size={13} /> : dv.level === "warn" ? <Clock size={13} /> : <X size={13} />} {dv.msg}</div>; })()}
          <label className="cd-check2"><input type="checkbox" checked={saveNew} onChange={e => setSaveNew(e.target.checked)} /> Save to my recipients</label>
          <button className="cd-primary full" onClick={submitDetails} disabled={!rcpName.trim() || !rcpDetail.trim() || validateDetail(method, token, rcpDetail).level === "error"}>Continue</button>
        </div></div>
      )}

      {step === "amount" && (
        <div className="cd-panel">
          <div className="cd-presets">{presets.map(p => <button key={p} className="cd-preset" onClick={() => submitAmount(p)}>{from.code} {p}</button>)}</div>
          <div className="cd-amtrow"><span className="cd-amtcur">{from.code}</span>
            <input className="cd-amtinput" inputMode="decimal" placeholder="Enter amount" value={custom} onChange={e => setCustom(e.target.value.replace(/[^0-9.]/g, ""))} onKeyDown={e => { if (e.key === "Enter") submitAmount(custom); }} />
            <button className="cd-amtgo" onClick={() => submitAmount(custom)} disabled={!custom}><ArrowRight size={18} /></button>
          </div>
        </div>
      )}

      {step === "results" && (() => {
        const best = quotes[0]; const rest = quotes.slice(1);
        const saveVsNext = rest.length ? Math.max(0, rest[0].totalCost - best.totalCost) : 0;
        const bestFast = best.p.id === fastestId;
        return (
          <div className="cd-results" ref={resultsRef}>
            <div className="cd-rec-lbl"><Sparkles size={13} /> Conduit recommends</div>
            <button className="cd-hero" onClick={() => { setChosen(best); setStep("confirm"); }}>
              <div className="cd-hero-top">
                <div className="cd-prov"><span className="cd-prov-badge lg" style={{ background: best.p.color, color: best.p.textColor || "#fff" }}>{best.p.initials}</span><div><div className="cd-prov-name">{best.p.name}</div><div className="cd-prov-rail">{best.p.rail}</div></div></div>
                <div className="cd-badges">{best.live && <span className="cd-badge live">Live rate</span>}<span className="cd-badge best">Best value</span>{bestFast && <span className="cd-badge fast"><Zap size={11} /> Fastest</span>}</div>
              </div>
              <div className="cd-hero-recv"><span className="cd-recv-label">They receive</span><span className="cd-hero-amt">{destCur} {fmt(best.received, destCur)}</span></div>
              <div className="cd-hero-foot"><span className="cd-hero-meta"><Clock size={13} /> {best.p.speed}</span><span className="cd-hero-meta">Total cost {from.code} {fmt(best.totalCost, from.code)}</span></div>
              {saveVsNext > 0.01 && <div className="cd-save">You save {from.code} {fmt(saveVsNext, from.code)} vs the next option</div>}
              <div className="cd-hero-cta">Send via {best.p.name} <ArrowRight size={16} /></div>
            </button>

            {rest.length > 0 && <div className="cd-other-lbl">Other options</div>}
            {rest.map(q => { const isFast = q.p.id === fastestId; return (
              <button key={q.p.id} className="cd-rowcard" onClick={() => { setChosen(q); setStep("confirm"); }}>
                <span className="cd-prov-badge" style={{ background: q.p.color, color: q.p.textColor || "#fff" }}>{q.p.initials}</span>
                <div className="cd-rc-main"><div className="cd-rc-name">{q.p.name}{q.live && <span className="cd-badge live sm">Live</span>}{isFast && <span className="cd-badge fast sm"><Zap size={10} /> Fastest</span>}</div><div className="cd-rc-sub"><Clock size={12} /> {q.p.speed} · Cost {from.code} {fmt(q.totalCost, from.code)}</div></div>
                <div className="cd-rc-recv"><span className="cd-rc-amt">{destCur} {fmt(q.received, destCur)}</span><span className="cd-rc-lbl">they get</span></div>
              </button>); })}

            <div className="cd-foot-note"><ShieldCheck size={13} /> Free to compare · quotes are estimates unless marked live · Conduit may earn a referral fee</div>
          </div>
        );
      })()}

      {step === "confirm" && chosen && (
        <div className="cd-confirm" ref={confirmRef}>
          <button className="cd-textback" onClick={() => setStep("results")}><ChevronLeft size={16} /> Back to options</button>
          <div className="cd-sum">
            <div className="cd-sum-head"><span className="cd-prov-badge lg" style={{ background: chosen.p.color, color: chosen.p.textColor || "#fff" }}>{chosen.p.initials}</span><div><div className="cd-prov-name">{chosen.p.name}</div><div className="cd-prov-rail">{chosen.p.rail} · {chosen.p.speed}</div></div></div>
            <div className="cd-bigrecv"><div><span className="cd-lbl">You send</span><span className="cd-val">{from.code} {fmt(amount, from.code)}</span></div><ArrowRight size={18} color={C.muted} /><div className="cd-r"><span className="cd-lbl">They receive</span><span className="cd-val mint">{destCur} {fmt(chosen.received, destCur)}</span></div></div>
            <div className="cd-breakdown">
              <Row k="Mid-market rate" v={`1 ${from.code} = ${fmt(chosen.mid, destCur)} ${destCur}`} />
              <Row k={`Provider fee (${chosen.p.name})`} v={`${from.code} ${fmt(chosen.providerFee, from.code)}`} />
              <Row k="Conduit fee" v="Free" />
              {payInFee > 0 && <Row k={`Card fee (1%)`} v={`${from.code} ${fmt(payInFee, from.code)}`} />}
              <Row k="Total cost" v={`${from.code} ${fmt(grandTotal, from.code)}`} bold />
            </div>
            <div className="cd-recipient"><div className="cd-rcp-ava">{method === "Wallet" ? <Wallet size={18} color={C.teal} /> : to.flag}</div><div><div className="cd-rcp-name">{rcpName || `Recipient in ${to.country}`}</div><div className="cd-rcp-sub">{to.country} · {method === "Wallet" ? `${token} ${shortDetail(rcpDetail)}` : `${METHOD_LABEL[method]}${rcpDetail ? " · " + shortDetail(rcpDetail) : ""}`}</div></div></div>
          </div>

          <div className="cd-paywith">
            <div className="cd-pw-title">What happens next</div>
            <div className="cd-ho-step"><span className="cd-ho-n">1</span> You finish this transfer on {chosen.p.name}'s site — it opens in a new tab.</div>
            <div className="cd-ho-step"><span className="cd-ho-n">2</span> Pay them directly. Your money never passes through Conduit.</div>
            <div className="cd-ho-step"><span className="cd-ho-n">3</span> We log it in your Activity and keep tracking your corridor's rate.</div>
          </div>

          <button className="cd-send" onClick={confirmSend}>Continue with {chosen.p.name} <ArrowRight size={17} /></button>
          <div className="cd-disc">You'll complete payment on {chosen.p.name}. Conduit may earn a referral fee — it never affects your price.</div>
        </div>
      )}

      {step === "done" && chosen && (
        <div className="cd-done" ref={doneRef}>
          <div className="cd-checkc"><Logo size={56} /><span className="cd-checkc-tick"><Check size={16} color="#fff" strokeWidth={4} /></span></div>
          <div className="cd-done-h">Over to {chosen.p.name}</div>
          <div className="cd-done-amt">{destCur} {fmt(chosen.received, destCur)} to {rcpName || to.country}</div>
          <div className="cd-track">
            <Stage done label="Compared on Conduit" sub="Best deal found" />
            <Stage label={`Complete on ${chosen.p.name}`} sub={`Their tab is open · ${chosen.p.speed}`} active />
            <Stage label={`${rcpName || "They"} receive the money`} sub="Track it in your Activity" />
          </div>
          <div className="cd-ref">Reference {chosen.ref}</div>
          <div className="cd-doneactions"><button className="cd-new" onClick={onExit}>Done</button><button className="cd-ghost2" onClick={reset}>Send another</button></div>
        </div>
      )}
    </div>
  );
}

/* ============================== PEOPLE ============================== */
function People({ recipients, setRecipients, addRecipient, removeRecipient }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState(""); const [picked, setPicked] = useState(DESTS[0]);
  const [method, setMethod] = useState("Bank"); const [token, setToken] = useState("USDC");
  const [detail, setDetail] = useState(""); const [customMode, setCustomMode] = useState(false);
  const [cName, setCName] = useState(""); const [cCur, setCCur] = useState("PKR");

  function save() {
    if (!name.trim() || !detail.trim()) return;
    const dest = customMode ? { country: cName.trim(), cur: cCur, flag: "🌐" } : picked;
    if (customMode && !cName.trim()) return;
    addRecipient({ id: "r" + Date.now(), name: name.trim(), country: dest.country, cur: dest.cur, flag: dest.flag, method, detail, token: method === "Wallet" ? token : undefined });
    setAdding(false); setName(""); setDetail(""); setMethod("Bank"); setCustomMode(false); setCName("");
  }

  return (
    <div className="cd-screen">
      <div className="cd-sc-head"><h2>Recipients</h2>{!adding && <button className="cd-addbtn" onClick={() => setAdding(true)}><Plus size={16} /> Add</button>}</div>
      {adding ? (
        <div className="cd-form card">
          <label className="cd-fl">Name</label><input className="cd-input" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} />
          <label className="cd-fl">Destination</label>
          {!customMode ? (<><select className="cd-input" value={picked.country} onChange={e => setPicked(DESTS.find(d => d.country === e.target.value))}>{DESTS.map(d => <option key={d.country} value={d.country}>{d.flag} {d.country}</option>)}</select><button className="cd-link" onClick={() => setCustomMode(true)}>+ Other country</button></>)
            : (<div className="cd-cc"><input className="cd-input" placeholder="Country name" value={cName} onChange={e => setCName(e.target.value)} /><select className="cd-input" value={cCur} onChange={e => setCCur(e.target.value)}>{CUR_LIST.map(c => <option key={c} value={c}>{c}</option>)}</select><button className="cd-link" onClick={() => setCustomMode(false)}>Use listed country</button></div>)}
          <label className="cd-fl">Receive by</label>
          <div className="cd-toggle three">{["Bank", "Wallet", "Cash"].map(m => <button key={m} className={`cd-tog ${method === m ? "on" : ""}`} onClick={() => setMethod(m)}>{METHOD_LABEL[m].split(" ")[0]}</button>)}</div>
          {method === "Wallet" && <div className="cd-toggle">{["USDC", "USDT"].map(t => <button key={t} className={`cd-tog ${token === t ? "on" : ""}`} onClick={() => setToken(t)}>{t}</button>)}</div>}
          <label className="cd-fl">{method === "Wallet" ? "Wallet address" : method === "Cash" ? "Mobile number" : "Account / IBAN"}</label>
          <input className={`cd-input ${detail.trim() ? `dv-${validateDetail(method, token, detail).level}` : ""}`} placeholder={method === "Wallet" ? "0x… or wallet ID" : method === "Cash" ? "+00 000 000 000" : "Account number or IBAN"} value={detail} onChange={e => setDetail(e.target.value)} />
          {(() => { const dv = validateDetail(method, token, detail); return dv.level !== "idle" && <div className={`cd-valmsg ${dv.level}`}>{dv.level === "ok" ? <Check size={13} /> : dv.level === "warn" ? <Clock size={13} /> : <X size={13} />} {dv.msg}</div>; })()}
          <div className="cd-formrow"><button className="cd-ghost" onClick={() => setAdding(false)}>Cancel</button><button className="cd-primary" onClick={save} disabled={!name.trim() || !detail.trim() || (customMode && !cName.trim()) || validateDetail(method, token, detail).level === "error"}>Save recipient</button></div>
        </div>
      ) : recipients.length === 0 ? (<Empty icon={Users} title="No recipients yet" sub="Add someone to send money in two taps." action="Add recipient" onAction={() => setAdding(true)} />)
        : (<div className="cd-list">{recipients.map(r => { const Ic = METHOD_ICON[r.method]; return (
          <div key={r.id} className="cd-rrow"><span className="cd-flag big">{r.flag}</span><div className="cd-rmain"><div className="cd-rname">{r.name}</div><div className="cd-rsub"><Ic size={12} /> {r.country} · {r.method === "Wallet" ? `${r.token || "USDC"} ${shortDetail(r.detail)}` : shortDetail(r.detail)}</div></div><button className="cd-del" onClick={() => removeRecipient(r.id)}><Trash2 size={15} /></button></div>); })}</div>)}
    </div>
  );
}

/* ============================== ACTIVITY ============================== */
function ActivityRow({ h, updateTransfer, removeTransfer }) {
  const [open, setOpen] = useState(false);
  const pending = h.status === "In progress";
  return (
    <div className={`cd-hcell ${pending ? "pend" : ""}`}>
      <button className="cd-hrow tap" onClick={() => pending && setOpen(o => !o)} style={{ cursor: pending ? "pointer" : "default" }}>
        <span className="cd-prov-badge" style={{ background: h.provider.color, color: h.provider.textColor || "#fff" }}>{h.provider.initials}</span>
        <div className="cd-rmain"><div className="cd-rname">{h.recipientName} <span className="cd-hflag">{h.flag}</span></div><div className="cd-rsub">{h.provider.name} · {h.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, {h.date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div></div>
        <div className="cd-hamt"><div className="cd-hsent">{h.from} {fmt(h.amount, h.from)}</div><div className="cd-hrecv">→ {h.destCur} {fmt(h.received, h.destCur)}</div><span className={`cd-status ${pending ? "prog" : "done"}`}>{h.status || "Delivered"}</span></div>
      </button>
      {pending && open && (
        <div className="cd-hconfirm">
          <div className="cd-hc-q">Did you finish this transfer on {h.provider.name}?</div>
          <div className="cd-hc-btns">
            <button className="cd-hc-yes" onClick={() => { updateTransfer(h.id, "Delivered"); setOpen(false); }}><Check size={14} /> Yes, it's done</button>
            <button className="cd-hc-no" onClick={() => { removeTransfer(h.id); }}>Didn't go through</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Activity({ history, startSend, updateTransfer, removeTransfer }) {
  const pendingCount = history.filter(h => h.status === "In progress").length;
  return (
    <div className="cd-screen">
      <div className="cd-sc-head"><h2>Activity</h2></div>
      {pendingCount > 0 && <div className="cd-hpend-note"><Clock size={13} /> Tap an in-progress transfer to confirm once you've finished it on the provider's site.</div>}
      {history.length === 0 ? (<Empty icon={History} title="No transfers yet" sub="Your sent transfers will appear here." action="Send money" onAction={startSend} />)
        : (<div className="cd-list">{history.map(h => (
          <ActivityRow key={h.id} h={h} updateTransfer={updateTransfer} removeTransfer={removeTransfer} />))}</div>)}
    </div>
  );
}

/* ============================== PROFILE ============================== */
function Profile({ profile, history, onSignOut, onLegal }) {
  const usedAUD = history.reduce((s, h) => s + toBase(h.amount, h.from, profile.currency), 0);
  const pct = Math.min(100, (usedAUD / profile.limitMax) * 100);
  return (
    <div className="cd-screen">
      <div className="cd-prof-top">
        <div className="cd-prof-ava">{profile.initials}</div>
        <div className="cd-prof-name">{profile.name}</div>
        <div className="cd-prof-email">{profile.email}</div>
        <div className="cd-prof-verified"><BadgeCheck size={14} /> {profile.tier} · {profile.status}</div>
      </div>

      <div className="cd-card2">
        <div className="cd-card2-h"><span>Monthly sending limit</span><span className="cd-card2-v">{profile.currency} {fmt(usedAUD, profile.currency)} / {fmt(profile.limitMax, profile.currency)}</span></div>
        <div className="cd-bar"><div className="cd-bar-fill" style={{ width: pct + "%" }} /></div>
        <div className="cd-card2-sub">Raise your limit with extra verification (proof of income).</div>
      </div>

      <ProgressSection history={history} profile={profile} />

      <div className="cd-sec-lbl">Funding methods</div>
      <div className="cd-list">
        <FundRow icon={Landmark} label="PayID / Bank transfer" sub="Linked · free" />
        <FundRow icon={CreditCard} label="Visa debit •••• 4242" sub="Expires 09/28" />
        <button className="cd-addfund"><Plus size={16} /> Add funding method</button>
      </div>

      <div className="cd-sec-lbl">Settings</div>
      <div className="cd-list">
        <SetRow icon={ShieldCheck} label="Identity & verification" value="Verified" />
        <SetRow icon={Bell} label="Notifications" />
        <SetRow icon={Lock} label="Security & PIN" />
        <div className="cd-prof-legal"><span onClick={() => onLegal("terms")}>Terms of Service</span><span className="cd-pl-dot">·</span><span onClick={() => onLegal("privacy")}>Privacy Policy</span></div>
        <button className="cd-signout" onClick={onSignOut}><LogOut size={16} /> Sign out</button>
      </div>
    </div>
  );
}
function FundRow({ icon: Icon, label, sub }) {
  return (<div className="cd-rrow"><span className="cd-fund-ic"><Icon size={17} color={C.teal} /></span><div className="cd-rmain"><div className="cd-rname">{label}</div><div className="cd-rsub">{sub}</div></div></div>);
}
function SetRow({ icon: Icon, label, value }) {
  return (<div className="cd-rrow"><span className="cd-fund-ic"><Icon size={17} color={C.teal} /></span><div className="cd-rmain"><div className="cd-rname">{label}</div></div>{value && <span className="cd-setval">{value}</span>}<ChevronRight size={16} color={C.muted} /></div>);
}

function Empty({ icon: Icon, title, sub, action, onAction }) {
  return (<div className="cd-empty"><div className="cd-empty-ic"><Icon size={26} color={C.teal} /></div><div className="cd-empty-t">{title}</div><div className="cd-empty-s">{sub}</div><button className="cd-primary" onClick={onAction}>{action}</button></div>);
}
function Row({ k, v, bold }) { return <div className={`cd-brow ${bold ? "bold" : ""}`}><span>{k}</span><span>{v}</span></div>; }
function Stage({ done, label, sub, active }) {
  return (<div className={`cd-stage ${done ? "done" : ""} ${active ? "active" : ""}`}><div className="cd-stage-dot">{done ? <Check size={12} color="#fff" strokeWidth={3} /> : null}</div><div><div className="cd-stage-lbl">{label}</div><div className="cd-stage-sub">{sub}</div></div></div>);
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
.cd-root{font-family:'Inter',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;display:flex;flex-direction:column;align-items:center;min-height:100%;padding:26px 14px 32px;box-sizing:border-box;background:radial-gradient(120% 90% at 50% -10%, #0e2a32 0%, #0B2027 55%, #081317 100%);}
.cd-frame{width:100%;max-width:412px;background:#fff;border-radius:34px;overflow:hidden;display:flex;flex-direction:column;height:772px;max-height:91vh;box-shadow:0 46px 90px -24px rgba(6,16,20,.6),0 0 0 1px rgba(255,255,255,.06);}
.cd-head{background:linear-gradient(150deg,#0d2731 0%,${C.ink} 60%,#091a20 100%);padding:15px 18px 13px;display:flex;align-items:center;justify-content:space-between;box-shadow:inset 0 -1px 0 rgba(255,255,255,.05);}
.cd-brandrow{display:flex;align-items:center;gap:16px;}
.cd-logo{width:36px;height:36px;border-radius:11px;background:linear-gradient(135deg,${C.teal},${C.sea});display:flex;align-items:center;justify-content:center;}
.cd-logomark{display:flex;align-items:center;}
.cd-logomark.big{margin-bottom:16px;}
.cd-logo.big{width:54px;height:54px;border-radius:16px;}
.cd-word{color:#fff;font-weight:800;font-size:18px;letter-spacing:-.3px;line-height:1;}
.cd-tag{color:${C.mint};font-size:10.5px;font-weight:500;margin-top:4px;}
.cd-headava{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,${C.sea},${C.mint});color:#04332a;font-weight:800;font-size:12.5px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px rgba(255,255,255,.16),0 4px 12px rgba(0,0,0,.3);}
.cd-body{flex:1;overflow-y:auto;background:linear-gradient(180deg,#F5F9FA 0%,#EEF4F5 100%);}
.cd-body::-webkit-scrollbar{width:0;}
.cd-nav{display:flex;background:rgba(255,255,255,.94);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-top:1px solid #edf2f3;box-shadow:0 -10px 26px rgba(11,32,39,.05);}
.cd-navbtn{flex:1;border:none;background:none;padding:10px 0 12px;display:flex;flex-direction:column;align-items:center;gap:4px;color:${C.muted};font-size:10.5px;font-weight:600;cursor:pointer;transition:.18s;letter-spacing:.2px;}
.cd-navbtn.on{color:${C.teal};font-weight:800;transform:translateY(-1px);}
/* onboarding */
.cd-onb{width:100%;max-width:412px;display:flex;flex-direction:column;align-items:center;}
.cd-onb-head{text-align:center;margin-bottom:18px;display:flex;flex-direction:column;align-items:center;}
.cd-logo.big{margin-bottom:12px;}
.cd-onb-word{color:#fff;font-weight:800;font-size:24px;letter-spacing:-.3px;}
.cd-onb-tag{color:${C.mint};font-size:12px;font-weight:500;margin-top:4px;}
.cd-onb-card{width:100%;background:#fff;border-radius:28px;padding:24px;box-sizing:border-box;box-shadow:0 34px 70px -18px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.05);min-height:430px;display:flex;flex-direction:column;}
.cd-prog{display:flex;gap:5px;margin-bottom:14px;}
.cd-prog-seg{flex:1;height:5px;border-radius:999px;background:#e6edee;transition:.25s;}
.cd-prog-seg.on{background:linear-gradient(90deg,${C.teal},${C.mint});box-shadow:0 1px 4px rgba(2,195,154,.35);}
.cd-onb-stepname{font-size:11px;font-weight:700;color:${C.muted};margin-bottom:14px;text-transform:uppercase;letter-spacing:.9px;}
.cd-onb-h{font-size:20px;font-weight:800;color:${C.ink};margin:0 0 8px;letter-spacing:-.4px;line-height:1.2;}
.cd-onb-h.center{text-align:center;}
.cd-onb-p{font-size:13px;color:${C.muted};line-height:1.55;margin:0 0 16px;}
.cd-onb-p.center{text-align:center;}
.cd-inwrap{display:flex;align-items:center;gap:9px;border:1.5px solid #e4ebec;border-radius:14px;padding:0 13px;background:#fff;transition:border-color .15s, box-shadow .15s;}
.cd-inwrap:focus-within{border-color:${C.teal};box-shadow:0 0 0 4px rgba(2,128,144,.12);}
.cd-input.bare{border:none;padding:12px 0;}
.cd-idtypes{display:flex;flex-direction:column;gap:10px;margin-bottom:14px;}
.cd-idtype{display:flex;align-items:center;gap:16px;border:1.5px solid #e4ebec;border-radius:14px;padding:14px;font-weight:600;font-size:14px;color:${C.charcoal};background:#fff;cursor:pointer;transition:.15s;}
.cd-idtype.on{border-color:${C.teal};background:#ecf7f5;color:${C.teal};background:linear-gradient(135deg,#e9f8f5,#f4fcfa);box-shadow:0 0 0 3px rgba(2,128,144,.09);}
.cd-upload{display:flex;align-items:center;justify-content:center;gap:9px;border:1.5px dashed ${C.sea};background:linear-gradient(135deg,#f4fcfa,#ffffff);border-radius:15px;padding:18px;font-weight:600;font-size:14px;color:${C.teal};cursor:pointer;width:100%;}
.cd-upload.done{border-style:solid;background:#ecf7f5;}
.cd-selfie{margin:10px auto 8px;width:130px;height:130px;border-radius:50%;box-shadow:0 0 0 8px rgba(2,195,154,.07);border:2.5px dashed ${C.sea};background:#f3fbfa;color:${C.teal};display:flex;align-items:center;justify-content:center;cursor:pointer;transition:.2s;}
.cd-selfie.done{border-style:solid;background:linear-gradient(135deg,${C.sea},${C.mint});color:#fff;}
.cd-selfie-lbl{text-align:center;font-size:13px;font-weight:600;color:${C.muted};margin-top:10px;}
.cd-review{display:flex;flex-direction:column;align-items:center;}
.cd-verified-ic{width:74px;height:74px;border-radius:50%;background:linear-gradient(135deg,${C.sea},${C.mint});display:flex;align-items:center;justify-content:center;margin-bottom:14px;box-shadow:0 12px 30px rgba(2,195,154,.4);animation:pop .5s cubic-bezier(.18,1.4,.4,1) both;}
.cd-rev-rows{width:100%;background:${C.cloud};border-radius:14px;padding:8px 16px;margin-top:12px;}
.cd-rev{display:flex;justify-content:space-between;padding:10px 0;font-size:13px;border-bottom:1px solid ${C.line};}
.cd-rev:last-child{border-bottom:none;}
.cd-rev span:first-child{color:${C.muted};}
.cd-rev span:last-child{color:${C.charcoal};font-weight:600;}
.cd-okpill{background:${C.mint};color:#04332a !important;padding:2px 10px;border-radius:20px;font-size:11px;}
.cd-onb-foot{text-align:center;font-size:12.5px;color:${C.muted};margin-top:16px;}
.cd-onb-card.welcome{justify-content:flex-start;}
.cd-vprops{display:flex;flex-direction:column;gap:15px;margin:12px 0 6px;}
.cd-vprop{display:flex;align-items:center;gap:17px;}
.cd-vprop-ic{width:42px;height:42px;border-radius:13px;background:#ecf7f5;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.cd-vprop-txt{font-weight:600;color:${C.charcoal};font-size:14px;}
.cd-trust{display:flex;align-items:center;justify-content:center;gap:7px;color:${C.muted};font-size:11px;margin-top:14px;font-weight:500;}
.cd-selfie.scanning{animation:scanpulse 1.6s ease-in-out infinite;}
@keyframes scanpulse{0%,100%{box-shadow:0 0 0 0 rgba(2,168,150,.35);}50%{box-shadow:0 0 0 12px rgba(2,168,150,0);}}
.cd-onb-foot span{color:${C.teal};font-weight:700;cursor:pointer;}
.cd-primary.full.big{margin-top:auto;padding:15px;font-size:15px;}
/* shared flow */
.cd-flow{display:flex;flex-direction:column;flex:1;padding-bottom:4px;}
.cd-reset{background:#fff;border:1px solid #e9eff0;color:${C.muted};font-size:12px;font-weight:700;display:inline-flex;align-items:center;gap:5px;cursor:pointer;padding:7px 12px;border-radius:999px;box-shadow:0 1px 2px rgba(11,32,39,.05);transition:.15s;}
.cd-reset:hover{border-color:${C.sea};color:${C.teal};}
.cd-chat{padding:16px 15px 6px;display:flex;flex-direction:column;gap:11px;}
.cd-bubble{display:flex;gap:12px;align-items:flex-end;animation:rise .32s ease both;}
.cd-bubble.user{flex-direction:row-reverse;}
.cd-ava{width:24px;height:24px;border-radius:8px;background:linear-gradient(135deg,${C.teal},${C.mint});display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.cd-bub-txt{max-width:78%;font-size:13.5px;line-height:1.5;padding:11px 14px;border-radius:18px;}
.cd-bubble.agent .cd-bub-txt{background:#fff;color:${C.charcoal};border:1px solid #eaf0f1;border-bottom-left-radius:6px;box-shadow:0 2px 10px rgba(11,32,39,.05);}
.cd-bubble.user .cd-bub-txt{background:linear-gradient(135deg,${C.teal},${C.sea});color:#fff;border-bottom-right-radius:6px;box-shadow:0 4px 14px rgba(2,128,144,.24),inset 0 1px 0 rgba(255,255,255,.14);}
.cd-dots{display:inline-flex;gap:4px;padding:2px 0;}
.cd-dots i{width:6px;height:6px;border-radius:50%;background:${C.sea};animation:blink 1.2s infinite;}
.cd-dots i:nth-child(2){animation-delay:.2s;}.cd-dots i:nth-child(3){animation-delay:.4s;}
.cd-panel{padding:10px 16px 20px;display:flex;flex-direction:column;gap:11px;}
.cd-opt{display:flex;align-items:center;gap:17px;background:#fff;border:1px solid #e9eff0;border-radius:16px;padding:13px 15px;cursor:pointer;text-align:left;transition:.15s;animation:rise .3s ease both;box-shadow:0 1px 2px rgba(11,32,39,.04),0 12px 28px -20px rgba(11,32,39,.14);}
.cd-opt:hover{border-color:${C.sea};transform:translateY(-1px);box-shadow:0 6px 16px rgba(2,128,144,.1);}
.cd-flag{font-size:20px;}.cd-flag.big{font-size:26px;}
.cd-opt-main{flex:1;font-weight:600;color:${C.charcoal};font-size:14.5px;display:flex;flex-direction:column;gap:2px;}
.cd-opt-em{font-style:normal;color:${C.muted};font-size:11.5px;font-weight:500;}
.cd-opt-sub{color:${C.muted};font-size:12px;font-weight:600;}
.cd-newicon,.cd-methodicon{width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,${C.teal},${C.sea});display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.cd-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.cd-chip{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #e9eff0;border-radius:14px;padding:13px 12px;cursor:pointer;font-weight:600;color:${C.charcoal};font-size:13.5px;transition:.15s;animation:rise .3s ease both;box-shadow:0 1px 2px rgba(11,32,39,.04);}
.cd-chip:hover{border-color:${C.sea};transform:translateY(-1px);box-shadow:0 6px 16px rgba(2,128,144,.1);}
.cd-custombtn{margin-top:4px;background:#fff;border:1px dashed ${C.sea};color:${C.teal};border-radius:13px;padding:12px;font-weight:600;font-size:13px;display:flex;align-items:center;justify-content:center;gap:7px;cursor:pointer;}
.cd-custombtn:hover{background:#ecf7f5;}
.cd-form{display:flex;flex-direction:column;gap:10px;}
.cd-valmsg{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:600;margin:-2px 2px 2px;line-height:1.3;}
.cd-addr{position:relative;}
.cd-addr-list{position:absolute;z-index:40;left:0;right:0;top:calc(100% + 4px);background:#fff;border:1px solid #e1eaec;border-radius:12px;box-shadow:0 16px 36px rgba(11,32,39,.18);overflow-y:auto;max-height:232px;}
.cd-addr-opt{display:flex;align-items:flex-start;gap:8px;width:100%;text-align:left;background:#fff;border:none;border-bottom:1px solid #f0f5f6;padding:10px 12px;cursor:pointer;font-size:12.5px;color:#1E2D33;line-height:1.35;}
.cd-addr-opt:last-child{border-bottom:none;}
.cd-addr-opt:hover{background:#f2fbfa;}
.cd-addr-hint{font-size:11.5px;color:#5C7079;margin:4px 2px;}
.cd-rw{background:linear-gradient(160deg,#0d2731,#0B2027);border-radius:20px;padding:16px;margin-top:16px;box-shadow:0 14px 32px -14px rgba(6,16,20,.5),inset 0 1px 0 rgba(255,255,255,.06);}
.cd-rw-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}
.cd-rw-lbl{display:inline-flex;align-items:center;gap:6px;color:${C.mint};font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.1px;}
.cd-rw-chips{display:flex;gap:6px;}
.cd-rw-chip{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);color:#b9ccce;font-size:11px;font-weight:700;padding:5px 10px;border-radius:999px;cursor:pointer;transition:.15s;}
.cd-rw-chip.on{background:${C.mint};border-color:${C.mint};color:#04332a;}
.cd-rw-main{display:flex;align-items:center;justify-content:space-between;gap:14px;}
.cd-rw-rate{color:#fff;font-weight:800;font-size:17px;letter-spacing:-.2px;}
.cd-rw-sub{display:flex;align-items:center;gap:9px;color:#8fa6ab;font-size:11.5px;margin-top:5px;}
.cd-rw-chg{font-weight:800;font-size:11.5px;}
.cd-rw-chg.up{color:${C.mint};}
.cd-rw-chg.down{color:#f2938c;}
.cd-rw-spark{flex-shrink:0;}
.cd-rw-alertbtn{width:100%;margin-top:13px;display:flex;align-items:center;justify-content:center;gap:7px;background:rgba(255,255,255,.06);border:1px dashed rgba(2,195,154,.45);color:${C.mint};font-size:12px;font-weight:700;padding:10px;border-radius:12px;cursor:pointer;transition:.15s;}
.cd-rw-alertbtn:hover{background:rgba(2,195,154,.1);}
.cd-rw-alertrow{display:flex;gap:8px;margin-top:13px;}
.cd-rw-in{flex:1;background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.15);color:#fff;}
.cd-rw-set{background:linear-gradient(135deg,${C.teal},${C.sea});border:none;color:#fff;font-weight:800;font-size:13px;padding:0 18px;border-radius:12px;cursor:pointer;}
.cd-rw-hit{margin-top:13px;display:flex;align-items:center;gap:8px;background:linear-gradient(135deg,rgba(2,195,154,.18),rgba(2,195,154,.08));border:1px solid rgba(2,195,154,.4);color:${C.mint};font-size:12.5px;font-weight:700;padding:11px 12px;border-radius:12px;}
.cd-rw-x{margin-left:auto;text-decoration:underline;cursor:pointer;font-weight:600;color:#8fa6ab;}
.cd-rw-load,.cd-rw-err{color:#8fa6ab;font-size:12.5px;display:flex;align-items:center;gap:8px;padding:6px 0;}
.cd-ld{width:100%;max-width:412px;display:flex;flex-direction:column;align-items:center;text-align:center;color:#fff;padding:10px 8px 20px;}
.cd-ld-bar{width:100%;display:flex;justify-content:space-between;align-items:center;margin-bottom:52px;}
.cd-ld-word{color:#fff;font-weight:700;font-size:17px;letter-spacing:-.2px;}
.cd-ld-login{background:none;border:none;color:#a8bcc0;font-weight:600;font-size:14px;cursor:pointer;padding:6px 2px;transition:.15s;}
.cd-ld-login:hover{color:#fff;}
.cd-ld-h1{margin:0;font-size:46px;font-weight:800;letter-spacing:-1.8px;line-height:1.06;}
.cd-ld-sub{color:#a8bcc0;font-size:16px;line-height:1.6;margin:20px 0 0;max-width:320px;font-weight:400;}
.cd-ld-cta{margin-top:32px;background:linear-gradient(135deg,${C.teal},${C.sea});border:none;color:#fff;font-weight:700;font-size:16px;padding:16px 44px;border-radius:999px;cursor:pointer;transition:.18s;box-shadow:0 14px 34px rgba(2,128,144,.4),inset 0 1px 0 rgba(255,255,255,.16);}
.cd-ld-cta:hover{transform:translateY(-1px);box-shadow:0 18px 40px rgba(2,128,144,.5),inset 0 1px 0 rgba(255,255,255,.16);}
.cd-ld-micro{color:#6d858b;font-size:12.5px;margin-top:14px;letter-spacing:.1px;}
.cd-ld-mock{width:100%;margin-top:56px;background:#fff;border-radius:22px;padding:20px;color:${C.charcoal};text-align:left;box-shadow:0 30px 60px -20px rgba(0,0,0,.6);box-sizing:border-box;}
.cd-ld-mock-line{display:flex;justify-content:space-between;align-items:baseline;padding:5px 0;}
.cd-ld-mock-line span{color:${C.muted};font-size:13px;font-weight:500;}
.cd-ld-mock-line b{font-size:15px;font-weight:700;color:${C.charcoal};letter-spacing:-.2px;}
.cd-ld-mock-line.big b{font-size:22px;font-weight:800;color:${C.ink};letter-spacing:-.5px;}
.cd-ld-mock-prov{display:flex;align-items:center;gap:12px;margin-top:14px;padding-top:14px;border-top:1px solid #eef3f4;}
.cd-ld-mock-prov .cd-prov-badge{width:28px;height:28px;font-size:11px;border-radius:8px;}
.cd-ld-mock-via{color:${C.muted};font-size:12.5px;}
.cd-ld-mock-via b{color:${C.charcoal};font-weight:700;}
.cd-ld-mock-save{margin-top:13px;color:${C.teal};font-weight:600;font-size:12.5px;text-align:center;}
.cd-ld-rate{margin-top:56px;display:flex;flex-direction:column;align-items:center;}
.cd-ld-rate-line{color:#fff;font-weight:700;font-size:19px;letter-spacing:-.3px;margin-top:12px;}
.cd-ld-rate-sub{color:#6d858b;font-size:12.5px;margin-top:6px;}
.cd-ld-up{color:${C.mint};font-weight:700;}
.cd-ld-dn{color:#f2938c;font-weight:700;}
.cd-ld-props{display:flex;flex-direction:column;gap:40px;margin-top:64px;}
.cd-ld-prop b{display:block;font-size:19px;color:#fff;letter-spacing:-.4px;font-weight:700;}
.cd-ld-prop span{display:block;color:#a8bcc0;font-size:13.5px;margin-top:7px;line-height:1.6;max-width:300px;margin-left:auto;margin-right:auto;}
.cd-ld-cta2{margin-top:64px;}
.cd-ld-foot{color:#6d858b;font-size:13px;margin-top:18px;}
.cd-ld-foot span{color:${C.mint};font-weight:600;cursor:pointer;}
.cd-ps{display:flex;align-items:center;gap:14px;width:100%;background:#fff;border:1px solid #e9eff0;border-radius:16px;padding:12px 15px;margin-top:16px;cursor:pointer;text-align:left;box-shadow:0 1px 2px rgba(11,32,39,.04),0 12px 28px -20px rgba(11,32,39,.14);transition:.15s;}
.cd-ps:hover{transform:translateY(-1px);}
.cd-ps-streak{font-size:12.5px;font-weight:800;color:${C.ink};white-space:nowrap;}
.cd-ps-streak.risk{color:#92600a;}
.cd-ps-goal{flex:1;display:flex;align-items:center;gap:10px;min-width:0;}
.cd-ps-goal-lbl{font-size:12px;font-weight:700;color:${C.muted};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:90px;}
.cd-ps-bar{flex:1;height:7px;border-radius:999px;background:#e9f0f1;overflow:hidden;}
.cd-ps-fill{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,${C.teal},${C.mint});}
.cd-ps-amt{font-size:11.5px;font-weight:800;color:${C.teal};}
.cd-pg-streakcard{display:flex;align-items:center;gap:15px;}
.cd-pg-flame{width:46px;height:46px;border-radius:14px;background:linear-gradient(135deg,#fff4e0,#fff9f1);border:1px solid #f6e3bf;display:flex;align-items:center;justify-content:center;font-size:21px;flex-shrink:0;}
.cd-pg-streaktxt b{display:block;font-size:14px;color:${C.ink};letter-spacing:-.2px;}
.cd-pg-streaktxt span{display:block;color:${C.muted};font-size:12px;margin-top:3px;line-height:1.45;}
.cd-pg-done{margin-top:11px;background:linear-gradient(135deg,#e9f8f5,#f4fcfa);border:1px solid #cdeee6;color:#0a7d52;font-weight:700;font-size:12.5px;padding:10px 12px;border-radius:11px;}
.cd-pg-actions{margin-top:11px;font-size:12px;color:${C.muted};}
.cd-pg-actions span{color:${C.teal};font-weight:700;cursor:pointer;}
.cd-pg-setbtn{width:100%;margin-top:12px;background:#fff;border:1.5px dashed ${C.sea};color:${C.teal};font-weight:700;font-size:13px;padding:12px;border-radius:13px;cursor:pointer;transition:.15s;}
.cd-pg-setbtn:hover{background:#f3fbfa;}
.cd-pg-form{display:flex;flex-direction:column;gap:10px;margin-top:12px;}
.cd-pg-formrow{display:flex;gap:9px;}
.cd-pg-save{flex:1;background:linear-gradient(135deg,${C.teal},${C.sea});border:none;color:#fff;font-weight:800;font-size:13px;padding:12px;border-radius:12px;cursor:pointer;box-shadow:0 6px 14px rgba(2,128,144,.25);}
.cd-pg-cancel{background:#fff;border:1px solid #e4ebec;color:${C.muted};font-weight:700;font-size:13px;padding:12px 16px;border-radius:12px;cursor:pointer;}
.cd-pg-badges{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:13px;}
.cd-pg-badge{display:flex;flex-direction:column;align-items:center;gap:6px;background:#f7fafb;border:1px solid #edf2f3;border-radius:13px;padding:12px 6px;opacity:.45;filter:grayscale(1);}
.cd-pg-badge.on{opacity:1;filter:none;background:linear-gradient(160deg,#f2fbf9,#ffffff);border-color:#cdeee6;box-shadow:0 6px 16px -8px rgba(2,195,154,.35);}
.cd-pg-bicon{font-size:20px;}
.cd-pg-blbl{font-size:10px;font-weight:700;color:${C.charcoal};text-align:center;letter-spacing:.1px;}
.cd-login-card{gap:2px;min-height:0;}
.cd-login-card .cd-onb-h{margin-bottom:6px;}
.cd-login-split{display:flex;align-items:center;margin:18px 0 14px;}
.cd-login-split span{flex:1;height:1px;background:#e9eff0;}
.cd-login-notice{background:linear-gradient(135deg,#fff4e0,#fff9f1);border:1px solid #f6e3bf;color:#92600a;font-weight:600;font-size:12.5px;padding:11px 13px;border-radius:12px;margin-bottom:12px;line-height:1.5;}
.cd-login-sent{display:flex;justify-content:center;margin:6px 0 12px;}
.cd-login-sent-ic{width:58px;height:58px;border-radius:50%;background:linear-gradient(135deg,#e7f7f4,#f2fbfa);border:1px solid #cdeee6;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 20px rgba(2,128,144,.12);}
.cd-ghost.full{width:100%;margin-top:8px;}
.cd-idverified{display:flex;align-items:center;gap:10px;background:#eafaf3;border:1px solid #b9ecd6;color:#0a7d52;font-weight:700;font-size:13.5px;border-radius:12px;padding:13px 14px;margin-top:4px;}
.cd-spin{width:14px;height:14px;border-radius:50%;border:2px solid rgba(2,128,144,.25);border-top-color:#028090;display:inline-block;animation:cdspin .8s linear infinite;margin-right:6px;vertical-align:-2px;}
@keyframes cdspin{to{transform:rotate(360deg);}}
.cd-valmsg.ok{color:#0a7d52;}
.cd-valmsg.warn{color:#92600a;}
.cd-valmsg.error{color:#c0322b;}
.cd-input.dv-ok{border-color:#28b487;box-shadow:0 0 0 3px rgba(2,195,154,.12);}
.cd-input.dv-warn{border-color:#e6b450;box-shadow:0 0 0 3px rgba(245,166,35,.12);}
.cd-input.dv-error{border-color:#e07a73;box-shadow:0 0 0 3px rgba(224,50,43,.1);}
.cd-form.card{background:#fff;border:1px solid ${C.line};border-radius:16px;padding:15px;margin:2px 0;}
.cd-fl{font-size:11px;font-weight:800;color:${C.muted};text-transform:uppercase;letter-spacing:.9px;}
.cd-input{border:1.5px solid #e4ebec;border-radius:14px;padding:12px 14px;font-size:14px;color:${C.charcoal};background:#fff;outline:none;transition:border-color .15s, box-shadow .15s;font-family:inherit;}
.cd-input:focus{border-color:${C.teal};box-shadow:0 0 0 4px rgba(2,128,144,.12);}
.cd-formrow{display:flex;gap:10px;margin-top:14px;}
.cd-primary{flex:1;background:linear-gradient(135deg,${C.teal} 0%,${C.sea} 72%,${C.mint} 130%);color:#fff;border:none;border-radius:13px;padding:13px;font-weight:700;font-size:14px;cursor:pointer;transition:.18s;box-shadow:0 6px 16px rgba(2,128,144,.22),inset 0 1px 0 rgba(255,255,255,.18);}
.cd-primary.full{width:100%;margin-top:10px;}
.cd-primary:disabled{opacity:.4;cursor:default;}
.cd-primary:not(:disabled):hover{transform:translateY(-1px);box-shadow:0 10px 22px rgba(2,128,144,.32),inset 0 1px 0 rgba(255,255,255,.18);}
.cd-ghost{flex:1;background:#fff;border:1px solid #e4ebec;color:${C.muted};border-radius:14px;padding:13px;font-weight:600;font-size:14px;cursor:pointer;}
.cd-ghost:hover{border-color:${C.muted};}
.cd-link{align-self:flex-start;background:none;border:none;color:${C.teal};font-weight:600;font-size:12.5px;cursor:pointer;padding:4px 0;}
.cd-cc{display:flex;flex-direction:column;gap:7px;}
.cd-toggle{display:flex;gap:8px;}
.cd-toggle.three .cd-tog{flex:1;}
.cd-tog{flex:1;background:#fff;border:1.5px solid #e4ebec;border-radius:13px;padding:10px;font-weight:700;font-size:13px;color:${C.muted};cursor:pointer;transition:.15s;}
.cd-tog.on{border-color:${C.teal};background:linear-gradient(135deg,#e9f8f5,#f4fcfa);color:${C.teal};box-shadow:0 0 0 3px rgba(2,128,144,.09);}
.cd-check2{display:flex;align-items:center;gap:8px;font-size:12.5px;color:${C.charcoal};font-weight:500;margin-top:12px;cursor:pointer;}
.cd-check2 input{width:16px;height:16px;accent-color:${C.teal};}
.cd-presets{display:flex;gap:9px;}
.cd-preset{flex:1;background:#fff;border:1px solid #e9eff0;border-radius:12px;padding:13px 4px;font-weight:700;color:${C.teal};font-size:13.5px;cursor:pointer;transition:.15s;box-shadow:0 1px 2px rgba(11,32,39,.04);}
.cd-preset:hover{border-color:${C.sea};background:#ecf7f5;}
.cd-amtrow{display:flex;align-items:center;background:#fff;border:1.5px solid ${C.teal};border-radius:16px;padding:6px 6px 6px 14px;gap:8px;box-shadow:0 0 0 4px rgba(2,128,144,.09),0 10px 26px -14px rgba(2,128,144,.25);}
.cd-amtcur{font-weight:700;color:${C.muted};font-size:14px;}
.cd-amtinput{flex:1;border:none;outline:none;font-size:17px;font-weight:700;color:${C.charcoal};padding:12px 10px;font-family:inherit;background:transparent;min-width:0;}
.cd-amtgo{width:44px;height:44px;border-radius:12px;border:none;background:linear-gradient(135deg,${C.teal},${C.sea});color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:.16s;box-shadow:0 6px 14px rgba(2,128,144,.28),inset 0 1px 0 rgba(255,255,255,.16);}
.cd-amtgo:disabled{opacity:.35;cursor:default;}
.cd-amtgo:not(:disabled):hover{background:${C.sea};}
.cd-results{padding:10px 16px 20px;display:flex;flex-direction:column;gap:11px;}
.cd-rec-lbl{display:flex;align-items:center;gap:9px;color:${C.teal};font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.1px;margin-bottom:9px;}
.cd-hero{text-align:left;background:linear-gradient(165deg,#f1fbf9 0%,#ffffff 62%);border:1px solid rgba(2,195,154,.5);border-radius:22px;padding:17px;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.7),0 14px 34px rgba(2,195,154,.16),0 2px 6px rgba(11,32,39,.05);transition:.18s;animation:rise .3s ease both;}
.cd-hero:hover{transform:translateY(-2px);box-shadow:0 16px 38px rgba(2,195,154,.26);}
.cd-hero-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;}
.cd-hero-recv{display:flex;align-items:baseline;justify-content:space-between;margin:14px 0 4px;padding-top:14px;border-top:1px dashed ${C.line};}
.cd-hero-amt{font-weight:800;color:${C.ink};font-size:24px;letter-spacing:-.5px;}
.cd-hero-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;color:${C.muted};font-size:12.5px;margin-top:9px;}
.cd-hero-meta{display:inline-flex;align-items:center;gap:5px;}
.cd-save{margin-top:14px;background:linear-gradient(135deg,#fff4e0,#fff9f1);border:1px solid #f6e3bf;color:#92600a;font-weight:700;font-size:12.5px;padding:10px 13px;border-radius:12px;display:flex;align-items:center;gap:6px;}
.cd-hero-cta{margin-top:14px;background:linear-gradient(135deg,${C.teal} 0%,${C.sea} 70%,${C.mint} 130%);color:#fff;font-weight:700;font-size:14px;border-radius:13px;padding:13px;display:flex;align-items:center;justify-content:center;gap:7px;box-shadow:0 8px 18px rgba(2,128,144,.26),inset 0 1px 0 rgba(255,255,255,.18);}
.cd-other-lbl{color:${C.muted};font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.1px;margin:16px 0 9px;}
.cd-rowcard{display:flex;align-items:center;gap:11px;text-align:left;background:#fff;border:1px solid #e9eff0;border-radius:16px;padding:12px 13px;cursor:pointer;transition:.15s;animation:rise .3s ease both;box-shadow:0 1px 2px rgba(11,32,39,.04),0 12px 28px -20px rgba(11,32,39,.14);}
.cd-rowcard:hover{border-color:${C.sea};transform:translateY(-1px);box-shadow:0 6px 16px rgba(2,128,144,.1);}
.cd-rc-main{flex:1;min-width:0;}
.cd-rc-name{font-weight:700;color:${C.charcoal};font-size:14px;display:flex;align-items:center;gap:7px;}
.cd-rc-sub{color:${C.muted};font-size:11.5px;margin-top:3px;display:flex;align-items:center;gap:5px;}
.cd-rc-recv{text-align:right;flex-shrink:0;}
.cd-rc-amt{display:block;font-weight:800;color:${C.ink};font-size:14px;}
.cd-rc-lbl{display:block;color:${C.muted};font-size:10.5px;margin-top:1px;}
.cd-badge.fast.sm{font-size:9px;padding:2px 6px;}
.cd-card{text-align:left;background:#fff;border:1px solid ${C.line};border-radius:16px;padding:14px 15px 13px;cursor:pointer;transition:.16s;animation:rise .3s ease both;}
.cd-card:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(11,32,39,.1);border-color:${C.sea};}
.cd-card.best{border:1.5px solid ${C.mint};box-shadow:0 8px 22px rgba(2,195,154,.16);}
.cd-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;}
.cd-prov{display:flex;align-items:center;gap:18px;}
.cd-prov-badge{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;flex-shrink:0;}
.cd-prov-badge.lg{width:42px;height:42px;font-size:14px;border-radius:12px;}
.cd-prov-name{font-weight:700;color:${C.charcoal};font-size:14.5px;line-height:1.1;}
.cd-prov-rail{color:${C.muted};font-size:11.5px;margin-top:2px;}
.cd-badges{display:flex;flex-direction:column;gap:4px;align-items:flex-end;}
.cd-badge{font-size:9.5px;font-weight:800;padding:4px 9px;border-radius:999px;display:inline-flex;align-items:center;gap:3px;white-space:nowrap;letter-spacing:.4px;text-transform:uppercase;}
.cd-badge.best{background:${C.mint};color:#04332a;}
.cd-badge.fast{background:#fef3c7;color:#92600a;}
.cd-badge.live{background:#e9f8f5;color:#0a7d52;border:1px solid #bfe9dc;}
.cd-badge.live.sm{margin-left:8px;font-size:8.5px;padding:2px 6px;vertical-align:2px;}
.cd-ho-step{display:flex;align-items:flex-start;gap:11px;font-size:12.5px;color:${C.charcoal};line-height:1.5;padding:7px 0;}
.cd-ho-n{width:20px;height:20px;border-radius:50%;background:linear-gradient(135deg,#e9f8f5,#f4fcfa);border:1px solid #cdeee6;color:${C.teal};font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;}
.cd-status.prog{background:linear-gradient(135deg,#f6dc9a,#fce9bd);color:#6b4a06;}
.cd-status.done{background:#e9f8f5;color:#0a7d52;}
.cd-hcell{border-radius:16px;overflow:hidden;}
.cd-hcell.pend .cd-hrow.tap{border-bottom-left-radius:0;border-bottom-right-radius:0;}
.cd-hrow.tap{width:100%;text-align:left;background:#fff;border:1px solid #e9eff0;border-radius:16px;padding:13px 14px;display:flex;align-items:center;gap:17px;box-shadow:0 1px 2px rgba(11,32,39,.04),0 12px 28px -20px rgba(11,32,39,.14);}
.cd-hcell.pend .cd-hrow.tap{border-color:#f0dcae;}
.cd-hconfirm{background:linear-gradient(180deg,#fffdf7,#fff9ee);border:1px solid #f0dcae;border-top:none;border-radius:0 0 16px 16px;padding:13px 15px;animation:rise .25s ease both;}
.cd-hc-q{font-size:13px;font-weight:700;color:#6b4a06;margin-bottom:11px;}
.cd-hc-btns{display:flex;gap:9px;}
.cd-hc-yes{flex:1;display:flex;align-items:center;justify-content:center;gap:7px;background:linear-gradient(135deg,${C.teal},${C.sea});border:none;color:#fff;font-weight:800;font-size:12.5px;padding:11px;border-radius:11px;cursor:pointer;box-shadow:0 6px 14px rgba(2,128,144,.25);}
.cd-hc-no{background:#fff;border:1px solid #eadfc4;color:#997518;font-weight:700;font-size:12.5px;padding:11px 15px;border-radius:11px;cursor:pointer;}
.cd-hc-no:hover{background:#fdf0f0;color:#c0392b;border-color:#f0cfcf;}
.cd-hpend-note{display:flex;align-items:center;gap:8px;background:#fff9ee;border:1px solid #f0dcae;color:#8a6d1a;font-size:12px;font-weight:600;padding:11px 13px;border-radius:13px;margin-bottom:14px;line-height:1.45;}
.cd-recv{display:flex;align-items:baseline;justify-content:space-between;margin:11px 0 9px;padding-top:11px;border-top:1px dashed ${C.line};}
.cd-recv-label{color:${C.muted};font-size:12px;font-weight:500;}
.cd-recv-amt{font-weight:800;color:${C.ink};font-size:17px;letter-spacing:-.3px;}
.cd-meta{display:flex;align-items:center;gap:13px;color:${C.muted};font-size:12px;font-weight:500;flex-wrap:wrap;}
.cd-meta span{display:inline-flex;align-items:center;gap:5px;}
.cd-methods{margin-left:auto;}.cd-methods i{display:inline-flex;color:${C.teal};margin-left:3px;}
.cd-foot-note{display:flex;align-items:center;gap:7px;justify-content:center;color:${C.muted};font-size:11px;margin-top:4px;padding:6px;}
.cd-confirm{padding:14px 16px 22px;display:flex;flex-direction:column;gap:14px;}
.cd-textback{background:none;border:none;color:${C.teal};font-weight:600;font-size:13px;display:inline-flex;align-items:center;gap:2px;cursor:pointer;padding:4px 0;align-self:flex-start;}
.cd-sum{background:#fff;border:1px solid #e9eff0;border-radius:18px;padding:16px;box-shadow:0 1px 2px rgba(11,32,39,.04),0 12px 28px -20px rgba(11,32,39,.14);}
.cd-sum-head{display:flex;align-items:center;gap:17px;padding-bottom:15px;border-bottom:1px solid ${C.line};}
.cd-bigrecv{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:15px 0;border-bottom:1px solid ${C.line};}
.cd-bigrecv .cd-r{text-align:right;}
.cd-lbl{display:block;color:${C.muted};font-size:11px;font-weight:500;margin-bottom:3px;}
.cd-val{font-weight:800;color:${C.ink};font-size:15.5px;}
.cd-val.mint{color:${C.teal};}
.cd-breakdown{padding:15px 0 5px;display:flex;flex-direction:column;gap:10px;}
.cd-brow{display:flex;justify-content:space-between;font-size:12.5px;color:${C.muted};gap:10px;}
.cd-brow span:last-child{color:${C.charcoal};font-weight:600;text-align:right;}
.cd-brow.bold{padding-top:9px;border-top:1px solid ${C.line};font-size:14px;}
.cd-brow.bold span{color:${C.ink};font-weight:800;}
.cd-recipient{display:flex;align-items:center;gap:16px;margin-top:16px;padding:13px;background:${C.cloud};border-radius:13px;}
.cd-rcp-ava{font-size:22px;width:30px;text-align:center;display:flex;align-items:center;justify-content:center;}
.cd-rcp-name{font-weight:700;color:${C.charcoal};font-size:13.5px;}
.cd-rcp-sub{color:${C.muted};font-size:11.5px;margin-top:1px;}
.cd-paywith{background:#fff;border:1px solid ${C.line};border-radius:16px;padding:13px 14px;}
.cd-pw-title{font-size:11px;font-weight:800;color:${C.muted};text-transform:uppercase;letter-spacing:.9px;margin-bottom:11px;}
.cd-pw{width:100%;display:flex;align-items:center;gap:16px;background:#fff;border:1.5px solid #e4ebec;border-radius:15px;padding:11px 12px;cursor:pointer;margin-bottom:8px;transition:.15s;}
.cd-pw:last-child{margin-bottom:0;}
.cd-pw.on{border-color:${C.teal};background:linear-gradient(135deg,#f2fbf9,#ffffff);box-shadow:0 0 0 3px rgba(2,128,144,.09);}
.cd-pw-ic{width:30px;height:30px;border-radius:9px;background:${C.cloud};display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.cd-pw-main{flex:1;display:flex;flex-direction:column;text-align:left;}
.cd-pw-lbl{font-weight:700;color:${C.charcoal};font-size:13.5px;}
.cd-pw-sub{color:${C.muted};font-size:11.5px;margin-top:1px;}
.cd-radio{width:20px;height:20px;border-radius:50%;border:2px solid ${C.line};display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.cd-radio.on{background:${C.teal};border-color:${C.teal};}
.cd-send{background:linear-gradient(135deg,${C.teal} 0%,${C.sea} 65%,${C.mint} 125%);color:#fff;border:none;border-radius:16px;padding:16px;font-weight:700;font-size:14.5px;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;transition:.18s;box-shadow:0 10px 22px rgba(2,128,144,.3),inset 0 1px 0 rgba(255,255,255,.16);}
.cd-send:hover{transform:translateY(-1px);box-shadow:0 12px 26px rgba(2,128,144,.36);}
.cd-disc{text-align:center;color:${C.muted};font-size:11px;margin-top:2px;}
.cd-done{padding:38px 24px 30px;display:flex;flex-direction:column;align-items:center;text-align:center;flex:1;}
.cd-checkc{position:relative;width:96px;height:96px;border-radius:50%;background:#fff;border:1px solid #e9eff0;display:flex;align-items:center;justify-content:center;margin:6px auto 22px;box-shadow:0 0 0 10px rgba(2,195,154,.08),0 0 0 20px rgba(2,195,154,.04),0 16px 34px -14px rgba(2,128,144,.3);}
.cd-checkc-tick{position:absolute;bottom:2px;right:2px;width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,${C.sea},${C.mint});border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(2,195,154,.4);}
.cd-done-h{font-weight:800;font-size:23px;color:${C.ink};margin-top:22px;letter-spacing:-.5px;}
.cd-done-amt{color:${C.muted};font-size:15px;margin-top:7px;font-weight:500;}
.cd-track{width:100%;margin:30px 0 12px;display:flex;flex-direction:column;text-align:left;}
.cd-stage{display:flex;gap:12px;padding:0 0 18px;position:relative;}
.cd-stage:not(:last-child)::before{content:"";position:absolute;left:11px;top:22px;bottom:0;width:2px;background:${C.line};}
.cd-stage.done:not(:last-child)::before{background:${C.sea};}
.cd-stage-dot{width:24px;height:24px;border-radius:50%;border:2px solid ${C.line};background:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;z-index:1;}
.cd-stage.done .cd-stage-dot{background:${C.sea};border-color:${C.sea};}
.cd-stage.active .cd-stage-dot{border-color:${C.teal};animation:pulse 1.4s infinite;}
.cd-stage-lbl{font-weight:700;color:${C.charcoal};font-size:13.5px;}
.cd-stage.done .cd-stage-lbl{color:${C.ink};}
.cd-stage-sub{color:${C.muted};font-size:11.5px;margin-top:2px;}
.cd-ref{font-size:12px;color:${C.muted};letter-spacing:.3px;background:${C.cloud};padding:9px 14px;border-radius:10px;font-weight:600;}
.cd-doneactions{display:flex;flex-direction:column;gap:10px;width:100%;margin-top:26px;}
.cd-new{background:${C.ink};color:#fff;border:none;border-radius:14px;padding:14px;font-weight:700;font-size:14px;cursor:pointer;transition:.15s;}
.cd-new:hover{background:${C.teal};}
.cd-ghost2{background:none;border:none;color:${C.teal};font-weight:600;font-size:13.5px;cursor:pointer;padding:4px;}
.cd-screen{padding:22px 18px 26px;display:flex;flex-direction:column;gap:14px;min-height:100%;box-sizing:border-box;}
.cd-sc-head{display:flex;align-items:center;justify-content:space-between;}
.cd-sc-head h2{margin:0;font-size:22px;font-weight:800;color:${C.ink};letter-spacing:-.5px;}
.cd-addbtn{background:${C.teal};color:#fff;border:none;border-radius:999px;padding:9px 14px;font-weight:700;font-size:13px;display:inline-flex;align-items:center;gap:5px;cursor:pointer;box-shadow:0 6px 14px rgba(2,128,144,.25),inset 0 1px 0 rgba(255,255,255,.16);}
.cd-addbtn:hover{background:${C.sea};}
.cd-list{display:flex;flex-direction:column;gap:10px;}
.cd-rrow,.cd-hrow{display:flex;align-items:center;gap:17px;background:#fff;border:1px solid #e9eff0;border-radius:16px;padding:13px 14px;animation:rise .3s ease both;box-shadow:0 1px 2px rgba(11,32,39,.04),0 12px 28px -20px rgba(11,32,39,.14);}
.cd-rmain{flex:1;min-width:0;}
.cd-rname{font-weight:700;color:${C.charcoal};font-size:14px;display:flex;align-items:center;gap:6px;}
.cd-hflag{font-size:14px;margin-left:9px;}
.cd-rsub{color:${C.muted};font-size:12px;margin-top:3px;display:flex;align-items:center;gap:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cd-del{background:none;border:none;color:#c0ccce;cursor:pointer;padding:7px;border-radius:10px;flex-shrink:0;transition:.15s;}
.cd-del:hover{color:#e05252;background:#fdf0f0;color:#e05252;background:#fdf0f0;}
.cd-hamt{text-align:right;flex-shrink:0;}
.cd-hsent{font-weight:800;color:${C.ink};font-size:13.5px;}
.cd-hrecv{color:${C.muted};font-size:11.5px;margin-top:1px;}
.cd-status{display:inline-block;margin-top:5px;font-size:9.5px;font-weight:800;color:#04332a;background:linear-gradient(135deg,${C.mint},#31d3ab);padding:3px 9px;border-radius:999px;letter-spacing:.4px;}
.cd-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:9px;padding:54px 22px;}
.cd-empty-ic{width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#e7f7f4,#f2fbfa);border:1px solid #d9f0ea;display:flex;align-items:center;justify-content:center;margin-bottom:14px;box-shadow:0 10px 24px -12px rgba(2,128,144,.25);}
.cd-empty-t{font-weight:800;font-size:16px;color:${C.ink};}
.cd-empty-s{color:${C.muted};font-size:13px;max-width:240px;line-height:1.5;margin-bottom:14px;}
.cd-empty .cd-primary{flex:0;padding:12px 22px;}
/* profile */
.cd-prof-top{display:flex;flex-direction:column;align-items:center;text-align:center;padding:14px 0 8px;}
.cd-prof-ava{width:76px;height:76px;border-radius:50%;background:linear-gradient(135deg,${C.teal},${C.mint});color:#fff;font-weight:800;font-size:23px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 4px rgba(2,195,154,.16),0 14px 30px rgba(2,128,144,.28);}
.cd-prof-name{font-weight:800;font-size:19px;color:${C.ink};margin-top:14px;letter-spacing:-.3px;}
.cd-prof-email{color:${C.muted};font-size:13px;margin-top:3px;}
.cd-prof-verified{display:inline-flex;align-items:center;gap:5px;background:#ecf7f5;color:${C.teal};font-weight:700;font-size:12px;padding:5px 12px;border-radius:20px;margin-top:12px;}
.cd-card2{background:#fff;border:1px solid #e9eff0;border-radius:18px;padding:16px;box-shadow:0 1px 2px rgba(11,32,39,.04),0 12px 28px -20px rgba(11,32,39,.14);}
.cd-card2-h{display:flex;justify-content:space-between;align-items:baseline;font-size:12.5px;color:${C.muted};font-weight:600;}
.cd-card2-v{color:${C.ink};font-weight:800;font-size:13px;}
.cd-bar{height:8px;border-radius:999px;background:#e9f0f1;margin-top:11px;overflow:hidden;}
.cd-bar-fill{height:100%;border-radius:5px;background:linear-gradient(90deg,${C.teal},${C.mint});transition:width .4s;}
.cd-card2-sub{font-size:11.5px;color:${C.muted};}
.cd-sec-lbl{font-size:11px;font-weight:800;color:${C.muted};text-transform:uppercase;letter-spacing:1.1px;margin:16px 2px 8px;}
.cd-fund-ic{width:34px;height:34px;border-radius:10px;background:${C.cloud};display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.cd-addfund{display:flex;align-items:center;justify-content:center;gap:7px;background:#fff;border:1px dashed ${C.sea};color:${C.teal};border-radius:13px;padding:13px;font-weight:600;font-size:13px;cursor:pointer;}
.cd-addfund:hover{background:#ecf7f5;}
.cd-setval{color:${C.teal};font-weight:700;font-size:12px;margin-right:4px;}
.cd-signout{display:flex;align-items:center;justify-content:center;gap:8px;background:#fff;border:1px solid #eadfe0;color:#c0445f;border-radius:14px;padding:13px;font-weight:700;font-size:13.5px;cursor:pointer;}
.cd-signout:hover{background:#fdeef0;border-color:#f3c9d2;}
.cd-prof-legal{display:flex;align-items:center;justify-content:center;gap:10px;margin:18px 0 14px;font-size:12.5px;}
.cd-prof-legal span{color:${C.muted};cursor:pointer;font-weight:600;}
.cd-prof-legal span:hover{color:${C.teal};}
.cd-pl-dot{color:#cdd8da !important;cursor:default !important;}
.cd-ld-legal{margin-top:12px;font-size:12px;color:#5a7178;}
.cd-ld-legal span{color:#8fa6ab;cursor:pointer;}
.cd-ld-legal span:hover{color:${C.mint};}
.cd-legal{width:100%;max-width:640px;margin:0 auto;padding:8px 4px 30px;text-align:left;}
.cd-lg-bar{display:flex;align-items:center;gap:14px;margin-bottom:22px;}
.cd-lg-back{background:#fff;border:1px solid ${C.line};border-radius:12px;width:40px;height:40px;display:flex;align-items:center;justify-content:center;color:${C.charcoal};cursor:pointer;flex-shrink:0;transition:.15s;}
.cd-lg-back:hover{background:${C.cloud};}
.cd-lg-word{font-weight:800;font-size:16px;color:${C.ink};letter-spacing:-.2px;}
.cd-lg-tabs{display:flex;gap:8px;background:#eef4f5;border-radius:14px;padding:5px;margin-bottom:26px;}
.cd-lg-tab{flex:1;background:none;border:none;border-radius:10px;padding:11px;font-size:13px;font-weight:700;color:${C.muted};cursor:pointer;transition:.15s;}
.cd-lg-tab.on{background:#fff;color:${C.ink};box-shadow:0 2px 6px rgba(11,32,39,.08);}
.cd-lg-body h1{font-size:27px;font-weight:800;color:${C.ink};letter-spacing:-.6px;margin:0 0 4px;}
.cd-lg-eff{color:${C.muted};font-size:12.5px;margin:0 0 26px;}
.cd-lg-body h3{font-size:15px;font-weight:800;color:${C.ink};margin:24px 0 7px;letter-spacing:-.2px;}
.cd-lg-body p{font-size:13.5px;line-height:1.65;color:${C.charcoal};margin:0 0 6px;}
.cd-lg-body a{color:${C.teal};font-weight:600;text-decoration:none;}
.cd-lg-body b{font-weight:700;color:${C.ink};}
.cd-lg-done{width:100%;margin-top:30px;background:#fff;border:1px solid ${C.line};color:${C.charcoal};border-radius:14px;padding:14px;font-weight:700;font-size:14px;cursor:pointer;transition:.15s;}
.cd-lg-done:hover{background:${C.cloud};}
.cd-caption{color:#7d949a;font-size:11px;margin-top:18px;letter-spacing:.3px;}
@keyframes rise{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}
@keyframes blink{0%,60%,100%{opacity:.25;transform:translateY(0);}30%{opacity:1;transform:translateY(-2px);}}
@keyframes pop{from{transform:scale(.4);opacity:0;}to{transform:scale(1);opacity:1;}}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(2,128,144,.4);}50%{box-shadow:0 0 0 6px rgba(2,128,144,0);}}
/* home */
.cd-home{padding:22px 18px 28px;display:flex;flex-direction:column;gap:0;}
.cd-greet{font-size:24px;font-weight:800;color:${C.ink};letter-spacing:-.5px;line-height:1.15;}
.cd-greet-sub{color:${C.muted};font-size:14px;margin-top:5px;line-height:1.4;}
.cd-bigsend{display:flex;align-items:center;gap:17px;background:linear-gradient(135deg,${C.teal} 0%,${C.sea} 65%,${C.mint} 125%);border:none;border-radius:22px;padding:18px 17px;cursor:pointer;text-align:left;box-shadow:0 14px 30px rgba(2,128,144,.32),inset 0 1px 0 rgba(255,255,255,.16);transition:.18s;margin-top:24px;}
.cd-bigsend:hover{transform:translateY(-2px);box-shadow:0 16px 34px rgba(2,128,144,.38);}
.cd-bigsend-ic{width:44px;height:44px;border-radius:13px;background:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 3px 8px rgba(0,0,0,.12);}
.cd-bigsend-txt{flex:1;display:flex;flex-direction:column;gap:2px;}
.cd-bigsend-h{color:#fff;font-weight:800;font-size:17px;}
.cd-bigsend-s{color:rgba(255,255,255,.85);font-size:12px;}
.cd-limit-mini{background:#fff;border:1px solid #e9eff0;border-radius:16px;padding:15px 16px;box-shadow:0 1px 2px rgba(11,32,39,.04),0 12px 28px -20px rgba(11,32,39,.14);margin-top:16px;}
.cd-lm-row{display:flex;justify-content:space-between;align-items:baseline;font-size:12.5px;color:${C.muted};font-weight:600;}
.cd-lm-v{color:${C.ink};font-weight:800;font-size:12.5px;}
.cd-home-sec{display:flex;flex-direction:column;gap:12px;margin-top:28px;}
.cd-home-sec-h{display:flex;justify-content:space-between;align-items:center;font-size:11px;font-weight:800;color:${C.muted};text-transform:uppercase;letter-spacing:1.1px;}
.cd-seeall{background:none;border:none;color:${C.teal};font-size:12px;font-weight:800;cursor:pointer;padding:0;letter-spacing:.3px;text-transform:none;}
.cd-quickrow{display:flex;gap:14px;overflow-x:auto;padding:4px 0 6px;}
.cd-quickrow::-webkit-scrollbar{height:0;}
.cd-quick{display:flex;flex-direction:column;align-items:center;gap:9px;background:none;border:none;cursor:pointer;flex-shrink:0;width:58px;}
.cd-quick-ava{width:54px;height:54px;border-radius:50%;background:#fff;border:1px solid #e9eff0;display:flex;align-items:center;justify-content:center;font-size:23px;box-shadow:0 1px 2px rgba(11,32,39,.04),0 10px 22px -14px rgba(11,32,39,.16);transition:.18s;}
.cd-quick:hover .cd-quick-ava{border-color:${C.sea};transform:translateY(-2px);box-shadow:0 6px 14px rgba(2,128,144,.14);}
.cd-quick-ava.add{background:#ecf7f5;border:1px dashed ${C.sea};}
.cd-quick-name{font-size:11.5px;font-weight:600;color:${C.charcoal};max-width:58px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cd-home-empty{background:#fff;border:1px dashed ${C.line};border-radius:13px;padding:18px;text-align:center;color:${C.muted};font-size:12.5px;}
/* flow top bar */
.cd-flowtop{display:flex;align-items:center;justify-content:space-between;padding:14px 16px 0;}
.cd-flowback{background:#fff;border:1px solid #e9eff0;color:${C.teal};font-weight:800;font-size:12.5px;display:inline-flex;align-items:center;gap:3px;cursor:pointer;padding:7px 12px 7px 8px;border-radius:999px;box-shadow:0 1px 2px rgba(11,32,39,.05);transition:.15s;}
@media (prefers-reduced-motion:reduce){*{animation:none!important;}}
`;
