import { useEffect, useState } from "react";
import "../App.css";
import Avatar, { profileImageUrl } from "./Avatar";

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
    profileImage: "",
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
        profileImage: data.profileImage || "",
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
      age: Number(profile.age),
      height: Number(profile.height),
      weight: Number(profile.weight),
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

  async function uploadProfileImage(e) {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("profileImage", file);

    const res = await fetch("http://localhost:5000/api/profile/image", {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const data = await res.json();

    if (res.ok) {
      setProfile({
        ...profile,
        profileImage: data.profileImage || "",
      });
      setMessage("Profile image uploaded!");
    } else {
      setMessage(data.message || "Image upload failed.");
    }
  }

  if (isEditing) {
    return (
      <main className="page-shell">
        <section className="profile-card">
          <h1>Edit Profile</h1>

          <form className="profile-form" onSubmit={saveProfile}>
            <label>Full Name</label>
            <input value={profile.fullName} onChange={(e) => updateField("fullName", e.target.value)} />

            <label>Age</label>
            <input type="number" value={profile.age} onChange={(e) => updateField("age", e.target.value)} />

            <label>Height</label>
            <input type="number" value={profile.height} onChange={(e) => updateField("height", e.target.value)} />

            <label>Weight</label>
            <input type="number" value={profile.weight} onChange={(e) => updateField("weight", e.target.value)} />

            <label>Dietary Restrictions</label>
            <select value={profile.dietaryRestrictions} onChange={(e) => updateField("dietaryRestrictions", e.target.value)}>
              <option value="">None</option>
              <option value="vegetarian">Vegetarian</option>
              <option value="vegan">Vegan</option>
              <option value="gluten-free">Gluten-free</option>
              <option value="dairy-free">Dairy-free</option>
              <option value="peanut-free">Peanut-free</option>
            </select>

            <label>Fitness Goal</label>
            <select value={profile.fitnessGoal} onChange={(e) => updateField("fitnessGoal", e.target.value)}>
              <option value="">Select goal</option>
              <option value="lose weight">Lose weight</option>
              <option value="maintain weight">Maintain weight</option>
              <option value="gain muscle">Gain muscle</option>
            </select>

            <label>Activity Level</label>
            <select value={profile.activityLevel} onChange={(e) => updateField("activityLevel", e.target.value)}>
              <option value="">Select activity level</option>
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
            </select>

            <label>Bio</label>
            <textarea value={profile.bio} onChange={(e) => updateField("bio", e.target.value)} />

            <div className="button-row">
              <button type="button" className="secondary-btn" onClick={() => setIsEditing(false)}>
                Cancel
              </button>
              <button type="submit" className="primary-btn">
                Save Profile
              </button>
            </div>
          </form>

          {message && <p className="status-message">{message}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="profile-card profile-layout">
        <div>
          <h1>User Profile</h1>

          <div className="profile-list">
            <p><strong>Full Name</strong><span>{profile.fullName || "Not provided"}</span></p>
            <p><strong>Age</strong><span>{profile.age || "Not provided"}</span></p>
            <p><strong>Height</strong><span>{profile.height ? `${profile.height} ft` : "Not provided"}</span></p>
            <p><strong>Weight</strong><span>{profile.weight ? `${profile.weight} kg` : "Not provided"}</span></p>
            <p><strong>Dietary Restrictions</strong><span>{profile.dietaryRestrictions || "None"}</span></p>
            <p><strong>Fitness Goal</strong><span>{profile.fitnessGoal || "Not provided"}</span></p>
            <p><strong>Activity Level</strong><span>{profile.activityLevel || "Not provided"}</span></p>
            <p><strong>Bio</strong><span>{profile.bio || "Not provided"}</span></p>
          </div>

          <button className="primary-btn" onClick={() => setIsEditing(true)}>
            Edit Profile
          </button>

          {message && <p className="status-message">{message}</p>}
        </div>

        <div className="profile-art">
          {profileImageUrl(profile.profileImage) ? (
            <img
              src={profileImageUrl(profile.profileImage)}
              alt="Profile"
              className="profile-image"
            />
          ) : (
            <span>👤</span>
          )}

          <label className="upload-btn">
            Upload Image
            <input type="file" accept="image/*" onChange={uploadProfileImage} hidden />
          </label>
        </div>
      </section>
    </main>
  );
}
