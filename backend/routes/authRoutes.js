const express = require("express");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const { User, PendingUser } = require("../models");
const { isStrongPassword } = require("../helpers");

const router = express.Router();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, //server email address
    pass: process.env.EMAIL_PASS, //server email password
  },
});

router.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.",
      });
    }

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

    res.status(200).json({ message: "Verifcation code sent to your email!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Signup initialization failed", error: err.message });
  }
});

router.post("/verify-signup", async (req, res) => {
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

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate a random 6-digit code for 2FA
    const code = Math.floor(Math.random() * 1000000).toString().padStart(6, "0");

    // Save code and expiration (10 minutes from now) to the user
    user.twoFactorCode = code;
    user.twoFactorExpires = Date.now() + 10 * 60 * 1000;
    await user.save();
    // Send the email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Your Fitness Tracker Login Code",
      text: `Your 6-digit login code is: ${code}. It expires in 10 minutes.`,
    });
    res.status(200).json({ message: "Code sent", requires2FA: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login error" });
  }
});

router.post("/verify-2fa", async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
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

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({ message: "If that email exists, a reset code was sent!" });
    }

    const code = Math.floor(Math.random() * 1000000).toString().padStart(6, "0");
    user.resetPasswordCode = code;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Fitness Tracker - Reset Your Password",
      text: `Your password reset code is: ${code}. It expires in 15 minutes.`,
    });

    res.status(200).json({ message: "If that email exists, a reset code was sent!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error sending reset code" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.resetPasswordCode !== code || user.resetPasswordExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired reset code." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.status(200).json({ message: "Password updated successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to reset password." });
  }
});

router.post("/logout", (req, res) => {
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
        sameSite: "lax",
      });

      return res.status(200).json({ message: "Logged out successfully" });
    });
  } else {
    return res.status(200).json({ message: "Already logged out" });
  }
});

// Protected route example
router.get("/me", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not logged in" });
  }

  const user = await User.findById(req.session.userId).select("-password");

  res.json({ user });
});

module.exports = router;