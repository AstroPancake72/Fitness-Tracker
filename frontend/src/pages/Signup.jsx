import { useState } from "react";

export default function Signup({ onBack }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  function handleSignup(e) {
    e.preventDefault();

    // fake signup flow — replace with real API call later
    if (!email || !password) {
      setMessage("Please provide email and password");
      return;
    }

    setMessage("Account created. You can now log in.");
  }

  return (
    <div className="signup-container">
      <h1>Create an account</h1>

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

      {message && <p className="info">{message}</p>}

      <p>
        Already have an account? <button type="button" onClick={onBack} className="link-button">Back to Log In</button>
      </p>
    </div>
  );
}
