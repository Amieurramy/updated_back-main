import express from "express"
import { sendOTP, verifyOTP, socialLogin, register,submitPreferences } from "../controllers/auth.ramyController.js"
import {
  validateSendOTP,
  validateVerifyOTP,
  validateRegister,
  validateSocialLogin,
} from "../middlewares/auth.validator.js"
import { otpRateLimiter } from "../middlewares/rateLimiter.js"

const router = express.Router()

// OTP routes
// router.post("/send-otp", validateSendOTP, otpRateLimiter, sendOTP)
router.post("/send-otp", otpRateLimiter, sendOTP)
// router.post("/verify-otp", validateVerifyOTP, verifyOTP)
router.post("/verify-otp", verifyOTP)
router.post('/preferences', submitPreferences);

// Social login
// router.post("/social-login", validateSocialLogin, socialLogin)
router.post("/social-login", socialLogin)
// Registration
router.post("/register", validateRegister, register)

export default router
