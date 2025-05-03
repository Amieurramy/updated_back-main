import express from "express";

import { getAllMenuItems } from "../controllers/meals.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

// OTP routes
// router.post("/send-otp", validateSendOTP, otpRateLimiter, sendOTP)
router.get("/", protect, getAllMenuItems);

export default router;
