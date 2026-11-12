const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const FX_URL = "https://open.er-api.com/v6/latest/USD";
const FX_TTL_MS = 60 * 60 * 1000;
const ATTRIBUTION = "Exchange rates by ExchangeRate-API (https://www.exchangerate-api.com)";
const ALLOWED = new Set(["keep", "cancel", "review"]);
const CODE = /^[A-Z]{3}$/;

let fxCache = null;

function sendError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

// Rates are units of each currency per 1 USD.
async function getRates() {
  if (fxCache && Date.now() - fxCache.fetchedAt < FX_TTL_MS) return fxCache;
  const res = await fetch(FX_URL);
  const data = await res.json();
  if (!res.ok || data.result !== "success") throw new Error("FX lookup failed");
  fxCache = { rates: data.rates, updated: data.time_last_update_utc, fetchedAt: Date.now() };
  return fxCache;
}

// Returns null when the currency is not supported.
async function toUSD(amount, currency) {
  if (currency === "USD") return { usd: amount };
  const fx = await getRates();
  const rate = fx.rates[currency];
  if (!rate) return null;
  return { usd: Math.round((amount / rate) * 100) / 100 };
}

function buildMessages(budgetUSD, items) {
  const system =
    "You review a person's subscriptions against their monthly budget. All amounts are in USD. " +
    "For each subscription, decide keep, cancel, or review. " +
    "Use cancel only when the cost is high for the budget and the service was not used recently. " +
    "Use review when the data is unclear. " +
    "Reply with JSON only, in this shape: " +
    '{"recommendations":[{"id":"copy the id exactly","decision":"keep|cancel|review","reason":"one short sentence"}]}. ' +
    "Do not invent services or costs.";

  const user = JSON.stringify({ monthly_budget_usd: budgetUSD, subscriptions: items });
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

module.exports = function registerGuardianRoutes(app, requireAuth) {
  // Body:
  // {
  //   "budget": { "amount": 50000, "currency": "NGN" },
  //   "subscriptions": [
  //     { "id": "row-1", "name": "Video streaming", "monthly_cost": 15, "currency": "USD", "days_since_used": 3 }
  //   ]
  // }
  app.post("/guardian/review", requireAuth, async (req, res, next) => {
    try {
      const { budget, subscriptions } = req.body || {};

      if (
        !budget ||
        typeof budget.amount !== "number" ||
        budget.amount < 0 ||
        typeof budget.currency !== "string" ||
        !CODE.test(budget.currency)
      ) {
        return sendError(res, 400, "VALIDATION_ERROR", "budget needs a non-negative amount and a 3-letter currency code.");
      }
      if (!Array.isArray(subscriptions) || subscriptions.length === 0 || subscriptions.length > 50) {
        return sendError(res, 400, "VALIDATION_ERROR", "subscriptions must be a list of 1 to 50 items.");
      }

      const seen = new Set();
      for (const s of subscriptions) {
        if (typeof s?.id !== "string" || !s.id) {
          return sendError(res, 400, "VALIDATION_ERROR", "Each subscription needs an id.");
        }
        if (seen.has(s.id)) {
          return sendError(res, 400, "VALIDATION_ERROR", "Subscription ids must be unique.");
        }
        seen.add(s.id);
        if (
          typeof s.name !== "string" ||
          typeof s.monthly_cost !== "number" ||
          s.monthly_cost < 0 ||
          typeof s.currency !== "string" ||
          !CODE.test(s.currency) ||
          typeof s.days_since_used !== "number" ||
          s.days_since_used < 0
        ) {
          return sendError(
            res,
            400,
            "VALIDATION_ERROR",
            "Each subscription needs id, name, monthly_cost, currency, and days_since_used."
          );
        }
      }

      if (!process.env.GROQ_API_KEY || !process.env.GROQ_MODEL) {
        return sendError(res, 500, "CONFIG_ERROR", "GROQ_API_KEY or GROQ_MODEL is not set.");
      }

      let budgetUSD;
      let items;
      try {
        budgetUSD = await toUSD(budget.amount, budget.currency);
        items = await Promise.all(
          subscriptions.map(async (s) => {
            const converted = await toUSD(s.monthly_cost, s.currency);
            return converted
              ? { id: s.id, name: s.name, monthly_cost_usd: converted.usd, days_since_used: s.days_since_used }
              : null;
          })
        );
      } catch (err) {
        console.error("FX error:", err.message);
        return sendError(res, 502, "FX_ERROR", "Exchange rates could not be loaded.");
      }

      if (!budgetUSD) {
        return sendError(res, 400, "VALIDATION_ERROR", `Unsupported budget currency: ${budget.currency}.`);
      }
      const bad = items.findIndex((item) => item === null);
      if (bad !== -1) {
        return sendError(res, 400, "VALIDATION_ERROR", `Unsupported currency for ${subscriptions[bad].name}.`);
      }

      const groqRes = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL,
          messages: buildMessages(budgetUSD.usd, items),
          response_format: { type: "json_object" },
          temperature: 0.2,
        }),
      });

      if (!groqRes.ok) {
        const detail = await groqRes.text();
        console.error("Groq error", groqRes.status, detail);
        return sendError(res, 502, "AI_ERROR", "The AI service could not review the subscriptions.");
      }

      const data = await groqRes.json();
      let parsed;
      try {
        parsed = JSON.parse(data.choices?.[0]?.message?.content);
      } catch {
        return sendError(res, 502, "AI_ERROR", "The AI reply could not be read.");
      }

      // Keep only recommendations for ids we sent, with a valid decision. Names come from our data, not the AI.
      const names = new Map(items.map((item) => [item.id, item.name]));
      const recommendations = (Array.isArray(parsed.recommendations) ? parsed.recommendations : [])
        .filter((r) => names.has(r.id) && ALLOWED.has(r.decision))
        .map((r) => ({
          id: r.id,
          name: names.get(r.id),
          decision: r.decision,
          reason: String(r.reason || ""),
        }));

      res.json({
        budget_usd: budgetUSD.usd,
        rates_updated: fxCache?.updated ?? null,
        attribution: ATTRIBUTION,
        recommendations,
      });
    } catch (err) {
      next(err);
    }
  });
};