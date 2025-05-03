import mongoose from "mongoose"

const addonSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  isAvailable: { type: Boolean, default: true },
})

const menuItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    image: { type: String },
    //category: { type: mongoose.Schema.Types.ObjectId, ref: "MenuCategory", required: true },
    category: { type: String, required: true },
    dietaryInfo: {
      vegetarian: Boolean,
      vegan: Boolean,
      glutenFree: Boolean,
      lactoseFree: Boolean
    },
    healthInfo:{
      low_carb: Boolean,
      low_fat: Boolean,
      low_sugar: Boolean,
      low_sodium: Boolean,
    },
    matrixIndex: { type: Number, unique: true, sparse: true },
    cfFeatures: { 
      type: [Number], 
      default: () => Array(10).fill(0).map(() => Math.random())
    },
    isAvailable: { type: Boolean, default: true },
    isPopular: { type: Boolean, default: false },
    addons: [addonSchema],
    preparationTime: { type: Number }, // in minutes
  },
  {
    timestamps: true,
  },
)

export const MenuItem = mongoose.model("MenuItem", menuItemSchema);
