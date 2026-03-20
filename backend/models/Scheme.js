const mongoose = require("mongoose");

// ─── Sub-schemas ───────────────────────────────────────────

const EligibilityConditionSchema = new mongoose.Schema(
  {
    field: {
      type: String,
      required: true,
      enum: ["age", "income", "state", "category", "occupation", "gender"],
    },
    operator: {
      type: String,
      required: true,
      enum: ["eq", "ne", "lt", "lte", "gt", "gte", "in", "nin", "range"],
    },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    label: { type: String }, // human-readable reason e.g. "Age between 18-40"
  },
  { _id: false }
);

const EligibilityRulesSchema = new mongoose.Schema(
  {
    logic: { type: String, enum: ["AND", "OR"], default: "AND" },
    conditions: [EligibilityConditionSchema],
  },
  { _id: false }
);

// ─── Main schema ───────────────────────────────────────────

const SchemeSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: { type: String, required: true, trim: true },
    nameHindi: { type: String, trim: true },
    tagline: { type: String, trim: true },

    category: {
      type: String,
      required: true,
      enum: [
        "farmer",
        "student",
        "housing",
        "health",
        "women",
        "labour",
        "business",
        "pension",
        "vendor",
        "general",
      ],
      index: true,
    },

    ministry: { type: String, required: true },
    icon: { type: String, default: "🏛️" },
    bgColor: { type: String, default: "#F3F4F6" },

    shortDescription: { type: String, required: true, maxlength: 300 },
    whatIsIt: { type: String, required: true },

    benefits: [{ type: String }],
    documents: [{ type: String }],
    howToApply: [{ type: String }],

    eligibilityRules: { type: EligibilityRulesSchema, required: true },
    eligibilityText: { type: String }, // human-readable summary

    officialLink: { type: String },
    applyLink: { type: String },

    // AI-generated simplified descriptions keyed by profile bucket
    // e.g. { "farmer-low": "...", "student-medium": "..." }
    simplifiedCache: {
      type: Map,
      of: String,
      default: {},
    },

    isActive: { type: Boolean, default: true, index: true },
    sourceDocument: { type: String }, // original PDF filename if ingested
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// ─── Full-text search index ────────────────────────────────
SchemeSchema.index(
  { name: "text", nameHindi: "text", shortDescription: "text", ministry: "text" },
  { weights: { name: 10, nameHindi: 8, shortDescription: 5, ministry: 2 } }
);

// ─── Statics ───────────────────────────────────────────────

SchemeSchema.statics.findActive = function () {
  return this.find({ isActive: true });
};

SchemeSchema.statics.findByCategory = function (category) {
  return this.find({ isActive: true, category });
};

SchemeSchema.statics.search = function (query) {
  return this.find(
    { $text: { $search: query }, isActive: true },
    { score: { $meta: "textScore" } }
  ).sort({ score: { $meta: "textScore" } });
};

module.exports = mongoose.model("Scheme", SchemeSchema);