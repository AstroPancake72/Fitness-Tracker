import { useEffect, useState } from "react";
import "../App.css";

export default function DietSuggestions() {
  const [suggestions, setSuggestions] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadDietSuggestions() {
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

    loadDietSuggestions();
  }, []);

  if (message) return <p>{message}</p>;
  if (!suggestions) return <p>Loading diet suggestions...</p>;

  return (
    <div className="card">
      <h1>Diet Plan Suggestions</h1>

      <p>
        Target calories: <strong>{suggestions.targetCalories}</strong>
      </p>

      <h2>Nutrition</h2>
      <p>Calories: {suggestions.nutrients.calories}</p>
      <p>Protein: {suggestions.nutrients.protein}g</p>
      <p>Carbs: {suggestions.nutrients.carbohydrates}g</p>
      <p>Fat: {suggestions.nutrients.fat}g</p>

      <h2>Meals</h2>
      <ul>
        {suggestions.meals.map((meal) => (
          <li key={meal.id}>
            <a href={meal.sourceUrl} target="_blank" rel="noreferrer">
              {meal.title}
            </a>
            <br />
            Ready in {meal.readyInMinutes} min | Servings: {meal.servings}
          </li>
        ))}
      </ul>

      <p>
        <em>These suggestions are informational and are not medical advice.</em>
      </p>
    </div>
  );
}