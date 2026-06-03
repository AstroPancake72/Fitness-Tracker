const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  twoFactorCode: { type: String },
  twoFactorExpires: { type: Date },
  resetPasswordCode: { type: String },
  resetPasswordExpires: { type: Date },
});

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
      instructions: { type: String, default: "" },
    },
  ],
});

const profileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    currentGoal: {
      type: String,
      enum: ["Getting Stronger", "Increasing Muscle Mass", "Losing Weight", null],
      default: null,
    },
    fullName: { type: String, default: "" },
    age: { type: Number, default: null },
    height: { type: Number, default: null },
    weight: { type: Number, default: null },
    dietaryRestrictions: { type: [String], default: [] },
    fitnessGoal: { type: String, default: "" },
    activityLevel: { type: String, default: "" },
    bio: { type: String, default: "" },
    connections: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "Profile" },
        status: { type: String, enum: ["pending", "connected"] },
      },
    ],
    profileImage: { type: String, default: "" },
  },
  { timestamps: true }
);

profileSchema.index({ "connections.userId": 1 });

const goalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    goalType: {
      type: String,
      enum: ["Strength", "Bodyweight", "Consistency", "Volume", "TARGET", "GOAL", "COMPLETION"],
      required: true,
    },
    macroCategory: { type: String, default: null },
    exerciseName: { type: String, trim: true, default: "" },
    targetValue: { type: Number, default: 0 },
    startingValue: { type: Number, default: 0 },
    deadline: { type: Date },
    status: { type: String, enum: ["Active", "Completed", "Abandoned"], default: "Active" },
    microTarget: {
      exerciseName: { type: String, default: "" },
      targetMetric: { type: Number },
      metricUnit: { type: String },
      currentValue: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["text", "workout"], default: "text" },
  content: { type: String, default: "" },
  workout: {
    name: String,
    exercises: [{ name: String, weight: Number, reps: Number, sets: Number, time: Number }],
  },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

messageSchema.index({ senderId: 1, receiverId: 1 });
messageSchema.index({ createdAt: -1 });

const pendingUserSchema = new mongoose.Schema({
  email: { type: String, required: true },
  password: { type: String, required: true },
  code: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 600 },
});

const dietPlanSchema = new mongoose.Schema({
  userId: String,
  generatedAt: {
    type: Date,
    default: Date.now,
  },
  plan: Object,
});

module.exports = {
  User: mongoose.model("User", userSchema),
  Workout: mongoose.model("Workout", workoutSchema),
  Profile: mongoose.model("Profile", profileSchema),
  Goal: mongoose.model("Goal", goalSchema),
  Message: mongoose.model("Message", messageSchema),
  PendingUser: mongoose.model("PendingUser", pendingUserSchema),
  DietPlan: mongoose.model("DietPlan", dietPlanSchema),
};