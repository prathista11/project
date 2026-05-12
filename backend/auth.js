const crypto = require("crypto");

const COOKIE_NAME = "stock_session";
const COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const PASSWORD_KEYLEN = 64;
const PASSWORD_SALT_BYTES = 16;

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function decodeBase64url(input) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function getCookieSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 24) {
    throw new Error("JWT_SECRET must be at least 24 characters");
  }
  return secret;
}

function signJwt(payload, secret, expiresInSeconds = COOKIE_MAX_AGE_SECONDS) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + expiresInSeconds };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(
    JSON.stringify(body)
  )}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(unsigned)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${unsigned}.${signature}`;
}

function verifyJwt(token, secret) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const provided = Buffer.from(signature);
  const calculated = Buffer.from(expected);
  if (
    provided.length !== calculated.length ||
    !crypto.timingSafeEqual(provided, calculated)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64url(body));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function parseCookies(header) {
  return String(header || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const eq = part.indexOf("=");
      if (eq === -1) return cookies;
      cookies[part.slice(0, eq)] = decodeURIComponent(part.slice(eq + 1));
      return cookies;
    }, {});
}

function sessionCookie(token) {
  return [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
  ].join("; ");
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(PASSWORD_SALT_BYTES).toString("hex");
  const hash = await new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, PASSWORD_KEYLEN, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey.toString("hex"));
    });
  });
  return `scrypt:${salt}:${hash}`;
}

async function verifyPassword(password, stored) {
  const [scheme, salt, hash] = String(stored || "").split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;

  const candidate = await new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, PASSWORD_KEYLEN, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
  const expected = Buffer.from(hash, "hex");
  return (
    candidate.length === expected.length &&
    crypto.timingSafeEqual(candidate, expected)
  );
}

function createSession(user) {
  return signJwt({ sub: user.id, email: user.email }, getCookieSecret());
}

function readSession(req) {
  const cookies = parseCookies(req.headers.cookie);
  return verifyJwt(cookies[COOKIE_NAME], getCookieSecret());
}

module.exports = {
  clearSessionCookie,
  createSession,
  hashPassword,
  readSession,
  sessionCookie,
  signJwt,
  verifyJwt,
  verifyPassword,
};
