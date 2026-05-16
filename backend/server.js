const express = require("express");
const session = require("express-session");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const bcrypt = require("bcrypt");
const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  })
);
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 1000 * 60 * 30, sameSite: "lax" }, // 30 minutes session
  })
)

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

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
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

const Workout = mongoose.model("Workout", workoutSchema);
// 2. Signup Route
app.post("/api/signup", async (req, res) => {
  try {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: "User created!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Signup failed", error: err.message });
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
    req.session.userId = user._id;
    res.status(200).json({ message: "Login successful", user: { email: user.email } });
  } catch (err) {
    res.status(500).json({ message: "Login error" });
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

app.listen(5000, () => {
  console.log("Server running on port 5000");
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
      { returnDocument: 'after', runValidators: true }
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