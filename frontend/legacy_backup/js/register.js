import { handleRegister } from "./auth.js";

const nombreInput   = document.getElementById("nombre");
const emailInput    = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmInput  = document.getElementById("confirm");
const nombreError   = document.getElementById("nombre-error");
const emailError    = document.getElementById("email-error");
const passwordError = document.getElementById("password-error");
const confirmError  = document.getElementById("confirm-error");
const alertEl       = document.getElementById("alert");
const btn           = document.getElementById("btn-register");

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

  const nombreOk = nombreInput.value.trim().length > 0;
  nombreInput.classList.toggle("invalid", !nombreOk);
  nombreError.classList.toggle("visible", !nombreOk);
  if (!nombreOk) valid = false;

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim());
  emailInput.classList.toggle("invalid", !emailOk);
  emailError.classList.toggle("visible", !emailOk);
  if (!emailOk) valid = false;

  const passOk = passwordInput.value.length >= 6;
  passwordInput.classList.toggle("invalid", !passOk);
  passwordError.classList.toggle("visible", !passOk);
  if (!passOk) valid = false;

  const confirmOk = confirmInput.value === passwordInput.value;
  confirmInput.classList.toggle("invalid", !confirmOk);
  confirmError.classList.toggle("visible", !confirmOk);
  if (!confirmOk) valid = false;

  return valid;
}

btn.addEventListener("click", async () => {
  clearAlert();
  if (!validate()) return;

  setLoading(true);
  try {
    await handleRegister(
      nombreInput.value.trim(),
      emailInput.value.trim(),
      passwordInput.value
    );
  } catch (err) {
    showAlert(err.message);
  } finally {
    setLoading(false);
  }
});

[nombreInput, emailInput, passwordInput, confirmInput].forEach(el =>
  el.addEventListener("keydown", e => { if (e.key === "Enter") btn.click(); })
);