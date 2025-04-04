import { configDotenv } from "dotenv";
import { Response } from "express";
import mongoose from "mongoose";
import stripe from "src/configF/stripe";
import { httpStatusCode, planIdsMap } from "src/lib/constant";
import { errorResponseHandler } from "src/lib/errors/error-response-handler";
import { companyModels } from "src/models/company/company-schema";
import { timestampToDateString } from "src/utils";
import { sendPromoCodeEmail, subscriptionExpireReminder } from "src/utils/mails/mail";
import Stripe from "stripe";
import { v4 as uuidv4 } from 'uuid';
import { number } from "zod";

configDotenv();

// Define TypeScript interfaces for better type safety
interface PriceUpdateRequest {
	monthlyPrice: number;
	yearlyPrice: number;
	lifeTimePrice: number;
}
interface PriceIdConfig {
    stayRooted: {
        week: string;
    };
    glowUp: {
        week: string;
        month: string;
    };
}
const priceIds: PriceIdConfig = {
    stayRooted: {
        week: process.env.STRIPE_PRICE_STAY_ROOTED as string,
    },
    glowUp: {
        week: process.env.STRIPE_PRICE_GLOW_UP as string,
        month: process.env.STRIPE_PRICE_GLOW_UP_MONTHLY as string,
    }
}

// const silverProductId = process.env.STRIPE_PRODUCT_SILVER_PLAN;
// const bronzeProductId = process.env.STRIPE_PRODUCT_BRONZE_PLAN;
// const goldProductId = process.env.STRIPE_PRODUCT_GOLD_PLAN;
const monthlyProductId = process.env.STRIPE_PRODUCT_MONTHLY_PLAN;
const yearlyProductId = process.env.STRIPE_PRODUCT_YEARLY_PLAN;
const lifeTimeProductId = process.env.STRIPE_PRODUCT_LIFETIME_PLAN;


  export const getAllProductsForCompanyService = async (company: any, filter?: string) => {
	const companyId = company.currentUser;
  
	try {
	  const products: any[] = [];
  
	  // Determine the active status based on the filter query
	  let activeFilter: boolean | undefined;
	  if (filter === "active") {
		activeFilter = true;
	  } else if (filter === "archived") {
		activeFilter = false;
	  } else if (filter && filter !== "all") {
		throw new Error("Invalid filter value. Use 'active', 'archived', or 'all'.");
	  }
  
	  // Fetch products from Stripe with the specified filter
	  const stripeProducts = stripe.products.list({
		limit: 100,
		active: activeFilter, // undefined fetches both active and inactive
	  });
  
	  let productCount = 0;
  
	  for await (const product of stripeProducts) {
		productCount++;
		// console.log(`Processing product ${productCount}:`, product.id);
  
		// Fetch associated prices for each product
		const prices = await stripe.prices.list({
		  product: product.id,
		  limit: 10, // Limit prices per product
		});
  
		products.push({
		  id: product.id,
		  name: product.name,
		  description: product.description || undefined,
		  active: product.active,
		  created: timestampToDateString(product.created),
		  updated: product.updated ? timestampToDateString(product.updated) : undefined,
		  metadata: product.metadata,
		  prices: prices.data.map(price => ({
			id: price.id,
			active: price.active,
			unit_amount: price.unit_amount || 0,
			currency: price.currency,
			recurring: price.recurring
			  ? {
				  interval: price.recurring.interval,
				  interval_count: price.recurring.interval_count,
				}
			  : undefined,
		  })),
		});
	  }
  
	  // If companyId is provided, fetch company details and add currentPlan to the matching product
	  if (companyId) {
		const companyDetails = await companyModels.find({
		  _id: companyId,
		});
  
		if (!companyDetails) {
		  throw new Error("Company not found");
		}
  
		const companyPlanType = companyDetails[0]?.planType; // e.g., "goldPlan"
		console.log('companyPlanType: ', companyPlanType);
		const subscriptionExpiryDate = companyDetails[0]?.subscriptionExpiryDate; // e.g., "2025-04-20T11:07:47.000Z"
		const subscriptionId = companyDetails[0]?.subscriptionId; // e.g., "2025-04-20T11:07:47.000Z"
  
		const planTypeToProductName: { [key: string]: string } = {
			monthly: "Monthly",
			yearly: "Yearly",
			lifetime: "Lifetime",
		  };
		const expectedProductName = planTypeToProductName[companyPlanType?.toLowerCase()];
		console.log('expectedProductName: ', expectedProductName);
  
		// Find the product that matches the company's planType and add currentPlan to it
		products.forEach((product: any) => {
		  if (product.name === expectedProductName) {
			product.currentPlan = {
			  name: product.name,
			  id: product.id,
			  expiryDate: subscriptionExpiryDate,
			  subscriptionId: subscriptionId,
			};
		  }
		});
	  }
  
	  return {
		success: true,
		count: products.length,
		products: products,
	  };
	} catch (error) {
	//   console.error("Error fetching products:", error);
	  throw new Error(`Failed to fetch products: ${(error as Error).message}`);
	}
  };

