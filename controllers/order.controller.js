import { Table } from "../models/table.model.js"
import {Order} from "../models/order.model.js"
import {MenuItem} from "../models/menuItem.model.js"
import {TableSession} from "../models/table-session.model.js"
import { Rating } from "../models/rating.model.js"
import {User} from "../models/user.model.js"

// Create a new order
export const createOrder = async (req, res, next) => {
  try {
    const { userId, items, deliveryAddress, deliveryInstructions, paymentMethod, sessionId, TableId, orderType} =
      req.body

      if (!items || !items.length || !orderType) {
        return res.status(400).json({ message: "Items and order type are required" })
      }
  
      // Validate user if userId is provided
      if (userId) {
        const user = await User.findById(userId)
        if (!user) {
          return res.status(404).json({ message: "User not found" })
        }
      }

    // Calculate order details
    let subtotal = 0
    const orderItems = []
    let paymentStatus = "pending";
    if (paymentMethod==="wallet"  || paymentMethod==="card") {
      paymentStatus = "paid";
    }


    for (const item of items) {
      const { menuItemId, quantity } = item

      if (!menuItemId || !quantity) {
        return res.status(400).json({ message: "Menu item ID and quantity are required for each item" })
      }

      const menuItem = await MenuItem.findById(menuItemId)
      if (!menuItem) {
        return res.status(404).json({ message: `Menu item with ID ${menuItemId} not found` })
      }

      if (!menuItem.isAvailable) {
        return res.status(400).json({ message: `Menu item ${menuItem.name} is not available` })
      }

      // Calculate item total
      const itemPrice = menuItem.price
      const total = itemPrice * quantity
      subtotal += total

      orderItems.push({
        menuItem: menuItemId,
        name: menuItem.name,
        price: itemPrice,
        image: menuItem.image,
        quantity,
        total,
      })
    }

    // Set delivery fee based on order type
    const deliveryFee = orderType === "Delivery" ? 500 : 0
    const total = subtotal + deliveryFee

    // Create the order
    const order = new Order({
      user: userId,
      items: orderItems,
      TableId: TableId || null,
      subtotal,
      deliveryFee,
      total,
      orderType,
      paymentMethod: paymentMethod || "cash",
      paymentStatus: paymentStatus || "pending",
      deliveryAddress: deliveryAddress || {
        address: orderType === "Dine-in" ? "Dine-in" : "Pick up at restaurant",
        apartment: "",
        landmark: "",
        latitude: 0,
        longitude: 0,
      },
      deliveryInstructions: deliveryInstructions || "",
    })

    await order.save()

    // If session ID is provided, add order to the session
    if (sessionId) {
      const session = await TableSession.findById(sessionId)
      if (!session) {
        return res.status(404).json({ message: "Session not found" })
      }

      session.orders.push(order._id)
      await session.save()
    }

    res.status(201).json({
      message: "Order created successfully",
      order: order,
    })
  } catch (error) {
    next(error)
  }
}
export const getMyOrders = async (req, res) => {
  try {
    const userId = req.user._id; // Utilisateur extrait du token JWT

    const orders = await Order.find({ user: userId })
      .sort({ createdAt: -1 }) // Trier par date de création, les plus récentes en premier
      // Les items contiennent déjà les détails dénormalisés (nom, prix).
      // Si vous avez besoin de l'image du menuItem et qu'elle n'est pas dans order.items,
      // vous pourriez envisager de la stocker dans order.items lors de la création de la commande,
      // ou faire une population plus complexe ici si 'menuItem' dans 'items' est juste l'ID.
      // Exemple de population si 'items.menuItem' est un ObjectId et que vous voulez l'image:
      // .populate({
      //   path: 'items.menuItem', // Chemin vers le champ ObjectId dans le sous-document
      //   select: 'name image' // Sélectionner les champs 'name' et 'image' du modèle MenuItem
      // })
      // Cependant, votre schéma 'orderItemSchema' a déjà 'name' et 'price'.
      // Si 'image' est aussi dans 'orderItemSchema' (dénormalisé), pas besoin de populate pour ça.
      .exec();

    // if (!orders || orders.length === 0) { // Retourner une liste vide est souvent préférable à un 404
    //   return res.status(200).json([]);
    // }

    res.status(200).json(orders);

  } catch (error) {
    console.error("Erreur lors de la récupération de mes commandes:", error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des commandes.', error: error.message });
  }
};

// Get order details
export const getOrderDetails = async (req, res, next) => {
  try {
    const { orderId } = req.params

    const order = await Order.findById(orderId).populate("user", "name email phoneNumber").populate({
      path: "items.menuItem",
      select: "name image",
    })

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    res.status(200).json({ order })
  } catch (error) {
    next(error)
  }
}

// Update order status
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params
    const { status } = req.body

    if (!status) {
      return res.status(400).json({ message: "Status is required" })
    }

    const order = await Order.findById(orderId)

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    // Update order status
    order.status = status
    await order.save()

    res.status(200).json({
      message: "Order status updated successfully",
      order: {
        id: order._id,
        status: order.status,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Update payment status
export const updatePaymentStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params
    const { paymentStatus, paymentId } = req.body

    if (!paymentStatus) {
      return res.status(400).json({ message: "Payment status is required" })
    }

    const order = await Order.findById(orderId)

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    // Update payment status
    order.paymentStatus = paymentStatus
    if (paymentId) {
      order.paymentId = paymentId
    }
    await order.save()

    // If this order is part of a session and all orders are paid, update session status
    const session = await TableSession.findOne({ orders: orderId })
    if (session && session.status === "payment_pending") {
      const unpaidOrders = await Order.countDocuments({
        _id: { $in: session.orders },
        paymentStatus: { $ne: "paid" },
      })

      if (unpaidOrders === 0) {
        session.status = "closed"
        session.endTime = new Date()
        await session.save()

        // Update table status
        const table = await Table.findById(session.tableId)
        if (table) {
          table.status = "cleaning"
          table.currentSession = null
          await table.save()
        }
      }
    }

    res.status(200).json({
      message: "Payment status updated successfully",
      order: {
        id: order._id,
        paymentStatus: order.paymentStatus,
        paymentId: order.paymentId,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Get orders by user
export const getOrdersByUser = async (req, res, next) => {
  try {
    const { userId } = req.params
    const { status } = req.query

    const query = { user: userId }
    if (status) {
      query.status = status
    }

    const orders = await Order.find(query)
      .populate("restaurant", "name logo")
      .select("items subtotal total status createdAt")
      .sort({ createdAt: -1 })

    res.status(200).json({ orders })
  } catch (error) {
    next(error)
  }
}

// Remove getOrdersByRestaurant function since we're working with a single restaurant
// export const getOrdersByRestaurant = async (req, res, next) => { ... }

// Get orders by session
export const getOrdersBySession = async (req, res, next) => {
  try {
    const { sessionId } = req.params

    const session = await TableSession.findById(sessionId)
    if (!session) {
      return res.status(404).json({ message: "Session not found" })
    }

    const orders = await Order.find({ _id: { $in: session.orders } })
      .populate({
        path: "items.menuItem",
        select: "name image isVeg",
      })
      .sort({ createdAt: -1 })

    // Calculate session total
    const sessionTotal = orders.reduce((total, order) => total + order.total, 0)

    res.status(200).json({
      sessionId: session._id,
      tableId: session.tableId,
      status: session.status,
      startTime: session.startTime,
      endTime: session.endTime,
      orders,
      sessionTotal,
    })
  } catch (error) {
    next(error)
  }
}

export const submitOrderRatings = async (req, res) => {
  try {
    const userId = req.user.id; // Depuis le middleware d'authentification
    const { orderId } = req.params; 
    const { itemRatings } = req.body; // Attendu comme [{ menuItemId: "...", ratingValue: N }, ...]

    if (!itemRatings || !Array.isArray(itemRatings) || itemRatings.length === 0) {
      return res.status(400).json({ message: "Aucune notation fournie." });
    }

    // 1. Valider la commande et les droits de l'utilisateur
    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) {
       return res.status(403).json({ message: "Commande non trouvée ou accès non autorisé pour noter." });
    }
    // Optionnel: Permettre de noter uniquement les commandes avec un certain statut (ex: "delivered")
    if (order.status !== "delivered") { 
        return res.status(400).json({ message: "Vous ne pouvez noter que les commandes qui ont été livrées." });
    }

    const operationsForRatingCollection = [];
    const itemRatingUpdatesForOrder = new Map(); 

    for (const itemRating of itemRatings) {
      if (!itemRating.menuItemId || typeof itemRating.ratingValue !== 'number' || itemRating.ratingValue < 1 || itemRating.ratingValue > 5) {
        console.warn(`Notation invalide ou menuItemId manquant pour l'article: ${JSON.stringify(itemRating)}. Ignorée.`);
        continue; 
      }
      
      operationsForRatingCollection.push({
        updateOne: {
          filter: { user: userId, menuItem: itemRating.menuItemId },
          update: {
            $set: {
              rating: itemRating.ratingValue,
              source: "manual_order", 
              user: userId,
              menuItem: itemRating.menuItemId,
            },
          },
          upsert: true, 
        },
      });

      itemRatingUpdatesForOrder.set(itemRating.menuItemId.toString(), itemRating.ratingValue);
    }

    if (operationsForRatingCollection.length === 0 && itemRatingUpdatesForOrder.size === 0) {
      return res.status(400).json({ message: "Aucune notation valide fournie." });
    }

    // 2. Mettre à jour la collection globale Rating (pour le système de recommandation)
    if (operationsForRatingCollection.length > 0) {
      await Rating.bulkWrite(operationsForRatingCollection);
      console.log("Notations globales enregistrées/mises à jour dans la collection Rating.");
    }

    // 3. Mettre à jour les notes DANS le document Order lui-même
    let orderItemsUpdatedCount = 0;
    order.items.forEach(item => {
      // Assurez-vous que item.menuItem existe et n'est pas null
      if (item.menuItem) {
        const menuItemIdStr = item.menuItem.toString(); 
        if (itemRatingUpdatesForOrder.has(menuItemIdStr)) {
          // IMPORTANT: Assurez-vous que votre orderItemSchema dans order.model.js
          // a un champ comme 'userRating: { type: Number }'
          item.currentUserRating = itemRatingUpdatesForOrder.get(menuItemIdStr); 
          orderItemsUpdatedCount++;
        }
      }
    });

    if (orderItemsUpdatedCount > 0) {
      // Marquer le tableau 'items' comme modifié est crucial pour Mongoose
      // lorsque l'on modifie des éléments d'un tableau d'objets imbriqués.
      order.markModified('items'); 
      await order.save();
      console.log(`${orderItemsUpdatedCount} article(s) noté(s) dans le document Order ID: ${orderId}`);
    } else {
      console.log(`Aucun article à mettre à jour avec une note dans le document Order ID: ${orderId}. Cela peut arriver si les menuItemId ne correspondent pas ou si les notes sont invalides.`);
    }

    res.status(200).json({ message: "Notations enregistrées avec succès." });

  } catch (error) {
    console.error("Erreur lors de la soumission des notations de commande:", error);
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};