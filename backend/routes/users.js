const express = require("express");
const { body, param, validationResult } = require("express-validator");
const crypto = require("crypto");
const router = express.Router();

const UserProfile = require("../models/UserProfile");
const logger = require("../services/logger");

// ─── POST /api/users/profile ──────────────────────────────
// Save a new user profile, return sessionId

router.post(
  "/profile",
  [
    body("age").isInt({ min: 0, max: 120 }),
    body("income").isInt({ min: 0 }),
    body("state").isString().notEmpty(),
    body("category").isIn(["General", "OBC", "SC", "ST", "EWS"]),
    body("occupation").isString().notEmpty(),
    body("gender").optional().isIn(["Male", "Female", "Other", "Prefer not to say"]),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Generate a short session ID
      const sessionId = crypto.randomBytes(12).toString("hex");

      const profile = new UserProfile({
        sessionId,
        age: req.body.age,
        income: req.body.income,
        state: req.body.state,
        category: req.body.category,
        occupation: req.body.occupation,
        gender: req.body.gender || "Prefer not to say",
      });

      await profile.save();
      logger.info(`Profile saved: ${sessionId}`);

      res.status(201).json({
        sessionId,
        profile: {
          age: profile.age,
          income: profile.income,
          state: profile.state,
          category: profile.category,
          occupation: profile.occupation,
          gender: profile.gender,
          incomeBucket: profile.incomeBucket,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/users/profile/:sessionId ───────────────────
// Retrieve a saved profile

router.get(
  "/profile/:sessionId",
  [param("sessionId").isString().isLength({ min: 24, max: 24 })],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const profile = await UserProfile.findOne({
        sessionId: req.params.sessionId,
      }).select("-__v");

      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      res.json({ profile });
    } catch (err) {
      next(err);
    }
  }
);

// ─── DELETE /api/users/profile/:sessionId ────────────────
// Delete a profile (GDPR / privacy)

router.delete(
  "/profile/:sessionId",
  [param("sessionId").isString().isLength({ min: 24, max: 24 })],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await UserProfile.findOneAndDelete({
        sessionId: req.params.sessionId,
      });

      if (!result) {
        return res.status(404).json({ error: "Profile not found" });
      }

      res.json({ message: "Profile deleted successfully" });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;