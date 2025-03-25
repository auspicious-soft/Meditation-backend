import { Console } from "console";
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

configDotenv();

// Define TypeScript interfaces for better type safety
interface PriceUpdateRequest {
	silverPrice: number;
	bronzePrice: number;
	goldPrice: number;
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

const silverProductId = process.env.STRIPE_PRODUCT_SILVER_PLAN;
const bronzeProductId = process.env.STRIPE_PRODUCT_BRONZE_PLAN;
const goldProductId = process.env.STRIPE_PRODUCT_GOLD_PLAN;

export const updatePricesService = async (data: PriceUpdateRequest)=> {
	try {
		// Validate environment variables for product IDs
		if (!silverProductId || !bronzeProductId || !goldProductId) {
			throw new Error("Missing required Stripe product IDs in environment variables");
		}

		// **Update Silver Plan**
		const silverProduct = await stripe.products.retrieve(silverProductId);
		let silverPriceId: string | undefined;
		if (silverProduct.default_price) {
			const defaultPrice = await stripe.prices.retrieve(silverProduct.default_price as string);
			if (defaultPrice.unit_amount !== data.silverPrice * 100) {
				// Price differs, create a new one and set as default
				const newPrice = await stripe.prices.create({
					unit_amount: data.silverPrice * 100,
					currency: "usd",
					product: silverProductId,
					nickname: "Silver Plan",
					recurring: { interval: "month" },
				});
				await stripe.products.update(silverProductId, {
					default_price: newPrice.id,
				});
				silverPriceId = newPrice.id;

				// Archive all other active prices
				const prices = await stripe.prices.list({ product: silverProductId });
				for (const price of prices.data) {
					if (price.id !== silverPriceId && price.active) {
						await stripe.prices.update(price.id, { active: false });
					}
				}
			} else {
				// Price is the same, use the existing default price
				silverPriceId = silverProduct.default_price as string;
			}
		} else {
			// No default price, create a new one and set as default
			const newPrice = await stripe.prices.create({
				unit_amount: data.silverPrice * 100,
				currency: "usd",
				product: silverProductId,
				nickname: "Silver Plan",
				recurring: { interval: "month" },
			});
			await stripe.products.update(silverProductId, {
				default_price: newPrice.id,
			});
			silverPriceId = newPrice.id;
		}

		// **Update Bronze Plan**
		const bronzeProduct = await stripe.products.retrieve(bronzeProductId);
		let bronzePriceId: string | undefined;
		if (bronzeProduct.default_price) {
			const defaultPrice = await stripe.prices.retrieve(bronzeProduct.default_price as string);
			if (defaultPrice.unit_amount !== data.bronzePrice * 100) {
				const newPrice = await stripe.prices.create({
					unit_amount: data.bronzePrice * 100,
					currency: "usd",
					product: bronzeProductId,
					nickname: "Bronze Plan",
					recurring: { interval: "month" },
				});
				await stripe.products.update(bronzeProductId, {
					default_price: newPrice.id,
				});
				bronzePriceId = newPrice.id;

				const prices = await stripe.prices.list({ product: bronzeProductId });
				for (const price of prices.data) {
					if (price.id !== bronzePriceId && price.active) {
						await stripe.prices.update(price.id, { active: false });
					}
				}
			} else {
				bronzePriceId = bronzeProduct.default_price as string;
			}
		} else {
			const newPrice = await stripe.prices.create({
				unit_amount: data.bronzePrice * 100,
				currency: "usd",
				product: bronzeProductId,
				nickname: "Bronze Plan",
				recurring: { interval: "month" },
			});
			await stripe.products.update(bronzeProductId, {
				default_price: newPrice.id,
			});
			bronzePriceId = newPrice.id;
		}

		// **Update Gold Plan**
		const goldProduct = await stripe.products.retrieve(goldProductId);
		let goldPriceId: string | undefined;
		if (goldProduct.default_price) {
			const defaultPrice = await stripe.prices.retrieve(goldProduct.default_price as string);
			if (defaultPrice.unit_amount !== data.goldPrice * 100) {
				const newPrice = await stripe.prices.create({
					unit_amount: data.goldPrice * 100,
					currency: "usd",
					product: goldProductId,
					nickname: "Gold Plan",
					recurring: { interval: "month" },
				});
				await stripe.products.update(goldProductId, {
					default_price: newPrice.id,
				});
				goldPriceId = newPrice.id;

				const prices = await stripe.prices.list({ product: goldProductId });
				for (const price of prices.data) {
					if (price.id !== goldPriceId && price.active) {
						await stripe.prices.update(price.id, { active: false });
					}
				}
			} else {
				goldPriceId = goldProduct.default_price as string;
			}
		} else {
			const newPrice = await stripe.prices.create({
				unit_amount: data.goldPrice * 100,
				currency: "usd",
				product: goldProductId,
				nickname: "Gold Plan",
				recurring: { interval: "month" },
			});
			await stripe.products.update(goldProductId, {
				default_price: newPrice.id,
			});
			goldPriceId = newPrice.id;
		}

		return {
			message: "Prices updated successfully",
			silverPriceId,
			bronzePriceId,
			goldPriceId,
		};
	} catch (error) {
		console.log("Error updating prices:", error);
		throw new Error(`Failed to update prices: ${(error as Error).message}`);
	}
};

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

