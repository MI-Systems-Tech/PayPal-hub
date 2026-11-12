const { getFirestore } = require("firebase-admin/firestore");

const BASE =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

const DAY_MS = 24 * 60 * 60 * 1000;
let cachedToken = null;
let tokenExpiresAt = 0;
const planPriceCache = new Map();

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

const subscriptionsRef = () => getFirestore().collection("subscriptions");
const ordersRef = () => getFirestore().collection("orders");

// The price comes from the PayPal plan, so it stays correct if the plan changes.
async function getPlanPrice(planId) {
  if (planPriceCache.has(planId)) return planPriceCache.get(planId);
  const plan = await paypalRequest("GET", `/v1/billing/plans/${encodeURIComponent(planId)}`);
  if (!plan.ok) return null;
  const fixed = plan.data?.billing_cycles?.[0]?.pricing_scheme?.fixed_price;
  const price = fixed ? { amount: fixed.value, currency: fixed.currency_code } : null;
  planPriceCache.set(planId, price);
  return price;
}

function daysSince(iso) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS));
}

// Combines PayPal's live status with what we store: the name and the last-used date.
async function loadSubscription(subscriptionId, stored) {
  const sub = await paypalRequest(
    "GET",
    `/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`
  );
  if (!sub.ok) return null;

  const price = await getPlanPrice(sub.data.plan_id);
  const lastUsedAt = stored.lastUsedAt ?? stored.createdAt ?? new Date().toISOString();
  return {
    subscription_id: sub.data.id,
    name: stored.name ?? "Subscription",
    status: sub.data.status,
    plan_id: sub.data.plan_id,
    plan_amount: price?.amount ?? null,
    currency: price?.currency ?? null,
    days_since_used: daysSince(lastUsedAt),
    last_used_at: lastUsedAt,
    next_billing_time: sub.data.billing_info?.next_billing_time ?? null,
  };
}

// Mounted from server.js. requireAuth is passed in so these routes need a login token.
module.exports = function registerPayPalRoutes(app, requireAuth) {
  // Run once. Creates a product and a monthly plan, then returns the plan id.
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

  // Creates a one-time order and saves it under the signed-in user.
  // Optional body: { "amount": "5.00" }. Defaults to 5.00 USD.
  app.post("/paypal/orders", requireAuth, async (req, res, next) => {
    try {
      const amount = typeof req.body?.amount === "string" ? req.body.amount : "5.00";

      const order = await paypalRequest("POST", "/v2/checkout/orders", {
        intent: "CAPTURE",
        purchase_units: [
          {
            description: "PayPal Hub Guardian test payment",
            amount: { currency_code: "USD", value: amount },
          },
        ],
        application_context: {
          brand_name: "PayPal Hub",
          user_action: "PAY_NOW",
          return_url: "https://paypal-hub.vercel.app/payment/approved",
          cancel_url: "https://paypal-hub.vercel.app/payment/cancelled",
        },
      });
      if (!order.ok) {
        return paypalError(res, 502, "PAYPAL_ERROR", "Could not create order.");
      }

      await ordersRef().doc(order.data.id).set({
        orderId: order.data.id,
        userId: req.user.id,
        createdAt: new Date().toISOString(),
      });

      const approve = order.data.links.find(
        (l) => l.rel === "payer-action" || l.rel === "approve"
      );
      res.status(201).json({
        order_id: order.data.id,
        status: order.data.status,
        approve_url: approve ? approve.href : null,
      });
    } catch (err) {
      next(err);
    }
  });

  // Captures an order, only if the signed-in user created it.
  app.post("/paypal/orders/:id/capture", requireAuth, async (req, res, next) => {
    try {
      const doc = await ordersRef().doc(req.params.id).get();
      if (!doc.exists || doc.data().userId !== req.user.id) {
        return paypalError(res, 404, "NOT_FOUND", "Order not found.");
      }

      const capture = await paypalRequest(
        "POST",
        `/v2/checkout/orders/${encodeURIComponent(req.params.id)}/capture`
      );
      if (!capture.ok) {
        return paypalError(res, 502, "PAYPAL_ERROR", "Could not capture order.");
      }

      res.json({ order_id: capture.data.id, status: capture.data.status });
    } catch (err) {
      next(err);
    }
  });

  // Starts a subscription. Optional body: { "name": "Netflix" }, the service name shown in the ledger.
  app.post("/paypal/subscriptions", requireAuth, async (req, res, next) => {
    try {
      const rawName = req.body?.name;
      if (
        rawName != null &&
        (typeof rawName !== "string" || rawName.trim().length === 0 || rawName.trim().length > 80)
      ) {
        return paypalError(res, 400, "VALIDATION_ERROR", "name must be 1 to 80 characters.");
      }
      const name = rawName != null ? rawName.trim() : "Subscription";

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

      const now = new Date().toISOString();
      await subscriptionsRef().doc(sub.data.id).set({
        subscriptionId: sub.data.id,
        userId: req.user.id,
        planId: process.env.PAYPAL_PLAN_ID,
        name,
        lastUsedAt: now,
        createdAt: now,
      });

      const approve = sub.data.links.find((l) => l.rel === "approve");
      res.status(201).json({
        subscription_id: sub.data.id,
        status: sub.data.status,
        approve_url: approve ? approve.href : null,
      });
    } catch (err) {
      next(err);
    }
  });

  // Lists the signed-in user's subscriptions created through PayPal Hub, up to 20.
  app.get("/paypal/subscriptions", requireAuth, async (req, res, next) => {
    try {
      const snap = await subscriptionsRef()
        .where("userId", "==", req.user.id)
        .limit(20)
        .get();
      const subscriptions = (
        await Promise.all(snap.docs.map((doc) => loadSubscription(doc.id, doc.data())))
      ).filter(Boolean);
      res.json({ subscriptions });
    } catch (err) {
      next(err);
    }
  });

  // Returns one subscription, only if the signed-in user owns it.
  app.get("/paypal/subscriptions/:id", requireAuth, async (req, res, next) => {
    try {
      const doc = await subscriptionsRef().doc(req.params.id).get();
      if (!doc.exists || doc.data().userId !== req.user.id) {
        return paypalError(res, 404, "NOT_FOUND", "Subscription not found.");
      }

      const sub = await loadSubscription(req.params.id, doc.data());
      if (!sub) {
        return paypalError(res, 502, "PAYPAL_ERROR", "Could not fetch subscription.");
      }
      res.json(sub);
    } catch (err) {
      next(err);
    }
  });

  // Marks a subscription as used now. Stored on the server, so it works across devices.
  app.post("/paypal/subscriptions/:id/used", requireAuth, async (req, res, next) => {
    try {
      const ref = subscriptionsRef().doc(req.params.id);
      const doc = await ref.get();
      if (!doc.exists || doc.data().userId !== req.user.id) {
        return paypalError(res, 404, "NOT_FOUND", "Subscription not found.");
      }

      const lastUsedAt = new Date().toISOString();
      await ref.update({ lastUsedAt });

      const sub = await loadSubscription(req.params.id, { ...doc.data(), lastUsedAt });
      if (!sub) {
        return paypalError(res, 502, "PAYPAL_ERROR", "Could not fetch subscription.");
      }
      res.json(sub);
    } catch (err) {
      next(err);
    }
  });
};