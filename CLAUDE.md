# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Git Finance** — AI-powered personal finance bot via WhatsApp. Users send natural language messages (Indonesian) to a WA number; the bot classifies intent, records transactions, checks balances, and generates spending recaps. No mobile app required.

## Service Layout

```
messaging-service/   ← WhatsApp gateway (Baileys). Receives messages, strips group/broadcast/self, forwards to finance-service. Zero business logic.
finance-service/     ← All business logic: auth, AI classification, transactions, Supabase.
testing-service/     ← Test runner (runner.js) + data reset (reset-user.js) + Postman collection.
```

Each service has its own `package.json` and `.env`. They do not share dependencies.

## Common Commands

```bash
# finance-service
cd finance-service
cp .env.example .env   # fill in SUPABASE_URL, SUPABASE_KEY, OPENROUTER_API_KEY, RESEND_API_KEY
npm install
npm start              # production
npm run dev            # nodemon watch mode

# messaging-service
cd messaging-service
cp .env.example .env   # fill in FINANCE_SERVICE_URL
npm install
npm start              # scan QR with WhatsApp → Linked Devices

# testing-service (finance-service must be running first)
cd testing-service
npm test               # all 57 test cases
npm run test:part1     # Section A–E: Income/Outcome/Transfer/Balance (32 cases)
npm run test:part2     # Section F–I: Recap/Ambiguous/General/Security (25 cases)
npm run test:quick     # 2 cases — fast sanity check
npm run reset          # wipe test user data from DB (uses USER_ID from .env)
```

## Architecture: Request Flow

```
User WA → messaging-service → POST /process {from, body} → finance-service
                                                                  │
                                        1. Auth check (checkAuth) ─── sbRpc("get_user_by_wa")
                                        2. AI classify (classifyMessage) ── OpenRouter 7-model fallback
                                        3. Intent validate (validateIntent)
                                        4. Confidence < 70% → Safe Mode (ask user to confirm)
                                        5. Execute intent → Supabase
                                        6. Return { reply: "..." } → messaging-service → sendMessage
```

## Key Files

| File | Role |
|---|---|
| `finance-service/src/routes/finance.route.js` | Main request handler — auth flow, intent dispatch, all route definitions |
| `finance-service/src/modules/ai/ai.service.js` | `classifyMessage()` + `buildPrompt()` + OpenRouter call + model fallback loop |
| `finance-service/src/modules/auth/auth.service.js` | Email verification flow: `requestEmailVerification`, `verifyAuthCode` |
| `finance-service/src/middleware/auth.middleware.js` | `checkAuth()` — looks up WA number, returns `{verified, userId}` |
| `finance-service/src/config/index.js` | All env vars in one place + `validateConfig()` (fails fast on startup) |
| `finance-service/src/utils/supabase.js` | `sbGet`, `sbPost`, `sbRpc` — raw axios wrappers for Supabase REST API (no SDK) |
| `finance-service/Supabase/schema.sql` | Full DB schema + PostgreSQL functions — run this in Supabase SQL Editor |

## Auth Flow (3-step via WA chat)

1. User sends any message → bot replies asking for email
2. User sends `user@example.com` → bot generates 6-digit code, emails it via Resend, replies with format
3. User sends `user@example.com verify-XXXXXX` → bot verifies code, marks session active

Regex patterns in `finance.route.js:91–109` handle steps 1–2 before reaching `checkAuth`.

## AI Intent System

`classifyMessage()` tries each model in `config.openrouter.modelFallbackChain` (7 models, all free tier) until one succeeds. The prompt (`buildPrompt()`) returns pure JSON with these intents:

- `ADD_TRANSACTION` — requires `amt > 0` and `type` (INCOME/OUTCOME)
- `TRANSFER` — requires `amt`, `rek_from`, `rek_to`
- `CHECK_BALANCE` — requires `rek`
- `CHECK_BALANCE_ALL` — no params
- `GET_RECAP` — no params
- `GENERAL` — fallback; bot replies "Bukan Track Keuangan"

`validateIntent()` in the route file re-checks AI output and downgrades to GENERAL if required fields are missing.

## Supabase Pattern

All DB calls go through `sbGet`/`sbPost`/`sbRpc` in `utils/supabase.js` using the **service_role key** (bypasses RLS). Complex operations are PostgreSQL functions called via `sbRpc`:

- `upsert_account_balance(user_id, name, delta)` — atomic saldo update
- `get_user_by_wa(wa_number)` — returns `{user_id, is_verified, ...}`
- `generate_auth_code(wa_number)` — writes 6-digit code + 10-min expiry to `wa_sessions`
- `verify_auth_code(wa_number, code)` — validates + one-time use + sets `is_active=true`

## Business Rules

- **Confidence threshold**: `CONFIDENCE_THRESHOLD=70` (env). Below this → Safe Mode prompt, no DB write.
- **Payday period**: `PAYDAY_DATE=28` (env). `getPeriodeGajian()` calculates current salary period for recap.
- **Account normalization**: `normalizeRekening()` in `transaction.service.js` maps aliases (e.g. "jago" → "Bank Jago", "gopay" → "GoPay").
- **Rate limiting**: In-memory (`rate-limit.js`): 3 email requests/min, 5 verify attempts/min. Resets on restart.
- **TrxId format**: `TRX-XXXXXXXX` (random hex), unique per user enforced by DB constraint.

## Known Pre-Production Issues

- `auth.service.js:57` — `code` field is returned in the response for testing convenience. Must be removed before production.
- No authentication between messaging-service and finance-service (open HTTP). Add a shared secret/API key before exposing to the internet.
- In-memory rate limiter does not survive restarts or work across multiple instances.
