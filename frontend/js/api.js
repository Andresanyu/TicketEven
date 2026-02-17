const BASE = "http://localhost:3001/api";

const api = {
  async get(path) {
    const res = await fetch(`${BASE}${path}`);
    return res.json();
  },
  async post(path, body) {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  },
  async put(path, body) {
    const res = await fetch(`${BASE}${path}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  },
  async del(path) {
    await fetch(`${BASE}${path}`, { method: "DELETE" });
  },
};