export const getAllProductsService = async (filter?: string) => {
    try {
        const products: any[] = [];
        
        // Determine the active status based on the filter query
        let activeFilter: boolean | undefined;
        if (filter === "active") {
            activeFilter = true;
        } else if (filter === "archived") {
            activeFilter = false;
        } else if (filter && filter !== "all") {
            throw new Error("Invalid filter value. Use 'active', 'archived', or 'all'.");
        }
        // If filter is "all" or undefined, activeFilter remains undefined to fetch all products

        // Fetch products from Stripe with the specified filter
        const stripeProducts = stripe.products.list({
            limit: 100,
            active: activeFilter // undefined fetches both active and inactive
        });

        let productCount = 0;

        for await (const product of stripeProducts) {
            productCount++;
            // console.log(`Processing product ${productCount}:`, product.id);

            // Fetch associated prices for each product
            const prices = await stripe.prices.list({
                product: product.id,
                limit: 10 // Limit prices per product
            });

            products.push({
                id: product.id,
                name: product.name,
                description: product.description || undefined,
                active: product.active,
                created: timestampToDateString(product.created),
                updated: product.updated ? timestampToDateString(product.updated) : undefined,
                metadata: product.metadata,
                prices: prices.data.map(price => ({
                    id: price.id,
                    active: price.active,
                    unit_amount: price.unit_amount || 0,
                    currency: price.currency,
                    recurring: price.recurring ? {
                        interval: price.recurring.interval,
                        interval_count: price.recurring.interval_count
                    } : undefined
                }))
            });
        }

        return {
            success: true,
            count: products.length,
            products: products
        };
    } catch (error) {
        console.error("Error fetching products:", error);
        throw new Error(`Failed to fetch products: ${(error as Error).message}`);
    }
};


interface ProductUpdateRequest {
	productId: string; // e.g., "prod_S49Zb6vQYcT0lY"
	description: string; // New description for the product
	price: number; // New price in dollars (e.g., 19.99)
  }
  
  export const updatePricesService = async (data: ProductUpdateRequest) => {
	try {
	  // Retrieve the existing product
	  const product = await stripe.products.retrieve(data.productId);
	  console.log('product: ', product);
  
	  // Update the product description
	  await stripe.products.update(data.productId, {
		description: data.description,
	  });
  
	  let priceId: string | undefined;
  
	  // Check if the product has a default price
	  if (product.default_price) {
		const defaultPrice = await stripe.prices.retrieve(product.default_price as string);
  
		// Compare the existing price with the new price (convert to cents)
		if (defaultPrice.unit_amount !== data.price * 100) {
		  // Price differs, create a new price and set it as default
		  const newPrice = await stripe.prices.create({
			unit_amount: data.price * 100, // Convert to cents
			currency: "usd",
			product: data.productId,
			nickname: product.name || "Updated Plan", // Use existing product name or a default
			// recurring: defaultPrice.recurring || undefined, // Preserve recurring settings if they exist
		  });
  
		  // Set the new price as the default
		  await stripe.products.update(data.productId, {
			default_price: newPrice.id,
		  });
		  priceId = newPrice.id;
  
		  // Archive all other active prices
		  const prices = await stripe.prices.list({ product: data.productId });
		  for (const price of prices.data) {
			if (price.id !== priceId && price.active) {
			  await stripe.prices.update(price.id, { active: false });
			}
		  }
		} else {
		  // Price is the same, keep the existing price
		  priceId = product.default_price as string;
		}
	  } else {
		// No default price exists, create a new one
		const newPrice = await stripe.prices.create({
		  unit_amount: data.price * 100,
		  currency: "usd",
		  product: data.productId,
		  nickname: product.name || "Updated Plan",
		  recurring: { interval: "month" }, // Default to monthly; adjust as needed
		});
  
		// Set the new price as the default
		await stripe.products.update(data.productId, {
		  default_price: newPrice.id,
		});
		priceId = newPrice.id;
	  }
  
	  return {
		message: "Product description and price updated successfully",
		productId: data.productId,
		priceId,
	  };
	} catch (error) {
	  console.log("Error updating product:", error);
	  throw new Error(`Failed to update product: ${(error as Error).message}`);
	}
  };


// export const updatePricesService = async (data: PriceUpdateRequest)=> {
// 	// console.log('data: ', data);
// 	try {
// 		// Validate environment variables for product IDs
// 		if ( !monthlyProductId || !yearlyProductId || !lifeTimeProductId) {
// 			throw new Error("Missing required Stripe product IDs in environment variables");
// 		}

