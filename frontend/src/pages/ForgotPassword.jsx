import { useState } from "react";

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "At least one uppercase", test: (p) => /[A-Z]/.test(p) },
  { label: "At least one lowercase", test: (p) => /[a-z]/.test(p) },
  { label: "At least one number",    test: (p) => /\d/.test(p) },
  { label: "At least one special",   test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export default function ForgotPassword({ onBack }) {
  const [step, setStep] = useState("REQUEST_CODE");
  const [form, setForm] = useState({ email: "", code: "", newPassword: "" });
  const [status, setStatus] = useState({ message: "", isError: false });
  const [showPassword, setShowPassword] = useState(false);

  const validation = PASSWORD_RULES.map(rule => ({
    ...rule,
    valid: rule.test(form.newPassword)
  }));
  const isPasswordValid = validation.every(r => r.valid);

  const updateForm = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  async function handleSubmit(endpoint, body, onSuccess) {
    try {
      const res = await fetch(`http://localhost:5000/api/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setStatus({ message: data.message, isError: !res.ok });
      if (res.ok) onSuccess();
    } catch {
      setStatus({ message: "Server error. Try again later.", isError: true });
    }
  }

  return (
    <div className="login-container">
      <h1>Fitness Tracker</h1>
      <h2>Reset Password</h2>

      {step === "REQUEST_CODE" ? (
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit("forgot-password", { email: form.email }, () => setStep("RESET_PASSWORD")); }}>
          <p>Enter email to receive a verification pin.</p>
          <input type="email" placeholder="Email" value={form.email} onChange={(e) => updateForm("email", e.target.value)} required />
          <button type="submit">Send Reset Code</button>
        </form>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit("reset-password", form, () => onBack()); }}>
          <input type="text" placeholder="6-Digit Code" value={form.code} onChange={(e) => updateForm("code", e.target.value)} required />
          
<div style={{ 
  position: 'relative', 
  width: '100%', 
  display: 'flex', 
  alignItems: 'center' 
}}>
  <input 
    type={showPassword ? "text" : "password"} 
    placeholder="New Password" 
    value={form.newPassword} 
    onChange={(e) => updateForm("newPassword", e.target.value)} 
    style={{ 
      width: '100%', 
      paddingRight: '60px', 
      boxSizing: 'border-box' 
    }} 
  />
  <button 
  type="button" 
  onClick={() => setShowPassword(!showPassword)}
  style={{
    position: 'absolute',
    right: '10px',      
    top: '50%',       
    transform: 'translateY(-50%)', 
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#38422B',
    fontWeight: 'bold',
    zIndex: 1,
    margin: 0,          
    padding: '5px 10px',
    width: 'auto',      
    flexShrink: 0       
  }}
>
  {showPassword ? "Hide" : "Show"}
</button>
</div>

          <ul className="password-rules">
            {validation.map(({ label, valid }) => (
              <li key={label} className={valid ? "valid" : "invalid"}>{valid ? "✓" : "○"} {label}</li>
            ))}
          </ul>

          <button type="submit" disabled={!isPasswordValid}>Update Password</button>
        </form>
      )}

      {status.message && <p className={status.isError ? "error" : "success"}>{status.message}</p>}
      <button onClick={onBack} className="link-button">Back to Login</button>
    </div>
  );
}