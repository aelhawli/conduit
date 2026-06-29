import React, { useState, useEffect, useRef } from "react";
import { compareQuotes } from "./api.js";
import {
  Globe, ArrowRight, Check, Clock, Building2, Wallet, Banknote,
  Zap, Send, ChevronLeft, ChevronRight, Sparkles, ShieldCheck, RotateCcw,
  Users, History, Plus, Trash2, UserPlus, User, BadgeCheck, CreditCard,
  Landmark, Smartphone, Camera, FileText, Settings, LogOut, Bell, Lock, Mail, X, MapPin
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
  PKR: 278, INR: 83.5, PHP: 56, BDT: 118, NGN: 1600, VND: 25400, MXN: 17,
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
  { country: "Pakistan", cur: "PKR", flag: "🇵🇰" },
  { country: "India", cur: "INR", flag: "🇮🇳" },
  { country: "Philippines", cur: "PHP", flag: "🇵🇭" },
  { country: "Bangladesh", cur: "BDT", flag: "🇧🇩" },
  { country: "Nigeria", cur: "NGN", flag: "🇳🇬" },
  { country: "Vietnam", cur: "VND", flag: "🇻🇳" },
  { country: "Mexico", cur: "MXN", flag: "🇲🇽" },
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
function toAUD(amount, fromCur) { return amount / PER_USD[fromCur] * PER_USD.AUD; }
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
export default function ConduitApp() {
  const [profile, setProfile] = useState(null); // null = signed out
  const [tab, setTab] = useState("send");
  const [recipients, setRecipients] = useState([
    { id: "r1", name: "Amir Khan", country: "Pakistan", cur: "PKR", flag: "🇵🇰", method: "Bank", detail: "PK36SCBL0000001123456702" },
    { id: "r2", name: "Maria Santos", country: "Philippines", cur: "PHP", flag: "🇵🇭", method: "Cash", detail: "+63 917 555 0148" },
  ]);
  const [history, setHistory] = useState([]);

  if (!profile) {
    return (<div className="cd-root"><style>{css}</style><Onboarding onDone={setProfile} /><div className="cd-caption">Conduit · interactive prototype · simulated KYC</div></div>);
  }

  return (
    <div className="cd-root">
      <style>{css}</style>
      <div className="cd-frame">
        <Header profile={profile} />
        <div className="cd-body">
          {tab === "send" && <SendTab profile={profile} recipients={recipients} setRecipients={setRecipients} setHistory={setHistory} history={history} goActivity={() => setTab("activity")} goPeople={() => setTab("people")} />}
          {tab === "people" && <People recipients={recipients} setRecipients={setRecipients} />}
          {tab === "activity" && <Activity history={history} startSend={() => setTab("send")} />}
          {tab === "profile" && <Profile profile={profile} history={history} onSignOut={() => { setProfile(null); setTab("send"); }} />}
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

function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [addr, setAddr] = useState("");
  const [country, setCountry] = useState("Australia");
  const [idType, setIdType] = useState(null);
  const [idDone, setIdDone] = useState(false);
  const [selfieDone, setSelfieDone] = useState(false);
  const [started, setStarted] = useState(false);

  const steps = ["Account", "Details", "ID", "Selfie", "Review"];

  function finish() {
    const initials = (name.trim() || "You").split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
    onDone({ name: name.trim() || "New user", email: email.trim() || "you@email.com", country, initials, tier: "Tier 1", status: "Verified", limitMax: 15000, currency: "AUD" });
  }

  const canNext = [
    email.includes("@"),
    name.trim() && dob && addr.trim(),
    idType && idDone,
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
            <p className="cd-onb-p">Send money in minutes. We verify your identity once to keep transfers safe and compliant.</p>
            <label className="cd-fl">Email</label>
            <div className="cd-inwrap"><Mail size={15} color={C.muted} /><input className="cd-input bare" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} /></div>
            <label className="cd-fl">Password</label>
            <div className="cd-inwrap"><Lock size={15} color={C.muted} /><input className="cd-input bare" type="password" placeholder="Create a password" /></div>
            <div className="cd-trust"><Lock size={12} /> 256-bit encryption · regulated partners</div>
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
              {["Australia", "United Kingdom", "United States", "Canada", "Germany", "France"].map(c => <option key={c}>{c}</option>)}
            </select>
          </>
        )}

        {step === 2 && (
          <>
            <h3 className="cd-onb-h">Verify your identity</h3>
            <p className="cd-onb-p">Pick a document. In the real app this runs through a KYC provider (Onfido / Persona).</p>
            <div className="cd-idtypes">
              {[["Passport", FileText], ["Driver licence", CreditCard], ["National ID", BadgeCheck]].map(([t, Ic]) => (
                <button key={t} className={`cd-idtype ${idType === t ? "on" : ""}`} onClick={() => { setIdType(t); setIdDone(false); }}>
                  <Ic size={18} />{t}
                </button>
              ))}
            </div>
            {idType && (
              <button className={`cd-upload ${idDone ? "done" : ""}`} onClick={() => setIdDone(true)}>
                {idDone ? <><Check size={18} /> {idType} uploaded</> : <><FileText size={18} /> Tap to upload {idType.toLowerCase()}</>}
              </button>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <h3 className="cd-onb-h">Quick selfie check</h3>
            <p className="cd-onb-p">A liveness selfie confirms it's really you. Nothing is stored in this prototype.</p>
            <button className={`cd-selfie ${selfieDone ? "done" : "scanning"}`} onClick={() => setSelfieDone(true)}>
              {selfieDone ? <><Check size={30} /></> : <><Camera size={30} /></>}
            </button>
            <div className="cd-selfie-lbl">{selfieDone ? "Face captured" : "Tap to capture"}</div>
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

        <button className="cd-primary full big" disabled={!canNext} onClick={() => step < 4 ? setStep(step + 1) : finish()}>
          {step === 4 ? "Enter Conduit" : "Continue"}
        </button>
        {step === 0 && <div className="cd-onb-foot">Already have an account? <span>Log in</span></div>}
      </div>
    </div>
  );
}

/* ============================== SEND TAB (home + flow) ============================== */
function SendTab({ profile, recipients, setRecipients, setHistory, history, goActivity, goPeople }) {
  const [mode, setMode] = useState("home");
  const [initRcp, setInitRcp] = useState(null);
  const [initFrom, setInitFrom] = useState(null);
  const home = () => { setMode("home"); setInitRcp(null); setInitFrom(null); };
  const startFresh = () => { setInitRcp(null); setInitFrom(null); setMode("flow"); };
  const quickSend = (r) => { setInitRcp(r); setInitFrom(countryToSource(profile.country)); setMode("flow"); };
  if (mode === "home")
    return <Home profile={profile} recipients={recipients} history={history} onSend={startFresh} onQuick={quickSend} goActivity={goActivity} goPeople={goPeople} />;
  return <SendFlow key={initRcp ? "q" + initRcp.id : "fresh"} profile={profile} recipients={recipients} setRecipients={setRecipients} setHistory={setHistory} goActivity={goActivity} initialRecipient={initRcp} initialFrom={initFrom} onExit={home} />;
}

function Home({ profile, recipients, history, onSend, onQuick, goActivity, goPeople }) {
  const usedAUD = history.reduce((s, h) => s + toAUD(h.amount, h.from), 0);
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
        <div className="cd-lm-row"><span>Sent this month</span><span className="cd-lm-v">AUD {fmt(usedAUD, "AUD")} / {fmt(profile.limitMax, "AUD")}</span></div>
        <div className="cd-bar"><div className="cd-bar-fill" style={{ width: pct + "%" }} /></div>
      </div>

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
                <div className="cd-hamt"><div className="cd-hsent">{h.from} {fmt(h.amount, h.from)}</div><span className="cd-status">Delivered</span></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================== SEND FLOW ============================== */
function SendFlow({ profile, recipients, setRecipients, setHistory, goActivity, initialRecipient = null, initialFrom = null, onExit }) {
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
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [log, step]);
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
    const rec = { id: "h" + Date.now(), date: new Date(), provider: chosen.p, from: from.code, amount, destCur: dc, received: chosen.received, country: to.country, flag: to.flag, method, recipientName: rcpName || "Recipient", ref: "CDT-" + Math.random().toString(36).slice(2, 8).toUpperCase() };
    setHistory(h => [rec, ...h]);
    if (!savedRcp && saveNew && rcpName.trim()) setRecipients(rs => [...rs, { id: "r" + Date.now(), name: rcpName.trim(), country: to.country, cur: to.cur, flag: to.flag, method, detail: rcpDetail, token: method === "Wallet" ? token : undefined }]);
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
          <div className="cd-results">
            <div className="cd-rec-lbl"><Sparkles size={13} /> Conduit recommends</div>
            <button className="cd-hero" onClick={() => { setChosen(best); setStep("confirm"); }}>
              <div className="cd-hero-top">
                <div className="cd-prov"><span className="cd-prov-badge lg" style={{ background: best.p.color, color: best.p.textColor || "#fff" }}>{best.p.initials}</span><div><div className="cd-prov-name">{best.p.name}</div><div className="cd-prov-rail">{best.p.rail}</div></div></div>
                <div className="cd-badges"><span className="cd-badge best">Best value</span>{bestFast && <span className="cd-badge fast"><Zap size={11} /> Fastest</span>}</div>
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
                <div className="cd-rc-main"><div className="cd-rc-name">{q.p.name}{isFast && <span className="cd-badge fast sm"><Zap size={10} /> Fastest</span>}</div><div className="cd-rc-sub"><Clock size={12} /> {q.p.speed} · Cost {from.code} {fmt(q.totalCost, from.code)}</div></div>
                <div className="cd-rc-recv"><span className="cd-rc-amt">{destCur} {fmt(q.received, destCur)}</span><span className="cd-rc-lbl">they get</span></div>
              </button>); })}

            <div className="cd-foot-note"><ShieldCheck size={13} /> Trusted providers · Conduit adds a flat 1%</div>
          </div>
        );
      })()}

      {step === "confirm" && chosen && (
        <div className="cd-confirm">
          <button className="cd-textback" onClick={() => setStep("results")}><ChevronLeft size={16} /> Back to options</button>
          <div className="cd-sum">
            <div className="cd-sum-head"><span className="cd-prov-badge lg" style={{ background: chosen.p.color, color: chosen.p.textColor || "#fff" }}>{chosen.p.initials}</span><div><div className="cd-prov-name">{chosen.p.name}</div><div className="cd-prov-rail">{chosen.p.rail} · {chosen.p.speed}</div></div></div>
            <div className="cd-bigrecv"><div><span className="cd-lbl">You send</span><span className="cd-val">{from.code} {fmt(amount, from.code)}</span></div><ArrowRight size={18} color={C.muted} /><div className="cd-r"><span className="cd-lbl">They receive</span><span className="cd-val mint">{destCur} {fmt(chosen.received, destCur)}</span></div></div>
            <div className="cd-breakdown">
              <Row k="Mid-market rate" v={`1 ${from.code} = ${fmt(chosen.mid, destCur)} ${destCur}`} />
              <Row k={`Provider fee (${chosen.p.name})`} v={`${from.code} ${fmt(chosen.providerFee, from.code)}`} />
              <Row k="Conduit fee (1%)" v={`${from.code} ${fmt(chosen.conduitFee, from.code)}`} />
              {payInFee > 0 && <Row k={`Card fee (1%)`} v={`${from.code} ${fmt(payInFee, from.code)}`} />}
              <Row k="Total cost" v={`${from.code} ${fmt(grandTotal, from.code)}`} bold />
            </div>
            <div className="cd-recipient"><div className="cd-rcp-ava">{method === "Wallet" ? <Wallet size={18} color={C.teal} /> : to.flag}</div><div><div className="cd-rcp-name">{rcpName || `Recipient in ${to.country}`}</div><div className="cd-rcp-sub">{to.country} · {method === "Wallet" ? `${token} ${shortDetail(rcpDetail)}` : `${METHOD_LABEL[method]}${rcpDetail ? " · " + shortDetail(rcpDetail) : ""}`}</div></div></div>
          </div>

          <div className="cd-paywith">
            <div className="cd-pw-title">Pay with</div>
            {FUNDING.map(f => { const Ic = FUND_ICON[f.id]; return (
              <button key={f.id} className={`cd-pw ${funding === f.id ? "on" : ""}`} onClick={() => setFunding(f.id)}>
                <span className="cd-pw-ic"><Ic size={16} color={funding === f.id ? C.teal : C.muted} /></span>
                <span className="cd-pw-main"><span className="cd-pw-lbl">{f.label}</span><span className="cd-pw-sub">{f.sub}</span></span>
                <span className={`cd-radio ${funding === f.id ? "on" : ""}`}>{funding === f.id && <Check size={12} color="#fff" strokeWidth={3} />}</span>
              </button>); })}
          </div>

          <button className="cd-send" onClick={confirmSend}><Send size={17} /> Confirm &amp; send {from.code} {fmt(amount + payInFee, from.code)}</button>
          <div className="cd-disc">Prototype — no real funds move.</div>
        </div>
      )}

      {step === "done" && chosen && (
        <div className="cd-done">
          <div className="cd-checkc"><Logo size={56} /><span className="cd-checkc-tick"><Check size={16} color="#fff" strokeWidth={4} /></span></div>
          <div className="cd-done-h">On its way</div>
          <div className="cd-done-amt">{destCur} {fmt(chosen.received, destCur)} to {rcpName || to.country}</div>
          <div className="cd-track">
            <Stage done label={`Paid via ${fund.label.split(" ")[0]}`} sub="Just now" />
            <Stage label={method === "Wallet" ? "Converting to " + token : `Sent via ${chosen.p.name}`} sub={chosen.p.speed} active />
            <Stage label={method === "Wallet" ? "Arrives in wallet" : METHOD_LABEL[method]} sub="Recipient notified" />
          </div>
          <div className="cd-ref">Reference {chosen.ref}</div>
          <div className="cd-doneactions"><button className="cd-new" onClick={onExit}>Done</button><button className="cd-ghost2" onClick={reset}>Send another</button></div>
        </div>
      )}
    </div>
  );
}

