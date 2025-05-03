import {MenuItem} from "../models/menuItem.model.js";

// Note: Cloudinary service imports are removed
// import { uploadImage, deleteImage } from "../services/cloudinary.service.js"

// Get all menu items
export const getAllMenuItems = async (req, res, next) => {
  try {
    const menuItems = await MenuItem.find();

    // Format response
    const formattedMenuItems = menuItems.map((item) => ({
      id: item._id,
      name: item.name,
      description: item.description,
      price: item.price,
      image: item.image, // Directly uses the image URL/path stored in the DB
      category: item.category,
      dietaryInfo: item.dietaryInfo,
      healthInfo: item.healthInfo,
      isPopular: item.isPopular,
      preparationTime: item.preparationTime,
    }));

    res.status(200).json({ meals: formattedMenuItems });
  } catch (error) {
    next(error);
  }
};

// Get menu items by category
export const getMenuItemsByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;

    const menuItems = await MenuItem.find({
      category: category,
      isAvailable: true,
    });

    // Format response
    const formattedMenuItems = menuItems.map((item) => ({
      id: item._id,
      name: item.name,
      description: item.description,
      price: item.price,
      image: item.image, // Directly uses the image URL/path stored in the DB
      dietaryInfo: item.dietaryInfo,
      healthInfo: item.healthInfo,
      preparationTime: item.preparationTime,
      isPopular: item.isPopular,
    }));

    res.status(200).json({ menuItems: formattedMenuItems });
  } catch (error) {
    next(error);
  }
};

// Get menu item details
export const getMenuItemDetails = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    const menuItem = await MenuItem.findById(itemId);

    if (!menuItem) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    // Format response
    const formattedMenuItem = {
      id: menuItem._id,
      name: menuItem.name,
      description: menuItem.description,
      price: menuItem.price,
      image: menuItem.image, // Directly uses the image URL/path stored in the DB
      category: menuItem.category,
      dietaryInfo: menuItem.dietaryInfo,
      healthInfo: menuItem.healthInfo,
      preparationTime: menuItem.preparationTime,
      isPopular: menuItem.isPopular,
    };

    res.status(200).json({ menuItem: formattedMenuItem });
  } catch (error) {
    next(error);
  }
};

