const express = require("express");
const mongoose = require("mongoose");
const { Profile } = require("../models");
const { requireLogin, upload } = require("../helpers");
const { getBucket } = require("../gridfs");

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

function uploadProfileImage(req, res, next) {
  upload.single("profileImage")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "Image is too large (max 2 MB)" });
      }
      return res.status(400).json({ message: err.message || "Upload failed" });
    }
    next();
  });
}

router.post("/image", requireLogin, uploadProfileImage, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    const bucket = getBucket();

    const existing = await Profile.findOne({ userId: req.session.userId });
    const oldImageId = existing && existing.profileImage ? existing.profileImage : "";

    const uploadStream = bucket.openUploadStream(req.file.originalname, {
      contentType: req.file.mimetype,
      metadata: { userId: req.session.userId.toString() },
    });

    const newFileId = uploadStream.id;

    uploadStream.on("error", (streamErr) => {
      console.error("GridFS upload stream error:", streamErr);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to store image" });
      }
    });

    uploadStream.on("finish", async () => {
      try {
        const updatedProfile = await Profile.findOneAndUpdate(
          { userId: req.session.userId },
          { profileImage: newFileId.toString() },
          { returnDocument: "after", upsert: true, runValidators: true }
        );

        if (oldImageId && mongoose.Types.ObjectId.isValid(oldImageId)) {
          try {
            await bucket.delete(new mongoose.Types.ObjectId(oldImageId));
          } catch (delErr) {
            console.warn("Could not delete old image (continuing):", delErr.message);
          }
        }

        res.json({
          message: "Profile image uploaded successfully",
          profileImage: updatedProfile.profileImage,
          profile: updatedProfile,
        });
      } catch (finishErr) {
        console.error("Profile image finalize error:", finishErr);
        if (!res.headersSent) {
          res.status(500).json({ message: "Failed to save image reference" });
        }
      }
    });

    uploadStream.end(req.file.buffer);
  } catch (error) {
    console.error("Profile image upload error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to upload profile image" });
    }
  }
});

router.get("/image/:id", requireLogin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: "Image not found" });
    }

    const bucket = getBucket();
    const fileId = new mongoose.Types.ObjectId(id);

    const files = await bucket.find({ _id: fileId }).toArray();
    if (!files || files.length === 0) {
      return res.status(404).json({ message: "Image not found" });
    }

    const file = files[0];
    res.set("Content-Type", file.contentType || "application/octet-stream");
    res.set("Cache-Control", "private, max-age=3600");

    const downloadStream = bucket.openDownloadStream(fileId);
    downloadStream.on("error", (streamErr) => {
      console.error("GridFS download error:", streamErr);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to read image" });
      }
    });
    downloadStream.pipe(res);
  } catch (error) {
    console.error("Profile image fetch error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to fetch image" });
    }
  }
});

module.exports = router;
