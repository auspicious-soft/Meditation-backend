import mongoose from "mongoose";

const usersSchema = new mongoose.Schema(
  {
    identifier: {
      type: String,
      // required: true,
      unique: true,
    },
    role: {
      type: String,
      required: true,
      default: "user",
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    companyName: {
      type: String,
      default: null,
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
      default: null,
    },
    gender: {
      type: String,
      default: null,
      required: true,
    },
    dob: {
      type: Date,
      default: null,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    isAccountActive: {
      type: Boolean,
      default: true,
    },
    emailVerified:{
      type: Boolean,
      default: false,
    },
    isVerifiedByCompany:{
      type:Boolean,
      default:false
    }
  },
  { timestamps: true }
);

export const usersModel = mongoose.model("users", usersSchema);
