const express = require("express");
const { Workout } = require("../models");

const router = express.Router();

router.post("/", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not logged in" });
  }

  try {
    // FIX 1: Explicitly pull isSuggested from req.body
    const { name, datetime, exercises, isTemplate, isSuggested } = req.body;
    if (!name || !exercises || !Array.isArray(exercises)) {
      return res.status(400).json({ message: "Invalid workout data" });
    }

    const newWorkout = new Workout({
      userId: req.session.userId,
      name,
      datetime: datetime || new Date(),
      isTemplate: isTemplate || false,
      isSuggested: isSuggested || false, // FIX 2: Map it to your Mongoose model here
      exercises,
    });

    await newWorkout.save();

    res.status(201).json(newWorkout);
  } catch (err) {
    console.error("Save error:", err);
    res.status(500).json({ message: "Failed to save workout session" });
  }
});

router.get("/", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });

  try {
    const userWorkouts = await Workout.find({
      userId: req.session.userId,
      exercises: { $exists: true, $not: { $size: 0 } },
    }).sort({ datetime: -1 });
    
    res.json(userWorkouts);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch workouts" });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, originalName, datetime, exercises, isTemplate, isSuggested } = req.body;

  try {
    if (originalName && originalName !== name) {
      await Workout.updateMany({ name: originalName }, { name });
    }

    const updatedWorkout = await Workout.findByIdAndUpdate(
      id,
      { name, datetime, exercises, isTemplate, isSuggested },
      { returnDocument: "after", runValidators: true }
    );

    if (!updatedWorkout) return res.status(404).json({ message: "Workout routine not found" });

    res.json(updatedWorkout);
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Server error updating workout" });
  }
});

router.delete("/:id", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });

  try {
    const deletedWorkout = await Workout.findOneAndDelete({
      _id: req.params.id,
      userId: req.session.userId,
    });

    if (!deletedWorkout) return res.status(404).json({ message: "Workout not found" });

    res.json({ message: "Workout deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete" });
  }
});

module.exports = router;