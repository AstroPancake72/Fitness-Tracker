const express = require("express");
const { Goal } = require("../models");
const exerciseData = require("../exerciseData.json");

const router = express.Router();

let suggestionsCache = {};

router.get("/exercises", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not logged in" });
  }

  const exerciseNames = [...new Set(exerciseData.map((ex) => ex.name))];

  res.json(exerciseNames);
});

router.get("/exercise-suggestions", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });

  try {
    const latestGoal = await Goal.findOne({
      user: req.session.userId,
      goalType: { $in: ["COMPLETION", "GOAL", "Strength", "Bodyweight", "Consistency", "Volume"] },
      status: { $in: ["Active", "ACTIVE"] },
    }).sort({ createdAt: -1 });

    const userCategory = latestGoal?.macroCategory || "STRENGTH";
    const currentTime = Date.now();

    if (suggestionsCache[userCategory] && currentTime < suggestionsCache[userCategory].expirationTime) {
      console.log(`Serving cached suggestions for category: ${userCategory}`);

      return res.json({
        goal: userCategory,
        suggestions: suggestionsCache[userCategory].data,
      });
    }

    let rawData = [];

    if (userCategory === "CARDIOVASCULAR" || userCategory === "BODY_COMPOSITION") {
      rawData = exerciseData.filter((ex) => ex.bodyPart === "cardio");
    } else if (userCategory === "HYPERTROPHY") {
      rawData = exerciseData.filter((ex) => ex.target === "pectorals");
    } else if (userCategory === "STRENGTH") {
      rawData = exerciseData.filter((ex) => ex.equipment === "barbell");
    } else {
      rawData = exerciseData;
    }

    const suggestions = rawData.slice(0, 5).map((exercise) => {
      const isCardio = exercise.bodyPart === "cardio";
      let baselineWeight = 0;

      if (userCategory === "HYPERTROPHY") baselineWeight = 25;
      if (userCategory === "STRENGTH") baselineWeight = 45;

      return {
        name: exercise.name,
        type: exercise.bodyPart,
        instructions: Array.isArray(exercise.instructions)
          ? exercise.instructions.join(" ")
          : `Targets the ${exercise.target}. Equipment needed: ${exercise.equipment}.`,
        sets: isCardio ? 1 : 4,
        reps: isCardio ? 1 : 8,
        weight: exercise.equipment === "body weight" ? 0 : baselineWeight,
        time: isCardio ? 25 : null,
      };
    });

    suggestionsCache[userCategory] = {
      data: suggestions,
      expirationTime: currentTime + 5 * 60 * 1000,
    };

    res.json({
      goal: userCategory,
      suggestions: suggestions,
    });
  } catch (error) {
    console.error("ExerciseDB request failed:", error.response?.data || error.message);
    res.status(500).json({ message: "Could not fetch suggestions from the internet." });
  }
});

module.exports = router;