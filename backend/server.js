const express = require("express");
const session = require("express-session");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const bcrypt = require("bcrypt");
const http = require("http");
const { Server } = require("socket.io");
const axios = require('axios');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  },
});

app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  })
);
app.use(express.json());

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 1000 * 60 * 30, sameSite: "lax" },
});

app.use(sessionMiddleware);
io.use((socket, next) => {
  sessionMiddleware(socket.request, socket.request.res || {}, next);
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch((err) => console.log("MongoDB connection error:", err));

app.get("/", (req, res) => res.send("Backend running"));

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  twoFactorCode: { type: String },
  twoFactorExpires: { type: Date },
  resetPasswordCode: { type: String },
  resetPasswordExpires: { type: Date },
});
const User = mongoose.model("User", userSchema);

const workoutSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  datetime: { type: Date, default: Date.now },
  isTemplate: { type: Boolean, default: false }, 
  exercises: [
    {
      name: { type: String, required: true },
      weight: { type: Number, default: 0 },
      reps: { type: Number, default: 0 },
      sets: { type: Number, default: 0 },
      time: { type: Number, default: null },
    },
  ],
});

const profileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    currentGoal: {type: String, enum: ['Getting Stronger', 'Increasing Muscle Mass', 'Losing Weight', null], default: null},
    fullName: { type: String, default: "" },
    age: { type: Number, default: null },
    height: { type: Number, default: null },
    weight: { type: Number, default: null },
    dietaryRestrictions: { type: [String], default: [] },
    bio: { type: String, default: "" },
    connections: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "Profile" },
        status: { type: String, enum: ["pending", "connected"] },
      },
    ],
  },
  { timestamps: true }
);
profileSchema.index({ "connections.userId": 1 });

const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["text", "workout"], default: "text" },
  content: { type: String, default: "" },
  workout: {
    name: String,
    exercises: [
      {
        name: String,
        weight: Number,
        reps: Number,
        sets: Number,
        time: Number,
      },
    ],
  },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});
messageSchema.index({ senderId: 1, receiverId: 1 });
messageSchema.index({ createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);
const Profile = mongoose.model("Profile", profileSchema);
const Workout = mongoose.model("Workout", workoutSchema);

const pendingUserSchema = new mongoose.Schema({
  email: { type: String, required: true },
  password: { type: String, required: true },
  code: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 600 },
});
const PendingUser = mongoose.model("PendingUser", pendingUserSchema);

app.post("/api/signup", async (req, res) => {
  try {
    const { email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already in use" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const code = Math.floor(Math.random() * 1000000).toString().padStart(6, "0");

    await PendingUser.findOneAndDelete({ email });
    const pending = new PendingUser({ email, password: hashedPassword, code });
    await pending.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Verify your Fitness Account",
      text: `Your verification code is: ${code}`,
    });

    res.status(200).json({ message: "Verification code sent to your email!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Signup initialization failed", error: err.message });
  }
});

app.post("/api/verify-signup", async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await PendingUser.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.code !== code) return res.status(400).json({ message: "Invalid code" });

    const newUser = new User({ email, password: user.password });
    await newUser.save();
    PendingUser.findOneAndDelete({ email });

    res.status(200).json({ message: "Verification successful", user: { email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Verification failed" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const code = Math.floor(Math.random() * 1000000).toString().padStart(6, "0");
    user.twoFactorCode = code;
    user.twoFactorExpires = Date.now() + 10 * 60 * 1000;
    await user.save();
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Your Fitness Tracker Login Code",
      text: `Your 6-digit login code is: ${code}. It expires in 10 minutes.`
    });
    res.status(200).json({ message: "Code sent", requires2FA: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login error" });
  }
});

