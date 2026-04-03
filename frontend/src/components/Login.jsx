// Login.jsx
// ─────────────────────────────────────────────────────────────
// Migración de login.html + login.js a React con Vite.
// Mantiene clases CSS, IDs y lógica idénticos al original.
//
// Requiere: auth.js (handleLogin) en la misma carpeta que antes.
// ─────────────────────────────────────────────────────────────

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../css/auth.css";
import { handleLogin, Auth } from "../lib/auth.js";

// ── Regex de validación de email (igual que el original) ──────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const navigate = useNavigate();

  // ── Estado de los campos ──────────────────────────────────
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");

  // ── Estado de errores de campo ────────────────────────────
  const [emailInvalid,    setEmailInvalid]    = useState(false);
  const [passwordInvalid, setPasswordInvalid] = useState(false);

  // ── Estado del alert global ───────────────────────────────
  const [alertMsg,     setAlertMsg]     = useState("");
  const [alertVisible, setAlertVisible] = useState(false);

  // ── Estado de carga del botón ─────────────────────────────
  const [loading, setLoading] = useState(false);

  // ── Helpers ───────────────────────────────────────────────
  function showAlert(msg) {
    setAlertMsg(msg);
    setAlertVisible(true);
  }

  function clearAlert() {
    setAlertMsg("");
    setAlertVisible(false);
  }

  // ── Validación (misma lógica que validate() original) ─────
  function validate() {
    const emailOk = EMAIL_REGEX.test(email.trim());
    const passOk  = password.length > 0;

    setEmailInvalid(!emailOk);
    setPasswordInvalid(!passOk);

    return emailOk && passOk;
  }

  // ── Submit (migración del listener "click" + handleLogin) ─
  async function handleSubmit(e) {
    // Evitar recarga si el botón está dentro de un <form>
    // (aquí no hay <form>, pero es buena práctica dejarlo)
    e.preventDefault();

    clearAlert();
    if (!validate()) return;

    setLoading(true);
    try {
      await handleLogin(email.trim(), password);
      navigate(Auth.getRol() === "admin" ? "/admin-dashboard" : "/");
    } catch (err) {
      showAlert(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Tecla Enter dispara el submit (igual que el original) ─
  function handleKeyDown(e) {
    if (e.key === "Enter") handleSubmit(e);
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="card">

      {/* Logo */}
      <div className="logo">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        EventPro
      </div>

      {/* Encabezado */}
      <h1>Bienvenido</h1>
      <p className="subtitle">
        ¿No tienes cuenta?{" "}
        <Link to="/register">Regístrate</Link>
      </p>

      {/* Alert de error global */}
      <div
        id="alert"
        className={`alert error${alertVisible ? " visible" : ""}`}
      >
        {alertMsg}
      </div>

      {/* Campo email */}
      <div className="field">
        <label htmlFor="email">Correo electrónico</label>
        <input
          type="email"
          id="email"
          placeholder="tu@correo.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          className={emailInvalid ? "invalid" : ""}
        />
        <span
          id="email-error"
          className={`field-error${emailInvalid ? " visible" : ""}`}
        >
          Ingresa un correo válido
        </span>
      </div>

      {/* Campo contraseña */}
      <div className="field">
        <label htmlFor="password">Contraseña</label>
        <input
          type="password"
          id="password"
          placeholder="••••••••"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          className={passwordInvalid ? "invalid" : ""}
        />
        <span
          id="password-error"
          className={`field-error${passwordInvalid ? " visible" : ""}`}
        >
          La contraseña es obligatoria
        </span>
      </div>

      {/* Botón submit */}
      <button
        id="btn-login"
        className={`btn-submit${loading ? " loading" : ""}`}
        disabled={loading}
        onClick={handleSubmit}
      >
        <div className="btn-spinner" />
        <span className="btn-label">Iniciar sesión</span>
      </button>

    </div>
  );
}