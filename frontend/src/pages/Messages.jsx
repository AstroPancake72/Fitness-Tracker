import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import "../App.css";

// Single socket instance shared for the lifetime of the page
let socket = null;

function getSocket() {
  if (!socket) {
    socket = io("http://localhost:5000", { withCredentials: true });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export default function Messages({ openWithUserId, onClearOpenWith }) {
  const [conversations, setConversations] = useState([]);
  const [connections, setConnections] = useState([]);
  const [activePartnerId, setActivePartnerId] = useState(null);
  const [activePartnerName, setActivePartnerName] = useState("");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [myUserId, setMyUserId] = useState(null);
  const [showWorkoutPicker, setShowWorkoutPicker] = useState(false);
  const [myWorkouts, setMyWorkouts] = useState([]);
  const [viewingWorkout, setViewingWorkout] = useState(null);
  const [addedWorkouts, setAddedWorkouts] = useState(new Set());
  const [closedConversations, setClosedConversations] = useState(new Set());
  const [messageError, setMessageError] = useState("");
  const messagesEndRef = useRef(null);

  // ── Bootstrap ────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchMe();
    fetchConversations();
    fetchConnections();

    const s = getSocket();

    s.on("receive_message", (msg) => {
      if (msg.senderId?.toString() === myUserIdRef.current) return;
      // If this conversation was closed, reopen it since a new message arrived
      setClosedConversations((prev) => {
        const next = new Set(prev);
        next.delete(msg.senderId?.toString());
        return next;
      });
      setConversations((prev) => upsertConversation(prev, msg, myUserIdRef.current));
      setMessages((prev) => {
        if (msg.senderId === activePartnerIdRef.current || msg.senderId?.toString() === activePartnerIdRef.current) {
          return [...prev, msg];
        }
        return prev;
      });
    });

    s.on("message_sent", (msg) => {
      setMessages((prev) => [...prev, msg]);
      setConversations((prev) => upsertConversation(prev, msg, myUserIdRef.current));
    });

    s.on("message_error", ({ message }) => {
      setMessageError(message);
    });

    return () => {
      s.off("receive_message");
      s.off("message_sent");
      s.disconnect();
      socket = null;
    };
  }, []);

  // Ref so socket callbacks can read current value without stale closure
  const activePartnerIdRef = useRef(activePartnerId);
  useEffect(() => {
    activePartnerIdRef.current = activePartnerId;
  }, [activePartnerId]);

  const myUserIdRef = useRef(myUserId);
  useEffect(() => {
    myUserIdRef.current = myUserId;
  }, [myUserId]);

  // If parent navigated us to a specific user (via Connect page message button)
  useEffect(() => {
    if (openWithUserId && connections.length > 0) {
      const partner = connections.find((c) => c.userId.toString() === openWithUserId);
      if (partner) openChat(openWithUserId, partner.fullName || "User");
      onClearOpenWith?.();
    }
  }, [openWithUserId, connections]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Fetchers ─────────────────────────────────────────────────────────────────

  async function fetchMe() {
    const res = await fetch("http://localhost:5000/api/me", { credentials: "include" });
    const data = await res.json();
    if (res.ok) setMyUserId(data.user._id);
  }

  async function fetchConversations() {
    const res = await fetch("http://localhost:5000/api/messages/conversations", {
      credentials: "include",
    });
    if (res.ok) setConversations(await res.json());
  }

  async function fetchConnections() {
    const res = await fetch("http://localhost:5000/api/my-connections", { credentials: "include" });
    if (res.ok) setConnections(await res.json());
  }

  async function fetchMessages(partnerId) {
    const res = await fetch(`http://localhost:5000/api/messages/${partnerId}`, {
      credentials: "include",
    });
    if (res.ok) {
      setMessages(await res.json());
      // Mark as read locally
      setConversations((prev) =>
        prev.map((c) => (c.partnerId === partnerId ? { ...c, unreadCount: 0 } : c))
      );
    }
  }

  async function fetchWorkouts() {
    const res = await fetch("http://localhost:5000/api/workouts", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      // Deduplicate to routines (same logic as Workouts.jsx)
      const routines = data.reduce((acc, cur) => {
        if (!cur.name) return acc;
        const idx = acc.findIndex(
          (r) => r.name.trim().toLowerCase() === cur.name.trim().toLowerCase()
        );
        if (idx === -1) acc.push(cur);
        else if (new Date(cur.datetime) < new Date(acc[idx].datetime)) acc[idx] = cur;
        return acc;
      }, []);
      setMyWorkouts(routines);
    }
  }

  // ── Actions ──────────────────────────────────────────────────────────────────

  function openChat(partnerId, partnerName) {
    setActivePartnerId(partnerId);
    setActivePartnerName(partnerName);
    setMessageError("");
    fetchMessages(partnerId);
  }

  function closeConversation(e, partnerId) {
    e.stopPropagation(); // don't trigger openChat on the sidebar item
    setClosedConversations((prev) => new Set([...prev, partnerId]));
    if (activePartnerId === partnerId) {
      setActivePartnerId(null);
      setMessages([]);
      setMessageError("");
    }
  }

  function sendText(e) {
    e.preventDefault();
    if (!text.trim() || !activePartnerId) return;
    getSocket().emit("send_message", { receiverId: activePartnerId, content: text.trim() });
    setText("");
  }

  function sendWorkout(workout) {
    if (!activePartnerId) return;
    getSocket().emit("send_workout", {
      receiverId: activePartnerId,
      workout: { name: workout.name, exercises: workout.exercises },
    });
    setShowWorkoutPicker(false);
  }

  async function addWorkoutToRoutines(workout) {
    const res = await fetch("http://localhost:5000/api/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: workout.name,
        datetime: new Date(),
        exercises: workout.exercises,
      }),
    });
    if (res.ok) {
      setAddedWorkouts((prev) => new Set([...prev, workout.name]));
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  function upsertConversation(prev, msg, currentUserId) {
    const partnerId =
      msg.senderId === currentUserId ? msg.receiverId : msg.senderId;
    const existing = prev.find((c) => c.partnerId === partnerId);
    if (existing) {
      return [
        { ...existing, latestMessage: msg, unreadCount: msg.senderId !== currentUserId ? existing.unreadCount + 1 : existing.unreadCount },
        ...prev.filter((c) => c.partnerId !== partnerId),
      ];
    }
    return [{ partnerId, partnerName: "User", latestMessage: msg, unreadCount: 1 }, ...prev];
  }

  // ── Filtered lists ────────────────────────────────────────────────────────────

  // Merge conversations + connections so all connections appear in sidebar
  const sidebarItems = (() => {
    const items = [...conversations];
    connections.forEach((conn) => {
      const uid = conn.userId.toString();
      if (!items.find((c) => c.partnerId === uid)) {
        items.push({ partnerId: uid, partnerName: conn.fullName || "User", latestMessage: null, unreadCount: 0 });
      }
    });
    return items.filter((item) => {
      const matchesSearch = item.partnerName.toLowerCase().includes(search.toLowerCase());
      // Hide closed conversations unless user is actively searching
      const isHidden = closedConversations.has(item.partnerId) && !search.trim();
      return matchesSearch && !isHidden;
    });
  })();

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div style={outerStyle}>
      {/* Workout Viewer Modal */}
      {viewingWorkout && (
        <div style={modalOverlayStyle}>
          <div style={modalBoxStyle}>
            <h2 style={{ margin: "0 0 16px", color: "#38422B" }}>{viewingWorkout.name}</h2>
            <div style={{ background: "#F5F1E8", borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={tableHeaderStyle}>
                <span style={{ flex: 2 }}>Exercise</span>
                <span style={{ flex: 1 }}>Weight</span>
                <span style={{ flex: 1 }}>Reps</span>
                <span style={{ flex: 1 }}>Sets</span>
                <span style={{ flex: 1 }}>Time</span>
              </div>
              <hr style={{ border: "1px solid #38422B", margin: "8px 0" }} />
              {viewingWorkout.exercises.map((ex, i) => (
                <div key={i} style={tableRowStyle}>
                  <span style={{ flex: 2, fontWeight: 500 }}>{ex.name}</span>
                  <span style={{ flex: 1 }}>{ex.weight} lbs</span>
                  <span style={{ flex: 1 }}>{ex.reps}</span>
                  <span style={{ flex: 1 }}>{ex.sets}</span>
                  <span style={{ flex: 1 }}>{ex.time || 0} min</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="counter" style={{ flex: 1 }} onClick={() => setViewingWorkout(null)}>
                Close
              </button>
              <button
                className="counter"
                style={{
                  flex: 2,
                  background: addedWorkouts.has(viewingWorkout.name) ? "#6E775C" : "#38422B",
                  color: "white",
                }}
                onClick={() => addWorkoutToRoutines(viewingWorkout)}
                disabled={addedWorkouts.has(viewingWorkout.name)}
              >
                {addedWorkouts.has(viewingWorkout.name) ? "Added ✓" : "Add to My Routines"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workout Picker Modal */}
      {showWorkoutPicker && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalBoxStyle, width: 420 }}>
            <h2 style={{ margin: "0 0 16px", color: "#38422B" }}>Share a Routine</h2>
            {myWorkouts.length === 0 ? (
              <p style={{ color: "#666" }}>No routines saved yet.</p>
            ) : (
              myWorkouts.map((w) => (
                <div key={w._id} style={workoutPickerItemStyle}>
                  <span style={{ fontWeight: 600 }}>{w.name}</span>
                  <button
                    className="counter"
                    style={{ background: "#38422B", color: "white", marginBottom: 0 }}
                    onClick={() => sendWorkout(w)}
                  >
                    Send
                  </button>
                </div>
              ))
            )}
            <button
              className="counter"
              style={{ width: "100%", marginTop: 12, background: "#ccc", color: "#333" }}
              onClick={() => setShowWorkoutPicker(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div style={sidebarStyle}>
        <h2 style={sidebarTitleStyle}>Messages</h2>
        <input
          style={searchStyle}
          placeholder="Search connections..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div style={{ overflowY: "auto", flex: 1 }}>
          {sidebarItems.length === 0 && (
            <p style={{ color: "#888", padding: "12px 16px", fontSize: 14 }}>
              No connections yet.
            </p>
          )}
          {sidebarItems.map((item) => {
            const isActive = activePartnerId === item.partnerId;
            return (
              <div
                key={item.partnerId}
                onClick={() => openChat(item.partnerId, item.partnerName)}
                style={{
                  ...convItemStyle,
                  background: isActive ? "#38422B" : "transparent",
                  color: isActive ? "white" : "#38422B",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: item.unreadCount > 0 ? 700 : 500, fontSize: 15 }}>
                    {item.partnerName}
                  </span>
                  {item.unreadCount > 0 && (
                    <span style={unreadBadgeStyle}>{item.unreadCount}</span>
                  )}
                </div>
                {item.latestMessage && (
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.latestMessage.type === "workout"
                      ? `🏋️ ${item.latestMessage.workout?.name}`
                      : item.latestMessage.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat Area */}
      <div style={chatAreaStyle}>
        {!activePartnerId ? (
          <div style={emptyStateStyle}>
            <p style={{ fontSize: 18, color: "#888" }}>Select a conversation to start chatting</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={chatHeaderStyle}>
              <span style={{ fontWeight: 700, fontSize: 18 }}>{activePartnerName}</span>
              <button
                className="counter"
                style={{ marginBottom: 0, padding: "4px 12px", fontSize: 13 }}
                onClick={(e) => closeConversation(e, activePartnerId)}
              >
                Close chat
              </button>
            </div>

            {/* Messages */}
            <div style={messagesListStyle}>
              {messages.map((msg, i) => {
                const isMine = msg.senderId === myUserId || msg.senderId?.toString() === myUserId?.toString();
                return (
                  <div
                    key={msg._id || i}
                    style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start", marginBottom: 10 }}
                  >
                    {msg.type === "workout" ? (
                      <div
                        style={workoutBubbleStyle(isMine)}
                        onClick={() => setViewingWorkout(msg.workout)}
                      >
                        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>
                          🏋️ Shared a workout
                        </div>
                        <div style={{ fontWeight: 700 }}>{msg.workout?.name}</div>
                        <div style={{ fontSize: 12, marginTop: 4, opacity: 0.8 }}>
                          {msg.workout?.exercises?.length} exercise{msg.workout?.exercises?.length !== 1 ? "s" : ""}
                        </div>
                        <div style={{ fontSize: 11, marginTop: 6, textDecoration: "underline", opacity: 0.7 }}>
                          Click to view
                        </div>
                      </div>
                    ) : (
                      <div style={bubbleStyle(isMine)}>{msg.content}</div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Error banner */}
            {messageError && (
              <div style={errorBannerStyle}>
                ⚠ {messageError}
              </div>
            )}

            {/* Input */}
            <form onSubmit={sendText} style={inputRowStyle}>
              <button
                type="button"
                className="counter"
                style={shareWorkoutBtnStyle}
                onClick={() => { fetchWorkouts(); setShowWorkoutPicker(true); }}
                title="Share a workout"
              >
                🏋️
              </button>
              <input
                style={textInputStyle}
                placeholder="Type a message..."
                value={text}
                onChange={(e) => { setText(e.target.value); setMessageError(""); }}
              />
              <button
                type="submit"
                className="counter"
                style={{ background: "#38422B", color: "white", marginBottom: 0, padding: "10px 20px" }}
              >
                Send
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const outerStyle = {
  display: "flex",
  height: "calc(100vh - 64px)", // subtract nav height
  background: "#F5F1E8",
  overflow: "hidden",
};

const sidebarStyle = {
  width: 280,
  minWidth: 220,
  background: "#CCD5C0",
  borderRight: "2px solid #38422B",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const sidebarTitleStyle = {
  padding: "20px 16px 8px",
  margin: 0,
  fontSize: 22,
  fontWeight: 700,
  color: "#38422B",
  borderBottom: "2px solid #38422B",
};

const searchStyle = {
  margin: "10px 12px",
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #38422B",
  background: "#F5F1E8",
  fontSize: 14,
  outline: "none",
};

const convItemStyle = {
  padding: "12px 16px",
  cursor: "pointer",
  borderRadius: 10,
  margin: "4px 8px",
  transition: "background 0.15s",
};

const unreadBadgeStyle = {
  background: "#9FB873",
  color: "#38422B",
  borderRadius: "50%",
  width: 20,
  height: 20,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 11,
  fontWeight: 700,
};

const chatAreaStyle = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const emptyStateStyle = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const chatHeaderStyle = {
  padding: "16px 20px",
  borderBottom: "2px solid #38422B",
  background: "#CCD5C0",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const errorBannerStyle = {
  margin: "0 16px 8px",
  padding: "10px 14px",
  background: "#f8d7da",
  border: "1px solid #8b2e2e",
  borderRadius: 10,
  color: "#8b2e2e",
  fontSize: 14,
  fontWeight: 600,
};

const messagesListStyle = {
  flex: 1,
  overflowY: "auto",
  padding: "16px 20px",
  display: "flex",
  flexDirection: "column",
};

const bubbleStyle = (isMine) => ({
  maxWidth: "65%",
  padding: "10px 14px",
  borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
  background: isMine ? "#38422B" : "#CCD5C0",
  color: isMine ? "white" : "#38422B",
  fontSize: 15,
  lineHeight: 1.4,
  wordBreak: "break-word",
});

const workoutBubbleStyle = (isMine) => ({
  maxWidth: "65%",
  padding: "12px 16px",
  borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
  background: isMine ? "#38422B" : "#6E775C",
  color: "white",
  cursor: "pointer",
  border: "2px solid #9FB873",
});

const inputRowStyle = {
  display: "flex",
  gap: 8,
  padding: "12px 16px",
  borderTop: "2px solid #38422B",
  background: "#CCD5C0",
  alignItems: "center",
};

const shareWorkoutBtnStyle = {
  background: "#F5F1E8",
  color: "#38422B",
  marginBottom: 0,
  padding: "10px 14px",
  fontSize: 18,
};

const textInputStyle = {
  flex: 1,
  padding: "10px 14px",
  borderRadius: 12,
  border: "2px solid #38422B",
  background: "#F5F1E8",
  fontSize: 15,
  outline: "none",
  color: "#38422B",
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
  width: 560,
  maxWidth: "90vw",
  maxHeight: "80vh",
  overflowY: "auto",
};

const tableHeaderStyle = {
  display: "flex",
  fontWeight: 700,
  fontSize: 13,
  color: "#38422B",
  textAlign: "left",
};

const tableRowStyle = {
  display: "flex",
  fontSize: 14,
  padding: "6px 0",
  borderBottom: "1px dashed #ccc",
  textAlign: "left",
};

const workoutPickerItemStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 14px",
  background: "#F5F1E8",
  borderRadius: 10,
  marginBottom: 8,
  border: "1px solid #38422B",
};
