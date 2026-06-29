# Conduit

**Money moves. Brains guide it.**

An AI-guided money-transfer app that compares every provider and routes your
transfer the cheapest, fastest way. This repo is the first real, runnable build:
a React frontend and a Node backend, with a **live Wise integration** as the
first real provider rail (the rest are simulated until their keys are added).

```
conduit/
├── server/   Node + Express API — the comparison engine (live Wise + simulated)
└── web/      Vite + React frontend — the Conduit app, calling the API
```

---

## Requirements

- **Node.js 18+** (Node 20 or 22 recommended — uses native `fetch`)

## Quick start

From the project root:

```bash
npm install      # installs root, server, and web
npm run dev      # starts the API (:4000) and the web app (:5173) together
```

Then open **http://localhost:5173**. Everything works immediately — all providers
are simulated until you switch Wise on (see below).

> Prefer two terminals? Run `npm --prefix server run dev` and
> `npm --prefix web run dev` separately.


## Turning on the live Wise quote

By default everything is simulated, so the app works with zero setup. To make
**Wise** return real sandbox pricing:

1. Get **Wise Platform sandbox** credentials — a user access token and a
   profile id — from the Wise Developer Hub / partner onboarding.
   Docs: https://docs.wise.com/api-reference/quote/quotecreate
2. In `server/.env`:
   ```
   WISE_API_BASE=https://api.sandbox.transferwise.tech
   WISE_API_TOKEN=your_sandbox_token
   WISE_PROFILE_ID=your_sandbox_profile_id
   ```
3. Restart the API. `GET /api/health` will report `"wiseLive": true`, and any
   **Bank** transfer will fetch a real Wise quote. If the live call fails for a
   given route, the server quietly falls back to a simulated Wise quote so the
   UX never breaks (`source: "wise-fallback"` in the response).

Each quote in the API response carries a `source` field — `wise-live`,
`wise-fallback`, or `simulated` — so you can see exactly where a price came from.

---

## The API

`POST /api/compare`
```json
{ "fromCur": "AUD", "toCur": "PKR", "amount": 500, "method": "Bank", "token": "USDC" }
```
- `method` is one of `Bank`, `Wallet`, `Cash` — it selects which providers compete.
- `token` (`USDC` / `USDT`) is the receive asset when `method` is `Wallet`.

Returns providers ranked best-received first:
```json
{
  "destCur": "PKR",
  "quotes": [
    { "p": { "id": "circle", "name": "Circle", ... },
      "mid": 182.9, "conduitFee": 5, "providerFee": 2.5,
      "received": 89895.5, "totalCost": 8.49, "source": "simulated" }
  ]
}
```

`GET /api/health` → `{ "ok": true, "wiseLive": false }`

---

## What's real vs. simulated

| Piece | Status |
| --- | --- |
| Frontend UX (onboarding, send flow, recipients, activity, profile, funding) | Real React app |
| Comparison engine / ranking | Real — runs server-side |
| **Wise** quote (Bank transfers) | **Live** when sandbox keys are set, else simulated |
| Circle, Ramp, Nium, Stripe, Western Union | Simulated (add their APIs the same way `server/src/providers/wise.js` adds Wise) |
| KYC / identity verification | Mocked in the UI (wire to Onfido/Persona later) |
| Funding / pay-in and settlement | Mocked (no money moves) |
| Recipients & history persistence | In-memory in the browser (add a DB — e.g. Supabase — next) |

---

## Adding the next provider

`server/src/providers/wise.js` is the template. Create a sibling (e.g.
`nium.js`) exporting an async function that returns the same shape
(`{ mid, conduitFee, providerFee, received, totalCost, source }`), then wire it
into `server/src/compare.js`. The frontend needs no changes.

---

## Next steps

- Add a database for users, recipients, and transfers (Supabase fits the model).
- Real KYC via Onfido or Persona at onboarding.
- A second live provider (Nium or Circle) for emerging-market and crypto rails.
- Auth (the onboarding flow is currently mocked end-to-end).

_Prototype/sandbox software — no real funds move. Get fintech compliance advice
(AUSTRAC registration, KYC/AML obligations) before handling real money._
