import { useState, useEffect } from "react";
import '../App.css'

const THEME_GREEN = "#CCD5C0";
const DARK_GREEN = "#38422B";  

export default function ExerciseSuggestions({ activeWorkout, setActiveWorkout, navigateTo }) {
  const [goalTypeKey, setGoalTypeKey] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [fullSuggestionsList, setFullSuggestionsList] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [successBanner, setSuccessBanner] = useState({ visible: false, message: "" });

  const readableGoalNames = {
    STRENGTH: "Strength & Power",
    HYPERTROPHY: "Hypertrophy (Muscle Building)",
    CARDIOVASCULAR: "Cardiovascular Endurance",
    BODY_COMPOSITION: "Body Composition",
    CONSISTENCY: "Consistency & Mobility"
  };

  const shuffle = (array) => [...array].sort(() => Math.random() - 0.5);

  const handleRefresh = () => {
    setSuggestions(shuffle(fullSuggestionsList).slice(0, 5));
  };

  useEffect(() => {
    const controller = new AbortController();
    async function fetchSuggestions() {
      try {
        const response = await fetch("http://localhost:5000/api/exercise-suggestions", { credentials: "include", signal: controller.signal });
        if (response.ok) {
          const data = await response.json();
          setGoalTypeKey(data.goal || "");
          setFullSuggestionsList(data.suggestions || []); 
          setSuggestions(shuffle(data.suggestions || []).slice(0, 5));
        }
      } catch (err) { if (err.name !== 'AbortError') console.error("Error:", err); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    fetchSuggestions();
    return () => controller.abort();
  }, []);

  const handleAddClick = async (item) => {
    const newExercise = { 
      name: item.name, 
      weight: item.weight || 0, 
      reps: item.reps || 0, 
      sets: item.sets || 0, 
      time: item.time || 0, 
      instructions: item.instructions || "" 
      // Removed 'isOriginal' here to keep backend array items clean
    };

    // CASE A: A workout session is already active. Just append the exercise to it locally.
    if (activeWorkout) {
      setActiveWorkout({ ...activeWorkout, exercises: [...activeWorkout.exercises, { ...newExercise, isOriginal: false }] });
      setSuccessBanner({ visible: true, message: `Added ${item.name} to active session!` });
      navigateTo('workouts'); 
      window.scrollTo(0, 0);
    } 
    // CASE B: No workout is running. Save this recommendation to the backend database as a new workout template!
    else {
      try {
        const payload = {
          name: item.name,        
          isTemplate: true,       
          isSuggested: true,      
          exercises: [newExercise] // This is a valid array, passing backend checks
        };

        // Added credentials: "include" so the backend knows who you are!
        const response = await fetch("http://localhost:5000/api/workouts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include", 
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          setSuccessBanner({ visible: true, message: `Saved recommended template: ${item.name}!` });
          navigateTo('workouts'); 
          window.scrollTo(0, 0);
        } else {
          const errData = await response.json();
          console.error("Backend error details:", errData.message);
        }
      } catch (err) {
        console.error("Network error while creating suggested routine:", err);
      }
    }

    setTimeout(() => setSuccessBanner({ visible: false, message: "" }), 3000);
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', height: '50vh', color: DARK_GREEN, fontWeight: 'bold' }}>Loading...</div>;

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto", color: DARK_GREEN }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center",  maxWidth: "800px", margin: "0 auto 30px auto"}}>
  <h2 style={{ fontSize: "2rem", color: "#38422B", margin: "0 0 10px 0" }}>
    Personalized Suggestions
  </h2>
  <div style={{ width: "100%", display: "flex", justifyContent: "flex-end" }}>
    <button onClick={handleRefresh} 
      style={{ padding: "10px 20px", cursor: "pointer", backgroundColor: "#38422B", border: "none", borderRadius: "5px", fontWeight: "bold", color: "white" }}>
      Refresh
    </button>
  </div>
</div>
      <p style={{ background: THEME_GREEN, padding: "10px", borderRadius: "5px", textAlign: "center", fontWeight: "bold", maxWidth: "400px", margin: "0 auto 20px" }}>
        Goal: {readableGoalNames[goalTypeKey] || "General Fitness"}
      </p>

      <div style={{ marginTop: "20px" }}>
        {suggestions.map((item, index) => (
          <div key={index} style={{ background: "#F1F3EE", padding: "20px", borderRadius: "8px", border: "1px solid #CCD5C0", marginBottom: "15px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ flex: 1, marginRight: '20px' }}>
              <h4 style={{ margin: "0 0 10px 0", textTransform: 'capitalize', color: DARK_GREEN }}>{item.name}</h4>
              <p style={{ fontSize: "14px", color: "#555", margin: 0 }}>
                {item.instructions ? item.instructions.substring(0, 100) + "..." : "No description."}
              </p>
              <div style={{ fontWeight: "bold", fontSize: "14px", marginTop: "10px" }}>
                {item.time ? `Duration: ${item.time} mins` : `Target: ${item.sets} sets x ${item.reps} reps`}
              </div>
            </div>
            <button 
              onClick={() => handleAddClick(item)} 
              style={{ padding: "10px 20px", cursor: "pointer", backgroundColor: THEME_GREEN, border: "none", borderRadius: "5px", fontWeight: "bold", color: DARK_GREEN, minWidth: "80px" }}
            >
              + Add
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}