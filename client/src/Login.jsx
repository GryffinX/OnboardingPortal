import { useState } from "react";
import "./Login.css";
import { validateEmail } from "./utils";

const Login = ({ onLogin, onForgotPassword, onVerifyOtp, onResetPassword }) => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [view, setView] = useState("login"); // login, forgot, otp, reset
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const showMessage = (text, type = "error") => {
    setMessage({ text, type });
    if (type === "success") {
      setTimeout(() => setMessage(null), 1500);
    }
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    const emailError = validateEmail(email);
    if (emailError) {
      showMessage(emailError);
      return;
    }
    if (!password) {
      showMessage("Password is required.");
      return;
    }
    onLogin(email, password);
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    const emailError = validateEmail(email);
    if (emailError) {
      showMessage(emailError);
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const result = await onForgotPassword(email);
      if (result.success) {
        setView("otp");
        showMessage("OTP sent to your email. Please check your inbox.", "success");
      } else {
        showMessage(result.message || "Failed to send OTP. Please try again.");
      }
    } catch {
      showMessage("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      showMessage("OTP must be exactly 6 digits.");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const result = await onVerifyOtp(email, otp);
      if (result.success) {
        setView("reset");
        showMessage("OTP verified. Please set your new password.", "success");
      } else {
        showMessage(result.message || "Invalid or expired OTP.");
      }
    } catch {
      showMessage("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      showMessage("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      showMessage("Passwords do not match.");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const result = await onResetPassword(email, otp, password);
      if (result.success) {
        setView("login");
        setEmail("");
        setOtp("");
        setPassword("");
        setConfirmPassword("");
        showMessage("Password reset successfully. You can now login.", "success");
      } else {
        showMessage(result.message || "Failed to reset password.");
      }
    } catch {
      showMessage("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="brand-badge">OA</div>
          <h2>
            {view === "login" && "Welcome Back"}
            {view === "forgot" && "Reset Password"}
            {view === "otp" && "Verify OTP"}
            {view === "reset" && "Set New Password"}
          </h2>
          <p>
            {view === "login" && "Enter your credentials to access the onboarding portal"}
            {view === "forgot" && "Enter your email to receive a verification OTP"}
            {view === "otp" && "Enter the 6-digit OTP sent to your email"}
            {view === "reset" && "Create a strong new password for your account"}
          </p>
        </div>

        {message && (
          <div className={`login-message login-message-${message.type}`}>
            {message.text}
          </div>
        )}

        {view === "login" && (
          <form onSubmit={handleLoginSubmit} className="login-form">
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
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
                onClick={() => {
                  setView("forgot");
                  setMessage(null);
                }}
              >
                Forgot password?
              </button>
            </div>
            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>
        )}

        {view === "forgot" && (
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
            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
            <div className="back-link">
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setView("login");
                  setMessage(null);
                }}
              >
                Back to Login
              </button>
            </div>
          </form>
        )}

        {view === "otp" && (
          <form onSubmit={handleOtpSubmit} className="login-form">
            <div className="form-group">
              <label>Enter OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                maxLength="6"
                required
              />
            </div>
            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
            <div className="back-link">
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setView("forgot");
                  setMessage(null);
                }}
              >
                Resend OTP
              </button>
            </div>
          </form>
        )}

        {view === "reset" && (
          <form onSubmit={handleResetSubmit} className="login-form">
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
