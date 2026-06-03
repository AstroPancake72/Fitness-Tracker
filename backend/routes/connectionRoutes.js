const express = require("express");
const mongoose = require("mongoose");
const { Profile } = require("../models");

const router = express.Router();

router.get("/users", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });

  try {
    const currentUserId = req.session.userId;
    const currentProfile = await Profile.findOne({ userId: currentUserId });
    const otherProfiles = await Profile.find({ userId: { $ne: currentUserId } });

    const usersWithStatus = otherProfiles.map((profile) => {
      const existingConnection = currentProfile.connections.find(
        (conn) => conn.userId.toString() === profile._id.toString()
      );

      const profileObj = profile.toObject();
      profileObj.connectionStatus = existingConnection ? existingConnection.status : null;
      return profileObj;
    });

    res.status(200).json(usersWithStatus);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error. Could not fetch users." });
  }
});

router.post("/connect", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });

  try {
    const currentUserId = req.session.userId;
    const { targetUserId } = req.body;

    const currentProfile = await Profile.findOne({ userId: currentUserId });
    const targetProfile = await Profile.findById(targetUserId);

    if (!targetProfile) return res.status(404).json({ message: "Target profile not found." });

    const alreadyConnected = currentProfile.connections.some(
      (conn) => conn.userId.toString() === targetUserId
    );

    if (alreadyConnected) return res.status(400).json({ message: "Already connected." });

    currentProfile.connections.push({ userId: targetUserId, status: "pending" });
    targetProfile.connections.push({ userId: currentUserId, status: "pending" });

    await Profile.updateOne(
      { _id: currentProfile._id },
      { $push: { connections: { userId: targetUserId, status: "pending" } } }
    );

    await Profile.updateOne(
      { _id: targetProfile._id },
      { $push: { connections: { userId: currentUserId, status: "pending" } } }
    );

    res.status(200).json({ message: "Connection request sent!" });
  } catch (error) {
    console.error("FULL ERROR:", error);
    res.status(500).json({ message: "Error sending connection request.", detail: error.message });
  }
});

router.get("/requests", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });

  try {
    const currentProfile = await Profile.findOne({ userId: req.session.userId });

    const incomingProfiles = await Profile.find({
      "connections.userId": currentProfile._id,
      "connections.status": "pending",
    });

    const incoming = incomingProfiles.filter((p) => {
      const theirConn = p.connections.find(
        (c) => c.userId.toString() === currentProfile._id.toString()
      );
      const myConn = currentProfile.connections.find(
        (c) => c.userId.toString() === p._id.toString()
      );
      return theirConn?.status === "pending" && !myConn;
    });

    res.status(200).json(incoming);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching requests." });
  }
});

router.post("/requests/respond", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });

  try {
    const { requesterId, action } = req.body;
    const currentProfile = await Profile.findOne({ userId: req.session.userId });
    const requesterProfile = await Profile.findById(requesterId);

    if (!requesterProfile) return res.status(404).json({ message: "User not found." });

    if (action === "accept") {
      await Profile.updateOne(
        { _id: currentProfile._id },
        { $push: { connections: { userId: requesterId, status: "connected" } } }
      );

      await Profile.updateOne(
        { _id: requesterId, "connections.userId": currentProfile._id },
        { $set: { "connections.$.status": "connected" } }
      );
    } else if (action === "decline") {
      await Profile.updateOne(
        { _id: requesterId },
        { $pull: { connections: { userId: currentProfile._id } } }
      );
    }

    res.status(200).json({ message: `Request ${action}ed.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error responding to request." });
  }
});

router.delete("/connections/:targetProfileId", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });

  try {
    const currentProfile = await Profile.findOne({ userId: req.session.userId });
    const targetProfileId = new mongoose.Types.ObjectId(req.params.targetProfileId);
    const currentProfileId = new mongoose.Types.ObjectId(currentProfile._id);

    await Profile.updateOne(
      { _id: currentProfileId },
      { $pull: { connections: { userId: targetProfileId } } }
    );

    await Profile.updateOne(
      { _id: targetProfileId },
      { $pull: { connections: { userId: currentProfileId } } }
    );

    res.status(200).json({ message: "Connection removed." });
  } catch (err) {
    console.error("Disconnect error:", err);
    res.status(500).json({ message: "Failed to remove connection." });
  }
});

router.get("/my-connections", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });

  try {
    const currentProfile = await Profile.findOne({ userId: req.session.userId });
    if (!currentProfile) return res.json([]);

    const connectedIds = currentProfile.connections
      .filter((c) => c.status === "connected")
      .map((c) => c.userId);

    const connectedProfiles = await Profile.find({ _id: { $in: connectedIds } });
    res.json(connectedProfiles);
  } catch (err) {
    console.error("My connections error:", err);
    res.status(500).json({ message: "Failed to fetch connections" });
  }
});

module.exports = router;