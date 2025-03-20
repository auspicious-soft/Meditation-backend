import mongoose, { Schema, Document } from "mongoose";
import { subscriptionExpireInAWeek } from 'src/controllers/subscription/subscription-controller';

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
    subscriptionStatus: {
      type: String,
      default: "inactive",
    },
    subscriptionId: {
      type: String,
      default: null,
    },
    subscriptionStartDate: {
      type: Date,
      default: null,
    },
    subscriptionExpiryDate: {
      type: Date,
      default: null,
    },
    role: {
      type: String,
      required: true,
      default: "company",
    },
    planInterval: {
      type: String,
      default: null,
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
