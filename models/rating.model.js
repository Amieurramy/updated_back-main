// models/rating.model.js
import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MenuItem",
      required: true,
    },
    rating: {
      // Échelle de 1 à 5.
      // 1: Fortement non recommandé (ex: restriction alimentaire)
      // 2: Non aimé (basé sur une note manuelle basse)
      // 3: Neutre / Pas d'opinion forte / Note manuelle moyenne
      // 4: Aimé (basé sur une note manuelle haute)
      // 5: Fortement recommandé (ex: favori, note manuelle très haute)
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    source: {
      // Pour savoir d'où vient la note
      type: String,
      enum: [
        "manual_order", // Note explicite après une commande
        "favorite_implicit", // Mis en favori par l'utilisateur
        "dietary_restriction_implicit", // Basé sur les restrictions de l'utilisateur
        "initial_preference_implicit", // Si vous demandez des préférences initiales
        // Ajoutez d'autres sources si nécessaire
      ],
      required: true,
    },
    // Optionnel: vous pouvez ajouter des commentaires si la note est manuelle
    comment: { type: String }, 
  },
  {
    timestamps: true, // Ajoute createdAt et updatedAt
  }
);

// Index pour des requêtes plus rapides et pour assurer l'unicité si nécessaire.
// Un utilisateur ne note un article qu'une seule fois de manière "définitive".
// Si une nouvelle source de note arrive (ex: manuelle après favori), on met à jour.
ratingSchema.index({ user: 1, menuItem: 1 }, { unique: true }); 
ratingSchema.index({ user: 1 });
ratingSchema.index({ menuItem: 1 });

export const Rating = mongoose.model("Rating", ratingSchema);
