import { useState } from "react";

export default function Login({ onLogin }) {
  const [showCodePage, setShowCodePage] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");

  function loginUser(e) {
    e.preventDefault();

    //temporary login info
    if (email === "test@example.com" && password === "password123") {
      setMessage("");
      setShowCodePage(true);
    } else {
      setMessage("Wrong email or password");
    }
  }

  function checkCode(e) {
    e.preventDefault();

    //fake 2FA code
    if (code === "123456") {
      setMessage("");
      onLogin();
    } else {
      setMessage("Wrong authentication code");
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
      <h1>Fitness Tracker Login</h1>

      <form onSubmit={loginUser}>
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

        <button type="submit">Log In</button>
      </form>

      {message && <p className="error">{message}</p>}
    </div>
  );
}