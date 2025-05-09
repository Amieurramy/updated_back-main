import mongoose from "mongoose";
const tableSchema = new mongoose.Schema(
  {
    tableId: {
      type: String,
      unique: true,
      sparse: true, // Allows null values while maintaining uniqueness for non-null values
    },
    status: {
      type: String,
      enum: ["available", "occupied", "reserved", "cleaning"],
      default: "available",
    },
    currentSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TableSession",
    },
    capacity: { type: Number, required: true },
    isActive: {
      type: Boolean,
      default: false,
    },
    name: { type: String }, // Optionnel: Nom/Numéro de table (ex: "Table 5", "Terrasse 1")
  },
  { timestamps: true }
);



export const Table = mongoose.model("Table", tableSchema);