const express = require("express");
const mongoose = require("mongoose");
const { Message, Profile } = require("../models");

const router = express.Router();

router.get("/conversations", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });

  try {
    const userId = req.session.userId;

    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    }).sort({ createdAt: -1 });

    const conversationMap = new Map();

    for (const msg of messages) {
      const partnerId =
        msg.senderId.toString() === userId.toString()
          ? msg.receiverId.toString()
          : msg.senderId.toString();

      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, msg);
      }
    }

    const unreadCounts = await Message.aggregate([
      { $match: { receiverId: new mongoose.Types.ObjectId(userId), read: false } },
      { $group: { _id: "$senderId", count: { $sum: 1 } } },
    ]);

    const unreadMap = {};
    unreadCounts.forEach((u) => {
      unreadMap[u._id.toString()] = u.count;
    });

    const partnerIds = [...conversationMap.keys()];

    const partnerProfiles = await Profile.find({
      userId: { $in: partnerIds.map((id) => new mongoose.Types.ObjectId(id)) },
    });

    const profileByUserId = {};
    partnerProfiles.forEach((p) => {
      profileByUserId[p.userId.toString()] = p;
    });

    const conversations = partnerIds.map((partnerId) => {
      const latestMsg = conversationMap.get(partnerId);
      const profile = profileByUserId[partnerId] || {};

      return {
        partnerId,
        partnerName: profile.fullName || "Unknown User",
        partnerImage: profile.profileImage || "",
        latestMessage: latestMsg,
        unreadCount: unreadMap[partnerId] || 0,
      };
    });

    res.json(conversations);
  } catch (err) {
    console.error("Conversations error:", err);
    res.status(500).json({ message: "Failed to fetch conversations" });
  }
});

router.get("/:partnerId", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });

  try {
    const userId = req.session.userId;
    const { partnerId } = req.params;

    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: partnerId },
        { senderId: partnerId, receiverId: userId },
      ],
    }).sort({ createdAt: 1 });

    await Message.updateMany(
      { senderId: partnerId, receiverId: userId, read: false },
      { $set: { read: true } }
    );

    res.json(messages);
  } catch (err) {
    console.error("Messages fetch error:", err);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

module.exports = router;