// 		// **Update Silver Plan**
// 		const monthlyProduct = await stripe.products.retrieve(monthlyProductId);
// 		let monthlyPriceId: string | undefined;
// 		if (monthlyProduct.default_price) {
// 			const defaultPrice = await stripe.prices.retrieve(monthlyProduct.default_price as string);
// 			if (defaultPrice.unit_amount !== data.monthlyPrice * 100) {
// 				// Price differs, create a new one and set as default
// 				const newPrice = await stripe.prices.create({
// 					unit_amount: data.monthlyPrice * 100,
// 					currency: "usd",
// 					product: monthlyPriceId,
// 					nickname: "Monthly Plan",
// 					recurring: { interval: "month" },
// 				});
// 				await stripe.products.update(monthlyProductId, {
// 					default_price: newPrice.id,
// 				});
// 				monthlyPriceId = newPrice.id;

// 				// Archive all other active prices
// 				const prices = await stripe.prices.list({ product: monthlyProductId });
// 				for (const price of prices.data) {
// 					if (price.id !== monthlyPriceId && price.active) {
// 						await stripe.prices.update(price.id, { active: false });
// 					}
// 				}
// 			} else {
// 				// Price is the same, use the existing default price
// 				monthlyPriceId = monthlyProduct.default_price as string;
// 			}
// 		} else {
// 			// No default price, create a new one and set as default
// 			const newPrice = await stripe.prices.create({
// 				unit_amount: data.monthlyPrice * 100,
// 				currency: "usd",
// 				product: monthlyProductId,
// 				nickname: "Monthly Plan",
// 				recurring: { interval: "month" },
// 			});
// 			await stripe.products.update(monthlyProductId, {
// 				default_price: newPrice.id,
// 			});
// 			monthlyPriceId = newPrice.id;
// 		}

// 		// **Update Bronze Plan**
// 		const bronzeProduct = await stripe.products.retrieve(yearlyProductId);
// 		let yearlyPriceId: string | undefined;
// 		if (bronzeProduct.default_price) {
// 			const defaultPrice = await stripe.prices.retrieve(bronzeProduct.default_price as string);
// 			if (defaultPrice.unit_amount !== data.yearlyPrice * 100) {
// 				const newPrice = await stripe.prices.create({
// 					unit_amount: data.yearlyPrice * 100,
// 					currency: "usd",
// 					product: yearlyProductId,
// 					nickname: "Yearly Plan",
// 					recurring: { interval: "month" },
// 				});
// 				await stripe.products.update(yearlyProductId, {
// 					default_price: newPrice.id,
// 				});
// 				yearlyPriceId = newPrice.id;

// 				const prices = await stripe.prices.list({ product: yearlyProductId });
// 				for (const price of prices.data) {
// 					if (price.id !== yearlyPriceId && price.active) {
// 						await stripe.prices.update(price.id, { active: false });
// 					}
// 				}
// 			} else {
// 				yearlyPriceId = bronzeProduct.default_price as string;
// 			}
// 		} else {
// 			const newPrice = await stripe.prices.create({
// 				unit_amount: data.yearlyPrice * 100,
// 				currency: "usd",
// 				product: yearlyProductId,
// 				nickname: "Bronze Plan",
// 				recurring: { interval: "month" },
// 			});
// 			await stripe.products.update(yearlyProductId, {
// 				default_price: newPrice.id,
// 			});
// 			yearlyPriceId = newPrice.id;
// 		}

// 		// **Update Gold Plan**
// 		const lifeTimeProduct = await stripe.products.retrieve(lifeTimeProductId);
// 		let lifeTimePriceId: string | undefined;
// 		if (lifeTimeProduct.default_price) {
// 			const defaultPrice = await stripe.prices.retrieve(lifeTimeProduct.default_price as string);
// 			if (defaultPrice.unit_amount !== data.lifeTimePrice * 100) {
// 				const newPrice = await stripe.prices.create({
// 					unit_amount: data.lifeTimePrice * 100,
// 					currency: "usd",
// 					product: lifeTimeProductId,
// 					nickname: "LifeTime Plan",
// 					recurring: { interval: "month" },
// 				});
// 				await stripe.products.update(lifeTimeProductId, {
// 					default_price: newPrice.id,
// 				});
// 				lifeTimePriceId = newPrice.id;

// 				const prices = await stripe.prices.list({ product: lifeTimeProductId });
// 				for (const price of prices.data) {
// 					if (price.id !== lifeTimePriceId && price.active) {
// 						await stripe.prices.update(price.id, { active: false });
// 					}
// 				}
// 			} else {
// 				lifeTimePriceId = lifeTimeProduct.default_price as string;
// 			}
// 		} else {
// 			const newPrice = await stripe.prices.create({
// 				unit_amount: data.lifeTimePrice * 100,
// 				currency: "usd",
// 				product: lifeTimeProductId,
// 				nickname: "LifeTime Plan",
// 				recurring: { interval: "month" },
// 			});
// 			await stripe.products.update(lifeTimeProductId, {
// 				default_price: newPrice.id,
// 			});
// 			lifeTimePriceId = newPrice.id;
// 		}

