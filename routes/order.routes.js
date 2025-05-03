import express from "express"
import {
  createOrder,
  getOrderDetails,
  updateOrderStatus,
  updatePaymentStatus,
  getOrdersByUser,
  getOrdersBySession,
} from "../controllers/order.controller.js"

const router = express.Router()

// Public routes
router.post("/", createOrder)
router.get("/:orderId", getOrderDetails)
router.get("/user/:userId", getOrdersByUser)
router.get("/session/:sessionId", getOrdersBySession)

// Admin routes
router.put("/:orderId/status", updateOrderStatus)
router.put("/:orderId/payment", updatePaymentStatus)

export default router
