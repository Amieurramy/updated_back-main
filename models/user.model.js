import mongoose from "mongoose";
import Counter from "./counter.model.js";
const addressSchema = new mongoose.Schema({
  // Champ AJOUTÉ pour le nom personnalisé donné par l'utilisateur
  label: { type: String, required: true },

  // Champ Optionnel pour garder l'ID Google Places/maps_local si utile
  place_id: { type: String },

  // Vos champs existants (type et address devraient aussi être requis logiquement)
  type: {
    type: String,
    enum: ["home", "office", "other"],
    default: "home",
    required: true,
  }, // Rendu requis
  address: { type: String, required: true },
  apartment: { type: String },
  building: { type: String },
  landmark: { type: String },
  // Latitude et Longitude sont souvent essentielles pour la livraison
  latitude: { type: Number, required: true }, // Rendu requis
  longitude: { type: Number, required: true }, // Rendu requis
  isDefault: { type: Boolean, default: false },
});

const walletTransactionSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  type: { type: String, enum: ["credit", "debit"], required: true },
  description: { type: String, required: true },
  date: { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String },
    email: { type: String, lowercase: true },
    mobileNumber: { type: String },
    countryCode: { type: String, default: "+213" },
    profileImage: { type: String },
    isVerified: { type: Boolean, default: false },
    isMobileVerified: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
    isRestaurantOwner: { type: Boolean, default: false },
    deviceToken: { type: String },
    social: {
      google: {
        id: { type: String },
        email: { type: String },
        name: { type: String },
      },
      facebook: {
        id: { type: String },
        email: { type: String },
        name: { type: String },
      },
    },
    addresses: [
      {
        label: { type: String, required: true },

        // Champ Optionnel pour garder l'ID Google Places/maps_local si utile
        place_id: { type: String },

        // Vos champs existants (type et address devraient aussi être requis logiquement)
        type: {
          type: String,
          enum: ["home", "office", "other"],
          default: "home",
          required: true,
        }, // Rendu requis
        address: { type: String, required: true },
        apartment: { type: String },
        building: { type: String },
        landmark: { type: String },
        // Latitude et Longitude sont souvent essentielles pour la livraison
        latitude: { type: Number, required: true }, // Rendu requis
        longitude: { type: Number, required: true }, // Rendu requis
        isDefault: { type: Boolean, default: false },
      },
    ],
    wallet: {
      balance: { type: Number, default: 0 },
      transactions: [walletTransactionSchema],
    },

    stripeCustomerId: { type: String },

    dietaryProfile: {
      vegetarian: { type: Boolean, default: false },
      vegan: { type: Boolean, default: false },
      glutenFree: { type: Boolean, default: false },
      dairyFree: { type: Boolean, default: false },
    },
    healthProfile: {
      low_carb: { type: Boolean, default: false },
      low_fat: { type: Boolean, default: false },
      low_sugar: { type: Boolean, default: false },
      low_sodium: { type: Boolean, default: false },
    },
    matrixIndex: { type: Number, unique: true, sparse: true },
    cfParams: {
      w: {
        type: [Number],
        default: () =>
          Array(10)
            .fill(0)
            .map(() => Math.random()),
      },
      b: { type: Number, default: 0 },
      lastTrained: Date,
    },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "MenuItem" }],
    recommandations: [
      { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem" },
    ],
  },
  {
    timestamps: true,
  }
);

// Middleware Mongoose exécuté AVANT la sauvegarde (.save())
userSchema.pre("save", async function (next) {
  if (!this.matrixIndex) {
    // Seulement pour les nouveaux documents
    try {
      const counter = await Counter.findByIdAndUpdate(
        { _id: "userId" }, // L'ID du document compteur
        { $inc: { sequence_value: 1 } }, // Incrémente la valeur
        { new: true, upsert: true } // Retourne le nouveau doc, crée s'il n'existe pas
      );
      this.matrixIndex = counter.sequence_value; // Assigne la nouvelle valeur
      next(); // Continue le processus de sauvegarde
    } catch (error) {
      next(error); // Propage l'erreur
    }
  } else {
    next(); // Ne fait rien si ce n'est pas un nouveau document
  }
});

// Virtual for backward compatibility
userSchema.virtual("walletBalance").get(function () {
  return this.wallet.balance;
});

userSchema.virtual("favoriteRestaurants").get(function () {
  return this.favorites;
});

userSchema.virtual("savedAddresses").get(function () {
  return this.addresses;
});

export const User = mongoose.model("User", userSchema);
