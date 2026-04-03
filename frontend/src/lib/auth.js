import api from "./api.js";

export const Auth = {
  saveToken(token) {
    localStorage.setItem("token", token);
  },

  getToken() {
    return localStorage.getItem("token");
  },

  removeToken() {
    localStorage.removeItem("token");
  },

  isLoggedIn() {
    const token = this.getToken();
    if (!token) return false;

    const payload = this.getPayload();
    const exp = payload?.exp;
    if (typeof exp === "number" && Date.now() >= exp * 1000) {
      this.removeToken();
      return false;
    }

    return true;
  },

  logout() {
    this.removeToken();
  },

  authOptions() {
    return { headers: { "Authorization": `Bearer ${this.getToken()}` } };
  },

  getPayload() {
    const token = this.getToken();
    if (!token) return null;
    try {
      return JSON.parse(atob(token.split(".")[1]));
    } catch {
      return null;
    }
  },

  getRol() {
    return this.getPayload()?.rol ?? null;
  },

  requireAuth() {
    return this.isLoggedIn();
  },

  requireAdmin() {
    return this.isLoggedIn() && this.getRol() === "admin";
  },
};

export async function handleLogin(email, password) {
  const data = await api.post("/users/login", { email, password });
  if (!data?.token) {
    throw new Error("La respuesta del servidor no incluyó token");
  }
  Auth.saveToken(data.token);
  return data;
}

export async function handleRegister(nombre, email, password) {
  await api.post("/users/register", { nombre, email, password });
  return handleLogin(email, password);
}