// 		return {
// 			message: "Prices updated successfully",
// 			lifeTimePriceId,
// 			yearlyPriceId,
// 			monthlyPriceId,
// 		};
// 	} catch (error) {
// 		console.log("Error updating prices:", error);
// 		throw new Error(`Failed to update prices: ${(error as Error).message}`);
// 	}
// };

export const getPricesService = async () => {
	try {
		const prices = await stripe.prices.list({ limit: 3 });
		return prices.data.map((price) => ({
			id: price.id,
			unit_amount: price.unit_amount ?? 0,
			currency: price.currency,
			nickname: price.nickname ?? "",
		}));
	} catch (error) {
		console.log("Error fetching prices:", error);
		throw new Error(`Failed to fetch prices: ${(error as Error).message}`);
	}
};

export async function getAllCouponsService() {
	// const coupons: any = [];
	const sanitizeCoupons = (coupons: any) => {
		const sanitized = coupons;
		delete sanitized.object;
		delete sanitized.has_more;
		delete sanitized.url;
		return sanitized;
	};
	const coupons = await stripe.promotionCodes.list({ limit: 100 });

	return sanitizeCoupons(coupons);
}

async function fetchCustomerDetails(customerId: string) {
	try {
		const customer = await stripe.customers.retrieve(customerId);
		return {
			id: customer.id,
        //to avoid type error as  Response<Customer | DeletedCustomer>, which means it can be either a Customer or a DeletedCustomer. However, the metadata property does not exist on the DeletedCustomer type.
			name: "deleted" in customer ? undefined : customer.name ?? undefined,
			email: "deleted" in customer ? undefined : customer.email ?? undefined,
			description: "deleted" in customer ? undefined : customer.description ?? undefined,
			phone: "deleted" in customer ? undefined : customer.phone ?? undefined,
			metadata: "deleted" in customer ? undefined : customer.metadata,
		};
	} catch (error) {
		console.error(`Error fetching customer ${customerId}:`, error);
		throw new Error(`Failed to fetch customer ${customerId} from Stripe`);
	}
}

export async function getAllSubscriptions() {
	const subscriptions: any[] = [];
	const defaultSubscriptionList = stripe.subscriptions.list({
		limit: 100,
	});

	let defaultCount = 0;
	for await (const subscription of defaultSubscriptionList) {
		defaultCount++;
		console.log(`Processing subscription ${defaultCount} (No Test Clock):`, subscription.id);

		// Fetch customer details
		const customerDetails = await fetchCustomerDetails(subscription.customer as string);

		subscriptions.push({
			id: subscription.id,
			customer: subscription.customer as string,
			customerDetails, // Add customer details
			status: subscription.status,
			plans: subscription.items.data.map((item) => ({
				id: item.plan?.id,
				amount: item.plan?.amount || 0,
				interval: item.plan?.interval,
			})),
			current_period_end: timestampToDateString(subscription.current_period_end),
			created: timestampToDateString(subscription.created),
			canceled_at: subscription.canceled_at ? timestampToDateString(subscription.canceled_at) : undefined,
		});
	}

	return {
		success: true,
		subscriptions
	};
}

export async function getSubscriptionById(subscriptionId: string) {
	const subscription = await stripe.subscriptions.retrieve(subscriptionId);
	// Fetch customer details
	const customerDetails = await fetchCustomerDetails(subscription.customer as string);

	return {
		id: subscription.id,
		customer: subscription.customer as string,
		customerDetails, // Add customer details
		status: subscription.status,
		plans: subscription.items.data.map((item) => ({
			id: item.plan?.id,
			amount: item.plan?.amount || 0,
			interval: item.plan?.interval,
		})),
		current_period_end: subscription.current_period_end,
		created: subscription.created,
		canceled_at: subscription.canceled_at || undefined,
	};
}

export async function subscriptionExpireInAWeekService() {
	const subscriptions = await getAllSubscriptions();

	const expiringSubscriptions = subscriptions.subscriptions.filter((subscription: any) => {
		const currentPeriodEnd = subscription.current_period_end;

		if (!currentPeriodEnd) {
			return false;
		}

		const expirationDate = new Date(currentPeriodEnd * 1000);
		const today = new Date();

		// Set both expirationDate and today to midnight (removing time part)	
		expirationDate.setHours(0, 0, 0, 0);
		today.setHours(0, 0, 0, 0);

		return expirationDate.getTime() - today.getTime() <= 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
	});

	return expiringSubscriptions;
}
export async function subscriptionExpireRemainderService(id: string, res: Response) {
	const company = await companyModels.findById(id)
	if (company) {
		await subscriptionExpireReminder({ name: company.companyName, email: company.email, expiryDate: company.subscriptionExpiryDate, planType: company.planType });
		return{
			status:true,
			message:"Reminder sent successfully"
		}
	} else {
		return errorResponseHandler("Company not found", httpStatusCode.NOT_FOUND, res)
	}
}


