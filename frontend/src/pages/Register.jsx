import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../css/auth.css";
import { handleRegister, Auth } from "../lib/auth.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INIT_ERRORS = {
  nombre:  false,
  email:   false,
  password: false,
  confirm: false,
};

export default function Register() {
  const navigate = useNavigate();

  const [nombre,          setNombre]          = useState("");
  const [email,           setEmail]           = useState("");
  const [password,        setPassword]        = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors,          setErrors]          = useState(INIT_ERRORS);
  const [alert,           setAlert]           = useState("");
  const [loading,         setLoading]         = useState(false);

  function validate() {
    const next = {
      nombre:   nombre.trim().length === 0,
      email:    !EMAIL_REGEX.test(email.trim()),
      password: password.length < 6,
      confirm:  confirmPassword !== password,
    };
    setErrors(next);
    return !Object.values(next).some(Boolean);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setAlert("");
    if (!validate()) return;

    setLoading(true);
    try {
      await handleRegister(nombre.trim(), email.trim(), password);
      navigate(Auth.getRol() === "admin" ? "/admin-dashboard" : "/");
    } catch (err) {
      setAlert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">

      <div className="logo">
        <svg
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        EventPro
      </div>

      <h1>Crear cuenta</h1>
      <p className="subtitle">
        ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
      </p>

      <div className={`alert error${alert ? " visible" : ""}`} id="alert">
        {alert}
      </div>

      <form onSubmit={handleSubmit} noValidate>

        <div className="field">
          <label htmlFor="nombre">Nombre completo</label>
          <input
            type="text"
            id="nombre"
            placeholder="Tu nombre"
            autoComplete="name"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={errors.nombre ? "invalid" : ""}
          />
          <span className={`field-error${errors.nombre ? " visible" : ""}`} id="nombre-error">
            El nombre es obligatorio
          </span>
        </div>

        <div className="field">
          <label htmlFor="email">Correo electrónico</label>
          <input
            type="email"
            id="email"
            placeholder="tu@correo.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={errors.email ? "invalid" : ""}
          />
          <span className={`field-error${errors.email ? " visible" : ""}`} id="email-error">
            Ingresa un correo válido
          </span>
        </div>

        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <input
            type="password"
            id="password"
            placeholder="Mínimo 6 caracteres"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={errors.password ? "invalid" : ""}
          />
          <span className={`field-error${errors.password ? " visible" : ""}`} id="password-error">
            Mínimo 6 caracteres
          </span>
        </div>

        <div className="field">
          <label htmlFor="confirm">Confirmar contraseña</label>
          <input
            type="password"
            id="confirm"
            placeholder="Repite tu contraseña"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={errors.confirm ? "invalid" : ""}
          />
          <span className={`field-error${errors.confirm ? " visible" : ""}`} id="confirm-error">
            Las contraseñas no coinciden
          </span>
        </div>

        <button
          type="submit"
          className={`btn-submit${loading ? " loading" : ""}`}
          id="btn-register"
          disabled={loading}
        >
          <div className="btn-spinner" />
          <span className="btn-label">Crear cuenta</span>
        </button>

      </form>
    </div>
  );
}