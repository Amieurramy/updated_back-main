import mongoose from "mongoose"

const locationSchema = new mongoose.Schema({
  type: { type: String, default: "Point" },
  coordinates: [Number], // [longitude, latitude]
  address: { type: String },
  city: { type: String },
  state: { type: String },
  country: { type: String },
  zipCode: { type: String },
})

const timingSchema = new mongoose.Schema({
  day: { type: String, required: true },
  open: { type: String, required: true },
  close: { type: String, required: true },
  isClosed: { type: Boolean, default: false },
})

const restaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    logo: { type: String },
    coverImage: { type: String },
    images: [{ type: String }],
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    cuisines: [{ type: String }],
    location: locationSchema,
    contactPhone: { type: String },
    contactEmail: { type: String },
    timings: [timingSchema],
    rating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },
    minOrderAmount: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    deliveryTime: { type: String },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    tags: [{ type: String }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Add index for geospatial queries
restaurantSchema.index({ "location.coordinates": "2dsphere" })

// Virtual for distance (to be populated during queries)
restaurantSchema.virtual("distance").get(function () {
  return this._distance
})

export const Restaurant = mongoose.model("Restaurant", restaurantSchema)