const fetchAllInvoices = async (customerId: string) => {
    let allInvoices: any[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
        const invoices = await stripe.invoices.list({
            customer: customerId,
            limit: 100,
            starting_after: startingAfter,
            expand: ['data.charge', 'data.lines']
        });

        allInvoices = allInvoices.concat(invoices.data);
        hasMore = invoices.has_more;
        startingAfter = invoices.data[invoices.data.length - 1]?.id;
    }
    return allInvoices;
};

export const getCompanyTransactionsService = async (company: any, res: Response) => {
	    const userId = company.currentUser;
    // try {
        // Find user
        const user = await companyModels.find({ _id: userId });
        if (!user || user.length === 0) {
            return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);
        }

        const stripeCustomerId = user[0].stripeCustomerId as string;
        if (!stripeCustomerId) {
            return errorResponseHandler("No Stripe customer ID found for user", httpStatusCode.BAD_REQUEST, res);
        }
    const invoices = await fetchAllInvoices(stripeCustomerId);

    // Filter only paid invoices
    const completedInvoices = invoices
        .filter(invoice => invoice.status === 'paid')
        .map(invoice => ({
            transactionId:  invoice.id, // Use charge ID if available, else fallback to invoice ID
            planType: invoice.lines?.data[0]?.plan?.nickname || invoice.lines?.data[0]?.description || 'Unknown Plan', // Plan Name
            purchaseDate: new Date(invoice.created * 1000).toISOString(), // Purchase Date
            transactionAmount: invoice.amount_paid ? (invoice.amount_paid / 100).toFixed(2) : '0.00' // Amount in dollars
        }));

    return {success: true, data: completedInvoices};
};

// export const createSubscriptionService = async (company: any, payload: any, res: Response) => {

// 	const idempotencyKey = uuidv4();
// 	const userId = company.id;
// 	const { planType, interval = 'month', email, name }: { 
// 	  planType: keyof typeof planIdsMap; 
// 	  interval?: string; 
// 	  email: string; 
// 	  name: string 
// 	} = payload;
  
// 	// Validate inputs
// 	if (!planType || !userId) return errorResponseHandler("Invalid request", httpStatusCode.BAD_REQUEST, res);
// 	const isPlanType = (type: string): boolean => ['goldPlan', 'silverPlan', 'bronzePlan'].includes(type);
// 	if (!isPlanType(planType as string)) return errorResponseHandler("Invalid plan type", httpStatusCode.BAD_REQUEST, res);
  
// 	const planId = planIdsMap[planType];
  
// 	// Fetch prices for the plan from Stripe
// 	let priceId;
// 	try {
// 	  const prices = await stripe.prices.list({
// 		product: planId,
// 		active: true,
// 		recurring: { interval: interval as 'month' | 'year' },
// 	  });
  
// 	  if (!prices.data.length) {
// 		return errorResponseHandler("No active prices found for this plan and interval", httpStatusCode.BAD_REQUEST, res);
// 	  }
  
// 	  // Get the first matching price (or you could add more specific filtering)
// 	  priceId = prices.data[0].id;
// 	} catch (error) {
// 	  console.error('Error fetching prices from Stripe:', error);
// 	  return errorResponseHandler("Failed to fetch plan prices", httpStatusCode.BAD_REQUEST, res);
// 	}
  
// 	// Fetch the user
// 	const user = await companyModels.findById(userId);
// 	if (!user) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);
  
// 	// Create or retrieve Stripe customer
// 	let customer;
// 	console.log('customer: ', customer);
// 	if (!user.stripeCustomerId) {
// 		customer = await stripe.customers.create({
// 			metadata: {
// 				userId,
// 			},
// 			email: email,
// 			name: name,
// 	  });
// 	  await companyModels.findByIdAndUpdate(
// 		  userId,
// 		{ stripeCustomerId: customer.id },
// 		{ new: true, upsert: true }
// 	);
// 	} else {
// 	  customer = await stripe.customers.retrieve(user.stripeCustomerId as string);
// 	}
// 	console.log('customer: ', customer);
  
// 	try {
// 	  // Create a Stripe Checkout session
// 	  const session = await stripe.checkout.sessions.create(
// 		{
// 		  customer: customer.id,
// 		  line_items: [
// 			{
// 			  price: priceId, // Use the fetched priceId // PRICE DATA
// 			  quantity: 1,
// 			},
// 		  ],
// 		  mode: 'subscription',
// 		  success_url: process.env.STRIPE_FRONTEND_SUCCESS_CALLBACK as string, // e.g., "https://yourdomain.com/success"
// 		  cancel_url: process.env.STRIPE_FRONTEND_CANCEL_CALLBACK as string, // e.g., "https://yourdomain.com/cancel"
// 		  metadata: {
// 			userId,
// 			planType,
// 			idempotencyKey,
// 			interval,
// 			name,
// 			customerId: customer.id,
// 			email,
// 		  },
// 		  subscription_data: {
// 			metadata: {
// 			  userId,
// 			  planType,
// 			  idempotencyKey,
// 			  interval,
// 			  name,
// 			  email,
// 			  customerId: customer.id,
// 			},
// 		  },
// 		},
// 		{
// 		  idempotencyKey, // Pass idempotency key to Stripe
// 		}
// 	  );
  
