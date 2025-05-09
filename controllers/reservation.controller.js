import { Table } from "../models/table.model.js";
import { Reservation } from "../models/reservation.model.js";
import moment from "moment"; // Pour manipuler les dates/heures

// Fonction utilitaire pour générer une liste de créneaux horaires
// (exemple : de 19h00 à 22h00, tous les 30 minutes)
const generateTimeSlots = (startTime, endTime, intervalMinutes) => {
  const slots = [];
  let currentTime = moment(startTime, "HH:mm");
  const end = moment(endTime, "HH:mm");

  while (currentTime <= end) {
    slots.push(currentTime.format("HH:mm"));
    currentTime.add(intervalMinutes, "minutes");
  }
  return slots;
};

export const getAvailability = async (req, res) => {
  const { date, guests } = req.query; // date au format "YYYY-MM-DD"
  const numericGuests = parseInt(guests, 10);

  if (!date || isNaN(numericGuests) || numericGuests <= 0) {
    return res.status(400).json({
      message:
        "La date et le nombre de personnes sont requis et doivent être valides.",
    });
  }

  try {
    // 1. Trouver les tables de capacité suffisante
    const availableTables = await Table.find({
      capacity: { $gte: numericGuests },
    });

    if (availableTables.length === 0) {
      return res.status(200).json({
        message: "Aucune table disponible pour ce nombre de personnes.",
        availableSlots: [],
      });
    }

    const availableTableIds = availableTables.map((table) => table._id);

    // 2. Générer les créneaux horaires (exemple : 19:00, 19:30, 20:00...)
    const timeSlots = generateTimeSlots("19:00", "22:00", 30); // À adapter à vos horaires

    const availability = [];

    // 3. Vérifier la disponibilité pour chaque créneau
    for (const timeSlot of timeSlots) {
      const startTime = moment(
        `${date} ${timeSlot}`,
        "YYYY-MM-DD HH:mm"
      ).toDate();
      const endTime = moment(startTime).add(30, "minutes").toDate(); // Durée typique d'une réservation

      // Vérifier s'il existe une réservation pour une table adéquate à ce créneau
      const isReserved = await Reservation.exists({
        tableId: { $in: availableTableIds },
        reservationTime: { $lt: endTime, $gte: startTime }, //  Chevauchement
      });

      availability.push({ time: timeSlot, available: !isReserved }); // Disponible si pas de réservation
    }

    res.status(200).json({ availableSlots: availability });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Erreur lors de la récupération des disponibilités.",
      error: error.message,
    });
  }
};

export const createReservation = async (req, res) => {
  const {
    reservationTime,
    guests,
    preSelectedMenu,
    specialRequests,
    paymentMethod,
  } = req.body;
  const userId = req.user._id; // Assurez-vous que l'authentification est en place
  const numericGuests = parseInt(guests, 10);

  if (!reservationTime || isNaN(numericGuests) || numericGuests <= 0) {
    return res.status(400).json({
      message:
        "L'heure de réservation et le nombre de personnes sont requis et doivent être valides.",
    });
  }

  try {
    // 1. Trouver les tables de capacité suffisante
    const availableTables = await Table.find({
      capacity: { $gte: numericGuests },
    });

    if (availableTables.length === 0) {
      return res.status(409).json({
        message: "Aucune table n'est disponible pour ce nombre de personnes.",
      });
    }

    const availableTableIds = availableTables.map((table) => table._id);

    // 2. Trouver une table disponible pour ce créneau
    const availableTable = await Table.findOne({
      _id: { $in: availableTableIds },
      _id: {
        $nin: (
          await Reservation.find({ reservationTime })
        ).map((r) => r.tableId),
      }, // N'est pas réservée
    });

    if (!availableTable) {
      return res.status(409).json({
        message:
          "Toutes les tables adéquates sont déjà réservées pour ce créneau.",
      });
    }

    // 3. Créer la réservation
    const reservation = new Reservation({
      userId: userId,
      tableId: availableTable._id,
      reservationTime: new Date(reservationTime), // S'assurer que c'est bien un objet Date
      guests: numericGuests,
      preSelectedMenu: preSelectedMenu,
      specialRequests: specialRequests,
      paymentMethod: paymentMethod, // <-- AJOUT : Sauvegarder le moyen de paiement
    });

    await reservation.save();

    res
      .status(201)
      .json({ message: "Réservation créée avec succès.", reservation });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Erreur lors de la création de la réservation.",
      error: error.message,
    });
  }
};

export const getReservations = async (req, res) => {
  try {
    // L'ID de l'utilisateur est fourni par le middleware 'protect' via req.user
    const userId = req.user._id;

    if (!userId) {
      // Normalement, 'protect' devrait déjà gérer ça, mais sécurité supplémentaire
      return res.status(401).json({ message: "Utilisateur non authentifié." });
    }

    // Récupérer toutes les réservations pour cet utilisateur
    // Trier par date de réservation la plus récente en premier (descendant)
    const reservations = await Reservation.find({ userId: userId })
      .sort({ reservationTime: -1 }) // Trier par reservationTime descendant
      // --- Options de "Population" (pour obtenir plus de détails) ---
      // Décommentez et adaptez celles dont vous avez besoin côté client
      // .populate({
      //     path: 'tableId', // Nom du champ dans ReservationSchema
      //     // select: 'name capacity', // Champs spécifiques de la table à retourner
      //     // model: 'Table' // Inutile si 'ref' est dans le schéma, mais bonne pratique
      // })
      .populate({
          path: 'preSelectedMenu.menuItemId', // Chemin vers l'ID dans le tableau
          model: 'MenuItem', // Modèle référencé
          select: 'name price image' // Retourner le nom, prix, image du plat (adaptez)
      });
      // .populate('userId', 'name email'); // Si vous voulez les détails de l'user au lieu de juste l'ID

    if (!reservations) {
      // find() retourne un tableau vide si rien n'est trouvé, pas null, donc cette condition est rarement utile
      // sauf si une erreur se produit.
      return res.status(404).json({ message: "Aucune réservation trouvée pour cet utilisateur." });
    }

    console.log(`Récupération de ${reservations.length} réservations pour l'utilisateur ${userId}`);

    res.status(200).json({
      message: "Réservations récupérées avec succès",
      reservations: reservations, // Envoyer le tableau des réservations
      // count: reservations.length // Optionnel: envoyer le nombre
    });

  } catch (error) {
    console.error("Erreur lors de la récupération des réservations:", error);
    res.status(500).json({
      message: "Erreur lors de recherche des réservations.",
      error: error.message,
    });// Passe à votre gestionnaire d'erreur global Express
  }
};