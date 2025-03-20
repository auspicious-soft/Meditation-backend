import mongoose, { Schema, Document } from "mongoose";

const CompanySchema = new Schema(
  {
    identifier: {
      type: String,
      // required: true,
      unique: true,
    },
    stripeCustomerId: {
      type: String,
      default: null,
    },
    planId: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      required: true,
      default: "company",
    },
    planType: {
      type: String,
      default: null,
    },
    companyName: {
      type: String,
      required: true,
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
      default: true,
    }
  },
  { timestamps: true }
);

export const companyModels = mongoose.model("companies", CompanySchema);
