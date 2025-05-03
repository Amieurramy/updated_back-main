import mongoose from 'mongoose';

// Schéma pour la collection 'counters'
const counterSchema = new mongoose.Schema({
  _id: { // Le nom de la séquence (ex: "menuItemMatrixIndex")
    type: String,
    required: true
  },
  sequence_value: { // La valeur actuelle du compteur
    type: Number,
    required: true,
    default: 0 // La valeur par défaut si un nouveau compteur est créé via Mongoose
  }
});

// Création du modèle Mongoose basé sur le schéma
const Counter = mongoose.model('Counter', counterSchema);

// Exportation du modèle pour pouvoir l'utiliser ailleurs (ex: dans le pre-save hook de MenuItem)
export default Counter;