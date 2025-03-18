import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    identifier: {
      type: String,
      // required: true,
      unique: true,
    },
    role: {
      type: String,
      requried: true,
      default: "admin",
    },
    fullName: {
      type: String,
      requried: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    phoneNumber: {
      type: String,
    },
    planType: {
      type: String,
    },
    profilePic: {
      type: String,
    },
    address: { 
        type: String
     },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    isAccountActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const adminModel = mongoose.model("admin", adminSchema);
