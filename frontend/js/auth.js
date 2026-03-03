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
    return !!this.getToken();
  },

  logout() {
    this.removeToken();
    window.location.href = "/frontend/login.html";
  },

  authOptions() {
    return { headers: { "Authorization": `Bearer ${this.getToken()}` } };
  }
};

export async function handleLogin(email, password) {
  const data = await api.post("/users/login", { email, password });
  Auth.saveToken(data.token);
  window.location.href = "/frontend/index.html";
}

export async function handleRegister(nombre, email, password) {
  await api.post("/users/register", { nombre, email, password });
  await handleLogin(email, password);
}