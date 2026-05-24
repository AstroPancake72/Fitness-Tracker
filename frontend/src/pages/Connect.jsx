import { useEffect, useState } from "react";
import "../App.css";

export default function Connect({ onOpenMessage }) {
  const [activeTab, setActiveTab] = useState("discover");
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [connections, setConnections] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState({});
  const [connSearch, setConnSearch] = useState("");
  const [viewingProfile, setViewingProfile] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [usersRes, requestsRes, connectionsRes] = await Promise.all([
          fetch("http://localhost:5000/api/users", { credentials: "include" }),
          fetch("http://localhost:5000/api/requests", { credentials: "include" }),
          fetch("http://localhost:5000/api/my-connections", { credentials: "include" }),
        ]);

        const usersData = await usersRes.json();
        const requestsData = await requestsRes.json();
        const connectionsData = await connectionsRes.json();

        if (usersRes.ok) {
          setUsers(usersData);
          const initialStatus = {};
          usersData.forEach((user) => {
            if (user.connectionStatus === "pending") initialStatus[user._id] = "pending";
            else if (user.connectionStatus === "connected") initialStatus[user._id] = "already";
          });
          setConnectionStatus(initialStatus);
        }

        if (requestsRes.ok) setRequests(requestsData);
        if (connectionsRes.ok) setConnections(connectionsData);
      } catch (err) {
        setMessage("Server error. Could not fetch data.");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  async function handleConnect(targetUserId) {
    try {
      const response = await fetch("http://localhost:5000/api/connect", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
      if (response.status === 200) {
        setConnectionStatus((prev) => ({ ...prev, [targetUserId]: "pending" }));
      } else if (response.status === 400) {
        setConnectionStatus((prev) => ({ ...prev, [targetUserId]: "already" }));
      }
    } catch (err) {
      console.error("Fetch error:", err);
    }
  }

  async function handleRespond(requesterId, action) {
    try {
      const response = await fetch("http://localhost:5000/api/requests/respond", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requesterId, action }),
      });
      if (response.ok) {
        setRequests((prev) => prev.filter((r) => r._id !== requesterId));
        if (action === "accept") {
          setConnectionStatus((prev) => ({ ...prev, [requesterId]: "already" }));
          // Also add to local connections list
          const accepted = requests.find((r) => r._id === requesterId);
          if (accepted) setConnections((prev) => [...prev, accepted]);
        }
      }
    } catch (err) {
      console.error("Respond error:", err);
    }
  }

  const filteredConnections = connections.filter((c) =>
    (c.fullName || "").toLowerCase().includes(connSearch.toLowerCase())
  );

  return (
    <div className="login-container" style={{ maxWidth: "900px" }}>
      {/* Profile viewer modal */}
      {viewingProfile && (
        <div style={modalOverlayStyle}>
          <div style={modalBoxStyle}>
            <h2 style={{ margin: "0 0 16px", color: "#38422B" }}>
              {viewingProfile.fullName || "Anonymous Tracker"}
            </h2>
            <div style={profileDetailStyle}>
              <p><strong>Age:</strong> {viewingProfile.age || "Not provided"}</p>
              <p><strong>Height:</strong> {viewingProfile.height || "Not provided"}</p>
              <p><strong>Weight:</strong> {viewingProfile.weight || "Not provided"}</p>
              <p><strong>Dietary Restrictions:</strong> {viewingProfile.dietaryRestrictions?.join(", ") || "None"}</p>
              <p><strong>Bio:</strong> {viewingProfile.bio || "Not provided"}</p>
            </div>
            <button
              className="counter"
              style={{ width: "100%", marginTop: 8 }}
              onClick={() => setViewingProfile(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <h1>Connect with Others</h1>

      {/* Tabs */}
      <div style={tabBarStyle}>
        {["discover", "requests", "connections"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={activeTab === tab ? activeTabStyle : tabStyle}
          >
            {tab === "discover" && "Discover"}
            {tab === "requests" && `Requests${requests.length > 0 ? ` (${requests.length})` : ""}`}
            {tab === "connections" && `Connections${connections.length > 0 ? ` (${connections.length})` : ""}`}
          </button>
        ))}
      </div>

      {message && (
        <div style={{ ...statusMessageStyle, backgroundColor: "#F8D7DA" }}>{message}</div>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          {/* DISCOVER TAB */}
          {activeTab === "discover" && (
            <div style={gridContainerStyle}>
              {users
                .filter((u) => !connectionStatus[u._id] || connectionStatus[u._id] === "pending")
                .map((user) => (
                  <div key={user._id} style={profileCardStyle}>
                    <h3>{user.fullName || "Anonymous Tracker"}</h3>
                    {user.bio && (
                      <p style={{ fontSize: "14px", fontStyle: "italic" }}>"{user.bio}"</p>
                    )}
                    <div style={detailsGroupStyle}>
                      {user.age && <span><strong>Age:</strong> {user.age}</span>}
                      {user.dietaryRestrictions?.length > 0 && (
                        <p style={{ margin: "5px 0 0 0", fontSize: "14px" }}>
                          <strong>Diet:</strong> {user.dietaryRestrictions.join(", ")}
                        </p>
                      )}
                    </div>
                    {connectionStatus[user._id] === "pending" ? (
                      <button className="counter" style={disabledButtonStyle} disabled>
                        Request Pending...
                      </button>
                    ) : (
                      <button
                        className="counter"
                        onClick={() => handleConnect(user._id)}
                        style={{ backgroundColor: "#38422B", color: "white", cursor: "pointer" }}
                      >
                        Connect
                      </button>
                    )}
                  </div>
                ))}
              {users.filter((u) => !connectionStatus[u._id] || connectionStatus[u._id] === "pending")
                .length === 0 && <p>No new users to discover!</p>}
            </div>
          )}

          {/* REQUESTS TAB */}
          {activeTab === "requests" && (
            <div style={gridContainerStyle}>
              {requests.length === 0 ? (
                <p>No incoming requests.</p>
              ) : (
                requests.map((user) => (
                  <div key={user._id} style={profileCardStyle}>
                    <h3>{user.fullName || "Anonymous Tracker"}</h3>
                    {user.bio && (
                      <p style={{ fontSize: "14px", fontStyle: "italic" }}>"{user.bio}"</p>
                    )}
                    <div style={detailsGroupStyle}>
                      {user.age && <span><strong>Age:</strong> {user.age}</span>}
                    </div>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        className="counter"
                        onClick={() => handleRespond(user._id, "accept")}
                        style={{ backgroundColor: "#38422B", color: "white", cursor: "pointer", flex: 1 }}
                      >
                        Accept ✓
                      </button>
                      <button
                        className="counter"
                        onClick={() => handleRespond(user._id, "decline")}
                        style={{ backgroundColor: "#cc0000", color: "white", cursor: "pointer", flex: 1 }}
                      >
                        Decline ✗
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* CONNECTIONS TAB */}
          {activeTab === "connections" && (
            <>
              <input
                type="text"
                placeholder="Search connections..."
                value={connSearch}
                onChange={(e) => setConnSearch(e.target.value)}
                style={searchInputStyle}
              />
              <div style={gridContainerStyle}>
                {filteredConnections.length === 0 ? (
                  <p>{connSearch ? "No matching connections." : "No connections yet. Start connecting!"}</p>
                ) : (
                  filteredConnections.map((user) => (
                    <div key={user._id} style={profileCardStyle}>
                      <h3>{user.fullName || "Anonymous Tracker"}</h3>
                      {user.bio && (
                        <p style={{ fontSize: "14px", fontStyle: "italic" }}>"{user.bio}"</p>
                      )}
                      <div style={detailsGroupStyle}>
                        {user.age && <span><strong>Age:</strong> {user.age}</span>}
                        {user.dietaryRestrictions?.length > 0 && (
                          <p style={{ margin: "5px 0 0 0", fontSize: "14px" }}>
                            <strong>Diet:</strong> {user.dietaryRestrictions.join(", ")}
                          </p>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="counter"
                          style={{ flex: 1 }}
                          onClick={() => setViewingProfile(user)}
                        >
                          View Info
                        </button>
                        <button
                          className="counter"
                          style={{ flex: 1, background: "#38422B", color: "white" }}
                          onClick={() => onOpenMessage(user.userId?.toString?.() || user._id)}
                        >
                          Message
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

const tabBarStyle = {
  display: "flex",
  gap: "10px",
  marginBottom: "20px",
  borderBottom: "2px solid #38422B",
  paddingBottom: "10px",
};
const tabStyle = {
  padding: "8px 20px",
  borderRadius: "20px",
  border: "2px solid #38422B",
  background: "transparent",
  color: "#38422B",
  cursor: "pointer",
  fontWeight: "600",
};
const activeTabStyle = { ...tabStyle, background: "#38422B", color: "white" };
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
const searchInputStyle = {
  width: "100%",
  padding: "12px 15px",
  borderRadius: "10px",
  border: "1px solid #38422B",
  background: "#F5F1E8",
  fontSize: "15px",
  boxSizing: "border-box",
  outline: "none",
  marginTop: 8,
};
const modalOverlayStyle = {
  position: "fixed",
  top: 0, left: 0, right: 0, bottom: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};
const modalBoxStyle = {
  background: "#CCD5C0",
  padding: 28,
  borderRadius: 20,
  border: "2px solid #38422B",
  width: 400,
  maxWidth: "90vw",
};
const profileDetailStyle = {
  background: "#F5F1E8",
  borderRadius: 12,
  padding: "16px 20px",
  marginBottom: 12,
  textAlign: "left",
  fontSize: 15,
};
