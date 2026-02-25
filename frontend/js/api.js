const BASE = "http://localhost:3001/api";

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
    const res = await fetch(`${BASE}${path}`);
    return parseResponse(res);
  },
  async post(path, body) {
    console.log("POST", path, body);
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return parseResponse(res);
  },
};

export default api;