const express = require("express");
const session = require("express-session");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const bcrypt = require("bcrypt");
const http = require("http");
const { Server } = require("socket.io");

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

// Share session with Socket.io so socket handlers can read req.session.userId
io.use((socket, next) => {
  sessionMiddleware(socket.request, socket.request.res || {}, next);
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB Atlas");
  })
  .catch((err) => {
    console.log("MongoDB connection error:", err);
  });

app.get("/", (req, res) => {
  res.send("Backend running");
});

const nodemailer = require("nodemailer");

/* TODO: Create an email address and password for the server to access */
const transporter = nodemailer.createTransport({
  service: "gmail", 
  auth: {
    user: process.env.EMAIL_USER, // Server email address
    pass: process.env.EMAIL_PASS, // Server email password
  },
});

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  twoFactorCode: { type: String },
  twoFactorExpires: { type: Date }
});
const User = mongoose.model("User", userSchema);

const workoutSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true }, 
  datetime: { type: Date, default: Date.now },
  exercises: [
    {
      name: { type: String, required: true },
      weight: { type: Number, default: 0 },
      reps: { type: Number, default: 0 },
      sets: { type: Number, default: 0 },
      time: { type: Number, default: null } 
    }
  ]
});

const profileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

  fullName: { type: String, default: "" },

  age: { type: Number, default: null },
  height: { type: Number, default: null },
  weight: { type: Number, default: null },
  dietaryRestrictions: { type: [String], default: [] },
  bio: { type: String, default: "" },
  connections: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile' },
    status: { type: String, enum: ['pending', 'connected'] }
  }]
}, { timestamps: true });

const Profile = mongoose.model("Profile", profileSchema);

const Workout = mongoose.model("Workout", workoutSchema);

const messageSchema = new mongoose.Schema({
  senderId:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiverId:{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type:      { type: String, enum: ["text", "workout"], default: "text" },
  content:   { type: String, default: "" },
  workout: {
    name: String,
    exercises: [{ name: String, weight: Number, reps: Number, sets: Number, time: Number }],
  },
  read:      { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});
messageSchema.index({ senderId: 1, receiverId: 1 });
messageSchema.index({ createdAt: -1 });
const Message = mongoose.model("Message", messageSchema);
const pendingUserSchema = new mongoose.Schema({
  email: { type: String, required: true },
  password: { type: String, required: true },
  code: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 600 } // Auto-deletes after 10 mins!
});
const PendingUser = mongoose.model("PendingUser", pendingUserSchema);

// 2. Signup Route
app.post("/api/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already in use" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const code = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');

    await PendingUser.findOneAndDelete({ email }); 
    const pending = new PendingUser({ email, password: hashedPassword, code });
    await pending.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Verify your Fitness Account",
      text: `Your verification code is: ${code}`
    });

    res.status(200).json({ message: "Verifcation code sent to your email!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Signup initialization failed", error: err.message });
  }
});

app.post("/api/verify-signup", async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await PendingUser.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if code matches and isn't expired
    if (user.code !== code) {
      return res.status(400).json({ message: "Invalid code" });
    }

    // Signup the new user
    const newUser = new User({ email, password: user.password });
    await newUser.save();

    // Delete the pending user
    PendingUser.findOneAndDelete({ email });

    res.status(200).json({ message: "Verification successful", user: { email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Verification failed" });
  }
});

// 3. Login Route
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate a random 6-digit code for 2fa
    const code = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');

    // Save code and expiration (10 minutes from now) to the user
    user.twoFactorCode = code;
    user.twoFactorExpires = Date.now() + 10 * 60 * 1000; 
    await user.save();
/*
    // Send the email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Your Fitness Tracker Login Code",
      text: `Your 6-digit login code is: ${code}. It expires in 10 minutes.`
    });
*/
    console.log(`2FA code for ${user.email}: ${code}`);
    // Tell the frontend to show the 2FA screen
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

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if code matches and isn't expired
    if (user.twoFactorCode !== code || user.twoFactorExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    // Clear the code from the database so it can't be reused
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
// 5. workout route
app.post("/api/workouts", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not logged in" });
  }

  try {
    const { name, datetime, exercises } = req.body;
    if (!name || !exercises || !Array.isArray(exercises)) {
      return res.status(400).json({ message: "Invalid workout data" });
    }
    const newWorkout = new Workout({
      userId: req.session.userId,
      name,
      datetime: datetime || new Date(), // Use provided date or current time
      exercises
    });

    await newWorkout.save();
    
    res.status(201).json(newWorkout);
    
  } catch (err) {
    console.error("Save error:", err);
    res.status(500).json({ message: "Failed to save workout session" });
  }
});
//6. delete workout 
app.delete("/api/workouts/:id", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });
  try {
    // Ensure the workout belongs to the user before deleting
    const deletedWorkout = await Workout.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.session.userId 
    });
    
    if (!deletedWorkout) return res.status(404).json({ message: "Workout not found" });
    res.json({ message: "Workout deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete" });
  }
});