// 	  return {
// 		id: session.id,
// 		success: true,
// 	  };
// 	} catch (error) {
// 	  console.error('Error creating checkout session:', error);
// 	  return errorResponseHandler("Failed to create subscription", httpStatusCode.BAD_REQUEST, res);
// 	}
//   };

// export const createSubscriptionService = async (company: any, payload: any, res: Response) => {
// 	const idempotencyKey = uuidv4();
// 	const userId = company.id;
// 	const { 
// 	  planType, 
// 	  interval = 'month', 
// 	  email, 
// 	  name, 
// 	  numberOfUsers,
// 	  price, // Add price to the payload
	  
	
// 	}: { 
// 	  planType: keyof typeof planIdsMap; 
// 	  interval?: string; 
// 	  email: string; 
// 	  name: string; 
// 	  price: number; // Price from frontend
// 	  numberOfUsers?: number; // Optional numberOfUsers property
// 	} = payload;
// 	console.log('payload: ', payload);

// 	// Validate inputs
// 	if (!planType || !userId || !price) 
// 	  return errorResponseHandler("Invalid request: planType, userId, and price are required", httpStatusCode.BAD_REQUEST, res);
	
// 	const isPlanType = (type: string): boolean => ['monthly', 'yearly', 'lifetime'].includes(type);
// 	if (!isPlanType(planType as string)) 
// 	  return errorResponseHandler("Invalid plan type", httpStatusCode.BAD_REQUEST, res);
  
// 	// Validate price
// 	if (typeof price !== 'number' || price <= 0) 
// 	  return errorResponseHandler("Invalid price: must be a positive number", httpStatusCode.BAD_REQUEST, res);
  
// 	const planId = planIdsMap[planType];
  
// 	// Fetch the user
// 	const user = await companyModels.findById(userId);
// 	if (!user) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);
  
// 	// Create or retrieve Stripe customer
// 	let customer;
// 	console.log('customer: ', customer);
// 	if (!user.stripeCustomerId) {
// 	  customer = await stripe.customers.create({
// 		metadata: {
// 		  userId,
// 		},
// 		email: email,
// 		name: name,
// 	  });
// 	  await companyModels.findByIdAndUpdate(
// 		userId,
// 		{ stripeCustomerId: customer.id },
// 		{ new: true, upsert: true }
// 	  );
// 	} else {
// 	  customer = await stripe.customers.retrieve(user.stripeCustomerId as string);
// 	}
// 	console.log('customer: ', customer);
  
// 	try {
// 	  // Create a Stripe Checkout session with custom price
// 	  const session = await stripe.checkout.sessions.create(
// 		{
// 		  customer: customer.id,
// 		  line_items: [
// 			{
// 			  price_data: {
// 				currency: 'usd', // Adjust currency as needed
// 				product: planId, // Use the product ID from planIdsMap
// 				unit_amount: Math.round(price * 100), // Convert to cents (Stripe expects integers)
// 				recurring: {
// 				  interval: interval as 'month' | 'year', // Match the interval from payload
// 				},
// 			  },
// 			  quantity: 1,
// 			},
// 		  ],
// 		  mode: 'subscription',
// 		  success_url: process.env.STRIPE_FRONTEND_SUCCESS_CALLBACK as string,
// 		  cancel_url: process.env.STRIPE_FRONTEND_CANCEL_CALLBACK as string,
// 		  allow_promotion_codes: true,
// 		  metadata: {
// 			userId,
// 			planType,
// 			idempotencyKey,
// 			interval,
// 			name,
// 			customerId: customer.id,
// 			email,
// 			numberOfUsers: numberOfUsers ?? null,
// 		  },
// 		  subscription_data: {
// 			metadata: {
// 			  userId,
// 			  planType,
// 			  idempotencyKey,
// 			  interval,
// 			  name,
// 			  email,
// 			  customerId: customer.id,
// 			  numberOfUsers: numberOfUsers ?? null,
// 			},
// 		  },
// 		},
// 		{
// 		  idempotencyKey, // Pass idempotency key to Stripe
// 		}
// 	  );
  
// 	  return {
// 		id: session.id,
// 		success: true,
// 	  };
// 	} catch (error) {
// 	  console.error('Error creating checkout session:', error);
// 	  return errorResponseHandler("Failed to create subscription", httpStatusCode.BAD_REQUEST, res);
// 	}
//   };


