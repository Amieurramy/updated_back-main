import express from "express"
import {
  createOrder,
  getOrderDetails,
  updateOrderStatus,
  updatePaymentStatus,
  submitOrderRatings,
  getOrdersByUser,
  getOrdersBySession,
  getMyOrders,
} from "../controllers/order.controller.js"
import { protect } from "../middlewares/auth.middleware.js"

const router = express.Router()

// Public routes
router.post("/", createOrder)
router.get("/", protect,getMyOrders)
router.post("/:orderId/rate-items", protect,submitOrderRatings)
router.get("/:orderId", getOrderDetails)
router.get("/user/:userId", getOrdersByUser)
router.get("/session/:sessionId", getOrdersBySession)

// Admin routes
router.put("/:orderId/status", updateOrderStatus)
router.put("/:orderId/payment", updatePaymentStatus)

export default router