// Create new menu item
export const createMenuItem = async (req, res, next) => {
  try {
    const {
      name,
      description,
      price,
      category,
      dietaryInfo,
      healthInfo,
      isAvailable,
      isPopular,
      preparationTime,
      image, // Expecting a direct URL/path now
    } = req.body;

    if (!name || !price || !category) {
      return res
        .status(400)
        .json({ message: "Name, price, and category are required" });
    }

    // Removed Cloudinary upload logic. 'image' from req.body is used directly.
    // Ensure that the 'image' value provided in the request is the final URL or path.

    // Create new menu item
    const menuItem = new MenuItem({
      name,
      description,
      price,
      image, // Assign the provided image URL/path
      category,
      dietaryInfo: dietaryInfo || {},
      healthInfo: healthInfo || {},
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      isPopular: isPopular !== undefined ? isPopular : false,
      preparationTime: preparationTime || 15,
    });

    await menuItem.save();

    res.status(201).json({
      message: "Menu item created successfully",
      menuItem: {
        id: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        image: menuItem.image,
        category: menuItem.category,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update menu item
export const updateMenuItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const {
      name,
      description,
      price,
      category,
      dietaryInfo,
      healthInfo,
      isAvailable,
      isPopular,
      preparationTime,
      image, // Expecting a direct URL/path if provided for update
    } = req.body;

    const menuItem = await MenuItem.findById(itemId);

    if (!menuItem) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    // Removed Cloudinary logic (storing old URL, uploading new, deleting old)

    // Update fields if provided
    if (name) {
      menuItem.name = name;
    }
    if (description !== undefined) {
      menuItem.description = description;
    }
    if (price !== undefined) {
      menuItem.price = price;
    }
    if (image !== undefined) {
      // Directly update the image URL/path if provided in the request
      menuItem.image = image;
    }
    if (category) {
      menuItem.category = category;
    }
    if (dietaryInfo) {
      menuItem.dietaryInfo = dietaryInfo;
    }
    if (healthInfo) {
      menuItem.healthInfo = healthInfo;
    }
    if (isAvailable !== undefined) {
      menuItem.isAvailable = isAvailable;
    }
    if (isPopular !== undefined) {
      menuItem.isPopular = isPopular;
    }
    if (preparationTime !== undefined) {
      menuItem.preparationTime = preparationTime;
    }

    await menuItem.save();

    res.status(200).json({
      message: "Menu item updated successfully",
      menuItem: {
        id: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        image: menuItem.image,
        category: menuItem.category,
        isAvailable: menuItem.isAvailable,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Delete menu item
export const deleteMenuItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    const menuItem = await MenuItem.findById(itemId);

    if (!menuItem) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    // Removed Cloudinary image deletion logic.
    // If images need to be deleted from storage (e.g., local disk, S3),
    // that logic would need to be handled separately, possibly using the
    // menuItem.image path before deleting the database record.

    // Delete the menu item from the database
    await MenuItem.findByIdAndDelete(itemId);

    res.status(200).json({
      message: "Menu item deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Get popular menu items
export const getPopularMenuItems = async (req, res, next) => {
  try {
    const popularItems = await MenuItem.find({
      isPopular: true,
      isAvailable: true,
    }).limit(10);

     // Format response (optional, but consistent with others)
    const formattedMenuItems = popularItems.map((item) => ({
      id: item._id,
      name: item.name,
      description: item.description,
      price: item.price,
      image: item.image,
      category: item.category,
      dietaryInfo: item.dietaryInfo,
      healthInfo: item.healthInfo,
      preparationTime: item.preparationTime,
      isPopular: item.isPopular,
    }));


    res.status(200).json({ menuItems: formattedMenuItems }); // Use formatted items
  } catch (error) {
    next(error);
  }
};

// Search menu items
export const searchMenuItems = async (req, res, next) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const menuItems = await MenuItem.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
      ],
      isAvailable: true,
    });

     // Format response (optional, but consistent with others)
    const formattedMenuItems = menuItems.map((item) => ({
      id: item._id,
      name: item.name,
      description: item.description,
      price: item.price,
      image: item.image,
      category: item.category,
      dietaryInfo: item.dietaryInfo,
      healthInfo: item.healthInfo,
      preparationTime: item.preparationTime,
      isPopular: item.isPopular,
    }));


    res.status(200).json({ menuItems: formattedMenuItems }); // Use formatted items
  } catch (error) {
    next(error);
  }
};

// Get menu items by dietary preferences
export const getMenuItemsByDietary = async (req, res, next) => {
  try {
    const { preference } = req.params;

    if (
      !["vegetarian", "vegan", "glutenFree", "lactoseFree"].includes(preference)
    ) {
      return res.status(400).json({ message: "Invalid dietary preference" });
    }

    const query = { isAvailable: true };
    query[`dietaryInfo.${preference}`] = true;

    const menuItems = await MenuItem.find(query);

     // Format response (optional, but consistent with others)
    const formattedMenuItems = menuItems.map((item) => ({
      id: item._id,
      name: item.name,
      description: item.description,
      price: item.price,
      image: item.image,
      category: item.category,
      dietaryInfo: item.dietaryInfo,
      healthInfo: item.healthInfo,
      preparationTime: item.preparationTime,
      isPopular: item.isPopular,
    }));


    res.status(200).json({ menuItems: formattedMenuItems }); // Use formatted items
  } catch (error) {
    next(error);
  }
};

// Get menu items by health preferences
export const getMenuItemsByHealth = async (req, res, next) => {
  try {
    const { preference } = req.params;

    if (
      !["low_carb", "low_fat", "low_sugar", "low_sodium"].includes(preference)
    ) {
      return res.status(400).json({ message: "Invalid health preference" });
    }

    const query = { isAvailable: true };
    query[`healthInfo.${preference}`] = true;

    const menuItems = await MenuItem.find(query);

     // Format response (optional, but consistent with others)
    const formattedMenuItems = menuItems.map((item) => ({
      id: item._id,
      name: item.name,
      description: item.description,
      price: item.price,
      image: item.image,
      category: item.category,
      dietaryInfo: item.dietaryInfo,
      healthInfo: item.healthInfo,
      preparationTime: item.preparationTime,
      isPopular: item.isPopular,
    }));

    res.status(200).json({ menuItems: formattedMenuItems }); // Use formatted items
  } catch (error) {
    next(error);
  }
};

// Get all categories
export const getAllCategories = async (req, res, next) => {
  try {
    // Get distinct categories from menu items
    const categories = await MenuItem.distinct("category", { isAvailable: true }); // Added isAvailable filter

    res.status(200).json({ categories });
  } catch (error) {
    next(error);
  }
};