export const createSubscriptionService = async (company: any, payload: any, res: Response) => {
	const idempotencyKey = uuidv4();
	const userId = company.id;
	const { 
	  planType, 
	  interval = 'month', 
	  email, 
	  name, 
	  numberOfUsers,
	  price,
	}: { 
	  planType: keyof typeof planIdsMap; 
	  interval?: string; 
	  email: string; 
	  name: string; 
	  price: number;
	  numberOfUsers?: number;
	} = payload;
	console.log('payload: ', payload);
  
	// Validate inputs
	if (!planType || !userId || !price) 
	  return errorResponseHandler("Invalid request: planType, userId, and price are required", httpStatusCode.BAD_REQUEST, res);
	
	const isPlanType = (type: string): boolean => ['monthly', 'yearly', 'lifetime'].includes(type);
	if (!isPlanType(planType as string)) 
	  return errorResponseHandler("Invalid plan type", httpStatusCode.BAD_REQUEST, res);
	
	if (typeof price !== 'number' || price <= 0) 
	  return errorResponseHandler("Invalid price: must be a positive number", httpStatusCode.BAD_REQUEST, res);
	
	const planId = planIdsMap[planType];
	console.log('planId:', planId); // Debug: Verify planId is correct
  
	if (!planId) 
	  return errorResponseHandler("Invalid plan type: No matching product ID found", httpStatusCode.BAD_REQUEST, res);
  
	// Fetch the user
	const user = await companyModels.findById(userId);
	if (!user) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);
	
	// Create or retrieve Stripe customer
	let customer;
	console.log('customer: ', customer);
	if (!user.stripeCustomerId) {
	  customer = await stripe.customers.create({
		metadata: { userId },
		email: email,
		name: name,
	  });
	  await companyModels.findByIdAndUpdate(
		userId,
		{ stripeCustomerId: customer.id },
		{ new: true, upsert: true }
	  );
	} else {
	  customer = await stripe.customers.retrieve(user.stripeCustomerId as string);
	}
	console.log('customer: ', customer);
	
	try {
	  const isRecurring = interval !== 'lifetime';
	  console.log('isRecurring: ', isRecurring);
  
	  const session = await stripe.checkout.sessions.create(
		  {
			  customer: customer.id,
			  line_items: [
				  {
					  price_data: {
						  currency: 'usd',
						  product: planId, // Use the predefined product ID
						  unit_amount: Math.round(price * 100), // Custom price from payload
						  ...(isRecurring && {
							  recurring: {
								  interval: interval as 'month' | 'year',
								},
							}),
						},
						quantity: 1,
					},
				],
				mode: isRecurring ? 'subscription' : 'payment',
				success_url: process.env.STRIPE_FRONTEND_SUCCESS_CALLBACK as string,
				cancel_url: process.env.STRIPE_FRONTEND_CANCEL_CALLBACK as string,
				allow_promotion_codes: true,
				metadata: {
					userId,
					planType,
					idempotencyKey,
					interval,
					name,
					customerId: customer.id,
					email,
					numberOfUsers: numberOfUsers ?? null,
				},
				...(isRecurring && {
					subscription_data: {
						metadata: {
							userId,
							planType,
				idempotencyKey,
				interval,
				name,
				email,
				customerId: customer.id,
				numberOfUsers: numberOfUsers ?? null,
			  },
			},
		}),
	},
	{ idempotencyKey }
);
console.log('session: ', session);
	
	  return {
		id: session.id,
		success: true,
	  };
	} catch (error) {
	  console.error('Error creating checkout session:', error);
	  return errorResponseHandler("Failed to create subscription", httpStatusCode.BAD_REQUEST, res);
	}
  };

