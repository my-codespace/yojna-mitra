const mongoose = require("mongoose");

const UserProfileSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    age: {
      type: Number,
      required: true,
      min: [0, "Age cannot be negative"],
      max: [120, "Age cannot exceed 120"],
    },

    income: {
      type: Number,
      required: true,
      min: [0, "Income cannot be negative"],
      comment: "Annual income in INR",
    },

    state: {
      type: String,
      required: true,
      enum: [
        "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
        "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
        "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra",
        "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
        "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
        "Uttar Pradesh", "Uttarakhand", "West Bengal",
        "Delhi", "Jammu & Kashmir", "Ladakh", "Puducherry",
        "Chandigarh", "Andaman & Nicobar Islands",
        "Dadra & Nagar Haveli and Daman & Diu", "Lakshadweep",
      ],
    },

    category: {
      type: String,
      required: true,
      enum: ["General", "OBC", "SC", "ST", "EWS"],
    },

    occupation: {
      type: String,
      required: true,
      enum: [
        "Farmer",
        "Student",
        "Self-employed / Small Business",
        "Salaried (Government)",
        "Salaried (Private)",
        "Daily Wage / Labour",
        "Street Vendor",
        "Unemployed",
        "Homemaker",
        "Retired",
      ],
    },

    gender: {
      type: String,
      enum: ["Male", "Female", "Other", "Prefer not to say"],
      default: "Prefer not to say",
    },

    // Derived income bucket for cache keying
    incomeBucket: {
      type: String,
      enum: ["very-low", "low", "medium", "high"],
    },
  },
  {
    timestamps: true,
  }
);

// ─── Pre-save: compute income bucket ──────────────────────
UserProfileSchema.pre("save", function (next) {
  if (this.income <= 100000) this.incomeBucket = "very-low";
  else if (this.income <= 300000) this.incomeBucket = "low";
  else if (this.income <= 800000) this.incomeBucket = "medium";
  else this.incomeBucket = "high";
  next();
});

// ─── Virtual: profile summary key for AI cache ────────────
UserProfileSchema.virtual("cacheKey").get(function () {
  return `${this.occupation.toLowerCase().replace(/\s+/g, "-")}-${this.incomeBucket}`;
});

module.exports = mongoose.model("UserProfile", UserProfileSchema);