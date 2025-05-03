import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema(
    {userIndex: {type: Number, required: true},
    menuIndex: {type: Number, required: true},
    rating: {type: Number, required: true},
    },)

export const Rating = mongoose.model("Rating", ratingSchema)