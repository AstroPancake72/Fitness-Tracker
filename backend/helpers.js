const multer = require("multer");

function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not logged in" });
  }

  next();
}

function calculateTargetCalories(profile) {
  const weight = Number(profile.weight);
  let calories = weight * 14;

  if (profile.fitnessGoal === "lose weight") calories -= 400;
  if (profile.fitnessGoal === "gain muscle") calories += 300;

  if (profile.activityLevel === "low") calories -= 100;
  if (profile.activityLevel === "high") calories += 200;

  return Math.round(calories);
}

function mapDietaryRestrictions(restrictions = []) {
  const lower = restrictions.map((r) => r.toLowerCase().trim());

  let diet = "";
  if (lower.includes("vegan")) diet = "vegan";
  else if (lower.includes("vegetarian")) diet = "vegetarian";

  const intolerances = [];

  if (lower.includes("gluten-free")) intolerances.push("gluten");
  if (lower.includes("dairy-free")) intolerances.push("dairy");
  if (lower.includes("peanut-free")) intolerances.push("peanut");

  return {
    diet,
    intolerances: intolerances.join(","),
  };
}

function isStrongPassword(password) {
  return (
    typeof password === "string" &&
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

module.exports = {
  requireLogin,
  calculateTargetCalories,
  mapDietaryRestrictions,
  isStrongPassword,
  upload,
};