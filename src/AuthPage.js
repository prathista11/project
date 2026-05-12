import React, { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { getErrorMessage, login, register } from "./apiClient";

function AuthPage({ mode, user, onAuth }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isRegister = mode === "register";

  if (user) return <Navigate to="/portfolio" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const authedUser = isRegister
        ? await register(email, password)
        : await login(email, password);
      onAuth(authedUser);
      navigate(location.state?.from?.pathname || "/portfolio", { replace: true });
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          isRegister ? "Failed to create account." : "Failed to log in."
        )
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-panel" onSubmit={handleSubmit}>
        <h1>{isRegister ? "Create Account" : "Log In"}</h1>
        {error && <p className="auth-error">{error}</p>}

        <label className="auth-field">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <label className="auth-field">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={isRegister ? "new-password" : "current-password"}
            minLength={8}
            required
          />
        </label>

        <button className="auth-submit" type="submit" disabled={submitting}>
          {submitting ? "Please wait..." : isRegister ? "Create account" : "Log in"}
        </button>

        <p className="auth-switch">
          {isRegister ? (
            <>
              Already have an account? <Link to="/login">Log in</Link>
            </>
          ) : (
            <>
              Need an account? <Link to="/register">Create one</Link>
            </>
          )}
        </p>
      </form>
    </div>
  );
}

export default AuthPage;
