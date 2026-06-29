// Stripe Identity — document + selfie verification.
// The SECRET key lives here (server-side only), read from the env var
// STRIPE_SECRET_KEY on Render. It must NEVER appear in the frontend or in GitHub.
// Uses Stripe's REST API directly (Node 18+ global fetch) — no extra dependency.

const KEY = process.env.STRIPE_SECRET_KEY || "";
const BASE = "https://api.stripe.com/v1";

export function stripeConfigured() {
  return KEY.startsWith("sk_");
}

function formEncode(obj) {
  return Object.entries(obj)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

// Creates a hosted verification session and returns its redirect URL + id.
export async function createIdentitySession(returnUrl) {
  if (!stripeConfigured()) throw new Error("Stripe Identity not configured");
  const body = formEncode({
    type: "document",
    "options[document][require_matching_selfie]": "true",
    return_url: returnUrl,
  });
  const res = await fetch(`${BASE}/identity/verification_sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Stripe ${res.status}`);
  return { id: data.id, url: data.url, status: data.status };
}

// Looks up the current status: requires_input | processing | verified | canceled.
export async function getIdentityStatus(id) {
  if (!stripeConfigured()) throw new Error("Stripe Identity not configured");
  const res = await fetch(`${BASE}/identity/verification_sessions/${id}`, {
    headers: { Authorization: `Bearer ${KEY}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Stripe ${res.status}`);
  return { status: data.status, error: data.last_error?.reason || null };
}
