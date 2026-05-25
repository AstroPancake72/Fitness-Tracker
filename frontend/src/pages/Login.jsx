import { useState } from "react";

export default function Login({ onLogin, onShowSignup }) {
  const [showCodePage, setShowCodePage] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // Tracks visibility state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");

  async function loginUser(e) {
    e.preventDefault();

    try {
      const response = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("");
        setShowCodePage(true); 
      } else {
        setMessage(data.message || "Wrong email or password");
      }
    } catch (error) {
      console.error(error);
      setMessage("Server error. Please try again later.");
    }
  }
  
  async function checkCode(e) {
    e.preventDefault();

    try {
      const response = await fetch("http://localhost:5000/api/verify-2fa", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }), 
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("");
        onLogin();
      } else {
        setMessage(data.message || "Wrong authentication code");
      }
    } catch (error) {
      setMessage("Server error. Please try again.");
    }
  }

  if (showCodePage) {
    return (
      <div className="login-container">
        <h1>Two-Factor Authentication</h1>
        <p>Enter the 6 digit code sent to your device.</p>

        <form onSubmit={checkCode}>
          <input type="text" placeholder="Enter code" value={code} onChange={(e) => setCode(e.target.value)} />
          <button type="submit">Verify</button>
        </form>

        {message && <p className="error">{message}</p>}
      </div>
    );
  }

  return (
    <div className="login-container">
      <h1>Fitness Tracker</h1>
      <h2 className="login-subtitle">Login</h2>

      <form onSubmit={loginUser}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: '100%' }}>
          <input
            type={showPassword ? "text" : "password"} 
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ paddingRight: '60px', width: '100%' }} // Bumped padding slightly so longer text labels won't overlap your typing
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

        <button type="submit" style={{ marginTop: '15px' }}>Log In</button>
      </form>

      {message && <p className="error">{message}</p>}

      <p className="signup-prompt">
        Don't have an account? <button type="button" onClick={onShowSignup} className="link-button">Sign Up</button>
      </p>
    </div>
  );
}