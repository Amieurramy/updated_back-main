import { Table } from "../models/table.model.js"
import {Order} from "../models/order.model.js"
import {MenuItem} from "../models/menuItem.model.js"
import {TableSession} from "../models/table-session.model.js"
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
      order: {
        id: order._id,
        items: order.items,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        total: order.total,
        status: order.status,
        paymentStatus: order.paymentStatus,
        orderType: order.orderType,
      },
    })
  } catch (error) {
    next(error)
  }
}

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
