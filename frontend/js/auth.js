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
    window.location.href = "/frontend/login.html";
  },

  // Devuelve el options listo para pasar a api.get/post/etc.
  authOptions() {
    return { headers: { "Authorization": `Bearer ${this.getToken()}` } };
  },

  // Decodifica el payload del JWT sin verificar firma (solo para leer el rol en cliente)
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

  requireAuth(redirectTo = "./login.html") {
    if (!this.isLoggedIn()) {
      window.location.href = redirectTo;
    }
  },

  requireAdmin(redirectTo = "./index.html") {
    this.requireAuth();
    if (this.getRol() !== "admin") {
      window.location.href = redirectTo;
    }
  }
};

export async function handleLogin(email, password) {
  const data = await api.post("/users/login", { email, password });
  Auth.saveToken(data.token);
  if (Auth.getRol() === "admin") {
    window.location.href = "/frontend/admin-dashboard.html";
  } else {
    window.location.href = "/frontend/index.html";
  }
}

export async function handleRegister(nombre, email, password) {
  await api.post("/users/register", { nombre, email, password });
  await handleLogin(email, password);
}