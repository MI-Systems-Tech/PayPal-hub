const BASE =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const basic = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`PayPal auth failed: ${data.error}`);

  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

async function paypalRequest(method, path, body) {
  const token = await getAccessToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}

function paypalError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

// Mounted from server.js. requireAuth is passed in so these routes need a login token.
module.exports = function registerPayPalRoutes(app, requireAuth) {
  // Run once. Creates a product and a monthly plan, then returns the plan id.
  // Copy the plan_id into backend/.env as PAYPAL_PLAN_ID.
  app.post("/paypal/setup", requireAuth, async (req, res) => {
    const product = await paypalRequest("POST", "/v1/catalogs/products", {
      name: "PayPal Hub Guardian",
      description: "Subscription tracking and renewal alerts",
      type: "SERVICE",
      category: "SOFTWARE",
    });
    if (!product.ok) {
      return paypalError(res, 502, "PAYPAL_ERROR", "Could not create product.");
    }

    const plan = await paypalRequest("POST", "/v1/billing/plans", {
      product_id: product.data.id,
      name: "Guardian Monthly",
      description: "Monthly Guardian subscription",
      billing_cycles: [
        {
          frequency: { interval_unit: "MONTH", interval_count: 1 },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: { value: "10.00", currency_code: "USD" },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        payment_failure_threshold: 3,
      },
    });
    if (!plan.ok) {
      return paypalError(res, 502, "PAYPAL_ERROR", "Could not create plan.");
    }

    res.status(201).json({ product_id: product.data.id, plan_id: plan.data.id });
  });

  // Starts a subscription and returns the URL the buyer must approve.
  app.post("/paypal/subscriptions", requireAuth, async (req, res) => {
    if (!process.env.PAYPAL_PLAN_ID) {
      return paypalError(res, 500, "CONFIG_ERROR", "PAYPAL_PLAN_ID is not set.");
    }

    const sub = await paypalRequest("POST", "/v1/billing/subscriptions", {
      plan_id: process.env.PAYPAL_PLAN_ID,
      application_context: {
        brand_name: "PayPal Hub",
        user_action: "SUBSCRIBE_NOW",
        return_url: "https://paypal-hub.vercel.app/subscription/approved",
        cancel_url: "https://paypal-hub.vercel.app/subscription/cancelled",
      },
    });
    if (!sub.ok) {
      return paypalError(res, 502, "PAYPAL_ERROR", "Could not create subscription.");
    }

    const approve = sub.data.links.find((l) => l.rel === "approve");
    res.status(201).json({
      subscription_id: sub.data.id,
      status: sub.data.status,
      approve_url: approve ? approve.href : null,
    });
  });

  // Checks a subscription's status after the buyer has approved it.
  app.get("/paypal/subscriptions/:id", requireAuth, async (req, res) => {
    const sub = await paypalRequest(
      "GET",
      `/v1/billing/subscriptions/${encodeURIComponent(req.params.id)}`
    );
    if (sub.status === 404) {
      return paypalError(res, 404, "NOT_FOUND", "Subscription not found.");
    }
    if (!sub.ok) {
      return paypalError(res, 502, "PAYPAL_ERROR", "Could not fetch subscription.");
    }

    res.json({
      subscription_id: sub.data.id,
      status: sub.data.status,
      plan_id: sub.data.plan_id,
      next_billing_time: sub.data.billing_info?.next_billing_time ?? null,
    });
  });
};