app.get("/api/profile", async (req, res) => {
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

app.put("/api/profile", async (req, res) => {
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
        bio,
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.json(updatedProfile);
  } catch (err) {
    console.error("Profile save error:", err);
    res.status(500).json({ message: "Failed to save profile" });
  }
});

// 4. Protected Route Example
app.get("/api/me", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not logged in" });
  }

  const user = await User.findById(req.session.userId).select("-password");

  res.json({ user });
});
//fetching workouts
app.get("/api/workouts", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });
  try {
    const userWorkouts = await Workout.find({ 
      userId: req.session.userId,
      exercises: { $exists: true, $not: { $size: 0 } } 
    }).sort({ datetime: -1 });
    
    res.json(userWorkouts);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch workouts" });
  }
});

app.put('/api/workouts/:id', async (req, res) => {
  const { id } = req.params;
  const { name, originalName, datetime, exercises } = req.body;

  try {
    // If the name was modified, update all past instances so they don't fracture the list
    if (originalName && originalName !== name) {
      await Workout.updateMany({ name: originalName }, { name: name });
    }

    const updatedWorkout = await Workout.findByIdAndUpdate(
      id,
      { name, datetime, exercises },
      { new: true, runValidators: true }
    );

    if (!updatedWorkout) {
      return res.status(404).json({ message: "Workout routine not found" });
    }

    res.json(updatedWorkout);
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Server error updating workout" });
  }
});

app.get('/api/users', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });
  try {
    const currentUserId = req.session.userId;
    const currentProfile = await Profile.findOne({ userId: currentUserId });
    
    console.log("currentProfile.connections:", currentProfile.connections); 
    
    const otherProfiles = await Profile.find({ userId: { $ne: currentUserId } });

    const usersWithStatus = otherProfiles.map(profile => {
      const existingConnection = currentProfile.connections.find(
        conn => conn.userId.toString() === profile._id.toString() 
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

// 2. POST /api/connect - Handle a new connection request
app.post('/api/connect', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });
  
  try {
    const currentUserId = req.session.userId;
    const { targetUserId } = req.body;

    const currentProfile = await Profile.findOne({ userId: currentUserId });
    const targetProfile = await Profile.findById(targetUserId);

    if (!targetProfile) return res.status(404).json({ message: "Target profile not found." });

    const alreadyConnected = currentProfile.connections.some(
      conn => conn.userId.toString() === targetUserId
    );
    if (alreadyConnected) return res.status(400).json({ message: "Already connected." });

    currentProfile.connections.push({ userId: targetUserId, status: 'pending' });
    targetProfile.connections.push({ userId: currentUserId, status: 'pending' });

    await Profile.updateOne(
      { _id: currentProfile._id },
      { $push: { connections: { userId: targetUserId, status: 'pending' } } }
    );
    await Profile.updateOne(
      { _id: targetProfile._id },
      { $push: { connections: { userId: currentUserId, status: 'pending' } } }
    );

    res.status(200).json({ message: "Connection request sent!" });
  } catch (error) {
    console.error("FULL ERROR:", error);
    res.status(500).json({ message: "Error sending connection request.", detail: error.message });
  }
});

// GET incoming pending requests
app.get('/api/requests', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });
  try {
    const currentProfile = await Profile.findOne({ userId: req.session.userId });

    // Find profiles that have sent a request TO the current user
    const incomingProfiles = await Profile.find({
      'connections.userId': currentProfile._id,
      'connections.status': 'pending'
    });

    // Filter to only ones where current user hasn't initiated
    const incoming = incomingProfiles.filter(p => {
      const theirConn = p.connections.find(c => c.userId.toString() === currentProfile._id.toString());
      const myConn = currentProfile.connections.find(c => c.userId.toString() === p._id.toString());
      return theirConn?.status === 'pending' && !myConn;
    });

    res.status(200).json(incoming);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching requests." });
  }
});

