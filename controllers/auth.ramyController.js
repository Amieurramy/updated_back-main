// controllers/authController.js

import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import VerificationToken from "../models/VerificationToken.model.js";
import { sendOTP as sendSMSOTP } from "../services/smsService.js"; // Gardé pour sendOTP
import { generateOTP } from "../lib/utils/helper.js"; // Gardé pour sendOTP
// Supprimé: import axios from "axios"; // Plus nécessaire pour Google si on utilise idToken
import dotenv from "dotenv";
import { OAuth2Client } from "google-auth-library"; // <<<--- AJOUTÉ
import { MenuItem } from "../models/menuItem.model.js";
import { Rating } from "../models/rating.model.js";
dotenv.config();

// Initialiser le client Google OAuth2
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// --- SOCIAL LOGIN MODIFIÉ ---
export const socialLogin = async (req, res, next) => {
  console.log("socialLogin");
  // On attend 'idToken' de Flutter au lieu de 'accessToken' pour Google
  const { provider, idToken } = req.body;

  // Gérer uniquement Google pour cette logique spécifique
  // (Adaptez si vous voulez un flux similaire pour Facebook)
  if (provider !== "google") {
    return res
      .status(400)
      .json({
        success: false,
        error: "Seul Google est supporté pour ce flux actuellement.",
      });
  }
  if (!idToken) {
    return res
      .status(400)
      .json({ success: false, error: "Le 'idToken' Google est manquant." });
  }

  try {
    // --- Vérification idToken Google ---
    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken: idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
      if (!payload) throw new Error("Payload Google vide.");
    } catch (googleError) {
      console.error("Erreur de vérification Google Token:", googleError);
      return res
        .status(401)
        .json({ success: false, error: "Token Google invalide ou expiré." });
    }
    // --- Fin Vérification ---

    const providerId = payload["sub"];
    const email = payload["email"]?.toLowerCase();
    const name = payload["name"];
    const profileImage = payload["picture"];

    if (!providerId || !email) {
      return res
        .status(400)
        .json({
          success: false,
          error: "Infos Google (ID ou email) manquantes.",
        });
    }

    // --- Trouver ou Créer l'utilisateur ---
    const user = await User.findOneAndUpdate(
      { $or: [{ "social.google.id": providerId }, { email: email }] },
      {
        $set: {
          email: email,
          // Mettre à jour fullName seulement s'il n'est pas déjà défini ou si différent ?
          // Option 1: Toujours mettre à jour avec le nom Google
          fullName: name,
          // Option 2: Mettre à jour seulement si le nom actuel est vide
          // fullName: this.fullName || name, // Nécessite d'abord un find() séparé
          profileImage: profileImage, // Mettre à jour l'image
          "social.google": { id: providerId, email: email, name: name },
          // Assurer que les flags de vérification ne sont PAS mis à true ici
        },
        $setOnInsert: {
          // Valeurs pour NOUVEAU utilisateur
          mobileNumber: null,
          countryCode: "+213", // Votre défaut
          isVerified: false,
          isMobileVerified: false,
          isAdmin: false,
          isRestaurantOwner: false,
          language: "fr", // ou payload['locale']
          wallet: { balance: 0, transactions: [] },
          favorites: [], // Assurez-vous que le type est correct (ObjectId[] ou String[])
          addresses: [],
          recommandations: [], // Assurez-vous que le type est correct
          dietaryProfile: {},
          healthProfile: {},
          cfParams: {},
          // Timestamps gérés par Mongoose
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await user.save();

    console.log(`Utilisateur trouvé/créé via Google: ID=${user._id}`);

    // --- Réponse : Succès simple + ID + Indication Tel Requis ---
    res.status(200).json({
      success: true,
      message: "Liaison Google réussie. Numéro de téléphone requis.",
      userId: user._id,
      // Indiquer explicitement si le numéro est déjà vérifié ou non
      // Utile si un utilisateur existant se reconnecte via Google
      mobileRequired: !user.isMobileVerified,
    });
  } catch (error) {
    console.error("Erreur interne dans socialLogin:", error);
    next(error);
  }
};

// --- FIN SOCIAL LOGIN MODIFIÉ ---

// --- ADAPTATION SUGGÉRÉE pour sendOTP ---
// Pour pouvoir l'appeler après socialLogin en passant l'userId
export const sendOTP = async (req, res, next) => {
  console.log("sendOTPokkkkkkkkkkkkkkk");
  try {
    // Recevoir aussi userId (optionnel)
    const { mobileNumber, countryCode, userId } = req.body;

    if (!mobileNumber) {
      return res
        .status(400)
        .json({ success: false, error: "Numéro de mobile manquant." });
    }

    const otp = generateOTP(6);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    let user;
    if (userId) {
      // Si userId est fourni (cas après socialLogin), trouver par ID et mettre à jour le numéro
      user = await User.findById(userId);
      if (!user) {
        return res
          .status(404)
          .json({
            success: false,
            error: "Utilisateur non trouvé pour l'ID fourni.",
          });
      }
      // Vérifier si le numéro est différent et non vérifié avant de mettre à jour ?
      // Ou toujours mettre à jour ? Pour l'instant, on met à jour.
      user.mobileNumber = mobileNumber;
      user.countryCode = countryCode || user.countryCode; // Garder l'ancien code pays si non fourni
      user.isMobileVerified = false; // Réinitialiser si le numéro change
      user.isVerified = false; // Réinitialiser si le numéro change
      await user.save();
      console.log(
        `Utilisateur ${userId} trouvé, numéro mis à jour: ${mobileNumber}`
      );
    } else {
      // Cas original: trouver/créer par numéro de mobile (connexion/inscription par tél seul)
      user = await User.findOneAndUpdate(
        { mobileNumber },
        {
          $set: { countryCode }, // Met à jour le countryCode si user existe
          // $setOnInsert: Définit les valeurs seulement si NOUVEL user par numéro
          $setOnInsert: {
            mobileNumber: mobileNumber, // Nécessaire ici car clé de recherche
            isVerified: false,
            isMobileVerified: false,
            // ... autres valeurs par défaut comme avant ...
            wallet: { balance: 0 },
            favorites: [],
            addresses: [],
            recommandations: [],
            dietaryProfile: {},
            healthProfile: {},
            cfParams: {},
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(
        `Utilisateur trouvé/créé par numéro: ${mobileNumber}, ID=${user._id}`
      );
    }

    // Sauvegarder le token OTP pour cet utilisateur
    await VerificationToken.findOneAndUpdate(
      { userId: user._id },
      { token: otp, expiresAt: otpExpiry, mobileNumber: mobileNumber }, // Stocker le numéro avec le token peut aider
      { upsert: true, new: true } // Crée ou met à jour le token OTP
    );

    console.log(`OTP généré pour ${mobileNumber}: ${otp}`);

    // Envoyer le SMS (logique existante)
    // try {
    //     const smsResult = await sendSMSOTP(mobileNumber, countryCode || user.countryCode, otp);
    //     // ... gestion log succès/échec SMS ...
    // } catch (smsError) { console.error("Erreur envoi SMS:", smsError); }

    // Répondre succès (sans OTP en prod)
    console.log("success");
    return res.status(200).json({
      success: true,
      message: "OTP envoyé avec succès (vérifiez les logs serveur).",
      otp: process.env.NODE_ENV !== "production" ? otp : undefined,
    });
  } catch (error) {
    next(error);
  }
};
// --- FIN ADAPTATION sendOTP ---

// --- verifyOTP (semble OK, génère le token final) ---
export const verifyOTP = async (req, res, next) => {
  try {
    // Recevoir le numéro avec l'OTP est crucial
    const { mobileNumber, otp } = req.body;
    if (!mobileNumber || !otp) {
      return res.status(400).json({ error: "Numéro et OTP requis." });
    }

    // Trouver l'utilisateur PAR NUMERO (car on n'a pas d'autre ID fiable à ce stade)
    const user = await User.findOne({ mobileNumber });
    if (!user)
      return res
        .status(404)
        .json({ error: "Utilisateur non trouvé pour ce numéro." });

    // Trouver le token de vérification VALIDE pour cet user et cet OTP
    const verification = await VerificationToken.findOne({
      userId: user._id,
      token: otp,
      //mobileNumber: mobileNumber, // Assurer que c'est le bon numéro si stocké
      expiresAt: { $gt: new Date() }, // Doit être encore valide
    });
    console.log(`OTP trouvé pour ${mobileNumber}: ${otp}`);
    if (!verification) {
      return res.status(400).json({ error: "Code OTP invalide ou expiré." });
    }

    // --- Succès OTP ---
    user.isVerified = true; // Marquer l'utilisateur comme vérifié globalement
    user.isMobileVerified = true; // Marquer le mobile comme vérifié
    await user.save();
    // Supprimer le token OTP pour qu'il ne soit pas réutilisé
    await VerificationToken.deleteOne({ _id: verification._id });

    // --- Générer le TOKEN DE SESSION FINAL ---
    // const token = jwt.sign(
    //     { userId: user._id }, // Payload du token
    //     process.env.ACCESS_TOKEN_SECRET, // Clé secrète
    //     { expiresIn: process.env.JWT_EXPIRES_IN || "30d" } // Durée de vie
    // );

    // console.log(`OTP vérifié pour ${mobileNumber}. Token JWT généré.`);

    // Renvoyer le token et les infos utilisateur
    // Adapter les champs renvoyés si nécessaire pour correspondre à UserModel Flutter
    res.json({
      success: true,
      message: "OTP vérifié avec succès. Veuillez fournir les préférences.",
      userId: user._id, // Renvoyer l'ID de l'utilisateur trouvé/vérifié
      // user: {
      //   _id: user._id,
      //   fullName: user.fullName,
      //   email: user.email,
      //   mobileNumber: user.mobileNumber,
      //   countryCode: user.countryCode, // Ajouter si utile pour Flutter
      //   profileImage: user.profileImage, // Ajouter si utile
      //   isVerified: user.isVerified,
      //   isMobileVerified: user.isMobileVerified, // Ajouter
      //   isAdmin: user.isAdmin, // Ajouter si utile
      //   isRestaurantOwner: user.isRestaurantOwner, // Ajouter si utile
      //   dietaryProfile: user.dietaryProfile, // Ajouter si utile
      //   healthProfile: user.healthProfile, // Ajouter si utile
      //   // Renvoyer les données nécessaires pour l'état 'Authenticated' et l'UI
      //   social: user.social || {},
      //   addresses: user.addresses || [],
      //   wallet: { balance: user.wallet?.balance ?? 0 },
      //   favorites: user.favorites || [], // Assurez-vous que ce sont les bons favoris (MenuItem)
      //   recommandations: user.recommandations || [], // Ajouter
      //   // etc.
      // },
    });
  } catch (error) {
    next(error);
  }
};

// Dans votre fichier de contrôleurs backend (authController.js ou userController.js)

// ... (imports User, jwt, etc.) ...

/**
 * Reçoit les préférences utilisateur, les enregistre,
 * et renvoie le token JWT final et les données utilisateur complètes.
 */
export const submitPreferences = async (req, res, next) => {
  // Récupérer les données envoyées par Flutter
  // Exemple: { userId: '...', preferences: { dietaryProfile: {...}, healthProfile: {...} } }
  const { userId, preferences } = req.body;

  // --- Validation ---
  if (!userId) {
    return res.status(400).json({ success: false, error: "userId manquant." });
  }
  if (!preferences || typeof preferences !== "object") {
    return res
      .status(400)
      .json({
        success: false,
        error: "Données de préférences invalides ou manquantes.",
      });
  }
  // Optionnel: Valider la structure de 'preferences' plus en détail

  try {
    // --- Trouver l'utilisateur ---
    // IMPORTANT: Comment s'assurer que cette requête est légitime ?
    // Normalement, cette route devrait être protégée par un token, mais nous n'en avons pas encore
    // de final. Le plus simple ici est de faire confiance à l'userId reçu juste après
    // la vérification OTP réussie. Ajoutez des contrôles si nécessaire (ex: vérifier que
    // l'utilisateur correspondant à userId a bien isMobileVerified=true mais n'a pas encore de prefs).
    let user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, error: "Utilisateur non trouvé." });
    }
    if (!user.isMobileVerified) {
      // Sécurité : vérifier que le mobile a bien été vérifié avant
      return res
        .status(403)
        .json({
          success: false,
          error:
            "Le numéro de téléphone doit être vérifié avant de soumettre les préférences.",
        });
    }
    console.log(preferences);
    // --- Enregistrer les préférences ---
    // Assurez-vous que les clés correspondent à votre schéma Mongoose
    if (preferences.dietaryProfile) {
      user.dietaryProfile = { ...preferences.dietaryProfile };
    }
    if (preferences.healthProfile) {
      // Attention à la casse si votre modèle utilise 'healthProfile' et le schéma 'HealthProfile'
      user.healthProfile = { ...preferences.healthProfile };
    }
    // Mettre à jour d'autres champs si nécessaire (ex: un flag profileComplete?)

    console.log(`Préférences enregistrées pour l'utilisateur ${userId}`);
    const meals = await MenuItem.find();
    const prediction = 0.5;
    for (const meal of meals) {
      const dietaryInfo = meal.dietaryInfo;
      for (const [key, value] of Object.entries(dietaryInfo)) {
        if (user.dietaryProfile[key] && !value) {
          const rating = new Rating({
            userIndex: user.matrixIndex,
            menuIndex: meal.matrixIndex,
            rating: prediction,
          });
          await rating.save();
          break;
        }
        
      }
      const healthInfo = meal.healthInfo;
      for (const [key, value] of Object.entries(healthInfo)) {
        if (user.healthProfile[key] && !value) {
          const rating = new Rating({
            userIndex: user.matrixIndex,
            menuIndex: meal.matrixIndex,
            rating: prediction,
          });
          await rating.save();
          break;
        }
        if (user.recommandations.length < 10) user.recommandations.push(meal);
      }
    }

    user = await user.save();

    // --- Générer le TOKEN JWT FINAL ---
    const token = jwt.sign(
      { userId: user._id },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "30d" }
    );
    console.log(`Token JWT final généré pour ${userId}`);

    // --- Renvoyer la réponse finale avec Token et User ---
    // Copiez/Adaptez la structure de l'objet 'user' renvoyé par votre 'verifyOTP' original
    // pour être cohérent avec ce que le modèle UserModel de Flutter attend.
    res.status(200).json({
      success: true,
      token: token, // Le token final !
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        mobileNumber: user.mobileNumber,
        countryCode: user.countryCode,
        profileImage: user.profileImage,
        isVerified: user.isVerified,
        isMobileVerified: user.isMobileVerified,
        isAdmin: user.isAdmin,
        isRestaurantOwner: user.isRestaurantOwner,
        addresses: user.addresses || [],
        wallet: { balance: user.wallet?.balance ?? 0 },
        favorites: user.favorites || [],
        recommandations: user.recommandations || [],
        dietaryProfile: user.dietaryProfile, // Renvoyer les profils mis à jour
        healthProfile: user.healthProfile,
        // ... autres champs nécessaires pour le modèle UserModel Flutter ...
      },
    });
  } catch (error) {
    console.error("Erreur dans submitPreferences:", error);
    next(error);
  }
};
// --- FIN verifyOTP ---

