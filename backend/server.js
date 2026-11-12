require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";
const TOKEN_TTL = "24h";

// Firebase Admin: the service account JSON comes from an env var, never the repo.
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT is not set");
}
initializeApp({
  credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
});
const usersRef = getFirestore().collection("users");

const app = express();

// Comma-separated list, e.g. "http://localhost:3000,https://paypal-hub.vercel.app"
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

function sendError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

function publicUser(user) {
  return { id: user.id, email: user.email };
}

function signToken(user) {
  return jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

// Documents are keyed by user id. Email lookups use a query.
async function findUserById(id) {
  const snap = await usersRef.doc(id).get();
  return snap.exists ? snap.data() : null;
}

async function findUserByEmail(email) {
  const snap = await usersRef.where("email", "==", email).limit(1).get();
  return snap.empty ? null : snap.docs[0].data();
}

async function createUser(fields) {
  const user = {
    id: "usr_" + crypto.randomUUID().slice(0, 8),
    createdAt: new Date().toISOString(),
    ...fields,
  };
  await usersRef.doc(user.id).set(user);
  return user;
}

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return sendError(res, 401, "UNAUTHORIZED", "Missing or invalid token.");

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await findUserById(payload.sub);
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

app.post("/auth/signup", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email)) {
      return sendError(res, 400, "VALIDATION_ERROR", "Enter a valid email address.");
    }
    if (typeof password !== "string" || password.length < 8) {
      return sendError(res, 400, "VALIDATION_ERROR", "Password must be at least 8 characters.");
    }

    const key = email.trim().toLowerCase();
    if (await findUserByEmail(key)) {
      return sendError(res, 409, "EMAIL_TAKEN", "An account with this email already exists.");
    }

    const user = await createUser({
      email: key,
      passwordHash: await bcrypt.hash(password, 10),
      provider: "password",
    });

    res.status(201).json({ user: publicUser(user), token: signToken(user) });
  } catch (err) {
    next(err);
  }
});

app.post("/auth/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (typeof email !== "string" || typeof password !== "string") {
      return sendError(res, 400, "VALIDATION_ERROR", "Email and password are required.");
    }

    const user = await findUserByEmail(email.trim().toLowerCase());
    // Google-only accounts have no password, so they can't log in this way.
    const valid = user && user.passwordHash && (await bcrypt.compare(password, user.passwordHash));
    if (!valid) {
      return sendError(res, 401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
    }

    res.json({ user: publicUser(user), token: signToken(user) });
  } catch (err) {
    next(err);
  }
});

// Firebase sign-in: the frontend sends the Firebase ID token, we verify it here.
app.post("/auth/google", async (req, res, next) => {
  try {
    const { idToken } = req.body || {};
    if (typeof idToken !== "string" || !idToken) {
      return sendError(res, 400, "VALIDATION_ERROR", "idToken is required.");
    }

    let decoded;
    try {
      decoded = await getAuth().verifyIdToken(idToken);
    } catch {
      return sendError(res, 401, "INVALID_GOOGLE_TOKEN", "Google sign-in could not be verified.");
    }

    if (!decoded.email || !decoded.email_verified) {
      return sendError(res, 401, "UNVERIFIED_EMAIL", "Google account email is not verified.");
    }

    const key = decoded.email.toLowerCase();
    const user =
      (await findUserByEmail(key)) ||
      (await createUser({ email: key, passwordHash: null, provider: "google" }));

    res.json({ user: publicUser(user), token: signToken(user) });
  } catch (err) {
    next(err);
  }
});

app.get("/auth/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// Tokens are stateless, so logout only confirms the token was valid.
// The frontend should delete its stored token.
app.post("/auth/logout", requireAuth, (req, res) => {
  res.status(204).end();
});

require("./paypal")(app, requireAuth);
require("./paypal-orders")(app, requireAuth);
require("./guardian")(app, requireAuth);

// Malformed JSON, and any unexpected server error
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