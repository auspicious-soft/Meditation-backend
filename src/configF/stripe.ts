import { configDotenv } from 'dotenv';
import Stripe from 'stripe';
configDotenv()

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: '2025-02-24.acacia', // Match your API version
  });
export default stripe
