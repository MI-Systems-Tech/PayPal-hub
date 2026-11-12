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
| 404 | NOT_FOUND | Subscription does not exist |
| 409 | EMAIL_TAKEN | An account with this email already exists |
| 500 | CONFIG_ERROR | Server is missing required configuration, such as the plan ID |
| 500 | INTERNAL_ERROR | Unexpected server error |
| 502 | PAYPAL_ERROR | PayPal rejected or failed the request |

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

Both routes need `Authorization: Bearer <token>`.

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

Captures the payment after the buyer has approved it. Call this when the buyer returns to the app, using the `order_id` from the create step.

Request: no body.

Response 200:

    {
      "order_id": "7NW60343NX219931H",
      "status": "COMPLETED"
    }

A `status` of `COMPLETED` means the payment went through.

Errors: 401 UNAUTHORIZED, 502 PAYPAL_ERROR

Return URLs after PayPal approval or cancel:
- `https://paypal-hub.vercel.app/payment/approved`
- `https://paypal-hub.vercel.app/payment/cancelled`

---

## PayPal: subscriptions

Both routes need `Authorization: Bearer <token>`. Subscriptions use the plan configured on the server.

### POST /paypal/subscriptions

Starts a subscription. Send the buyer to `approve_url` to agree on PayPal. Status is `APPROVAL_PENDING` until the buyer approves.

Request: no body.

Response 201:

    {
      "subscription_id": "I-LSW6XBWXUPEK",
      "status": "APPROVAL_PENDING",
      "approve_url": "https://www.sandbox.paypal.com/..."
    }

Errors: 401 UNAUTHORIZED, 500 CONFIG_ERROR, 502 PAYPAL_ERROR

### GET /paypal/subscriptions/:id

Checks a subscription's status. Call this after the buyer returns, and show success when `status` is `ACTIVE`.

Response 200:

    {
      "subscription_id": "I-LSW6XBWXUPEK",
      "status": "ACTIVE",
      "plan_id": "P-949397489C7034449NL2ST5Q",
      "next_billing_time": "2026-12-11T..."
    }

Errors: 401 UNAUTHORIZED, 404 NOT_FOUND, 502 PAYPAL_ERROR

Return URLs after PayPal approval or cancel:
- `https://paypal-hub.vercel.app/subscription/approved`
- `https://paypal-hub.vercel.app/subscription/cancelled`

---

## Internal (not for the frontend)

### POST /paypal/setup

Creates the PayPal product and monthly plan. Run once per PayPal app, then copy the returned `plan_id` into `PAYPAL_PLAN_ID`. Requires a login token.