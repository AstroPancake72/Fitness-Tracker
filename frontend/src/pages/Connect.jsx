import { useEffect, useState } from "react";
import "../App.css";

export default function Connect() {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  // 1. Fetch potential connections from backend
  async function fetchUsers() {
    try {
      const res = await fetch("http://localhost:5000/api/users", {
        credentials: "include",
      });
      const data = await res.json();

      if (res.ok) {
        setUsers(data);
      } else {
        setMessage(data.message || "Failed to load users.");
      }
    } catch (err) {
      setMessage("Server error. Could not fetch users.");
    } finally {
      setLoading(false);
    }
  }

  // 2. Handle connection request
  async function handleConnect(targetUserId) {
    try {
      const res = await fetch("http://localhost:5000/api/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ targetUserId }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Connection request sent!");
        // Update the local state UI to reflect the pending request
        setUsers(
          users.map((user) =>
            user._id === targetUserId ? { ...user, connectionStatus: "pending" } : user
          )
        );
      } else {
        setMessage(data.message || "Could not send request.");
      }
    } catch (err) {
      setMessage("Error sending connection request.");
    }
  }

  return (
    <div className="login-container" style={{ maxWidth: "900px" }}>
      <h1>Connect with Others</h1>
      <p style={{ marginBottom: "20px", color: "#38422B" }}>
        Find other fitness enthusiasts, share goals, and track progress together.
      </p>

      {message && (
        <div style={{ ...statusMessageStyle, backgroundColor: message.includes("sent") ? "#E2E8DD" : "#F8D7DA" }}>
          {message}
        </div>
      )}

      {loading ? (
        <p>Loading potential connections...</p>
      ) : users.length === 0 ? (
        <p>No other users found at the moment!</p>
      ) : (
        <div style={gridContainerStyle}>
          {users.map((user) => (
            <div key={user._id} style={profileCardStyle}>
              <h3>{user.fullName || "Anonymous Tracker"}</h3>
              {user.bio && <p style={{ fontSize: "14px", fontStyle: "italic" }}>"{user.bio}"</p>}
              
              <div style={detailsGroupStyle}>
                {user.age && <span><strong>Age:</strong> {user.age}</span>}
                {user.dietaryRestrictions?.length > 0 && (
                  <p style={{ margin: "5px 0 0 0", fontSize: "14px" }}>
                    <strong>Diet:</strong> {user.dietaryRestrictions.join(", ")}
                  </p>
                )}
              </div>

              {/* Button behavior depending on current connection state */}
              {user.connectionStatus === "connected" ? (
                <button className="counter" style={disabledButtonStyle} disabled>
                  Connected ✓
                </button>
              ) : user.connectionStatus === "pending" ? (
                <button className="counter" style={disabledButtonStyle} disabled>
                  Request Pending...
                </button>
              ) : (
                <button className="counter" onClick={() => handleConnect(user._id)}>
                  Connect
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const gridContainerStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
  gap: "20px",
  marginTop: "20px",
};

const profileCardStyle = {
  background: "#F5F1E8",
  border: "2px solid #38422B",
  borderRadius: "20px",
  padding: "20px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "between",
  textAlign: "left",
};

const detailsGroupStyle = {
  borderTop: "1px solid rgba(56, 66, 43, 0.2)",
  paddingTop: "10px",
  marginTop: "auto",
  marginBottom: "15px",
};

const disabledButtonStyle = {
  background: "#CCCCCC",
  color: "#666666",
  border: "2px solid #999999",
  cursor: "not-allowed",
};

const statusMessageStyle = {
  padding: "10px",
  borderRadius: "10px",
  border: "1px solid #38422B",
  marginBottom: "15px",
  textAlign: "center",
};