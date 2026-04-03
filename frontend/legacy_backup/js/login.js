import { handleLogin } from "./auth.js";

const emailInput    = document.getElementById("email");
const passwordInput = document.getElementById("password");
const emailError    = document.getElementById("email-error");
const passwordError = document.getElementById("password-error");
const alertEl       = document.getElementById("alert");
const btn           = document.getElementById("btn-login");

function showAlert(msg) {
  alertEl.textContent = msg;
  alertEl.className = "alert error visible";
}

function clearAlert() {
  alertEl.className = "alert error";
}

function setLoading(on) {
  btn.disabled = on;
  btn.classList.toggle("loading", on);
}

function validate() {
  let valid = true;

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim());
  emailInput.classList.toggle("invalid", !emailOk);
  emailError.classList.toggle("visible", !emailOk);
  if (!emailOk) valid = false;

  const passOk = passwordInput.value.length > 0;
  passwordInput.classList.toggle("invalid", !passOk);
  passwordError.classList.toggle("visible", !passOk);
  if (!passOk) valid = false;

  return valid;
}

btn.addEventListener("click", async () => {
  clearAlert();
  if (!validate()) return;

  setLoading(true);
  try {
    await handleLogin(emailInput.value.trim(), passwordInput.value);
  } catch (err) {
    showAlert(err.message);
  } finally {
    setLoading(false);
  }
});

[emailInput, passwordInput].forEach(el =>
  el.addEventListener("keydown", e => { if (e.key === "Enter") btn.click(); })
);