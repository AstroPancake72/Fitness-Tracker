const express = require("express");
const { Profile } = require("../models");
const { requireLogin, upload } = require("../helpers");

const router = express.Router();

router.get("/", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });
  try {
    let profile = await Profile.findOne({ userId: req.session.userId });
    if (!profile) {
      profile = await Profile.create({ userId: req.session.userId });
    }

    res.json(profile);
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

router.put("/", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not logged in" });
  }

  try {
    const {
      fullName,
      age,
      height,
      weight,
      dietaryRestrictions,
      fitnessGoal,
      activityLevel,
      bio,
    } = req.body;

    const updatedProfile = await Profile.findOneAndUpdate(
      { userId: req.session.userId },
      {
        fullName,
        age,
        height,
        weight,
        dietaryRestrictions,
        fitnessGoal,
        activityLevel,
        bio,
      },
      { returnDocument: "after", upsert: true, runValidators: true }
    );

    res.json(updatedProfile);
  } catch (err) {
    console.error("Profile save error:", err);
    res.status(500).json({ message: "Failed to save profile" });
  }
});

router.post("/image", requireLogin, upload.single("profileImage"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    const profileImagePath = `/uploads/${req.file.filename}`;

    const updatedProfile = await Profile.findOneAndUpdate(
      { userId: req.session.userId },
      { profileImage: profileImagePath },
      { returnDocument: "after", upsert: true, runValidators: true }
    );

    res.json({
      message: "Profile image uploaded successfully",
      profileImage: updatedProfile.profileImage,
      profile: updatedProfile,
    });
  } catch (error) {
    console.error("Profile image upload error:", error);
    res.status(500).json({ message: "Failed to upload profile image" });
  }
});

module.exports = router;