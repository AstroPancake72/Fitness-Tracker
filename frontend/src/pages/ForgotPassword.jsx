import { useState } from "react";

export default function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // 👈 Tracks visibility state
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

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
      <h1>Fitness Tracker</h1>
      <h2 className="login-subtitle">Reset Password</h2>

      {!codeSent ? (
        <form onSubmit={handleRequestCode}>
          <p style={{ marginBottom: '15px', fontSize: '14px' }}>Enter your email to receive a verification pin.</p>
          <input 
            type="email" 
            placeholder="Email Address" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
          <button type="submit">Send Reset Code</button>
        </form>
      ) : (
        <form onSubmit={handleResetPassword}>
          <input 
            type="text" 
            placeholder="6-Digit Code" 
            value={code} 
            onChange={(e) => setCode(e.target.value)} 
            required 
          />
          
          {/* 👈 Replicated inline wrapper from Login.jsx */}
          <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: '100%' }}>
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="New Password" 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)} 
              style={{ paddingRight: '60px', width: '100%' }}
              required 
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

          <button type="submit" style={{ marginTop: '15px' }}>Update Password</button>
        </form>
      )}

      {message && <p className={isError ? "error" : "success-message"} style={{ marginTop: '10px' }}>{message}</p>}

      <p className="signup-prompt">
        <button type="button" onClick={onBack} className="link-button">Back to Login</button>
      </p>
    </div>
  );
}