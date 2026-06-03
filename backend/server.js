const express = require("express");
const session = require("express-session");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const http = require("http");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const dietRoutes = require("./routes/dietRoutes");
const workoutRoutes = require("./routes/workoutRoutes");
const connectionRoutes = require("./routes/connectionRoutes");
const messageRoutes = require("./routes/messageRoutes");
const goalRoutes = require("./routes/goalRoutes");
const exerciseRoutes = require("./routes/exerciseRoutes");
const setupChatSocket = require("./sockets/chatSocket");

const app = express();
const server = http.createServer(app);

app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  })
);

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 1000 * 60 * 30,
    sameSite: "lax",
  },
});

app.use(sessionMiddleware);

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

app.use("/api", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api", dietRoutes);
app.use("/api/workouts", workoutRoutes);
app.use("/api", connectionRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api", exerciseRoutes);

setupChatSocket(server, sessionMiddleware);

server.listen(5000, () => {
  console.log("Server running on port 5000");
});