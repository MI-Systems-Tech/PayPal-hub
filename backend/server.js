require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";
const TOKEN_TTL = "24h";

// Comma-separated list, e.g. "http://localhost:3000,https://your-app.vercel.app"
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// In-memory storage. Accounts are lost when the server restarts.
const users = new Map(); // key: lowercase email, value: { id, email, passwordHash }

function sendError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

function publicUser(user) {
  return { id: user.id, email: user.email };
}

function signToken(user) {
  return jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

function findUserById(id) {
  for (const user of users.values()) {
    if (user.id === id) return user;
  }
  return null;
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return sendError(res, 401, "UNAUTHORIZED", "Missing or invalid token.");

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = findUserById(payload.sub);
    if (!user) return sendError(res, 401, "UNAUTHORIZED", "Missing or invalid token.");
    req.user = user;
    next();
  } catch {
    return sendError(res, 401, "UNAUTHORIZED", "Missing or invalid token.");
  }
}

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/auth/signup", async (req, res) => {
  const { email, password } = req.body || {};

  if (typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email)) {
    return sendError(res, 400, "VALIDATION_ERROR", "Enter a valid email address.");
  }
  if (typeof password !== "string" || password.length < 8) {
    return sendError(res, 400, "VALIDATION_ERROR", "Password must be at least 8 characters.");
  }

  const key = email.trim().toLowerCase();
  if (users.has(key)) {
    return sendError(res, 409, "EMAIL_TAKEN", "An account with this email already exists.");
  }

  const user = {
    id: "usr_" + crypto.randomUUID().slice(0, 8),
    email: key,
    passwordHash: await bcrypt.hash(password, 10),
  };
  users.set(key, user);

  res.status(201).json({ user: publicUser(user), token: signToken(user) });
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body || {};

  if (typeof email !== "string" || typeof password !== "string") {
    return sendError(res, 400, "VALIDATION_ERROR", "Email and password are required.");
  }

  const user = users.get(email.trim().toLowerCase());
  const valid = user && (await bcrypt.compare(password, user.passwordHash));
  if (!valid) {
    return sendError(res, 401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
  }

  res.json({ user: publicUser(user), token: signToken(user) });
});

app.get("/auth/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// Tokens are stateless, so logout just confirms the token was valid.
// The frontend should delete its stored token.
app.post("/auth/logout", requireAuth, (req, res) => {
  res.status(204).end();
});

// Handles malformed JSON bodies
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return sendError(res, 400, "VALIDATION_ERROR", "Request body must be valid JSON.");
  }
  console.error(err);
  return sendError(res, 500, "INTERNAL_ERROR", "Something went wrong.");
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});