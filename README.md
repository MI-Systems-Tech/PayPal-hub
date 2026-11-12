# PayPal Hub

PayPal Hub helps people keep track of what they pay for online. It brings subscription records, usage reminders, AI-assisted review and service discovery into one place. Built for the **PayPal AI Hackathon 2026**.

> **Sandbox disclosure:** This prototype uses **PayPal Sandbox**. No real money is transferred. The ledger is not an import of a user's PayPal account history: it shows only subscriptions created through PayPal Hub and saved for the signed-in user. It cannot see subscriptions created directly with other providers or outside this app.

## Live links

- **Frontend:** <https://paypal-hub.vercel.app>
- **Backend API:** <https://paypal-hub-backend.onrender.com>
- **Backend health check:** <https://paypal-hub-backend.onrender.com/health>
- **API contract:** [docs/api-contract.md](docs/api-contract.md)

## What the project does

- **Accounts — implemented:** Email/password accounts and Google sign-in through Firebase Authentication. The backend verifies users and issues a 24-hour API token. Google-created accounts do not have a password for email/password login.
- **One-time PayPal payment — implemented in the prototype:** The checkout flow creates a USD 5.00 PayPal Sandbox order, sends the buyer to PayPal for approval, then captures the order when the buyer returns. A successful payment is reported only when PayPal returns `COMPLETED`.
- **PayPal subscription — implemented in the prototype:** The backend creates a subscription against the configured `PAYPAL_PLAN_ID`; the current test plan is Guardian Monthly at USD 10.00 per month. PayPal approval is checked after the buyer returns. This is a test subscription for the Hub flow, not a purchase of a service from Discover.
- **Subscription ledger — implemented locally:** The Hub loads the signed-in user's PayPal Hub subscriptions from `GET /paypal/subscriptions`, including service name, plan price, PayPal status and last-use information. It does not import subscriptions created outside PayPal Hub.
- **Mark as used — implemented locally:** The Hub calls `POST /paypal/subscriptions/:id/used`, which saves the latest usage timestamp in Firestore for that account. Sample rows remain local demonstration data.
- **Guardian AI review — implemented locally:** The Hub submits eligible ledger rows and the selected planning limit to `POST /guardian/review`. Groq returns `keep`, `cancel` or `review` suggestions with reasons. Recommendations are prompts for the user, not cancellation actions.
- **Discover — implemented locally:** Discover sends the user's request to `POST /discover/search`; Groq builds the product query and Channel3 returns product results. The existing comparison directory remains available alongside product results. Provider payment availability is not guaranteed.
- **AG Grid — implemented locally:** The Hub uses AG Grid Community for a sortable, filterable subscription table. A custom budget-summary widget is included; AG Studio evaluation mode is limited to local development because the trial key is not licensed for production.

The frontend integrations above have passed a Vite production build. They still require live user-flow testing and a Vercel production deployment; a successful build alone does not prove each external flow works end to end.

## How it works

The project has a React frontend and an Express backend:

- **Frontend (`frontend/`)** — React 18, React Router and Vite. It handles account screens, the Hub interface, Discover comparisons and PayPal checkout/return screens.
- **Backend (`backend/`)** — Express API. It handles account verification and tokens, PayPal order and subscription operations, per-user Firestore records, Guardian review requests and product search.
- **Firebase** — Firebase Authentication supports Google sign-in; Firebase Admin verifies Google ID tokens. Cloud Firestore stores account and PayPal Hub subscription/order records.
- **PayPal** — PayPal Sandbox creates and captures one-time orders and manages the recurring test plan.
- **Groq** — Builds Discover search queries and performs the Guardian review.
- **Channel3** — Returns product search results for Discover.
- **ExchangeRate-API** — Provides daily currency rates used to convert budgets and subscription amounts to USD for Guardian review. Converted amounts are estimates, not bank or card settlement values.

## Repository layout

```text
PayPal-hub/
├── backend/                 # Express API, PayPal routes and backend environment template
├── frontend/                # React + Vite application
├── docs/
│   └── api-contract.md      # API routes, payloads, responses and error format
├── LICENSE                 # MIT License
└── README.md
```

