const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const CHANNEL3_URL = "https://api.trychannel3.com/v1/search";

async function askGroq(system, user) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

async function searchChannel3(query) {
  const res = await fetch(CHANNEL3_URL, {
    method: "POST",
    headers: {
      "x-api-key": process.env.CHANNEL3_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Channel3 ${res.status}: ${await res.text()}`);
  return res.json();
}

module.exports = function registerDiscoverRoutes(app, requireAuth) {
  // Body: { "need": "wireless headphones under 100 dollars" }
  app.post("/discover/search", requireAuth, async (req, res) => {
    try {
      const { need } = req.body || {};
      if (typeof need !== "string" || need.trim().length < 3) {
        return res.status(400).json({
          error: { code: "VALIDATION_ERROR", message: "Describe what you need." },
        });
      }
      if (!process.env.GROQ_API_KEY || !process.env.GROQ_MODEL || !process.env.CHANNEL3_API_KEY) {
        return res.status(500).json({
          error: { code: "CONFIG_ERROR", message: "GROQ or CHANNEL3 key is not set." },
        });
      }

      // Step 1: AI turns the request into a product search.
      const plan = await askGroq(
        'Turn the user request into a shopping search. Reply with JSON only: {"query":"short product search terms"}. Keep the query under 8 words. Do not add prices or brands the user did not mention.',
        need.trim()
      );
      const query = String(plan.query || "").slice(0, 100) || need.trim();

      // Step 2: Channel3 returns real products for that query.
      const raw = await searchChannel3(query);
      const items = raw.products || raw.results || raw.items || [];
      if (items.length === 0) {
        console.log("Channel3 returned no product list. Keys:", Object.keys(raw));
      }

      const products = items.slice(0, 10).map((p) => ({
        name: p.title || p.name || "Untitled",
        brand: p.brand_name || p.brand || null,
        price: p.price?.price ?? p.price ?? null,
        currency: p.price?.currency ?? "USD",
        url: p.url || p.product_url || null,
        image: p.image_url || p.image || null,
      }));

      res.json({ query, products });
    } catch (err) {
      console.error("Discover error:", err.message);
      res.status(502).json({
        error: { code: "DISCOVER_ERROR", message: "Product search failed." },
      });
    }
  });
};