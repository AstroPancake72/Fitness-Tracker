import { useEffect, useState } from "react";
import "../App.css";

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState({
    fullName: "",
    age: "",
    height: "",
    weight: "",
    dietaryRestrictions: "",
    bio: "",
    goalsVisibleToFriends: false,
  });

  useEffect(() => {
    loadProfile();
  }, []);

    async function loadProfile() {
      const res = await fetch("http://localhost:5000/api/profile", {
      credentials: "include",
    })

    const data = await res.json();

        if (res.ok) {
          setProfile({
            fullName: data.fullName || "",
            age: data.age || "",
            height: data.height || "",
            weight: data.weight || "",
            dietaryRestrictions: data.dietaryRestrictions?.join(", ") || "",
            bio: data.bio || "",
          });
        } else {
          setMessage(data.message || "Could not load profile.");
        }
      }

    function updateField(field, value) {
      setProfile({ ...profile, [field]: value });
    }

    async function saveProfile(e) {
      e.preventDefault();

    const payload = {
      fullName: profile.fullName,
      age: profile.age ? Number(profile.age) : null,
      height: profile.height ? Number(profile.height) : null,
      weight: profile.weight ? Number(profile.weight) : null,
      dietaryRestrictions: profile.dietaryRestrictions
        .split(",")
        .map(item => item.trim())
        .filter(item => item !== ""),
      bio: profile.bio,
    };

      const res = await fetch("http://localhost:5000/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

    if (res.ok) {
        setMessage("Profile saved!");
        setIsEditing(false);
        loadProfile();
    } else {
        setMessage(data.message || "Profile save failed.");
    }    
  }

if (!isEditing) {
  return (
    <div className="login-container" style={{ maxWidth: "700px" }}>
      <h1>User Profile</h1>


        <div style={profileCardStyle}>
          <p><strong>Full Name:</strong> {profile.fullName || "Not provided"}</p>
          <p><strong>Age:</strong> {profile.age || "Not provided"}</p>
          <p><strong>Height:</strong> {profile.height || "Not provided"}</p>
          <p><strong>Weight:</strong> {profile.weight || "Not provided"}</p>
          <p><strong>Dietary Restrictions:</strong> {profile.dietaryRestrictions || "None"}</p>
          <p><strong>Bio:</strong> {profile.bio || "Not provided"}</p>
        </div>

        <button className="counter" onClick={() => setIsEditing(true)}>
          Edit Profile
        </button>

        {message && <p>{message}</p>}
      </div>
    );
  }

  return (
    <div className="login-container" style={{ maxWidth: "700px" }}>
      <h1>Edit Profile</h1>

      <form onSubmit={saveProfile}>
        <input
          type="text"
          placeholder="Full name"
          value={profile.fullName}
          onChange={(e) => updateField("fullName", e.target.value)}
        />

        <input
          type="number"
          placeholder="Age"
          value={profile.age}
          onChange={(e) => updateField("age", e.target.value)}
        />

        <input
          type="number"
          placeholder="Height"
          value={profile.height}
          onChange={(e) => updateField("height", e.target.value)}
        />

        <input
          type="number"
          placeholder="Weight"
          value={profile.weight}
          onChange={(e) => updateField("weight", e.target.value)}
        />

        <input
          type="text"
          placeholder="Dietary restrictions, comma separated"
          value={profile.dietaryRestrictions}
          onChange={(e) => updateField("dietaryRestrictions", e.target.value)}
        />

        <textarea
          placeholder="Short bio"
          value={profile.bio}
          onChange={(e) => updateField("bio", e.target.value)}
        />

        <div style={{ display: "flex", gap: "10px" }}>
          <button type="button" className="counter" onClick={() => setIsEditing(false)}>
            Cancel
          </button>

          <button type="submit" className="counter">
            Save Profile
          </button>
        </div>
      </form>

      {message && <p>{message}</p>}
    </div>
  );
}

const profileCardStyle = {
  background: "#F5F1E8",
  border: "2px solid #38422B",
  borderRadius: "20px",
  padding: "24px",
  marginBottom: "20px",
  textAlign: "left",
  fontSize: "18px",
};