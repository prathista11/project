const { signJwt } = require("./auth");

const POSTGREST_URL = process.env.POSTGREST_URL || "http://localhost:3001";
const PGRST_JWT_SECRET =
  process.env.PGRST_JWT_SECRET || "dev-postgrest-jwt-secret-change-me";

function toQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) query.set(key, value);
  });
  const text = query.toString();
  return text ? `?${text}` : "";
}

async function request(path, options = {}) {
  const headers = {
    Accept: "application/json",
    Prefer: "return=representation",
    ...(options.headers || {}),
  };

  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(
    `${POSTGREST_URL}${path}${toQuery(options.params)}`,
    {
      method: options.method || "GET",
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    }
  );

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = data?.message || data?.hint || "PostgREST request failed";
    const err = new Error(message);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

function serviceToken() {
  return signJwt({ role: "service_role" }, PGRST_JWT_SECRET, 60 * 5);
}

function userToken(userId) {
  return signJwt({ role: "app_user", sub: userId }, PGRST_JWT_SECRET, 60 * 5);
}

module.exports = {
  request,
  serviceToken,
  userToken,
};
