const BASE = "http://localhost:3001/api";

export const api = {
  async get(path) {
    const res = await fetch(`${BASE}${path}`);
    return res.json();
  },
  async post(path, body) {
    console.log("POST", path, body);
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  },
};

export default api;