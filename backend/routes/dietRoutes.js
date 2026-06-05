const express = require("express");
const axios = require("axios");
const { Profile, DietPlan } = require("../models");
const {
  calculateTargetCalories,
  mapDietaryRestrictions,
} = require("../helpers");

const router = express.Router();

router.post("/generate-diet-plan", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not logged in" });
  }

  try {
    const profile = await Profile.findOne({ userId: req.session.userId });

    if (
      !profile ||
      !profile.age ||
      !profile.height ||
      !profile.weight ||
      !profile.fitnessGoal ||
      !profile.activityLevel
    ) {
      return res.status(400).json({
        message:
          "Complete your profile, fitness goal, and activity level before generating a diet plan.",
      });
    }

    const targetCalories = calculateTargetCalories(profile);
    const { diet, intolerances } = mapDietaryRestrictions(profile.dietaryRestrictions);

    const response = await axios.get(
      "https://api.spoonacular.com/mealplanner/generate",
      {
        params: {
          apiKey: process.env.SPOONACULAR_API_KEY,
          timeFrame: "day",
          targetCalories,
          diet,
          intolerances,
        },
      }
    );

    const savedPlan = await DietPlan.findOneAndUpdate(
      { userId: req.session.userId },
      {
        generatedAt: new Date(),
        plan: {
          targetCalories,
          diet: diet || "none",
          intolerances: intolerances || "none",
          meals: response.data.meals,
          nutrients: response.data.nutrients,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
      }
    );

    res.json(savedPlan);
  } catch (err) {
    console.error("Diet API error:", err.response?.data || err.message);
    res.status(500).json({ message: "Could not generate diet plan." });
  }
});

router.get("/diet-suggestions", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not logged in" });
  }

  const dietPlan = await DietPlan.findOne({ userId: req.session.userId });

  if (!dietPlan) {
    return res.status(404).json({
      message: "No diet plan found. Click Generate Diet Plan to create one.",
    });
  }

  res.json(dietPlan);
});

module.exports = router;