app.post("/api/verify-2fa", async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.twoFactorCode !== code || user.twoFactorExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    user.twoFactorCode = undefined;
    user.twoFactorExpires = undefined;
    req.session.userId = user._id;
    await user.save();

    res.status(200).json({ message: "Login successful", user: { email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Verification failed" });
  }
});
app.post("/api/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(200).json({ message: "If that email exists, a reset code was sent!" });
    }

    const code = Math.floor(Math.random() * 1000000).toString().padStart(6, "0");
    user.resetPasswordCode = code;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 mins
    await user.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Fitness Tracker - Reset Your Password",
      text: `Your password reset code is: ${code}. It expires in 15 minutes.`
    });

    res.status(200).json({ message: "If that email exists, a reset code was sent!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error sending reset code" });
  }
});

app.post("/api/reset-password", async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    const user = await User.findOne({ email });

    if (!user || !user.resetPasswordCode || user.resetPasswordCode !== code || user.resetPasswordExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired reset code." });
    }

    user.password = await bcrypt.hash(newPassword, 10); //in-place update
    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password updated successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to reset password." });
  }
});
app.get("/api/me", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });
  const user = await User.findById(req.session.userId).select("-password");
  res.json({ user });
});

app.post("/api/logout", (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({ message: "Could not log out, please try again." });
      }
      
      res.clearCookie("connect.sid", {
        path: "/",
        httpOnly: true,
        secure: false, 
        sameSite: "lax"
      });

      return res.status(200).json({ message: "Logged out successfully" });
    });
  } else {
    return res.status(200).json({ message: "Already logged out" });
  }
});
//Workout Routes 

app.post("/api/workouts", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });
  try {
    const { name, datetime, exercises, isTemplate } = req.body; 
    if (!name || !exercises || !Array.isArray(exercises)) {
      return res.status(400).json({ message: "Invalid workout data" });
    }
    const newWorkout = new Workout({
      userId: req.session.userId,
      name,
      datetime: datetime || new Date(),
      isTemplate: isTemplate || false, 
      exercises,
    });
    await newWorkout.save();
    res.status(201).json(newWorkout);
  } catch (err) {
    console.error("Save error:", err);
    res.status(500).json({ message: "Failed to save workout session" });
  }
});

app.get("/api/workouts", async (req, res) => {
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

app.put("/api/workouts/:id", async (req, res) => {
  const { id } = req.params;
  const { name, originalName, datetime, exercises, isTemplate } = req.body; 
  try {
    if (originalName && originalName !== name) {
      await Workout.updateMany({ name: originalName }, { name });
    }
    const updatedWorkout = await Workout.findByIdAndUpdate(
      id,
      { name, datetime, exercises, isTemplate }, 
      { new: true, runValidators: true }
    );
    if (!updatedWorkout) return res.status(404).json({ message: "Workout routine not found" });
    res.json(updatedWorkout);
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Server error updating workout" });
  }
});

app.delete("/api/workouts/:id", async (req, res) => {
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

//profile routes
app.get("/api/profile", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });
  try {
    let profile = await Profile.findOne({ userId: req.session.userId });
    if (!profile) profile = await Profile.create({ userId: req.session.userId });
    res.json(profile);
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

app.put("/api/profile", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });
  try {
    const { fullName, age, height, weight, dietaryRestrictions, bio } = req.body;
    const updatedProfile = await Profile.findOneAndUpdate(
      { userId: req.session.userId },
      { fullName, age, height, weight, dietaryRestrictions, bio },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(updatedProfile);
  } catch (err) {
    console.error("Profile save error:", err);
    res.status(500).json({ message: "Failed to save profile" });
  }
});


app.get("/api/users", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });
  try {
    const currentProfile = await Profile.findOne({ userId: req.session.userId });
    const otherProfiles = await Profile.find({ userId: { $ne: req.session.userId } });

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

app.post("/api/connect", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });
  try {
    const { targetUserId } = req.body;
    const currentProfile = await Profile.findOne({ userId: req.session.userId });
    const targetProfile = await Profile.findById(targetUserId);

    if (!targetProfile) return res.status(404).json({ message: "Target profile not found." });

    const alreadyConnected = currentProfile.connections.some(
      (conn) => conn.userId.toString() === targetUserId
    );
    if (alreadyConnected) return res.status(400).json({ message: "Already connected." });

    await Profile.updateOne(
      { _id: currentProfile._id },
      { $push: { connections: { userId: targetUserId, status: "pending" } } }
    );

    res.status(200).json({ message: "Connection request sent!" });
  } catch (error) {
    console.error("Connect error:", error);
    res.status(500).json({ message: "Error sending connection request.", detail: error.message });
  }
});