export const afterSubscriptionCreatedService = async (payload: any, transaction: mongoose.mongo.ClientSession, res: Response<any, Record<string, any>>) => {
    const sig = payload.headers['stripe-signature'];
	console.log('sig: ', sig);
    let checkSignature: Stripe.Event;
	console.log("hello there after webhook");
    try {
        checkSignature = stripe.webhooks.constructEvent(payload.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET as string);
    } catch (err: any) {
        console.log(`❌ Error message: ${err.message}`);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return
    }
    const event = payload.body


	if (event.type === 'payment_intent.succeeded' || event.type === 'checkout.session.completed') {
		console.log('checkout.session.completed: ');
		const session = event.data.object as Stripe.Checkout.Session;
		console.log('session: ', session);
		const subscriptionId = session.subscription as string;
		if (!subscriptionId) {
		  console.log('No subscription ID found in checkout session');
		  return;
		}
	
		// Fetch the subscription to get metadata
		const subscription = await stripe.subscriptions.retrieve(subscriptionId);
		console.log('subscription: ', subscription);
		const { userId, planType, interval ,numberOfUsers} = subscription.metadata;
		console.log('numberOfUsers: ', numberOfUsers);
		console.log('planType: ', planType);
	
		// Fetch the user
		const user = await companyModels.findById(userId);
		if (!user) return errorResponseHandler('User or customer ID not found', 404, res);
	
		// Cancel any existing subscription if it exists and is different from the new one
		if (user.subscriptionId && user.subscriptionId !== subscriptionId) {
		  try {
			console.log(`Canceling existing subscription: ${user.subscriptionId}`);
			await stripe.subscriptions.cancel(user.subscriptionId as string);
		  } catch (error) {
			console.error('Error cancelling old subscription:', error);
		  }
		}
	
		// Update the user with the new subscription details
		await companyModels.findByIdAndUpdate(userId, {
		  planType,
		  planInterval: interval,
		  subscriptionId: subscriptionId,
		  subscriptionStatus: subscription.status,
		  subscriptionExpiryDate: timestampToDateString(subscription.current_period_end),
		  subscriptionStartDate: timestampToDateString(subscription.current_period_start),
		  numUsersForPlan: numberOfUsers,
		});
	
		return {
		  success: true,
		  message: 'Subscription created successfully',
		};
	  }
    if (event.type === 'invoice.payment_succeeded') {
        const invoice = event.data.object as Stripe.Invoice;
        const { customer: customerId, subscription: subscriptionId } = invoice

        const subscription = await stripe.subscriptions.retrieve(subscriptionId as string)
        const metadata = subscription.metadata
        if (!subscription) return errorResponseHandler('Subscription not found', 404, res)

        const customer = await stripe.customers.retrieve(customerId as string)
        if (!customer) return errorResponseHandler('Customer not found', 404, res)

        if (subscription.status === 'active') {
            await companyModels.findOneAndUpdate({ stripeCustomerId: customerId },
                {
                    subscriptionId: subscriptionId,
					subscriptionStatus: subscription.status,
					subscriptionExpiryDate: timestampToDateString(subscription.current_period_end),
					subscriptionStartDate: timestampToDateString(subscription.current_period_start),
					numUsersForPlan: metadata.numberOfUsers,
                }, { new: true })
        }
        else {
            await companyModels.findOneAndUpdate({ stripeCustomerId: customerId },
                {
					subscriptionId: null,
					subscriptionStatus: subscription.status,
					subscriptionExpiryDate: timestampToDateString(subscription.current_period_end),
		            subscriptionStartDate: timestampToDateString(subscription.current_period_start),
					numUsersForPlan: metadata.numberOfUsers,
                }, { new: true })
        }
        return {
            success: true,
            message: 'Subscription renewed successfully'
        }

    }
    if (event.type === 'promotion_code.created') {		
        const couponDetails = event.data.object;
		const { code, coupon,customer,expires_at } = couponDetails
		const userDetails = await companyModels.findOne({ stripeCustomerId: customer })
		if (!userDetails) return errorResponseHandler('User or customer ID not found', 404, res);
		if (userDetails) {
			const expiryDate =expires_at !==null ? timestampToDateString(expires_at as number) : null;
			await sendPromoCodeEmail(userDetails.email, userDetails?.companyName, code, coupon.percent_off, expiryDate || undefined);
		} else {
			console.error("User details not found for the given customer.");
		}
		
        return {
            success: true,
            message: 'Promo code sent successfully'
        }

    }
    if (event.type === 'payment_intent.canceled' || event.type === 'payment_intent.payment_failed') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const { customer: customerId } = paymentIntent
        const user = await companyModels.findOne({ stripeCustomerId: customerId })
        if (!user) return errorResponseHandler('User not found', 404, res)
        return { success: false, message: 'Payment failed or was canceled' }
    }

    if (event.type === 'invoice.payment_failed') {
        const invoice = event.data.object as Stripe.Invoice
        const { customer: customerId, subscription: subscriptionId } = invoice
        const subscription = await stripe.subscriptions.retrieve(subscriptionId as string)
        if (!subscription) return errorResponseHandler('Subscription not found', 404, res)

        const customer = await stripe.customers.retrieve(customerId as string)
        if (!customer) return errorResponseHandler('Customer not found', 404, res)

        // Cancel the subscription in Stripe
        await stripe.subscriptions.cancel(subscriptionId as string)

        // Update the user record
        await companyModels.findOneAndUpdate({ stripeCustomerId: customerId },
            {
                subscriptionId: null,
                planInterval: null,
				subscriptionExpiryDate: null,
				subscriptionStartDate: null,
                planType: null
            },
            { new: true }
        )

        return {
            success: true,
            message: "Subscription canceled due to failed payment"
        }
    }
}

export const cancelSubscriptionService = async (company: any,  res: Response) => {
    const user = await companyModels.findById(company.currentUser)
    if (!user) return errorResponseHandler("User not found", 404, res)

    const subscription = await stripe.subscriptions.retrieve(user.subscriptionId as string)
    if (!subscription) return errorResponseHandler("Subscription not found", 404, res)

    if (subscription.status === 'canceled') return errorResponseHandler("Subscription already cancelled", 400, res)
    if (subscription.id !== user.subscriptionId) return errorResponseHandler("Invalid subscription ID", 400, res)

    await stripe.subscriptions.cancel(subscription.id as string)
    await companyModels.findByIdAndUpdate(company.currentUser,
        {
            subscriptionId: null,
            planInterval: "", 
			planType: "",
			subscriptionStatus: "canceled",
			subscriptionExpiryDate: null,
			subscriptionStartDate: null,
																																				
        },
        { new: true })

    return {
        success: true,
        message: "Your subscription has been cancelled"
    }
}