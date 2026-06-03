import React, { useState } from "react";
import "./Login.css";

const Login = ({ onLogin, onForgotPassword }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [view, setView] = useState("login"); 
  const [message, setMessage] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password);
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    await onForgotPassword(email);
    setView("login");
  };


  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="brand-badge">OA</div>
          <h2>{view === "login" ? "Welcome Back" : "Reset Password"}</h2>
          <p>
            {view === "login"
              ? "Enter your credentials to access the onboarding portal"
              : "Enter your email to receive a password reset link"}
          </p>
        </div>

        {message && (
          <div className={`login-message login-message-${message.type}`}>
            {message.text}
          </div>
        )}

        {view === "login" ? (
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <div className="forgot-link">
              <button
                type="button"
                className="text-button"
                onClick={() => setView("forgot")}
              >
                Forgot password?
              </button>
            </div>
            <button type="submit" className="login-button">
              Sign In
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgotSubmit} className="login-form">
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
            <button type="submit" className="login-button">
              Send Reset Link
            </button>
            <div className="back-link">
              <button
                type="button"
                className="text-button"
                onClick={() => setView("login")}
              >
                Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