/* ============================== PEOPLE ============================== */
function People({ recipients, setRecipients }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState(""); const [picked, setPicked] = useState(DESTS[0]);
  const [method, setMethod] = useState("Bank"); const [token, setToken] = useState("USDC");
  const [detail, setDetail] = useState(""); const [customMode, setCustomMode] = useState(false);
  const [cName, setCName] = useState(""); const [cCur, setCCur] = useState("PKR");

  function save() {
    if (!name.trim() || !detail.trim()) return;
    const dest = customMode ? { country: cName.trim(), cur: cCur, flag: "🌐" } : picked;
    if (customMode && !cName.trim()) return;
    setRecipients(rs => [...rs, { id: "r" + Date.now(), name: name.trim(), country: dest.country, cur: dest.cur, flag: dest.flag, method, detail, token: method === "Wallet" ? token : undefined }]);
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
          <div key={r.id} className="cd-rrow"><span className="cd-flag big">{r.flag}</span><div className="cd-rmain"><div className="cd-rname">{r.name}</div><div className="cd-rsub"><Ic size={12} /> {r.country} · {r.method === "Wallet" ? `${r.token || "USDC"} ${shortDetail(r.detail)}` : shortDetail(r.detail)}</div></div><button className="cd-del" onClick={() => setRecipients(rs => rs.filter(x => x.id !== r.id))}><Trash2 size={15} /></button></div>); })}</div>)}
    </div>
  );
}

