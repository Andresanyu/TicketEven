function normalizeBaseUrl(value) {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return null;
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

const runtimeBase =
  normalizeBaseUrl(window.localStorage?.getItem("API_BASE_URL")) ||
  normalizeBaseUrl(window.API_BASE_URL) ||
  "http://localhost:4001/api";

const FALLBACK_BASE = "http://localhost:4001/api";
const SECONDARY_FALLBACK_BASE = "http://localhost:4002/api";
const TERTIARY_FALLBACK_BASE = "http://localhost:4003/api";
const BASE_CANDIDATES = Array.from(new Set([runtimeBase, FALLBACK_BASE, SECONDARY_FALLBACK_BASE, TERTIARY_FALLBACK_BASE]));

async function parseResponse(res) {
  let data = null;
  try {
    data = await res.json();
  } catch (_err) {
    data = null;
  }

  if (!res.ok) {
    const error = new Error(data?.error || `HTTP ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  async get(path) {
    let lastError;

    for (const base of BASE_CANDIDATES) {
      try {
        const res = await fetch(`${base}${path}`);
        return await parseResponse(res);
      } catch (err) {
        lastError = err;
        const isNetworkError = !err?.status;
        if (!isNetworkError) throw err;
      }
    }

    throw lastError;
  },
  async post(path, body) {
    console.log("POST", path, body);
    let lastError;

    for (const base of BASE_CANDIDATES) {
      try {
        const res = await fetch(`${base}${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        return await parseResponse(res);
      } catch (err) {
        lastError = err;
        const isNetworkError = !err?.status;
        if (!isNetworkError) throw err;
      }
    }

    throw lastError;
  },
  async put(path, body) {
    let lastError;

    for (const base of BASE_CANDIDATES) {
      try {
        const res = await fetch(`${base}${path}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        return await parseResponse(res);
      } catch (err) {
        lastError = err;
        const isNetworkError = !err?.status;
        if (!isNetworkError) throw err;
      }
    }

    throw lastError;
  },
  async patch(path, body) {
    let lastError;

    for (const base of BASE_CANDIDATES) {
      try {
        const res = await fetch(`${base}${path}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        return await parseResponse(res);
      } catch (err) {
        lastError = err;
        const isNetworkError = !err?.status;
        if (!isNetworkError) throw err;
      }
    }

    throw lastError;
  },
};

export default api;