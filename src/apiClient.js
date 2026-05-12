import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 15000,
  withCredentials: true,
});

function symbolsParam(symbols) {
  return symbols.map((symbol) => symbol.trim().toUpperCase()).join(",");
}

export async function getQuotes(symbols) {
  const response = await api.get("/quotes", {
    params: { symbols: symbolsParam(symbols) },
  });
  return response.data || [];
}

export async function getStock(symbol) {
  const response = await api.get(`/stock/${encodeURIComponent(symbol)}`);
  return response.data || {};
}

export async function getPortfolio() {
  const response = await api.get("/portfolio");
  return response.data || [];
}

export async function buyStock(payload) {
  const response = await api.post("/portfolio", payload);
  return response.data || [];
}

export async function sellStock(symbol, quantity) {
  const response = await api.post("/portfolio/sell", { symbol, quantity });
  return response.data || [];
}

export async function getCurrentUser() {
  const response = await api.get("/auth/me");
  return response.data?.user || null;
}

export async function login(email, password) {
  const response = await api.post("/auth/login", { email, password });
  return response.data?.user || null;
}

export async function register(email, password) {
  const response = await api.post("/auth/register", { email, password });
  return response.data?.user || null;
}

export async function logout() {
  await api.post("/auth/logout");
}

export function getErrorMessage(error, fallback) {
  return error?.response?.data?.error || fallback;
}