/* ============================== ACTIVITY ============================== */
function Activity({ history, startSend }) {
  return (
    <div className="cd-screen">
      <div className="cd-sc-head"><h2>Activity</h2></div>
      {history.length === 0 ? (<Empty icon={History} title="No transfers yet" sub="Your sent transfers will appear here." action="Send money" onAction={startSend} />)
        : (<div className="cd-list">{history.map(h => (
          <div key={h.id} className="cd-hrow"><span className="cd-prov-badge" style={{ background: h.provider.color, color: h.provider.textColor || "#fff" }}>{h.provider.initials}</span>
            <div className="cd-rmain"><div className="cd-rname">{h.recipientName} <span className="cd-hflag">{h.flag}</span></div><div className="cd-rsub">{h.provider.name} · {h.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, {h.date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div></div>
            <div className="cd-hamt"><div className="cd-hsent">{h.from} {fmt(h.amount, h.from)}</div><div className="cd-hrecv">→ {h.destCur} {fmt(h.received, h.destCur)}</div><span className="cd-status">Delivered</span></div></div>))}</div>)}
    </div>
  );
}

/* ============================== PROFILE ============================== */
function Profile({ profile, history, onSignOut }) {
  const usedAUD = history.reduce((s, h) => s + toAUD(h.amount, h.from), 0);
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
        <div className="cd-card2-h"><span>Monthly sending limit</span><span className="cd-card2-v">AUD {fmt(usedAUD, "AUD")} / {fmt(profile.limitMax, "AUD")}</span></div>
        <div className="cd-bar"><div className="cd-bar-fill" style={{ width: pct + "%" }} /></div>
        <div className="cd-card2-sub">Raise your limit with extra verification (proof of income).</div>
      </div>

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
.cd-root{font-family:'Inter',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;display:flex;flex-direction:column;align-items:center;
  min-height:100%;padding:24px 14px 30px;box-sizing:border-box;background:radial-gradient(120% 90% at 50% -10%, #0e2a32 0%, #0B2027 55%, #081317 100%);}
.cd-frame{width:100%;max-width:412px;background:#fff;border-radius:32px;overflow:hidden;display:flex;flex-direction:column;height:772px;max-height:91vh;box-shadow:0 40px 80px -22px rgba(6,16,20,.55),0 0 0 1px rgba(255,255,255,.05);}
.cd-head{background:${C.ink};padding:16px 18px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
.cd-brandrow{display:flex;align-items:center;gap:11px;}
.cd-logo{width:36px;height:36px;border-radius:11px;background:linear-gradient(135deg,${C.teal},${C.sea});display:flex;align-items:center;justify-content:center;}
.cd-logomark{display:flex;align-items:center;}
.cd-logomark.big{margin-bottom:14px;}
.cd-logo.big{width:54px;height:54px;border-radius:16px;}
.cd-word{color:#fff;font-weight:800;font-size:17px;letter-spacing:-.2px;line-height:1;}
.cd-tag{color:${C.mint};font-size:10.5px;font-weight:500;margin-top:3px;}
.cd-headava{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,${C.sea},${C.mint});color:#04332a;font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center;}
.cd-body{flex:1;overflow-y:auto;background:${C.cloud};display:flex;flex-direction:column;}
.cd-body::-webkit-scrollbar{width:0;}
.cd-nav{display:flex;background:#fff;border-top:1px solid ${C.line};flex-shrink:0;}
.cd-navbtn{flex:1;border:none;background:none;padding:9px 0 11px;display:flex;flex-direction:column;align-items:center;gap:3px;color:${C.muted};font-size:10px;font-weight:600;cursor:pointer;transition:.15s;}
.cd-navbtn.on{color:${C.teal};}
/* onboarding */
.cd-onb{width:100%;max-width:412px;display:flex;flex-direction:column;align-items:center;}
.cd-onb-head{text-align:center;margin-bottom:18px;display:flex;flex-direction:column;align-items:center;}
.cd-logo.big{margin-bottom:12px;}
.cd-onb-word{color:#fff;font-weight:800;font-size:24px;letter-spacing:-.3px;}
.cd-onb-tag{color:${C.mint};font-size:12px;font-weight:500;margin-top:4px;}
.cd-onb-card{width:100%;background:#fff;border-radius:24px;padding:22px;box-sizing:border-box;box-shadow:0 26px 70px rgba(0,0,0,.4);min-height:430px;display:flex;flex-direction:column;}
.cd-prog{display:flex;gap:5px;margin-bottom:10px;}
.cd-prog-seg{flex:1;height:4px;border-radius:3px;background:${C.line};transition:.25s;}
.cd-prog-seg.on{background:${C.teal};}
.cd-onb-stepname{font-size:11px;font-weight:600;color:${C.muted};margin-bottom:12px;text-transform:uppercase;letter-spacing:.4px;}
.cd-onb-h{font-size:20px;font-weight:800;color:${C.ink};margin:0 0 6px;letter-spacing:-.3px;}
.cd-onb-h.center{text-align:center;}
.cd-onb-p{font-size:13px;color:${C.muted};line-height:1.5;margin:0 0 14px;}
.cd-onb-p.center{text-align:center;}
.cd-inwrap{display:flex;align-items:center;gap:8px;border:1.5px solid ${C.line};border-radius:11px;padding:0 12px;margin-bottom:2px;}
.cd-inwrap:focus-within{border-color:${C.teal};}
.cd-input.bare{border:none;padding:12px 0;}
.cd-idtypes{display:flex;flex-direction:column;gap:8px;margin-bottom:12px;}
.cd-idtype{display:flex;align-items:center;gap:11px;border:1.5px solid ${C.line};border-radius:12px;padding:14px;font-weight:600;font-size:14px;color:${C.charcoal};background:#fff;cursor:pointer;transition:.15s;}
.cd-idtype.on{border-color:${C.teal};background:#ecf7f5;color:${C.teal};}
.cd-upload{display:flex;align-items:center;justify-content:center;gap:9px;border:1.5px dashed ${C.sea};border-radius:13px;padding:18px;font-weight:600;font-size:14px;color:${C.teal};background:#f3fbfa;cursor:pointer;width:100%;}
.cd-upload.done{border-style:solid;background:#ecf7f5;}
.cd-selfie{margin:10px auto 8px;width:130px;height:130px;border-radius:50%;border:2.5px dashed ${C.sea};background:#f3fbfa;color:${C.teal};display:flex;align-items:center;justify-content:center;cursor:pointer;transition:.2s;}
.cd-selfie.done{border-style:solid;background:linear-gradient(135deg,${C.sea},${C.mint});color:#fff;}
.cd-selfie-lbl{text-align:center;font-size:13px;font-weight:600;color:${C.muted};}
.cd-review{display:flex;flex-direction:column;align-items:center;}
.cd-verified-ic{width:74px;height:74px;border-radius:50%;background:linear-gradient(135deg,${C.sea},${C.mint});display:flex;align-items:center;justify-content:center;margin-bottom:14px;box-shadow:0 12px 30px rgba(2,195,154,.4);animation:pop .5s cubic-bezier(.18,1.4,.4,1) both;}
.cd-rev-rows{width:100%;background:${C.cloud};border-radius:14px;padding:6px 14px;margin-top:8px;}
.cd-rev{display:flex;justify-content:space-between;padding:9px 0;font-size:13px;border-bottom:1px solid ${C.line};}
.cd-rev:last-child{border-bottom:none;}
.cd-rev span:first-child{color:${C.muted};}
.cd-rev span:last-child{color:${C.charcoal};font-weight:600;}
.cd-okpill{background:${C.mint};color:#04332a !important;padding:2px 10px;border-radius:20px;font-size:11px;}
.cd-onb-foot{text-align:center;font-size:12.5px;color:${C.muted};margin-top:12px;}
.cd-onb-card.welcome{justify-content:flex-start;}
.cd-vprops{display:flex;flex-direction:column;gap:13px;margin:8px 0 4px;}
.cd-vprop{display:flex;align-items:center;gap:13px;}
.cd-vprop-ic{width:42px;height:42px;border-radius:13px;background:#ecf7f5;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.cd-vprop-txt{font-weight:600;color:${C.charcoal};font-size:14px;}
.cd-trust{display:flex;align-items:center;justify-content:center;gap:6px;color:${C.muted};font-size:11px;margin-top:12px;font-weight:500;}
.cd-selfie.scanning{animation:scanpulse 1.6s ease-in-out infinite;}
@keyframes scanpulse{0%,100%{box-shadow:0 0 0 0 rgba(2,168,150,.35);}50%{box-shadow:0 0 0 12px rgba(2,168,150,0);}}
.cd-onb-foot span{color:${C.teal};font-weight:700;cursor:pointer;}
.cd-primary.full.big{margin-top:auto;padding:15px;font-size:15px;}
/* shared flow */
.cd-flow{display:flex;flex-direction:column;flex:1;}
.cd-reset{background:#fff;border:1px solid ${C.line};color:${C.muted};font-weight:600;font-size:11.5px;border-radius:20px;padding:6px 11px;display:inline-flex;align-items:center;gap:5px;cursor:pointer;}
.cd-reset:hover{border-color:${C.sea};color:${C.teal};}
.cd-chat{padding:14px 14px 4px;display:flex;flex-direction:column;gap:9px;}
.cd-bubble{display:flex;gap:8px;align-items:flex-end;animation:rise .32s ease both;}
.cd-bubble.user{flex-direction:row-reverse;}
.cd-ava{width:24px;height:24px;border-radius:8px;background:linear-gradient(135deg,${C.teal},${C.mint});display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.cd-bub-txt{max-width:78%;font-size:13.5px;line-height:1.45;padding:10px 13px;border-radius:15px;}
.cd-bubble.agent .cd-bub-txt{background:#fff;color:${C.charcoal};border-bottom-left-radius:5px;box-shadow:0 1px 2px rgba(11,32,39,.06);}
.cd-bubble.user .cd-bub-txt{background:${C.teal};color:#fff;border-bottom-right-radius:5px;font-weight:600;}
.cd-dots{display:inline-flex;gap:4px;padding:2px 0;}
.cd-dots i{width:6px;height:6px;border-radius:50%;background:${C.sea};animation:blink 1.2s infinite;}
.cd-dots i:nth-child(2){animation-delay:.2s;}.cd-dots i:nth-child(3){animation-delay:.4s;}
.cd-panel{padding:8px 14px 16px;display:flex;flex-direction:column;gap:9px;}
.cd-opt{display:flex;align-items:center;gap:12px;background:#fff;border:1px solid #e9eff0;border-radius:15px;padding:13px 15px;cursor:pointer;text-align:left;transition:.15s;animation:rise .3s ease both;box-shadow:0 1px 2px rgba(11,32,39,.04);}
.cd-opt:hover{border-color:${C.sea};transform:translateY(-1px);box-shadow:0 6px 16px rgba(2,128,144,.1);}
.cd-flag{font-size:20px;}.cd-flag.big{font-size:26px;}
.cd-opt-main{flex:1;font-weight:600;color:${C.charcoal};font-size:14.5px;display:flex;flex-direction:column;gap:2px;}
.cd-opt-em{font-style:normal;color:${C.muted};font-size:11.5px;font-weight:500;}
.cd-opt-sub{color:${C.muted};font-size:12px;font-weight:600;}
.cd-newicon,.cd-methodicon{width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,${C.teal},${C.sea});display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.cd-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;}
.cd-chip{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #e9eff0;border-radius:14px;padding:13px 12px;cursor:pointer;font-weight:600;color:${C.charcoal};font-size:13.5px;transition:.15s;animation:rise .3s ease both;box-shadow:0 1px 2px rgba(11,32,39,.04);}
.cd-chip:hover{border-color:${C.sea};transform:translateY(-1px);box-shadow:0 6px 16px rgba(2,128,144,.1);}
.cd-custombtn{margin-top:4px;background:#fff;border:1px dashed ${C.sea};color:${C.teal};border-radius:13px;padding:12px;font-weight:600;font-size:13px;display:flex;align-items:center;justify-content:center;gap:7px;cursor:pointer;}
.cd-custombtn:hover{background:#ecf7f5;}
.cd-form{display:flex;flex-direction:column;gap:7px;}
.cd-valmsg{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;margin:-2px 2px 2px;line-height:1.3;}
.cd-addr{position:relative;}
.cd-addr-list{position:absolute;z-index:40;left:0;right:0;top:calc(100% + 4px);background:#fff;border:1px solid #e1eaec;border-radius:12px;box-shadow:0 16px 36px rgba(11,32,39,.18);overflow-y:auto;max-height:232px;}
.cd-addr-opt{display:flex;align-items:flex-start;gap:8px;width:100%;text-align:left;background:#fff;border:none;border-bottom:1px solid #f0f5f6;padding:10px 12px;cursor:pointer;font-size:12.5px;color:#1E2D33;line-height:1.35;}
.cd-addr-opt:last-child{border-bottom:none;}
.cd-addr-opt:hover{background:#f2fbfa;}
.cd-addr-hint{font-size:11.5px;color:#5C7079;margin:4px 2px;}
.cd-valmsg.ok{color:#0a7d52;}
.cd-valmsg.warn{color:#92600a;}
.cd-valmsg.error{color:#c0322b;}
.cd-input.dv-ok{border-color:#28b487;box-shadow:0 0 0 3px rgba(2,195,154,.12);}
.cd-input.dv-warn{border-color:#e6b450;box-shadow:0 0 0 3px rgba(245,166,35,.12);}
.cd-input.dv-error{border-color:#e07a73;box-shadow:0 0 0 3px rgba(224,50,43,.1);}
.cd-form.card{background:#fff;border:1px solid ${C.line};border-radius:16px;padding:15px;margin:2px 0;}
.cd-fl{font-size:11.5px;font-weight:600;color:${C.muted};margin-top:6px;}
.cd-input{border:1.5px solid ${C.line};border-radius:11px;padding:11px 12px;font-size:14px;font-family:inherit;color:${C.charcoal};outline:none;background:#fff;width:100%;box-sizing:border-box;}
.cd-input:focus{border-color:${C.teal};}
.cd-formrow{display:flex;gap:9px;margin-top:10px;}
.cd-primary{flex:1;background:linear-gradient(135deg,${C.teal} 0%,${C.sea} 72%,${C.mint} 130%);color:#fff;border:none;border-radius:13px;padding:13px;font-weight:700;font-size:14px;cursor:pointer;transition:.18s;box-shadow:0 6px 16px rgba(2,128,144,.22),inset 0 1px 0 rgba(255,255,255,.18);}
.cd-primary.full{width:100%;margin-top:10px;}
.cd-primary:disabled{opacity:.4;cursor:default;}
.cd-primary:not(:disabled):hover{transform:translateY(-1px);box-shadow:0 10px 22px rgba(2,128,144,.32),inset 0 1px 0 rgba(255,255,255,.18);}
.cd-ghost{flex:1;background:#fff;border:1px solid ${C.line};color:${C.muted};border-radius:12px;padding:13px;font-weight:600;font-size:14px;cursor:pointer;}
.cd-ghost:hover{border-color:${C.muted};}
.cd-link{align-self:flex-start;background:none;border:none;color:${C.teal};font-weight:600;font-size:12.5px;cursor:pointer;padding:4px 0;}
.cd-cc{display:flex;flex-direction:column;gap:7px;}
.cd-toggle{display:flex;gap:7px;}
.cd-toggle.three .cd-tog{flex:1;}
.cd-tog{flex:1;background:#fff;border:1.5px solid ${C.line};border-radius:10px;padding:10px;font-weight:700;font-size:13px;color:${C.muted};cursor:pointer;transition:.15s;}
.cd-tog.on{border-color:${C.teal};background:#ecf7f5;color:${C.teal};}
.cd-check2{display:flex;align-items:center;gap:8px;font-size:12.5px;color:${C.charcoal};font-weight:500;margin-top:10px;cursor:pointer;}
.cd-check2 input{width:16px;height:16px;accent-color:${C.teal};}
.cd-presets{display:flex;gap:8px;}
.cd-preset{flex:1;background:#fff;border:1px solid ${C.line};border-radius:12px;padding:13px 4px;font-weight:700;color:${C.teal};font-size:13.5px;cursor:pointer;transition:.15s;}
.cd-preset:hover{border-color:${C.sea};background:#ecf7f5;}
.cd-amtrow{display:flex;align-items:center;background:#fff;border:1.5px solid ${C.teal};border-radius:14px;padding:5px 6px 5px 15px;margin-top:2px;}
.cd-amtcur{font-weight:700;color:${C.muted};font-size:14px;}
.cd-amtinput{flex:1;border:none;outline:none;font-size:17px;font-weight:700;color:${C.charcoal};padding:12px 10px;font-family:inherit;background:transparent;min-width:0;}
.cd-amtgo{width:42px;height:42px;border-radius:11px;border:none;background:${C.teal};color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:.15s;flex-shrink:0;}
.cd-amtgo:disabled{opacity:.35;cursor:default;}
.cd-amtgo:not(:disabled):hover{background:${C.sea};}
.cd-results{padding:8px 13px 16px;display:flex;flex-direction:column;gap:10px;}
.cd-rec-lbl{display:flex;align-items:center;gap:6px;color:${C.teal};font-weight:800;font-size:12px;text-transform:uppercase;letter-spacing:.5px;padding:2px 2px 0;}
.cd-hero{text-align:left;background:linear-gradient(165deg,#f1fbf9 0%,#ffffff 62%);border:1px solid rgba(2,195,154,.5);border-radius:20px;padding:17px;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.7),0 14px 34px rgba(2,195,154,.16),0 2px 6px rgba(11,32,39,.05);transition:.18s;animation:rise .3s ease both;}
.cd-hero:hover{transform:translateY(-2px);box-shadow:0 16px 38px rgba(2,195,154,.26);}
.cd-hero-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;}
.cd-hero-recv{display:flex;align-items:baseline;justify-content:space-between;margin:13px 0 4px;padding-top:13px;border-top:1px dashed ${C.line};}
.cd-hero-amt{font-weight:800;color:${C.ink};font-size:24px;letter-spacing:-.5px;}
.cd-hero-foot{display:flex;align-items:center;gap:14px;color:${C.muted};font-size:12.5px;font-weight:500;margin-top:4px;}
.cd-hero-meta{display:inline-flex;align-items:center;gap:5px;}
.cd-save{margin-top:12px;background:linear-gradient(135deg,#fff4e0,#fff9f1);border:1px solid #f6e3bf;color:#92600a;font-weight:700;font-size:12.5px;padding:9px 12px;border-radius:12px;display:flex;align-items:center;gap:6px;}
.cd-hero-cta{margin-top:12px;background:linear-gradient(135deg,${C.teal} 0%,${C.sea} 70%,${C.mint} 130%);color:#fff;font-weight:700;font-size:14px;border-radius:13px;padding:13px;display:flex;align-items:center;justify-content:center;gap:7px;box-shadow:0 8px 18px rgba(2,128,144,.26),inset 0 1px 0 rgba(255,255,255,.18);}
.cd-other-lbl{color:${C.muted};font-weight:700;font-size:11.5px;text-transform:uppercase;letter-spacing:.5px;margin:8px 2px 0;}
.cd-rowcard{display:flex;align-items:center;gap:11px;text-align:left;background:#fff;border:1px solid #e9eff0;border-radius:15px;padding:12px 13px;cursor:pointer;transition:.15s;animation:rise .3s ease both;box-shadow:0 1px 2px rgba(11,32,39,.04);}
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
.cd-prov{display:flex;align-items:center;gap:10px;}
.cd-prov-badge{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;flex-shrink:0;}
.cd-prov-badge.lg{width:42px;height:42px;font-size:14px;border-radius:12px;}
.cd-prov-name{font-weight:700;color:${C.charcoal};font-size:14.5px;line-height:1.1;}
.cd-prov-rail{color:${C.muted};font-size:11.5px;margin-top:2px;}
.cd-badges{display:flex;flex-direction:column;gap:4px;align-items:flex-end;}
.cd-badge{font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px;display:inline-flex;align-items:center;gap:3px;white-space:nowrap;}
.cd-badge.best{background:${C.mint};color:#04332a;}
.cd-badge.fast{background:#fef3c7;color:#92600a;}
.cd-recv{display:flex;align-items:baseline;justify-content:space-between;margin:11px 0 9px;padding-top:11px;border-top:1px dashed ${C.line};}
.cd-recv-label{color:${C.muted};font-size:12px;font-weight:500;}
.cd-recv-amt{font-weight:800;color:${C.ink};font-size:17px;letter-spacing:-.3px;}
.cd-meta{display:flex;align-items:center;gap:13px;color:${C.muted};font-size:12px;font-weight:500;flex-wrap:wrap;}
.cd-meta span{display:inline-flex;align-items:center;gap:5px;}
.cd-methods{margin-left:auto;}.cd-methods i{display:inline-flex;color:${C.teal};margin-left:3px;}
.cd-foot-note{display:flex;align-items:center;gap:6px;justify-content:center;color:${C.muted};font-size:11px;margin-top:4px;padding:6px;}
.cd-confirm{padding:10px 15px 18px;display:flex;flex-direction:column;gap:12px;}
.cd-textback{background:none;border:none;color:${C.teal};font-weight:600;font-size:13px;display:inline-flex;align-items:center;gap:2px;cursor:pointer;padding:4px 0;align-self:flex-start;}
.cd-sum{background:#fff;border:1px solid ${C.line};border-radius:18px;padding:16px;}
.cd-sum-head{display:flex;align-items:center;gap:11px;padding-bottom:14px;border-bottom:1px solid ${C.line};}
.cd-bigrecv{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:15px 0;border-bottom:1px solid ${C.line};}
.cd-bigrecv .cd-r{text-align:right;}
.cd-lbl{display:block;color:${C.muted};font-size:11px;font-weight:500;margin-bottom:3px;}
.cd-val{font-weight:800;color:${C.ink};font-size:15.5px;}
.cd-val.mint{color:${C.teal};}
.cd-breakdown{padding:14px 0 4px;display:flex;flex-direction:column;gap:9px;}
.cd-brow{display:flex;justify-content:space-between;font-size:12.5px;color:${C.muted};gap:10px;}
.cd-brow span:last-child{color:${C.charcoal};font-weight:600;text-align:right;}
.cd-brow.bold{padding-top:9px;border-top:1px solid ${C.line};font-size:14px;}
.cd-brow.bold span{color:${C.ink};font-weight:800;}
.cd-recipient{display:flex;align-items:center;gap:11px;margin-top:14px;padding:12px;background:${C.cloud};border-radius:13px;}
.cd-rcp-ava{font-size:22px;width:30px;text-align:center;display:flex;align-items:center;justify-content:center;}
.cd-rcp-name{font-weight:700;color:${C.charcoal};font-size:13.5px;}
.cd-rcp-sub{color:${C.muted};font-size:11.5px;margin-top:1px;}
.cd-paywith{background:#fff;border:1px solid ${C.line};border-radius:16px;padding:13px 14px;}
.cd-pw-title{font-size:11.5px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:.4px;margin-bottom:9px;}
.cd-pw{width:100%;display:flex;align-items:center;gap:11px;background:#fff;border:1.5px solid ${C.line};border-radius:12px;padding:11px 12px;cursor:pointer;margin-bottom:8px;transition:.15s;}
.cd-pw:last-child{margin-bottom:0;}
.cd-pw.on{border-color:${C.teal};background:#f3fbfa;}
.cd-pw-ic{width:30px;height:30px;border-radius:9px;background:${C.cloud};display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.cd-pw-main{flex:1;display:flex;flex-direction:column;text-align:left;}
.cd-pw-lbl{font-weight:700;color:${C.charcoal};font-size:13.5px;}
.cd-pw-sub{color:${C.muted};font-size:11.5px;margin-top:1px;}
.cd-radio{width:20px;height:20px;border-radius:50%;border:2px solid ${C.line};display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.cd-radio.on{background:${C.teal};border-color:${C.teal};}
.cd-send{background:linear-gradient(135deg,${C.teal} 0%,${C.sea} 65%,${C.mint} 125%);color:#fff;border:none;border-radius:16px;padding:16px;font-weight:700;font-size:14.5px;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;transition:.18s;box-shadow:0 10px 22px rgba(2,128,144,.3),inset 0 1px 0 rgba(255,255,255,.16);}
.cd-send:hover{transform:translateY(-1px);box-shadow:0 12px 26px rgba(2,128,144,.36);}
.cd-disc{text-align:center;color:${C.muted};font-size:11px;}
.cd-done{padding:34px 24px;display:flex;flex-direction:column;align-items:center;text-align:center;flex:1;}
.cd-checkc{position:relative;width:92px;height:92px;border-radius:50%;background:#fff;border:1px solid ${C.line};display:flex;align-items:center;justify-content:center;box-shadow:0 14px 34px rgba(2,128,144,.22);animation:pop .5s cubic-bezier(.18,1.4,.4,1) both;}
.cd-checkc-tick{position:absolute;bottom:2px;right:2px;width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,${C.sea},${C.mint});border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(2,195,154,.4);}
.cd-done-h{font-weight:800;font-size:23px;color:${C.ink};margin-top:20px;letter-spacing:-.4px;}
.cd-done-amt{color:${C.muted};font-size:14px;margin-top:5px;font-weight:500;}
.cd-track{width:100%;margin:26px 0 10px;display:flex;flex-direction:column;text-align:left;}
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
.cd-doneactions{display:flex;flex-direction:column;gap:9px;width:100%;margin-top:22px;}
.cd-new{background:${C.ink};color:#fff;border:none;border-radius:14px;padding:14px;font-weight:700;font-size:14px;cursor:pointer;transition:.15s;}
.cd-new:hover{background:${C.teal};}
.cd-ghost2{background:none;border:none;color:${C.teal};font-weight:600;font-size:13.5px;cursor:pointer;padding:4px;}
.cd-screen{padding:16px 14px;display:flex;flex-direction:column;gap:12px;min-height:100%;box-sizing:border-box;}
.cd-sc-head{display:flex;align-items:center;justify-content:space-between;}
.cd-sc-head h2{margin:0;font-size:21px;font-weight:800;color:${C.ink};letter-spacing:-.3px;}
.cd-addbtn{background:${C.teal};color:#fff;border:none;border-radius:11px;padding:9px 14px;font-weight:700;font-size:13px;display:inline-flex;align-items:center;gap:5px;cursor:pointer;}
.cd-addbtn:hover{background:${C.sea};}
.cd-list{display:flex;flex-direction:column;gap:9px;}
.cd-rrow,.cd-hrow{display:flex;align-items:center;gap:12px;background:#fff;border:1px solid ${C.line};border-radius:14px;padding:13px 14px;animation:rise .3s ease both;}
.cd-rmain{flex:1;min-width:0;}
.cd-rname{font-weight:700;color:${C.charcoal};font-size:14px;display:flex;align-items:center;gap:6px;}
.cd-hflag{font-size:14px;}
.cd-rsub{color:${C.muted};font-size:12px;margin-top:3px;display:flex;align-items:center;gap:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cd-del{background:none;border:none;color:#c0ccce;cursor:pointer;padding:6px;border-radius:8px;flex-shrink:0;}
.cd-del:hover{color:#e2526b;background:#fdeef0;}
.cd-hamt{text-align:right;flex-shrink:0;}
.cd-hsent{font-weight:800;color:${C.ink};font-size:13.5px;}
.cd-hrecv{color:${C.muted};font-size:11.5px;margin-top:1px;}
.cd-status{display:inline-block;margin-top:5px;font-size:9.5px;font-weight:700;color:#04332a;background:${C.mint};padding:2px 8px;border-radius:20px;}
.cd-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:7px;padding:50px 20px;}
.cd-empty-ic{width:60px;height:60px;border-radius:18px;background:#ecf7f5;display:flex;align-items:center;justify-content:center;margin-bottom:6px;}
.cd-empty-t{font-weight:800;font-size:16px;color:${C.ink};}
.cd-empty-s{color:${C.muted};font-size:13px;max-width:230px;line-height:1.45;margin-bottom:12px;}
.cd-empty .cd-primary{flex:0;padding:12px 22px;}
/* profile */
.cd-prof-top{display:flex;flex-direction:column;align-items:center;text-align:center;padding:8px 0 4px;}
.cd-prof-ava{width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,${C.teal},${C.mint});color:#fff;font-weight:800;font-size:24px;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 22px rgba(2,128,144,.3);}
.cd-prof-name{font-weight:800;font-size:19px;color:${C.ink};margin-top:12px;}
.cd-prof-email{color:${C.muted};font-size:13px;margin-top:2px;}
.cd-prof-verified{display:inline-flex;align-items:center;gap:5px;background:#ecf7f5;color:${C.teal};font-weight:700;font-size:12px;padding:5px 12px;border-radius:20px;margin-top:10px;}
.cd-card2{background:#fff;border:1px solid ${C.line};border-radius:16px;padding:15px;}
.cd-card2-h{display:flex;justify-content:space-between;align-items:baseline;font-size:12.5px;color:${C.muted};font-weight:600;}
.cd-card2-v{color:${C.ink};font-weight:800;font-size:13px;}
.cd-bar{height:8px;border-radius:5px;background:${C.cloud};margin:10px 0 8px;overflow:hidden;}
.cd-bar-fill{height:100%;border-radius:5px;background:linear-gradient(90deg,${C.teal},${C.mint});transition:width .4s;}
.cd-card2-sub{font-size:11.5px;color:${C.muted};}
.cd-sec-lbl{font-size:11.5px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:.4px;margin-top:4px;}
.cd-fund-ic{width:34px;height:34px;border-radius:10px;background:${C.cloud};display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.cd-addfund{display:flex;align-items:center;justify-content:center;gap:7px;background:#fff;border:1px dashed ${C.sea};color:${C.teal};border-radius:13px;padding:13px;font-weight:600;font-size:13px;cursor:pointer;}
.cd-addfund:hover{background:#ecf7f5;}
.cd-setval{color:${C.teal};font-weight:700;font-size:12px;margin-right:4px;}
.cd-signout{display:flex;align-items:center;justify-content:center;gap:8px;background:#fff;border:1px solid ${C.line};color:#c0445f;border-radius:13px;padding:13px;font-weight:700;font-size:13.5px;cursor:pointer;}
.cd-signout:hover{background:#fdeef0;border-color:#f3c9d2;}
.cd-caption{color:#5c7079;font-size:11px;margin-top:16px;letter-spacing:.2px;}
@keyframes rise{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}
@keyframes blink{0%,60%,100%{opacity:.25;transform:translateY(0);}30%{opacity:1;transform:translateY(-2px);}}
@keyframes pop{from{transform:scale(.4);opacity:0;}to{transform:scale(1);opacity:1;}}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(2,128,144,.4);}50%{box-shadow:0 0 0 6px rgba(2,128,144,0);}}
/* home */
.cd-home{padding:18px 16px;display:flex;flex-direction:column;gap:16px;}
.cd-greet{font-size:22px;font-weight:800;color:${C.ink};letter-spacing:-.4px;}
.cd-greet-sub{color:${C.muted};font-size:13.5px;margin-top:2px;}
.cd-bigsend{display:flex;align-items:center;gap:13px;background:linear-gradient(135deg,${C.teal} 0%,${C.sea} 65%,${C.mint} 125%);border:none;border-radius:20px;padding:17px 16px;cursor:pointer;text-align:left;box-shadow:0 14px 30px rgba(2,128,144,.32),inset 0 1px 0 rgba(255,255,255,.16);transition:.18s;}
.cd-bigsend:hover{transform:translateY(-2px);box-shadow:0 16px 34px rgba(2,128,144,.38);}
.cd-bigsend-ic{width:44px;height:44px;border-radius:13px;background:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 3px 8px rgba(0,0,0,.12);}
.cd-bigsend-txt{flex:1;display:flex;flex-direction:column;gap:2px;}
.cd-bigsend-h{color:#fff;font-weight:800;font-size:17px;}
.cd-bigsend-s{color:rgba(255,255,255,.85);font-size:12px;}
.cd-limit-mini{background:#fff;border:1px solid #e9eff0;border-radius:16px;padding:14px;box-shadow:0 1px 2px rgba(11,32,39,.04);}
.cd-lm-row{display:flex;justify-content:space-between;align-items:baseline;font-size:12.5px;color:${C.muted};font-weight:600;margin-bottom:9px;}
.cd-lm-v{color:${C.ink};font-weight:800;font-size:12.5px;}
.cd-home-sec{display:flex;flex-direction:column;gap:10px;}
.cd-home-sec-h{display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:800;color:${C.ink};}
.cd-seeall{background:none;border:none;color:${C.teal};font-weight:700;font-size:12px;cursor:pointer;}
.cd-quickrow{display:flex;gap:12px;overflow-x:auto;padding:2px 0 4px;}
.cd-quickrow::-webkit-scrollbar{height:0;}
.cd-quick{display:flex;flex-direction:column;align-items:center;gap:6px;background:none;border:none;cursor:pointer;flex-shrink:0;width:58px;}
.cd-quick-ava{width:52px;height:52px;border-radius:50%;background:#fff;border:1px solid ${C.line};display:flex;align-items:center;justify-content:center;font-size:24px;transition:.15s;}
.cd-quick:hover .cd-quick-ava{border-color:${C.sea};transform:translateY(-2px);box-shadow:0 6px 14px rgba(2,128,144,.14);}
.cd-quick-ava.add{background:#ecf7f5;border:1px dashed ${C.sea};}
.cd-quick-name{font-size:11.5px;font-weight:600;color:${C.charcoal};max-width:58px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cd-home-empty{background:#fff;border:1px dashed ${C.line};border-radius:13px;padding:18px;text-align:center;color:${C.muted};font-size:12.5px;}
/* flow top bar */
.cd-flowtop{display:flex;align-items:center;justify-content:space-between;padding:10px 14px 0;}
.cd-flowback{background:none;border:none;color:${C.teal};font-weight:700;font-size:13px;display:inline-flex;align-items:center;gap:2px;cursor:pointer;padding:4px 0;}
@media (prefers-reduced-motion:reduce){*{animation:none!important;}}
`;