The complete backend route contract is in [docs/api-contract.md](docs/api-contract.md). Frontend routes and screens are defined in `frontend/src/App.jsx`; the key screens include the Hub, Checkout and Discover components.

## Run locally

Use a current Node.js LTS release and npm. The frontend dependency tree may emit engine warnings on older Node versions; Node **24.12.0 or later** avoids the Firebase package engine warnings observed during development.

### 1. Configure and run the backend

From the repository root:

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env` and provide the required values. Do not commit `.env`, Firebase service-account JSON, PayPal credentials, Groq keys or Channel3 keys.

Start the API:

```bash
node server.js
```

In another terminal, check the health route:

```bash
curl -i http://localhost:4000/health
```

Expected response:

```json
{"status":"ok"}
```

### Backend environment variables

| Variable | Required | Purpose |
|---|---:|---|
| `PORT` | No | HTTP port. Defaults to `4000`. |
| `JWT_SECRET` | Yes | Secret used to sign the backend's 24-hour API tokens. Set a strong, private value; do not use the development fallback in production. |
| `CORS_ORIGIN` | Yes for deployed frontend | Comma-separated list of allowed browser origins. For local Vite development use `http://localhost:5173`; include the deployed Vercel origin when deploying. |
| `FIREBASE_SERVICE_ACCOUNT` | Yes | Firebase Admin service-account JSON supplied as one environment-variable value. The backend exits at startup if it is missing. Keep it private. |
| `PAYPAL_CLIENT_ID` | Yes | PayPal Sandbox app client ID. |
| `PAYPAL_CLIENT_SECRET` | Yes | PayPal Sandbox app secret. Keep it private. |
| `PAYPAL_ENV` | Yes | Use `sandbox` for this hackathon prototype. The backend selects PayPal Sandbox unless this is explicitly set to `live`; do not use live credentials for the demo. |
| `PAYPAL_PLAN_ID` | After setup | ID of the recurring PayPal plan created by `POST /paypal/setup`. |
| `GROQ_API_KEY` | For Guardian and Discover | API key used by the backend to call Groq. |
| `GROQ_MODEL` | For Guardian and Discover | Groq model name. The model used during local testing was `openai/gpt-oss-20b`. |
| `CHANNEL3_API_KEY` | For Discover | API key used by the backend to retrieve product results from Channel3. |

For `FIREBASE_SERVICE_ACCOUNT`, use the JSON service-account key for the Firebase project. When entering it into a hosting dashboard, keep it as valid JSON in a single variable value; do not put the JSON file in the repository.

### 2. Configure and run the frontend

Open another terminal from the repository root:

```bash
cd frontend
npm install
cp .env.example .env.local
```

Set the frontend variables in `frontend/.env.local`:

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend base URL, for example `http://localhost:4000` for local work or `https://paypal-hub-backend.onrender.com` for the deployed backend. |
| `VITE_FIREBASE_API_KEY` | Firebase web-app API key. |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Authentication domain. |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID. |

Start Vite:

```bash
npm run dev
```

