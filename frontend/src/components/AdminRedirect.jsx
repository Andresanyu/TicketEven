import { Navigate } from "react-router-dom";
import { Auth } from "../services/auth.js";

export default function AdminRedirect({ children }) {
  if (Auth.isLoggedIn() && Auth.getRol() === "admin") {
    return <Navigate to="/admin-dashboard" replace />;
  }

  return children;
}