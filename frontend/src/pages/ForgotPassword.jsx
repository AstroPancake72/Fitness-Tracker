import { useState } from "react";

export default function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  function getPasswordChecks(password) {
    return [
      { label: "At least 8 characters", valid: password.length >= 8 },
      { label: "At least one uppercase letter", valid: /[A-Z]/.test(password) },
      { label: "At least one lowercase letter", valid: /[a-z]/.test(password) },
      { label: "At least one number", valid: /\d/.test(password) },
      { label: "At least one special character", valid: /[^A-Za-z0-9]/.test(password) },
    ];
  }

  const passwordChecks = getPasswordChecks(newPassword);
  const isPasswordValid = passwordChecks.every((check) => check.valid);

  async function handleRequestCode(e) {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:5000/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      setIsError(!response.ok);
      setMessage(data.message);
      if (response.ok) setCodeSent(true);
    } catch (error) {
      setIsError(true);
      setMessage("Server error. Try again later.");
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (!isPasswordValid) return;

    try {
      const response = await fetch("http://localhost:5000/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await response.json();
      setIsError(!response.ok);
      setMessage(data.message);
      if (response.ok) {
        setCode("");
        setNewPassword("");
      }
    } catch (error) {
      setIsError(true);
      setMessage("Server error. Try again later.");
    }
  }

  return (
    <div className="login-container">
      <h1 style={{ marginBottom: '10px' }}>Fitness Tracker</h1>
      <h2 className="login-subtitle" style={{ marginBottom: '10px' }}>Reset Password</h2>
      
      {!codeSent ? (
        <form onSubmit={handleRequestCode}>
          <p style={{ fontSize: '14px' }}>Enter email to receive a verification pin.</p>
          <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button type="submit">Send Reset Code</button>
        </form>
      ) : (
        <form onSubmit={handleResetPassword}>
          <input type="text" placeholder="6-Digit Code" value={code} onChange={(e) => setCode(e.target.value)} required />
          
          <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: '100%' }}>
            <input
              type={showPassword ? "text" : "password"} 
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ paddingRight: '60px', width: '100%' }} 
            />
            <button
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '20px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#38422B', 
                padding: '4px',
                margin: 0,
                width: 'auto',
                boxShadow: 'none',
                marginTop: '10px',
              }}
            >
              {showPassword ? "Hide" : "Show"} 
            </button>
          </div>

          <ul className="password-rules" style={{ textAlign: 'left', listStyle: 'none', padding: 0, margin: '10px 0' }}>
            {passwordChecks.map((check) => (
              <li key={check.label} style={{ fontSize: '13px', color: check.valid ? '#38422B' : '#777' }}>
                {check.valid ? "✓ " : "○ "} {check.label}
              </li>
            ))}
          </ul>

          <button type="submit" disabled={!isPasswordValid} style={{ marginTop: '10px' }}>
            Update Password
          </button>
        </form>
      )}

      {message && <p className={isError ? "error" : "success-message"} style={{ marginTop: '10px' }}>{message}</p>}

      <p className="signup-prompt">
        <button type="button" onClick={onBack} className="link-button">Back to Login</button>
      </p>
    </div>
  );
}