# API Contract

Base URL (production): https://paypal-hub-backend.onrender.com
Base URL (local): http://localhost:4000

All request and response bodies are JSON. Send `Content-Type: application/json` on POST requests.

## Error format

Every error uses this shape:

    { "error": { "code": "CODE", "message": "Human-readable message." } }

| Status | Code | Meaning |
|---|---|---|
| 400 | VALIDATION_ERROR | Missing or malformed field, or body is not valid JSON |
| 401 | UNAUTHORIZED | Missing, invalid, or expired token |
| 401 | INVALID_CREDENTIALS | Wrong email or password |
| 401 | INVALID_GOOGLE_TOKEN | Firebase ID token could not be verified |
| 401 | UNVERIFIED_EMAIL | Google account email is not verified |
| 404 | NOT_FOUND | Order or subscription does not exist, or belongs to another user |
| 409 | EMAIL_TAKEN | An account with this email already exists |
| 500 | CONFIG_ERROR | Server is missing required configuration |
| 500 | INTERNAL_ERROR | Unexpected server error |
| 502 | PAYPAL_ERROR | PayPal rejected or failed the request |
| 502 | FX_ERROR | Exchange rates could not be loaded |
| 502 | AI_ERROR | The AI service could not complete the review |
| 502 | DISCOVER_ERROR | Product search failed |

## Tokens

Signup, login, and Google sign-in return a token that expires after 24 hours. Send it on protected routes as:

    Authorization: Bearer <token>

When a protected route returns 401, clear the stored token and send the user to login. Logout does not invalidate the token on the server. The frontend must delete its stored copy.

## GET /health

No auth. Response 200:

    { "status": "ok" }

## POST /auth/signup

Request:

    { "email": "ada@example.com", "password": "at-least-8-chars" }

Response 201:

    {
      "user": { "id": "usr_1a2b3c4d", "email": "ada@example.com" },
      "token": "eyJ..."
    }

Errors: 400 VALIDATION_ERROR, 409 EMAIL_TAKEN

Rules: email must look like an address. Password must be at least 8 characters.

## POST /auth/login

Request:

    { "email": "ada@example.com", "password": "at-least-8-chars" }

Response 200:

    {
      "user": { "id": "usr_1a2b3c4d", "email": "ada@example.com" },
      "token": "eyJ..."
    }

Errors: 400 VALIDATION_ERROR, 401 INVALID_CREDENTIALS

Accounts created with Google have no password, so they cannot log in here.

## POST /auth/google

Firebase sign-in. The frontend signs the user in with Firebase, then sends the ID token here.

Request:

    { "idToken": "firebase-id-token" }

Response 200:

    {
      "user": { "id": "usr_1a2b3c4d", "email": "ada@example.com" },
      "token": "eyJ..."
    }

If no account exists for that email, one is created. If one exists, it is returned.

Errors: 400 VALIDATION_ERROR, 401 INVALID_GOOGLE_TOKEN, 401 UNVERIFIED_EMAIL

## GET /auth/me

Header: `Authorization: Bearer <token>`

Response 200:

    { "user": { "id": "usr_1a2b3c4d", "email": "ada@example.com" } }

Errors: 401 UNAUTHORIZED

## POST /auth/logout

Header: `Authorization: Bearer <token>`

Response 204, no body.

Errors: 401 UNAUTHORIZED

---

## PayPal: one-time payments

Both routes need `Authorization: Bearer <token>`. An order belongs to the user who created it.

### POST /paypal/orders

Creates a one-time order. Send the buyer to `approve_url` so they can approve the payment on PayPal.

Request (optional body, defaults to 5.00 USD):

    { "amount": "5.00" }

Response 201:

    {
      "order_id": "7NW60343NX219931H",
      "status": "CREATED",
      "approve_url": "https://www.sandbox.paypal.com/..."
    }

Errors: 401 UNAUTHORIZED, 502 PAYPAL_ERROR

### POST /paypal/orders/:id/capture

Captures the payment after the buyer has approved it. Call this when the buyer returns to the app, using the `order_id` from the create step. If the order doesn't exist or belongs to another user, the response is 404.

Request: no body.

Response 200:

    {
      "order_id": "7NW60343NX219931H",
      "status": "COMPLETED"
    }

A `status` of `COMPLETED` means the payment went through.

Errors: 401 UNAUTHORIZED, 404 NOT_FOUND, 502 PAYPAL_ERROR

Return URLs after PayPal approval or cancel:
- `https://paypal-hub.vercel.app/payment/approved`
- `https://paypal-hub.vercel.app/payment/cancelled`

---

## PayPal: subscriptions

All routes need `Authorization: Bearer <token>`. Subscriptions are saved under the signed-in user, so each user sees only their own.

### POST /paypal/subscriptions

Starts a subscription. Send the buyer to `approve_url`. Status is `APPROVAL_PENDING` until the buyer approves.

Request (optional body): the service name shown in the ledger, such as "Netflix". If omitted, it's "Subscription". Maximum 80 characters.

    { "name": "Netflix" }

