const express = require("express");
const mongoose = require("mongoose");
const { Goal, Workout } = require("../models");

const router = express.Router();

router.get("/", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });

  try {
    const userId = new mongoose.Types.ObjectId(req.session.userId);
    const goals = await Goal.find({ user: userId }).sort({ createdAt: -1 });

    const goalsWithProgress = await Promise.all(
      goals.map(async (goal) => {
        let currentValue = goal.startingValue;

        if (goal.macroCategory === "STRENGTH" && goal.goalType === "1RM" && goal.exerciseName) {
          const maxLift = await Workout.aggregate([
            { $match: { userId: userId, isTemplate: false } },
            { $unwind: "$exercises" },
            { $match: { "exercises.name": { $regex: new RegExp(`^${goal.exerciseName}$`, "i") } } },
            { $group: { _id: null, currentMax: { $max: "$exercises.weight" } } },
          ]);

          if (maxLift.length > 0) {
            currentValue = maxLift[0].currentMax;
          }
        } else if (
          goal.macroCategory === "CARDIOVASCULAR" &&
          goal.goalType === "ENDURANCE" &&
          goal.exerciseName
        ) {
          const maxTime = await Workout.aggregate([
            { $match: { userId: userId, isTemplate: false } },
            { $unwind: "$exercises" },
            { $match: { "exercises.name": { $regex: new RegExp(`^${goal.exerciseName}$`, "i") } } },
            { $group: { _id: null, maxDuration: { $max: "$exercises.time" } } },
          ]);

          if (maxTime.length > 0 && maxTime[0].maxDuration) {
            currentValue = maxTime[0].maxDuration;
          }
        } else if (goal.macroCategory === "CONSISTENCY" && goal.goalType === "FREQUENCY") {
          const count = await Workout.countDocuments({ userId: userId, isTemplate: false });
          currentValue = count;
        }

        const totalRequired = goal.targetValue - goal.startingValue;
        const amountProgressed = currentValue - goal.startingValue;

        let percentage = 0;
        if (totalRequired > 0) {
          percentage = (amountProgressed / totalRequired) * 100;
        } else if (totalRequired === 0 && currentValue >= goal.targetValue) {
          percentage = 100;
        }

        percentage = Math.max(0, Math.min(100, percentage));

        return {
          ...goal.toObject(),
          status: goal.status || "ACTIVE",
          currentValue,
          percentageCompleted: Math.round(percentage),
        };
      })
    );

    res.status(200).json(goalsWithProgress);
  } catch (err) {
    console.error("Error fetching goals with progress:", err);
    res.status(500).json({ message: "Server error fetching goal telemetry data." });
  }
});

router.post("/create", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });

  try {
    const { macroCategory, goalType, exerciseName, targetValue, deadline, microTarget } = req.body;

    if (!goalType) return res.status(400).json({ message: "Missing required tracking parameters." });

    const newGoal = new Goal({
      user: req.session.userId,
      goalType: goalType === "GOAL" ? "GOAL" : goalType,
      macroCategory: macroCategory || null,
      exerciseName: microTarget?.exerciseName || exerciseName || "",
      startingValue: 0,
      targetValue: microTarget?.targetMetric
        ? Number(microTarget.targetMetric)
        : targetValue
          ? Number(targetValue)
          : 1,
      status: "Active",
      deadline: deadline ? new Date(deadline) : null,
      microTarget: microTarget || null,
    });

    await newGoal.save();
    res.status(201).json(newGoal);
  } catch (err) {
    console.error("Save error:", err);
    res.status(500).json({ message: "Failed to save goal" });
  }
});

router.patch("/:id", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });

  try {
    const { status } = req.body;

    const updated = await Goal.findOneAndUpdate(
      { _id: req.params.id, user: req.session.userId },
      { status },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Goal not found" });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to update goal" });
  }
});

router.delete("/:id", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });

  try {
    const deletedGoal = await Goal.findOneAndDelete({
      _id: req.params.id,
      user: req.session.userId,
    });

    if (!deletedGoal) return res.status(404).json({ message: "Goal not found" });

    res.status(200).json({ message: "Goal deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting goal" });
  }
});

module.exports = router;