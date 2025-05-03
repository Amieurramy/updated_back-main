import mongoose from "mongoose"

const verificationTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  token: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 43200, // 12 hours in seconds
  },
})

const VerificationToken = mongoose.model("VerificationToken", verificationTokenSchema)

export default VerificationToken
