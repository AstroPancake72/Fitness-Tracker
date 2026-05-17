import { useEffect, useState } from "react";
import "../App.css";

export default function Profile() {
  const [profile, setProfile] = useState({
    fullName: "",
    age: "",
    height: "",
    weight: "",
    dietaryRestrictions: "",
    fitnessGoal: "Maintain fitness",
    bio: "",
    goalsVisibleToFriends: false,
  });

  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("http://localhost:5000/api/profile", {
          credentials: "include",
        });

        const data = await res.json();

        if (res.ok) {
          setProfile({
            fullName: data.fullName || "",
            age: data.age || "",
            height: data.height || "",
            weight: data.weight || "",
            dietaryRestrictions: data.dietaryRestrictions?.join(", ") || "",
            fitnessGoal: data.fitnessGoal || "Maintain fitness",
            bio: data.bio || "",
            goalsVisibleToFriends: data.goalsVisibleToFriends || false,
          });
        }
      } catch (err) {
        console.error(err);
        setMessage("Could not load profile.");
      }
    }

    loadProfile();
  }, []);

  function updateField(field, value) {
    setProfile({ ...profile, [field]: value });
  }

  async function saveProfile(e) {
    e.preventDefault();

    const payload = {
      ...profile,
      age: profile.age ? Number(profile.age) : null,
      height: profile.height ? Number(profile.height) : null,
      weight: profile.weight ? Number(profile.weight) : null,
      dietaryRestrictions: profile.dietaryRestrictions
        .split(",")
        .map(item => item.trim())
        .filter(item => item !== ""),
    };

    try {
      const res = await fetch("http://localhost:5000/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setMessage("Profile saved!");
      } else {
        setMessage("Profile save failed.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Server error.");
    }
  }

  return (
    <div className="login-container" style={{ maxWidth: "700px" }}>
      <h1>User Profile</h1>

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

        <select
          value={profile.fitnessGoal}
          onChange={(e) => updateField("fitnessGoal", e.target.value)}
        >
          <option>Maintain fitness</option>
          <option>Lose weight</option>
          <option>Gain muscle</option>
          <option>Increase strength</option>
          <option>Improve endurance</option>
        </select>

        <textarea
          placeholder="Short bio"
          value={profile.bio}
          onChange={(e) => updateField("bio", e.target.value)}
          style={{ minHeight: "90px" }}
        />

        <label style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <input
            type="checkbox"
            checked={profile.goalsVisibleToFriends}
            onChange={(e) => updateField("goalsVisibleToFriends", e.target.checked)}
          />
          Allow friends to see my goals
        </label>

        <button type="submit">Save Profile</button>
      </form>

      {message && <p>{message}</p>}
    </div>
  );
}