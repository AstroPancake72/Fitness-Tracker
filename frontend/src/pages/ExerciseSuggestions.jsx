import { useState, useEffect } from "react";

export default function ExerciseSuggestions({ onSelectSuggestedExercise }) {
  const [goalTypeKey, setGoalTypeKey] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [successBanner, setSuccessBanner] = useState({ visible: false, exerciseName: "" });

  const readableGoalNames = {
    STRENGTH: "Strength & Power",
    HYPERTROPHY: "Hypertrophy (Muscle Building)",
    CARDIOVASCULAR: "Cardiovascular Endurance",
    BODY_COMPOSITION: "Body Composition",
    CONSISTENCY: "Consistency & Mobility"
  };

  useEffect(() => {
    const controller = new AbortController();
    
    async function fetchSuggestions() {
      try {
        const response = await fetch("http://localhost:5000/api/exercise-suggestions", {
          credentials: "include",
          signal: controller.signal 
        });
        
        if (response.ok) {
          const data = await response.json();
          setGoalTypeKey(data.goal || "");
          setSuggestions(data.suggestions || []);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error("Failed fetching suggestions:", err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchSuggestions();
    return () => controller.abort(); 
  }, []);

  const handleAddClick = (item) => {
    onSelectSuggestedExercise(item);
    
    setSuccessBanner({ visible: true, exerciseName: item.name });
    
    setTimeout(() => {
      setSuccessBanner({ visible: false, exerciseName: "" });
    }, 3000);
  };

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
      
      {successBanner.visible && (
        <div style={{ 
          background: '#E1EAD6', 
          color: '#38422B', 
          padding: '15px', 
          borderRadius: '8px', 
          borderLeft: '5px solid #38422B',
          marginBottom: '20px', 
          textAlign: 'center', 
          fontWeight: 'bold',
          fontSize: '15px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          Successfully added "{successBanner.exerciseName}" to your Workouts log!
        </div>
      )}

      <p style={{ background: "#CCD5C0", padding: "10px", borderRadius: "5px", display: "inline-block" }}>
        Suggested for your Goal: <strong>{readableGoalNames[goalTypeKey] || "General Fitness Selection"}</strong>
      </p>

      <div style={{ marginTop: "20px" }}>
        {suggestions.length === 0 ? (
          <p>No active suggestions available. Select a Macro Goal category in your Goals Tab to populate routines.</p>
        ) : (
          suggestions.map((item, index) => (
            <div key={index} style={{ background: "#F1F3EE", padding: "15px", borderRadius: "8px", border: "1px solid #CCD5C0", marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ marginRight: '15px', maxWidth: '70%' }}>
                <h4 style={{ margin: "0 0 5px 0", textTransform: 'capitalize' }}>{item.name}</h4>
                <p style={{ fontSize: "12px", color: "#666", margin: "0 0 8px 0", fontStyle: "italic" }}>
                  {item.instructions ? item.instructions.substring(0, 120) + "..." : "No instructions available."}
                </p>
                <span style={{ fontSize: "13px", color: "#38422B", fontWeight: 'bold' }}>
                  {item.time || item.type === "cardio" 
                    ? `Duration: ${item.time || 25} mins` 
                    : `Target: ${item.sets || 4} sets x ${item.reps || 10} reps @ ${item.weight || 0} lbs`}
                </span>
              </div>
              <button 
                onClick={() => handleAddClick(item)} 
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