Open the local URL printed by Vite (normally <http://localhost:5173>). Values prefixed with `VITE_` are delivered to the browser; never put private server credentials in frontend variables. Do not commit `.env.local`.

## PayPal Sandbox setup

1. In the PayPal Developer Dashboard, create a Sandbox REST app and copy its client ID and secret into the backend environment.
2. Link the Sandbox app to a Sandbox **Business** account. For the test, use a business account in the same country as the Sandbox buyer account.
3. Create a separate Sandbox **Personal** buyer account. Use this buyer to approve the test payment and subscription; do not use a real PayPal account.
4. Configure `PAYPAL_ENV=sandbox` and the remaining required backend variables.
5. Sign in to the app and call the authenticated `POST /paypal/setup` route once. It creates the PayPal product and monthly plan and returns a `plan_id`.
6. Copy the returned plan ID into `PAYPAL_PLAN_ID` in the backend environment, then restart or redeploy the backend.

`POST /paypal/setup` is an internal setup route, not a normal user checkout action. Run it once for the PayPal app/plan configuration; do not create a new plan for every buyer.

## How to try the main flows

Use a signed-in account in PayPal Hub and a **Sandbox Personal buyer account** when PayPal redirects to its approval page.

### One-time payment

1. Open Checkout and choose the one-time Sandbox payment.
2. The app creates a USD 5.00 order and redirects to PayPal Sandbox.
3. Approve it with the Sandbox Personal buyer.
4. PayPal returns to the app, which asks the backend to capture the order.
5. The app reports success only when the backend confirms `COMPLETED`.

### Subscription

1. Open Checkout and choose Guardian Monthly.
2. The backend creates a subscription against `PAYPAL_PLAN_ID` and returns an approval link.
3. Approve it with the Sandbox Personal buyer.
4. On return, the app queries the backend and should report success only when the PayPal subscription status is `ACTIVE`.
5. The checkout asks for a service name (for example, Netflix or Spotify) and sends it to the backend when creating the PayPal Hub subscription. The configured PayPal test plan is still Guardian Monthly at USD 10.00 per month; the name is the ledger label, not a separate provider billing plan.

### Guardian review

The Hub sends eligible PayPal and sample ledger rows to the authenticated `POST /guardian/review` route. It sends a budget `{ "amount": 50000, "currency": "NGN" }` and rows with unique `id`, `name`, `monthly_cost`, `currency` and `days_since_used`. The backend converts amounts to USD using daily rates and asks Groq for `keep`, `cancel` or `review` recommendations. Rows with missing cost or usage information are not submitted. The returned converted budget and rate attribution are shown in the Hub.

## Deployment

### Backend on Render

Configure the Render Web Service as follows:

| Setting | Value |
|---|---|
| Branch | `main` |
| Root directory | `backend` |
| Build command | `npm install` |
| Start command | `node server.js` |
| Health check path | `/health` |

Add all required backend environment variables in Render's Environment settings. Set `CORS_ORIGIN` to include `https://paypal-hub.vercel.app`. The free tier may spin down after inactivity; the first request after a sleep can take up to about a minute while the service wakes.

### Frontend on Vercel

The deployed frontend is <https://paypal-hub.vercel.app>. Configure the Vercel project to build from `frontend/` (or use the frontend directory as the project root), with the Vite build command `npm run build` and output directory `dist`. Set `VITE_API_URL` to `https://paypal-hub-backend.onrender.com` and supply the three Firebase web-app variables listed above. Trigger a production deployment after changing frontend code or environment variables.

The AG Studio key received for this project is an evaluation-only trial key. It is not permitted for production use, so it must not be added to Vercel Production. The frontend uses AG Grid Community in the Hub. AG Studio evaluation mode is loaded only during local development; production uses the native budget-summary fallback.

## Sponsor tools and services

- **Render** — hosts the Express backend.
- **Channel3** — product-search provider for the Discover backend endpoint.

PayPal Sandbox, Firebase, Groq and ExchangeRate-API are also used by the prototype. **AG Grid** powers the Hub subscription table. AG Studio was used for a local-development custom budget widget during its evaluation period; the evaluation key is not included in production.

## Known limitations

- The ledger shows only subscriptions created through PayPal Hub, up to the backend list limit. It does not import existing PayPal or third-party provider subscriptions.
- Sample ledger rows are demonstration data stored locally; their usage dates are not cross-device records.
- Guardian review depends on complete cost and usage information. It does not access provider usage, billing records or cancellation systems, and it never cancels a subscription.
- Discover results depend on Channel3's catalogue and response. Product names, images, prices, currencies or links may be missing.
- Frontend integrations have passed a local production build but still need live end-to-end testing and production deployment.
- Currency conversion uses a daily reference rate and is an estimate. It is not a quoted payment, bank or card conversion rate.
- Discover results depend on Channel3's catalogue and response. Product names, images, prices, currencies or links may be missing.
- Google-created accounts have no password and therefore cannot use email/password login unless a separate password flow is added.
- The configured PayPal checkout plan is a USD 10.00 monthly Guardian test plan. It is separate from services listed in Discover.
- The prototype does not cancel subscriptions with third-party providers. Removing a record from Hub does not cancel provider billing.

## Team and license

- **Goodness Oni** — backend, PayPal integration and AI review.
- **David** — frontend.

This project is released under the **MIT License**. See the [`LICENSE`](LICENSE) file in the repository root.
