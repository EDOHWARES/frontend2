# Session expiry behavior

The frontend wallet-sign-in flow (`src/lib/session.ts`) validates session
tokens against an expiry timestamp and clears expired sessions automatically.
This document describes the validation rules and the resulting sign-in
behavior so contributors know what the code already does and what to expect
when a session lapses.

## Token shape

A session token has two fields:

```ts
interface SessionToken {
  token: string;   // opaque server-issued string sent as a Bearer token
  expiresAt: number; // epoch milliseconds when the token becomes invalid
}
```

The backend's `SessionExchangeResponse` provides both values after the wallet
signature is verified (see `authenticateWithWallet` below). The frontend never
computes `expiresAt` itself.

## Expiry validation

`isExpired(session)` returns `true` when `expiresAt` is not a finite number or
when the current time has passed it:

```ts
return !Number.isFinite(session.expiresAt) || Date.now() >= session.expiresAt;
```

Every code path that touches the session calls `isExpired` before trusting the
token:

| Path | What happens on expiry |
|------|------------------------|
| `getSessionToken()` | Calls `clearSession()` and returns `null`. |
| `setSession(session)` | Throws `SessionAuthError("Invalid or expired session")`. |
| `syncStore()` | Sets `authState` to `{ authenticated: false, token: null, expiresAt: null }`. |
| `loadPersistedSession()` | Removes the item from `sessionStorage` and returns `null`. |

## Automatic expiry timer

`setSession` schedules a `setTimeout` that fires `clearSession` at the moment
the token expires (capped at the max 32-bit signed integer delay):

```ts
expiryTimer = setTimeout(clearSession, Math.min(session.expiresAt - Date.now(), 2_147_483_647));
```

`clearSession` cancels that timer, nulls the in-memory session, removes the
persisted copy, and pushes the unauthenticated state to the `authState` store.
Any component subscribed to `authState` re-renders with `authenticated: false`.

## Persistence and restore

Sessions are written to `sessionStorage` under the key `session_token`. On
module load the persisted token is read back, validated with `isExpired`, and
either restored via `setSession` or discarded. `sessionStorage` is scoped to
the tab, so closing the tab discards the session automatically.

The write and read paths swallow `Storage` errors (quota exceeded, privacy
mode) so the app degrades gracefully — the session stays in memory for the
tab's lifetime but is not restored after a reload.

## Sign-in flow

`authenticateWithWallet(address, signChallenge, api)` performs a three-step
challenge–response:

1. **Request challenge** — `api.requestChallenge(address)` returns
   `{ challenge, expiresAt }`. If the challenge is missing, non-finite, or
   already past its `expiresAt`, the function throws
   `SessionAuthError("Failed to obtain authentication challenge")`.

2. **Sign** — the caller's `signChallenge` callback produces a wallet
   signature. An empty or falsy signature throws
   `SessionAuthError("Wallet signature was rejected")`.

3. **Exchange** — `api.exchangeSignature({ address, challenge, signature })`
   returns `{ token, expiresAt }`. If the response is missing `token` or
   `expiresAt`, or either has the wrong type, the function throws
   `SessionAuthError("Invalid session response from server")`.

On success, `setSession` stores the token, starts the expiry timer, persists
to `sessionStorage`, and syncs `authState` to authenticated.

### Fictional example

```
address:  GABCDEXAMPLE0000000000000000000000000000000000000000000
challenge: "sign-this-nonce-abc123"
signature: "<base64 signature blob>"
token:    "eyJhbGciOi..." (server-issued, opaque)
expiresAt: 1734567890000
```

## HTTP integration

At the bottom of `session.ts`, `setTokenProvider(getSessionToken)` registers
`getSessionToken` as the bearer-token source for the HTTP client
(`src/api/http.ts`). Every API request calls `getSessionToken`, which re-checks
expiry on each call. An expired token is cleared on the spot and the request
goes out without a bearer token, so the backend sees an unauthenticated call
rather than a stale credential.
