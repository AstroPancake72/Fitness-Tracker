import { useState, useEffect } from "react";

export default function ExerciseSuggestions({ onSelectSuggestedExercise }) {
  const [goal, setGoal] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSuggestions() {
      try {
        const response = await fetch("http://localhost:5000/api/exercise-suggestions", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setGoal(data.goal);
          setSuggestions(data.suggestions);
        }
      } catch (err) {
        console.error("Failed fetching suggestions:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSuggestions();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: '#38422B', fontWeight: 'bold' }}>
        Loading Personalized Suggestions...
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto", color: "#38422B" }}>
      <h2>Personalized Suggestions</h2>
      <p style={{ background: "#CCD5C0", padding: "10px", borderRadius: "5px", display: "inline-block" }}>
         Current Focus Goal: <strong>{goal || "General Fitness"}</strong>
      </p>

      <div style={{ marginTop: "20px" }}>
        {suggestions.length === 0 ? (
          <p>No suggestions available at this time.</p>
        ) : (
          suggestions.map((item, index) => (
            <div key={index} style={{ background: "#F1F3EE", padding: "15px", borderRadius: "8px", border: "1px solid #CCD5C0", marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ marginRight: '15px', maxWidth: '70%' }}>
                <h4 style={{ margin: "0 0 5px 0", textTransform: 'capitalize' }}>{item.name}</h4>
                <p style={{ fontSize: "12px", color: "#666", margin: "0 0 8px 0", fontStyle: "italic" }}>
                  {item.instructions ? item.instructions.substring(0, 120) + "..." : "No instructions available."}
                </p>
                <span style={{ fontSize: "13px", color: "#38422B", fontWeight: 'bold' }}>
                  {item.time ? `Duration: ${item.time} mins` : ` Target: ${item.sets} sets x ${item.reps} reps @ ${item.weight} lbs`}
                </span>
              </div>
              <button 
                onClick={() => onSelectSuggestedExercise(item)} 
                className="counter"
                style={{ padding: "8px 12px", cursor: "pointer", whiteSpace: 'nowrap' }}
              >
                + Add Exercise
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}