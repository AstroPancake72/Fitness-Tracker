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
      setMessage(data.message || "No diet plan generated yet.");
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
      <main className="page-shell">
        <section className="diet-card">
          <h1>Diet Plan Suggestions</h1>
          <div className="success-box">{message}</div>

          <button className="primary-btn" onClick={generateDietPlan} disabled={loading}>
            {loading ? "Generating..." : "Generate Diet Plan"}
          </button>
        </section>
      </main>
    );
  }

  const plan = suggestions.plan;

  return (
    <main className="page-shell">
      <section className="diet-card">
        <h1>Diet Plan Suggestions</h1>

        {message && <div className="success-box">{message}</div>}

        <div className="diet-summary">
          <div>
            <strong>Generated:</strong>{" "}
            {new Date(suggestions.generatedAt).toLocaleString()}
          </div>
          <div>
            <strong>Target calories:</strong> {plan.targetCalories}
          </div>
        </div>

        <h2>Nutrition</h2>

        <div className="nutrition-grid">
          <div className="nutrition-box">
            <span>🔥</span>
            <p>Calories</p>
            <strong>{plan.nutrients.calories}</strong>
            <small>kcal</small>
          </div>

          <div className="nutrition-box">
            <span>💪</span>
            <p>Protein</p>
            <strong>{plan.nutrients.protein}g</strong>
          </div>

          <div className="nutrition-box">
            <span>🌿</span>
            <p>Carbs</p>
            <strong>{plan.nutrients.carbohydrates}g</strong>
          </div>

          <div className="nutrition-box">
            <span>💧</span>
            <p>Fat</p>
            <strong>{plan.nutrients.fat}g</strong>
          </div>
        </div>

        <h2>Meals</h2>

        <div className="meal-list">
          {plan.meals.map((meal) => {
            const imageUrl = `https://spoonacular.com/recipeImages/${meal.id}-312x231.${meal.imageType}`;

            return (
              <a
                className="meal-card"
                href={meal.sourceUrl}
                target="_blank"
                rel="noreferrer"
                key={meal.id}
              >
                <img src={imageUrl} alt={meal.title} className="meal-image" />

                <div className="meal-info">
                  <h3>{meal.title}</h3>
                  <p>Ready in {meal.readyInMinutes} min</p>
                </div>

                <span>Servings: {meal.servings}</span>
              </a>
            );
          })}
        </div>

        <button className="primary-btn center-btn" onClick={generateDietPlan} disabled={loading}>
          {loading ? "Generating..." : "Regenerate Plan"}
        </button>

        <p className="disclaimer">
          These suggestions are informational and are not medical advice.
        </p>
      </section>
    </main>
  );
}