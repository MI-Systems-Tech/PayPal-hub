const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const ALLOWED = new Set(["keep", "cancel", "review"]);

function sendError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

function buildMessages(budget, subscriptions) {
  const system =
    "You review a person's subscriptions against their monthly budget. " +
    "For each subscription, decide keep, cancel, or review. " +
    "Use cancel only when the cost is high for the budget and the service was not used recently. " +
    "Use review when the data is unclear. " +
    "Reply with JSON only, in this shape: " +
    '{"recommendations":[{"name":"...","decision":"keep|cancel|review","reason":"one short sentence"}]}. ' +
    "Do not invent services or costs.";

  const user = JSON.stringify({ monthly_budget: budget, subscriptions });
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

module.exports = function registerGuardianRoutes(app, requireAuth) {
  // Body: { "monthly_budget": 50, "subscriptions": [{ "name": "Netflix", "monthly_cost": 15, "days_since_used": 3 }] }
  // Amounts must all use the same currency.
  app.post("/guardian/review", requireAuth, async (req, res, next) => {
    try {
      const { monthly_budget, subscriptions } = req.body || {};

      if (typeof monthly_budget !== "number" || monthly_budget < 0) {
        return sendError(res, 400, "VALIDATION_ERROR", "monthly_budget must be a number.");
      }
      if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
        return sendError(res, 400, "VALIDATION_ERROR", "subscriptions must be a non-empty list.");
      }
      if (subscriptions.length > 50) {
        return sendError(res, 400, "VALIDATION_ERROR", "Review up to 50 subscriptions at a time.");
      }
      for (const s of subscriptions) {
        if (typeof s?.name !== "string" || typeof s?.monthly_cost !== "number") {
          return sendError(res, 400, "VALIDATION_ERROR", "Each subscription needs a name and a numeric monthly_cost.");
        }
      }

      if (!process.env.GROQ_API_KEY || !process.env.GROQ_MODEL) {
        return sendError(res, 500, "CONFIG_ERROR", "GROQ_API_KEY or GROQ_MODEL is not set.");
      }

      const groqRes = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL,
          messages: buildMessages(monthly_budget, subscriptions),
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
      const content = data.choices?.[0]?.message?.content;
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        return sendError(res, 502, "AI_ERROR", "The AI reply could not be read.");
      }

      // Keep only recommendations that match a submitted subscription and a valid decision.
      const names = new Set(subscriptions.map((s) => s.name));
      const recommendations = (Array.isArray(parsed.recommendations) ? parsed.recommendations : [])
        .filter((r) => names.has(r.name) && ALLOWED.has(r.decision))
        .map((r) => ({ name: r.name, decision: r.decision, reason: String(r.reason || "") }));

      res.json({ recommendations });
    } catch (err) {
      next(err);
    }
  });
};