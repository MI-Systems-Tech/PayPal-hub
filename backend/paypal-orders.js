const BASE =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

async function getAccessToken() {
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
  return data.access_token;
}

async function paypalRequest(method, path, body) {
  const token = await getAccessToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}

function paypalError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

// Mounted from server.js. requireAuth is passed in so these routes need a login token.
module.exports = function registerOrderRoutes(app, requireAuth) {
  // Creates a one-time order and returns the URL the buyer must approve.
  // Optional body: { "amount": "5.00" }. Defaults to 5.00 USD.
  app.post("/paypal/orders", requireAuth, async (req, res) => {
    const amount =
      typeof req.body?.amount === "string" ? req.body.amount : "5.00";

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

    const approve = order.data.links.find(
      (l) => l.rel === "payer-action" || l.rel === "approve"
    );
    res.status(201).json({
      order_id: order.data.id,
      status: order.data.status,
      approve_url: approve ? approve.href : null,
    });
  });

  // Captures an order after the buyer has approved it.
  app.post("/paypal/orders/:id/capture", requireAuth, async (req, res) => {
    const capture = await paypalRequest(
      "POST",
      `/v2/checkout/orders/${encodeURIComponent(req.params.id)}/capture`
    );
    if (!capture.ok) {
      return paypalError(res, 502, "PAYPAL_ERROR", "Could not capture order.");
    }

    res.json({
      order_id: capture.data.id,
      status: capture.data.status,
    });
  });
};