// --- /api/auth/me (pour checkAuthStatus avec renouvellement) ---
// !! NÉCESSITE un MIDDLEWARE d'authentification JWT avant !!
// Ce middleware doit vérifier le token entrant et attacher l'utilisateur à req.user
// Exemple de middleware (à placer avant cette route):
/*
import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';

export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      req.user = await User.findById(decoded.userId).select('-password'); // Exclure mot de passe si existant
      if (!req.user) throw new Error('User not found');
      next();
    } catch (error) {
      console.error('Not authorized, token failed', error);
      res.status(401).json({ success: false, error: 'Not authorized' });
    }
  }
  if (!token) {
    res.status(401).json({ success: false, error: 'Not authorized, no token' });
  }
};
*/

export const getMyProfile = async (req, res, next) => {
  // req.user est attaché par le middleware 'protect'
  if (!req.user) {
    return res.status(401).json({ success: false, error: "Not authorized" });
  }

  try {
    // L'utilisateur est déjà chargé par le middleware protect,
    // on pourrait le renvoyer directement ou re-fetch si nécessaire.
    // Utilisons req.user pour l'instant.
    const user = req.user;

    // --- Logique de renouvellement du Token (Sliding Session) ---
    const refreshedToken = jwt.sign(
      { userId: user._id },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "30d" }
    );
    console.log(`Token renouvelé pour l'utilisateur ${user._id} lors de /me`);
    // --- Fin Renouvellement ---

    // Renvoyer les données utilisateur et le token rafraîchi
    // Adapter les champs renvoyés pour correspondre à UserModel Flutter
    res.status(200).json({
      // Mettre le token rafraîchi dans le corps (ou un header)
      refreshedToken: refreshedToken, // <-- NOUVEAU TOKEN ICI
      // ... copier/adapter les champs utilisateur depuis verifyOTP ou getUserProfile ...
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      mobileNumber: user.mobileNumber,
      countryCode: user.countryCode,
      profileImage: user.profileImage,
      isVerified: user.isVerified,
      isMobileVerified: user.isMobileVerified,
      isAdmin: user.isAdmin,
      isRestaurantOwner: user.isRestaurantOwner,
      addresses: user.addresses || [],
      wallet: { balance: user.wallet?.balance ?? 0 },
      favorites: user.favorites || [],
      recommandations: user.recommandations || [],
      // etc...
    });
  } catch (error) {
    console.error("Erreur dans getMyProfile:", error);
    next(error);
  }
};
// --- FIN /api/auth/me ---

// --- register (semble OK, mais renvoie un token final direct) ---
// Pourrait être adapté pour envoyer un OTP à l'email ou au mobile si nécessaire
export const register = async (req, res, next) => {
  /* ... code existant ... */
};

// --- getUserProfile (logique intégrée dans getMyProfile maintenant) ---
// export const getUserProfile = async (req, res, next) => { /* ... code existant ... */ };

// --- Helpers (fetchSocialUserInfo, validateSocialUserInfo) ---
// Plus nécessaire pour Google avec idToken. Adaptez pour Facebook si besoin.
// const fetchSocialUserInfo = ...
// const validateSocialUserInfo = ...
