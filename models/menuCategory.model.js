import mongoose from "mongoose"

const menuCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    order: { type: Number, default: 0 }, // For sorting categories
  },
  {
    timestamps: true,
  },
)

export const MenuCategory = mongoose.model("MenuCategory", menuCategorySchema)
