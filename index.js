import express from "express"
import mongoose from "mongoose"
import cors from "cors"
import dotenv from "dotenv"
import authRoutes from "./routes/auth.routes.js"
import userRoutes from "./routes/user.routes.js"

import orderRoutes from "./routes/order.routes.js"

import menuRoutes from "./routes/menuItems.routes.js"
// Add import for notification routes


import { errorHandler, notFound } from "./middlewares/error.middleware.js"
import { apiRateLimiter } from "./middlewares/rateLimiter.js"

// Add imports for fs and path
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { connectDB } from "./lib/DB.js"

dotenv.config()

// Add this after dotenv.config()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads")
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())

// Special handling for Stripe webhook route
app.use((req, res, next) => {
  if (req.originalUrl === "/api/payments/webhook") {
    next()
  } else {
    express.json()(req, res, next)
  }
})

app.use(express.urlencoded({ extended: true }))

// Apply rate limiter to all routes except webhook
app.use((req, res, next) => {
  if (req.originalUrl === "/api/payments/webhook") {
    next()
  } else {
    apiRateLimiter(req, res, next)
  }
})

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/meals", menuRoutes)
app.use("/api/users", userRoutes)

app.use("/api/orders", orderRoutes)

// Add notification routes


// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is running" })
})

// Error handling middleware
app.use(notFound)
app.use(errorHandler)


   
 app.listen(PORT, () => {
  connectDB()
  console.log(`Server running on port ${PORT}`)
})

  
export default app