	return subscriptions;
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

	const expiringSubscriptions = subscriptions.filter((subscription) => {
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



// export const createSubscriptionService = async (id: string, payload: any, res: Response) => {
//     const idempotencyKey = uuidv4()
//     const userId = id
// 	const { planType, interval = 'monthly', email, name }: { planType: keyof typeof planIdsMap; interval?: string; email: string; name: string } = payload
//     if (!planType || !userId) return errorResponseHandler("Invalid request", 400, res)
// 	const isPlanType = (type: string): boolean => ['goldPlan', 'silverPlan','bronzePlan'].includes(type);
// 	if (!isPlanType(planType as string)) return errorResponseHandler("Invalid plan type", 400, res)
//     const planId = planIdsMap[planType]
//     const priceId = (planId as any)[interval as any]
//     if (!priceId) return errorResponseHandler("Invalid interval", 400, res)

//     const user = await companyModels.findById(userId)
//     if (!user) return errorResponseHandler("User not found", 404, res)

//     let customer;
//     if (user.stripeCustomerId == "" || user.stripeCustomerId === null || !user.stripeCustomerId) {
//         customer = await stripe.customers.create({
//             metadata: {
//                 userId,
//             },
//             email: email,
//             name: name
//         })
//         await companyModels.findByIdAndUpdate(userId, { stripeCustomerId: customer.id }, { new: true, upsert: true })
//     }
//     else {
//         customer = await stripe.customers.retrieve(user.stripeCustomerId as string)
//     }
//     try {
//         // Create the subscription directly with payment_behavior set to default_incomplete
//         const subscription: any = await stripe.subscriptions.create({
//             customer: customer.id,
//             items: [{ price: priceId }],
//             payment_behavior: 'default_incomplete',
//             expand: ['latest_invoice.payment_intent'],
//             metadata: { userId: id, idempotencyKey, planType, interval, name, email, planId: priceId },
//         }, {
//             idempotencyKey
//         });

//         // Retrieve the client secret from the payment intent
//         const clientSecret = subscription.latest_invoice.payment_intent.client_secret;

//         return {
//             status: true,
//             clientSecret,
//             subscriptionId: subscription.id
//         }
//     } catch (error) {
//         console.error('Subscription creation error:', error);
//         return errorResponseHandler("Failed to create subscription", 400, res);
//     }
// }

export const createSubscriptionService = async (company: any, payload: any, res: Response) => {
    const idempotencyKey = uuidv4()
    const userId = company.id
    const { planType, interval = 'month', email, name }: { 
        planType: keyof typeof planIdsMap; 
        interval?: string; 
        email: string; 
        name: string 
    } = payload
    
    if (!planType || !userId) return errorResponseHandler("Invalid request", 400, res)
    const isPlanType = (type: string): boolean => ['goldPlan', 'silverPlan', 'bronzePlan'].includes(type);
    if (!isPlanType(planType as string)) return errorResponseHandler("Invalid plan type", 400, res)
    
    const planId = planIdsMap[planType]
    
    // Fetch prices for the plan from Stripe
    let priceId;
    try {
		const prices = await stripe.prices.list({
			product: planId,
			active: true,
			recurring: { interval: interval as 'month' | 'year' }
		});
        
        if (!prices.data.length) {
            return errorResponseHandler("No active prices found for this plan and interval", 400, res);
        }
        
        // Get the first matching price (or you could add more specific filtering)
        priceId = prices.data[0].id;
    } catch (error) {
        console.error('Error fetching prices from Stripe:', error);
        return errorResponseHandler("Failed to fetch plan prices", 400, res);
    }

    const user = await companyModels.findById(userId)
    if (!user) return errorResponseHandler("User not found", 404, res)

    let customer;
    if (!user.stripeCustomerId) {
        customer = await stripe.customers.create({
            metadata: {
                userId,
            },
            email: email,
            name: name
        })
        await companyModels.findByIdAndUpdate(userId, { 
            stripeCustomerId: customer.id 
        }, { 
            new: true, 
            upsert: true 
        })
    } else {
        customer = await stripe.customers.retrieve(user.stripeCustomerId as string)
    }

    try {
        // Create the subscription directly with payment_behavior set to default_incomplete
		const subscription: any = await stripe.subscriptions.create({
			customer: customer.id,
            items: [{ price: priceId }],
			payment_behavior: 'default_incomplete',
            expand: ['latest_invoice.payment_intent'],
            metadata: { userId: company.id, idempotencyKey, planType, interval, name, email, planId: priceId },
        }, {
            idempotencyKey
        });

        // Retrieve the client secret from the payment intent
        const clientSecret = subscription.latest_invoice.payment_intent.client_secret;

        return {
            status: true,
            clientSecret,
            subscriptionId: subscription.id
        }
    } catch (error) {
        console.error('Subscription creation error:', error);
        return errorResponseHandler("Failed to create subscription", 400, res);
    }
}

export const afterSubscriptionCreatedService = async (payload: any, transaction: mongoose.mongo.ClientSession, res: Response<any, Record<string, any>>) => {
    const sig = payload.headers['stripe-signature'];
	console.log('sig: ', sig);
    let checkSignature: Stripe.Event;
    try {
        checkSignature = stripe.webhooks.constructEvent(payload.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET as string);
    } catch (err: any) {
        console.log(`❌ Error message: ${err.message}`);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return
    }
    const event = payload.body

   
    if (event.type === 'payment_intent.succeeded') {
		console.log('payment_intent.succeeded: ');
        let paymentIntent = event.data.object as Stripe.PaymentIntent;
        const invoiceId = paymentIntent.invoice as string;
		console.log('invoiceId: ', invoiceId);
        if (!invoiceId) {
            console.log('No invoice ID found in payment intent');
            return;
        }

        // Fetch the invoice to get subscription ID
        const invoice = await stripe.invoices.retrieve(invoiceId);
        const subscriptionId = invoice.subscription as string;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
		console.log('subscription: ', subscription);
        const { userId, planType, interval } = subscription.metadata;
		console.log('planType: ', planType);
        const user = await companyModels.findById(userId);
        if (!user) return errorResponseHandler('User or customer ID not found', 404, res);

        if (user.subscriptionId && user.subscriptionId !== subscriptionId) {
            try {
                await stripe.subscriptions.cancel(user.subscriptionId as string)
            } catch (error) {
                console.error('Error cancelling old subscription:', error)
            }
        }
        await companyModels.findByIdAndUpdate(userId, {
            planType,
            planInterval: interval,
            subscriptionId: subscriptionId, 
			subscriptionStatus: subscription.status,
			subscriptionExpiryDate: timestampToDateString(subscription.current_period_end),
		    subscriptionStartDate: timestampToDateString(subscription.current_period_start),
        })
        return {
            success: true,
            message: 'Subscription created successfully'
        }
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
                }, { new: true })
        }
        else {
            await companyModels.findOneAndUpdate({ stripeCustomerId: customerId },
                {
					subscriptionId: null,
					subscriptionStatus: subscription.status,
					subscriptionExpiryDate: timestampToDateString(subscription.current_period_end),
		            subscriptionStartDate: timestampToDateString(subscription.current_period_start),
                }, { new: true })
        }
        return {
            success: true,
            message: 'Subscription renewed successfully'
        }

    }
    if (event.type === 'promotion_code.created') {
		console.log('event.type: ', event.type);
		
        const couponDetails = event.data.object;
		console.log('invoice: ', couponDetails);
		const { code, coupon,customer,expires_at } = couponDetails
		console.log('code, coupon,customer: ', code, coupon,customer);
		const userDetails = await companyModels.findOne({ stripeCustomerId: customer })
		if (!userDetails) return errorResponseHandler('User or customer ID not found', 404, res);
		console.log('userDetails: ', userDetails);
		if (userDetails) {
			const expiryDate =expires_at !==null ?timestampToDateString(expires_at as number) : null;
			console.log('coupon?.expires_at: ', coupon?.expires_at);
			await sendPromoCodeEmail(userDetails.email, userDetails?.companyName, code, coupon.percent_off, expiryDate || undefined);
		} else {
			console.error("User details not found for the given customer.");
		}
		// await 
		// console.log('invoice: ', invoice);
        // const { customer: customerId, subscription: subscriptionId } = invoice

        // const subscription = await stripe.subscriptions.retrieve(subscriptionId as string)
        // const metadata = subscription.metadata
        // if (!subscription) return errorResponseHandler('Subscription not found', 404, res)

        // const customer = await stripe.customers.retrieve(customerId as string)
        // if (!customer) return errorResponseHandler('Customer not found', 404, res)

        // if (subscription.status === 'active') {
        //     await companyModels.findOneAndUpdate({ stripeCustomerId: customerId },
        //         {
        //             subscriptionId: subscriptionId,
		// 			subscriptionStatus: subscription.status,
		// 			subscriptionExpiryDate: timestampToDateString(subscription.current_period_end),
		// 			subscriptionStartDate: timestampToDateString(subscription.current_period_start),
        //         }, { new: true })
        // }
        // else {
        //     await companyModels.findOneAndUpdate({ stripeCustomerId: customerId },
        //         {
		// 			subscriptionId: null,
		// 			subscriptionStatus: subscription.status,
		// 			subscriptionExpiryDate: timestampToDateString(subscription.current_period_end),
		//             subscriptionStartDate: timestampToDateString(subscription.current_period_start),
        //         }, { new: true })
        // }
        return {
            success: true,
            message: 'Subscription renewed successfully'
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

export const cancelSubscriptionService = async (id: string,  res: Response) => {
    const user = await companyModels.findById(id)
    if (!user) return errorResponseHandler("User not found", 404, res)

    const subscription = await stripe.subscriptions.retrieve(user.subscriptionId as string)
    if (!subscription) return errorResponseHandler("Subscription not found", 404, res)

    if (subscription.status === 'canceled') return errorResponseHandler("Subscription already cancelled", 400, res)
    if (subscription.id !== user.subscriptionId) return errorResponseHandler("Invalid subscription ID", 400, res)

    await stripe.subscriptions.cancel(subscription.id as string)
    await companyModels.findByIdAndUpdate(id,
        {
            planOrSubscriptionId: null,
            planInterval: null, 
			planType: null,
			subscriptionStatus: "canceled",
			subscriptionExpiryDate: null,
			subscriptionStartDate: null
        },
        { new: true })

    return {
        success: true,
        message: "Your subscription has been cancelled"
    }
}