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
    fitnessGoal: "",
    activityLevel: "",
    bio: "",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
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
        dietaryRestrictions: data.dietaryRestrictions?.[0] || "",
        fitnessGoal: data.fitnessGoal || "",
        activityLevel: data.activityLevel || "",
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
        ? [profile.dietaryRestrictions]
        : [],
      fitnessGoal: profile.fitnessGoal,
      activityLevel: profile.activityLevel,
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
      <div style={profileCardStyle}>
        <h1>User Profile</h1>

        <p>Full Name: {profile.fullName || "Not provided"}</p>
        <p>Age: {profile.age || "Not provided"}</p>
        <p>Height: {profile.height || "Not provided"}</p>
        <p>Weight: {profile.weight || "Not provided"}</p>
        <p>Dietary Restrictions: {profile.dietaryRestrictions || "None"}</p>
        <p>Fitness Goal: {profile.fitnessGoal || "Not provided"}</p>
        <p>Activity Level: {profile.activityLevel || "Not provided"}</p>
        <p>Bio: {profile.bio || "Not provided"}</p>

        <button className="counter" onClick={() => setIsEditing(true)}>
          Edit Profile
        </button>

        {message && <p>{message}</p>}
      </div>
    );
  }

  return (
    <div style={profileCardStyle}>
      <h1>Edit Profile</h1>

      <form onSubmit={saveProfile}>
        <label>Full Name</label>
        <input
          value={profile.fullName}
          onChange={(e) => updateField("fullName", e.target.value)}
        />

        <label>Age</label>
        <input
          type="number"
          value={profile.age}
          onChange={(e) => updateField("age", e.target.value)}
        />

        <label>Height</label>
        <input
          type="number"
          value={profile.height}
          onChange={(e) => updateField("height", e.target.value)}
        />

        <label>Weight</label>
        <input
          type="number"
          value={profile.weight}
          onChange={(e) => updateField("weight", e.target.value)}
        />

        <label>Dietary Restrictions</label>
        <select
          value={profile.dietaryRestrictions}
          onChange={(e) => updateField("dietaryRestrictions", e.target.value)}
        >
          <option value="">None</option>
          <option value="vegetarian">Vegetarian</option>
          <option value="vegan">Vegan</option>
          <option value="gluten-free">Gluten-free</option>
          <option value="dairy-free">Dairy-free</option>
          <option value="peanut-free">Peanut-free</option>
        </select>

        <label>Fitness Goal</label>
        <select
          value={profile.fitnessGoal}
          onChange={(e) => updateField("fitnessGoal", e.target.value)}
        >
          <option value="">Select a goal</option>
          <option value="lose weight">Lose weight</option>
          <option value="maintain weight">Maintain weight</option>
          <option value="gain muscle">Gain muscle</option>
        </select>

        <label>Activity Level</label>
        <select
          value={profile.activityLevel}
          onChange={(e) => updateField("activityLevel", e.target.value)}
        >
          <option value="">Select activity level</option>
          <option value="low">Low</option>
          <option value="moderate">Moderate</option>
          <option value="high">High</option>
        </select>

        <label>Bio</label>
        <textarea
          value={profile.bio}
          onChange={(e) => updateField("bio", e.target.value)}
        />

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            className="counter"
            onClick={() => setIsEditing(false)}
          >
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