// POST accept or decline a request
app.post('/api/requests/respond', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });
  try {
    const { requesterId, action } = req.body; // action: 'accept' or 'decline'
    const currentProfile = await Profile.findOne({ userId: req.session.userId });
    const requesterProfile = await Profile.findById(requesterId);

    if (!requesterProfile) return res.status(404).json({ message: "User not found." });

    if (action === 'accept') {
      // Add connected entry to current user
      await Profile.updateOne(
        { _id: currentProfile._id },
        { $push: { connections: { userId: requesterId, status: 'connected' } } }
      );
      // Update requester's entry to connected
      await Profile.updateOne(
        { _id: requesterId, 'connections.userId': currentProfile._id },
        { $set: { 'connections.$.status': 'connected' } }
      );
    } else if (action === 'decline') {
      // Remove from requester's connections
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

// DELETE a connection — pulls the entry from both profiles
app.delete("/api/connections/:targetProfileId", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });
  try {
    const currentProfile = await Profile.findOne({ userId: req.session.userId });
    const targetProfileId = new mongoose.Types.ObjectId(req.params.targetProfileId);
    const currentProfileId = new mongoose.Types.ObjectId(currentProfile._id);

    // Remove target from current user's connections
    await Profile.updateOne(
      { _id: currentProfileId },
      { $pull: { connections: { userId: targetProfileId } } }
    );

    // Remove current user from target's connections
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

// GET conversations (only with current connections)
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

// GET message history between two users
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

// GET current user's confirmed connections
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

// ─── Socket.io ────────────────────────────────────────────────────────────────

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
      // Block messaging if not connected
      const senderProfile = await Profile.findOne({ userId });
      const receiverProfile = await Profile.findOne({ userId: receiverId });
      const isConnected = senderProfile?.connections.some(
        (c) => c.userId.toString() === receiverProfile?._id.toString() && c.status === "connected"
      );
      if (!isConnected) {
        socket.emit("message_error", { message: "You are not connected with this user." });
        return;
      }

      const msg = await Message.create({ senderId: userId, receiverId, type: "text", content });
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) io.to(receiverSocketId).emit("receive_message", msg);
      socket.emit("message_sent", msg);
    } catch (err) {
      console.error("send_message error:", err);
      socket.emit("message_error", { message: "Failed to send message" });
    }
  });

  socket.on("send_workout", async ({ receiverId, workout }) => {
    try {
      // Block messaging if not connected
      const senderProfile = await Profile.findOne({ userId });
      const receiverProfile = await Profile.findOne({ userId: receiverId });
      const isConnected = senderProfile?.connections.some(
        (c) => c.userId.toString() === receiverProfile?._id.toString() && c.status === "connected"
      );
      if (!isConnected) {
        socket.emit("message_error", { message: "You are not connected with this user." });
        return;
      }

      const msg = await Message.create({ senderId: userId, receiverId, type: "workout", content: "", workout });
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) io.to(receiverSocketId).emit("receive_message", msg);
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

server.listen(5000, () => {
  console.log("Server running on port 5000");
});