Response 201:

    {
      "subscription_id": "I-LSW6XBWXUPEK",
      "status": "APPROVAL_PENDING",
      "approve_url": "https://www.sandbox.paypal.com/..."
    }

Errors: 400 VALIDATION_ERROR, 401 UNAUTHORIZED, 500 CONFIG_ERROR, 502 PAYPAL_ERROR

Return URLs after PayPal approval or cancel:
- `https://paypal-hub.vercel.app/subscription/approved`
- `https://paypal-hub.vercel.app/subscription/cancelled`

### GET /paypal/subscriptions

Lists the user's subscriptions created through PayPal Hub, up to 20.

Response 200:

    {
      "subscriptions": [
        {
          "subscription_id": "I-LSW6XBWXUPEK",
          "name": "Netflix",
          "status": "ACTIVE",
          "plan_id": "P-949397489C7034449NL2ST5Q",
          "plan_amount": "10.00",
          "currency": "USD",
          "days_since_used": 3,
          "last_used_at": "2026-11-09T10:00:00.000Z",
          "next_billing_time": "2026-12-11T10:00:00Z"
        }
      ]
    }

Errors: 401 UNAUTHORIZED, 502 PAYPAL_ERROR

### GET /paypal/subscriptions/:id

Returns one subscription the user owns. If it doesn't exist or belongs to another user, the response is 404. Use this after the buyer returns, and show success when `status` is `ACTIVE`.

Response 200: same shape as one item in the list above.

`plan_amount` and `currency` come from the PayPal plan. Possible `status` values include `APPROVAL_PENDING`, `ACTIVE`, `SUSPENDED`, `CANCELLED`, and `EXPIRED`.

Errors: 401 UNAUTHORIZED, 404 NOT_FOUND, 502 PAYPAL_ERROR

### POST /paypal/subscriptions/:id/used

Marks a subscription as used now. The date is stored on the server, so every device sees the same value. `days_since_used` resets to 0.

Request: no body.

Response 200: same shape as one item in the list above, with `days_since_used` set to 0.

Errors: 401 UNAUTHORIZED, 404 NOT_FOUND, 502 PAYPAL_ERROR

---

## Discover

### POST /discover/search

Turns a plain-language request into a product search, then returns matching products from Channel3. Uses AI to build the search query.

Request:

    { "need": "wireless headphones under 100 dollars" }

Rules: `need` is a string of at least 3 characters.

Response 200:

    {
      "query": "wireless headphones",
      "products": [
        {
          "name": "Example Wireless Headphones",
          "brand": "Example",
          "price": 89.99,
          "currency": "USD",
          "url": "https://retailer.example/product",
          "image": "https://retailer.example/image.jpg"
        }
      ]
    }

Up to 10 products. Any field can be `null` if the retailer doesn't provide it, so the frontend should handle missing values. The `query` is the search the AI built, so the frontend can show it to the user.

Errors: 400 VALIDATION_ERROR, 500 CONFIG_ERROR, 502 DISCOVER_ERROR

---

## Guardian

### POST /guardian/review

Reviews subscriptions against the user's monthly budget. Each amount can be in any supported currency. The server converts everything to USD before the review, using daily exchange rates, so all amounts are compared fairly.

Request:

    {
      "budget": { "amount": 50000, "currency": "NGN" },
      "subscriptions": [
        { "id": "I-LSW6XBWXUPEK", "name": "Netflix", "monthly_cost": 15, "currency": "USD", "days_since_used": 3 },
        { "id": "row-2", "name": "Design tool", "monthly_cost": 20000, "currency": "NGN", "days_since_used": 40 }
      ]
    }

Validation rules:
- `budget.amount`: number, 0 or more. `budget.currency`: 3-letter ISO code, such as `NGN` or `USD`.
- `subscriptions`: 1 to 50 items.
- Each `id`: non-empty string, unique within the request. It is returned with its recommendation. For PayPal subscriptions, use the `subscription_id`.
- Each `name`: string, the service name.
- Each `monthly_cost`: number, 0 or more. Each `currency`: 3-letter ISO code.
- Each `days_since_used`: number, 0 or more. For PayPal subscriptions, use the `days_since_used` from the list route.

Response 200:

    {
      "budget_usd": 37.04,
      "rates_updated": "Thu, 12 Nov 2026 00:02:31 +0000",
      "attribution": "Exchange rates by ExchangeRate-API (https://www.exchangerate-api.com)",
      "recommendations": [
        { "id": "I-LSW6XBWXUPEK", "name": "Netflix", "decision": "keep", "reason": "Used recently and within budget." },
        { "id": "row-2", "name": "Design tool", "decision": "cancel", "reason": "High cost and not used recently." }
      ]
    }

`decision` is `keep`, `cancel`, or `review`. A subscription may have no recommendation. Converted amounts are estimates from a daily rate.

Errors: 400 VALIDATION_ERROR (including an unsupported currency), 500 CONFIG_ERROR, 502 FX_ERROR, 502 AI_ERROR

---

## Internal (not for the frontend)

### POST /paypal/setup

Creates the PayPal product and monthly plan. Run once per PayPal app, then copy the returned `plan_id` into `PAYPAL_PLAN_ID`. Requires a login token.