app.get("/api/requests", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });
  try {
    const currentProfile = await Profile.findOne({ userId: req.session.userId });

    const incomingProfiles = await Profile.find({
      _id: { $ne: currentProfile._id },
      "connections.userId": currentProfile._id,
      "connections.status": "pending",
    });

    res.status(200).json(incomingProfiles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching requests." });
  }
});

app.post("/api/requests/respond", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });
  try {
    const { requesterId, action } = req.body;
    const currentProfile = await Profile.findOne({ userId: req.session.userId });
    const requesterProfile = await Profile.findById(requesterId);

    if (!requesterProfile) return res.status(404).json({ message: "User not found." });

    if (action === "accept") {
      await Profile.updateOne(
        { _id: requesterId, "connections.userId": currentProfile._id },
        { $set: { "connections.$.status": "connected" } }
      );
      await Profile.updateOne(
        { _id: currentProfile._id },
        { $push: { connections: { userId: requesterId, status: "connected" } } }
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


app.get("/api/messages/conversations", async (req, res) => {
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
    unreadCounts.forEach((u) => { unreadMap[u._id.toString()] = u.count; });

    const partnerIds = [...conversationMap.keys()];
    const partnerProfiles = await Profile.find({
      userId: { $in: partnerIds.map((id) => new mongoose.Types.ObjectId(id)) },
    });
    const profileByUserId = {};
    partnerProfiles.forEach((p) => { profileByUserId[p.userId.toString()] = p; });

    const conversations = partnerIds.map((partnerId) => {
      const latestMsg = conversationMap.get(partnerId);
      const profile = profileByUserId[partnerId] || {};
      return {
        partnerId,
        partnerName: profile.fullName || "Unknown User",
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

app.get("/api/messages/:partnerId", async (req, res) => {
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

app.get("/api/my-connections", async (req, res) => {
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


const onlineUsers = new Map();

io.on("connection", (socket) => {
  const userId = socket.request.session?.userId?.toString();
  if (!userId) {
    socket.disconnect();
    return;
  }

  onlineUsers.set(userId, socket.id);
  console.log(`User connected: ${userId}`);

  socket.on("send_message", async ({ receiverId, content }) => {
    try {
      const msg = await Message.create({
        senderId: userId,
        receiverId,
        type: "text",
        content,
      });

      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receive_message", msg);
      }

      socket.emit("message_sent", msg);
    } catch (err) {
      console.error("send_message error:", err);
      socket.emit("message_error", { message: "Failed to send message" });
    }
  });

  // Send a workout
  socket.on("send_workout", async ({ receiverId, workout }) => {
    try {
      const msg = await Message.create({
        senderId: userId,
        receiverId,
        type: "workout",
        content: "",
        workout,
      });

      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receive_message", msg);
      }

      socket.emit("message_sent", msg);
    } catch (err) {
      console.error("send_workout error:", err);
      socket.emit("message_error", { message: "Failed to send workout" });
    }
  });

  socket.on("disconnect", () => {
    onlineUsers.delete(userId);
    console.log(`User disconnected: ${userId}`);
  });
});

app.put('/api/goals/set', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: 'Not logged in' });
  const { goal } = req.body;
  try {
    const profile = await Profile.findOneAndUpdate(
      { userId: req.session.userId },
      { currentGoal: goal },
      { new: true, upsert: true }
    );
    res.json({ currentGoal: profile.currentGoal });
  } catch (err) {
    res.status(500).json({ message: 'Server error updating goal' });
  }
});

// GET /api/goals/progress
app.get('/api/goals/progress', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: 'Not logged in' });
  try {
    const userId = new mongoose.Types.ObjectId(req.session.userId);
    const profile = await Profile.findOne({ userId });

    if (!profile || !profile.currentGoal) {
      return res.json({ currentGoal: null, progressData: [] });
    }

    let progressData = [];

    if (profile.currentGoal === 'Getting Stronger') {
      progressData = await Workout.aggregate([
        { $match: { userId } },
        { $unwind: '$exercises' },
        {
          $group: {
            _id: { date: { $dateToString: { format: '%Y-%m', date: '$datetime' } }, exerciseName: '$exercises.name' },
            maxWeight: { $max: '$exercises.weight' }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]);
    } else if (profile.currentGoal === 'Losing Weight' || profile.currentGoal === 'Increasing Muscle Mass') {
      progressData = await Workout.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$datetime' } },
            totalSets: { $sum: { $sum: '$exercises.sets' } },
            sessionCount: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);
    }

    res.json({ currentGoal: profile.currentGoal, progressData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching progress data' });
  }
});


let cachedSuggestions = null;
let cacheExpirationTime = 0;

// exercise suggestions
app.get("/api/exercise-suggestions", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });

  try {
    const profile = await Profile.findOne({ userId: req.session.userId });
    const userGoal = profile?.currentGoal || "Getting Stronger";

    const currentTime = Date.now();
    if (cachedSuggestions && currentTime < cacheExpirationTime) {
      console.log("Serving suggestions directly from backend cache (Saving API Quota!)");
      return res.json({
        goal: userGoal,
        suggestions: cachedSuggestions
      });
    }

    let targetPath = 'exercises?limit=10';
    if (userGoal === "Losing Weight") {
      targetPath = 'exercises/bodyPart/cardio?limit=10';
    } else if (userGoal === "Increasing Muscle Mass") {
      targetPath = 'exercises/target/pectorals?limit=10';
    } else if (userGoal === "Getting Stronger") {
      targetPath = 'exercises/equipment/barbell?limit=10';
    }

    console.log("Cache expired or empty. Making a LIVE request to ExerciseDB...");
    const response = await axios.get(`https://exercisedb.p.rapidapi.com/${targetPath}`, {
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY, 
        'x-rapidapi-host': 'exercisedb.p.rapidapi.com'
      }
    });

    const rawData = response.data;

    const suggestions = rawData.slice(0, 5).map(exercise => {
      let baselineWeight = 0;
      if (userGoal === "Increasing Muscle Mass") baselineWeight = 25;
      if (userGoal === "Getting Stronger") baselineWeight = 45;

      const isCardio = exercise.bodyPart === "cardio";

      return {
        name: exercise.name,
        type: exercise.bodyPart,
        instructions: Array.isArray(exercise.instructions) 
          ? exercise.instructions.join(' ') 
          : `Targets the ${exercise.target}. Equipment needed: ${exercise.equipment}.`,
        sets: isCardio ? 1 : 4,
        reps: isCardio ? 1 : 8, 
        weight: exercise.equipment === "body weight" ? 0 : baselineWeight,
        time: isCardio ? 25 : null
      };
    });

    cachedSuggestions = suggestions;
    cacheExpirationTime = currentTime + (5 * 60 * 1000);

    res.json({
      goal: userGoal,
      suggestions: suggestions
    });

  } catch (error) {
    console.error("ExerciseDB request failed:", error.response?.data || error.message);
    res.status(500).json({ message: "Could not fetch suggestions from the internet." });
  }
});
//
server.listen(5000, () => {
  console.log("Server running on port 5000");
});

