import { useEffect, useState } from "react";

export default function DietSuggestions() {
  const [suggestions, setSuggestions] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadSuggestions() {
      const res = await fetch("http://localhost:5000/api/diet-suggestions", {
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Failed to load diet suggestions.");
        return;
      }

      setSuggestions(data);
    }

    loadSuggestions();
  }, []);

  if (message) return <p style={{ padding: 24 }}>{message}</p>;
  if (!suggestions) return <p style={{ padding: 24 }}>Loading...</p>;

  return (
    <div style={{ padding: 24 }}>
      <h1>Diet Plan Suggestions</h1>

      <h2>Daily Target</h2>
      <p>{suggestions.calories} calories</p>

      <h2>Macros</h2>
      <p>Protein: {suggestions.macros.protein}g</p>
      <p>Carbs: {suggestions.macros.carbs}g</p>
      <p>Fat: {suggestions.macros.fat}g</p>

      <h2>Suggested Meals</h2>
      <ul>
        {suggestions.meals.map((meal) => (
          <li key={meal}>{meal}</li>
        ))}
      </ul>

      <h2>Notes</h2>
      <ul>
        {suggestions.notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </div>
  );
}