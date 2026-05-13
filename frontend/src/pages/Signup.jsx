import { useState } from "react";

export default function Signup({ onBack }) {
  const [showCodePage, setShowCodePage] = useState(false);
  const [showReturnLogin, setShowReturnLogin] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");

  async function handleSignup(e) {
    e.preventDefault();

    // fake signup flow — replace with real API call later
    if (!email || !password) {
      setMessage("Please provide email and password");
      return;
    }

    try {

      const response = await fetch("http://localhost:5000/api/signup", {
      method: "POST", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowCodePage(true)
        setMessage("");
      } else {
        setMessage(data.message || "Signup failed.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Server Error, please try again later");
    }
  }

  async function checkCode(e) {
  e.preventDefault();

  try {
    const response = await fetch("http://localhost:5000/api/verify-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }), // Sends the email and the typed code
    });

    const data = await response.json();

    if (response.ok) {
      setMessage("Account created. You can now log in.");
      setShowReturnLogin(true);
    } else {
      setMessage(data.message || "Wrong authentication code");
    }
  } catch (error) {
    setMessage("Server error, please try again later");
  }
}

  if (showCodePage) {
    return (
      <div className="login-container">
        <h1>Email Verification</h1>
        <p>Enter the 6 digit code sent to your device.</p>

        <form onSubmit={checkCode}>
          <input type="text" placeholder="Enter code" value={code} onChange={(e) => setCode(e.target.value)} />
          <button type="submit">Verify</button>
        </form>

        {showReturnLogin && <button type="button" onClick={onBack} className="link-button">Go to Login</button>}

        {message && <p className="error">{message}</p>}
      </div>
    );
  }
  

  return (
    <div className="login-container">
      <h1>Fitness Tracker</h1>
      <h2 className="login-subtitle">Sign Up</h2>

      <form onSubmit={handleSignup}>
        <input
          type="text"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit">Sign Up</button>
      </form>

      {message && <p className="error">{message}</p>}

      <p className="signup-prompt">
        Already have an account? <button type="button" onClick={onBack} className="link-button">Back to Login</button>
      </p>
    </div>
  );

}