const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const bcrypt = require("bcrypt");
const app = express();

app.use(cors());
app.use(express.json());

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

    // Send the email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Your Fitness Tracker Login Code",
      text: `Your 6-digit login code is: ${code}. It expires in 10 minutes.`
    });

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
    await user.save();

    res.status(200).json({ message: "Login successful", user: { email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Verification failed" });
  }
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});