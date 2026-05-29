import { useEffect, useState } from "react";
import "../App.css";

export default function DietSuggestions() {
  const [suggestions, setSuggestions] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDietPlan();
  }, []);

  async function loadDietPlan() {
    const res = await fetch("http://localhost:5000/api/diet-suggestions", {
      credentials: "include",
    });

    const data = await res.json();

    if (res.ok) {
      setSuggestions(data);
      setMessage("");
    } else {
      setMessage(data.message || "No diet plan found.");
    }
  }

  async function generateDietPlan() {
    setLoading(true);
    setMessage("");

    const res = await fetch("http://localhost:5000/api/generate-diet-plan", {
      method: "POST",
      credentials: "include",
    });

    const data = await res.json();

    if (res.ok) {
      setSuggestions(data);
      setMessage("Diet plan generated!");
    } else {
      setMessage(data.message || "Failed to generate diet plan.");
    }

    setLoading(false);
  }

  if (!suggestions) {
    return (
      <div className="card">
        <h1>Diet Plan Suggestions</h1>

        <p>{message}</p>

        <button
          className="counter"
          onClick={generateDietPlan}
          disabled={loading}
        >
          {loading ? "Generating..." : "Generate Diet Plan"}
        </button>
      </div>
    );
  }

  const plan = suggestions.plan;

  return (
    <div className="card">
      <h1>Diet Plan Suggestions</h1>

      {message && <p>{message}</p>}

      <p>Generated: {new Date(suggestions.generatedAt).toLocaleString()}</p>

      <p>
        Target calories: <strong>{plan.targetCalories}</strong>
      </p>

      <h2>Nutrition</h2>
      <p>Calories: {plan.nutrients.calories}</p>
      <p>Protein: {plan.nutrients.protein}g</p>
      <p>Carbs: {plan.nutrients.carbohydrates}g</p>
      <p>Fat: {plan.nutrients.fat}g</p>

      <h2>Meals</h2>
      <ul>
        {plan.meals.map((meal) => (
          <li key={meal.id}>
            <a href={meal.sourceUrl} target="_blank" rel="noreferrer">
              {meal.title}
            </a>
            <br />
            Ready in {meal.readyInMinutes} min | Servings: {meal.servings}
          </li>
        ))}
      </ul>

      <button
        className="counter"
        onClick={generateDietPlan}
        disabled={loading}
      >
        {loading ? "Generating..." : "Regenerate Plan"}
      </button>

      <p>
        <em>These suggestions are informational and are not medical advice.</em>
      </p>
    </div>
  );
}