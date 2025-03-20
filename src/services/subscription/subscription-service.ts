import stripe, { Stripe } from "stripe";
import { configDotenv } from "dotenv";
import { timestampToDateString } from "src/utils";
import { subscriptionExpireReminder } from "src/utils/mails/mail";

// Load environment variables
configDotenv();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
	throw new Error("Stripe secret key is not defined");
}

const stripeClient = new stripe(stripeSecretKey, { apiVersion: "2025-02-24.acacia", typescript: true });

// Define TypeScript interfaces for better type safety
interface PriceUpdateRequest {
	silverPrice: number;
	bronzePrice: number;
	goldPrice: number;
}

interface PriceResponse {
	message: string;
	silverPriceId?: string;
	bronzePriceId?: string;
	goldPriceId?: string;
}

interface PriceData {
	id: string;
	unit_amount: number;
	currency: string;
	nickname: string;
}

const silverProductId = process.env.STRIPE_PRODUCT_SILVER_PLAN;
const bronzeProductId = process.env.STRIPE_PRODUCT_BRONZE_PLAN;
const goldProductId = process.env.STRIPE_PRODUCT_GOLD_PLAN;

export const updatePricesService = async (data: PriceUpdateRequest): Promise<PriceResponse> => {
	try {
		// Validate environment variables for product IDs
		if (!silverProductId || !bronzeProductId || !goldProductId) {
			throw new Error("Missing required Stripe product IDs in environment variables");
		}

		// **Update Silver Plan**
		const silverProduct = await stripeClient.products.retrieve(silverProductId);
		let silverPriceId: string | undefined;
		if (silverProduct.default_price) {
			const defaultPrice = await stripeClient.prices.retrieve(silverProduct.default_price as string);
			if (defaultPrice.unit_amount !== data.silverPrice * 100) {
				// Price differs, create a new one and set as default
				const newPrice = await stripeClient.prices.create({
					unit_amount: data.silverPrice * 100,
					currency: "usd",
					product: silverProductId,
					nickname: "Silver Plan",
					recurring: { interval: "month" },
				});
				await stripeClient.products.update(silverProductId, {
					default_price: newPrice.id,
				});
				silverPriceId = newPrice.id;

				// Archive all other active prices
				const prices = await stripeClient.prices.list({ product: silverProductId });
				for (const price of prices.data) {
					if (price.id !== silverPriceId && price.active) {
						await stripeClient.prices.update(price.id, { active: false });
					}
				}
			} else {
				// Price is the same, use the existing default price
				silverPriceId = silverProduct.default_price as string;
			}
		} else {
			// No default price, create a new one and set as default
			const newPrice = await stripeClient.prices.create({
				unit_amount: data.silverPrice * 100,
				currency: "usd",
				product: silverProductId,
				nickname: "Silver Plan",
				recurring: { interval: "month" },
			});
			await stripeClient.products.update(silverProductId, {
				default_price: newPrice.id,
			});
			silverPriceId = newPrice.id;
		}

		// **Update Bronze Plan**
		const bronzeProduct = await stripeClient.products.retrieve(bronzeProductId);
		let bronzePriceId: string | undefined;
		if (bronzeProduct.default_price) {
			const defaultPrice = await stripeClient.prices.retrieve(bronzeProduct.default_price as string);
			if (defaultPrice.unit_amount !== data.bronzePrice * 100) {
				const newPrice = await stripeClient.prices.create({
					unit_amount: data.bronzePrice * 100,
					currency: "usd",
					product: bronzeProductId,
					nickname: "Bronze Plan",
					recurring: { interval: "month" },
				});
				await stripeClient.products.update(bronzeProductId, {
					default_price: newPrice.id,
				});
				bronzePriceId = newPrice.id;

				const prices = await stripeClient.prices.list({ product: bronzeProductId });
				for (const price of prices.data) {
					if (price.id !== bronzePriceId && price.active) {
						await stripeClient.prices.update(price.id, { active: false });
					}
				}
			} else {
				bronzePriceId = bronzeProduct.default_price as string;
			}
		} else {
			const newPrice = await stripeClient.prices.create({
				unit_amount: data.bronzePrice * 100,
				currency: "usd",
				product: bronzeProductId,
				nickname: "Bronze Plan",
				recurring: { interval: "month" },
			});
			await stripeClient.products.update(bronzeProductId, {
				default_price: newPrice.id,
			});
			bronzePriceId = newPrice.id;
		}

		// **Update Gold Plan**
		const goldProduct = await stripeClient.products.retrieve(goldProductId);
		let goldPriceId: string | undefined;
		if (goldProduct.default_price) {
			const defaultPrice = await stripeClient.prices.retrieve(goldProduct.default_price as string);
			if (defaultPrice.unit_amount !== data.goldPrice * 100) {
				const newPrice = await stripeClient.prices.create({
					unit_amount: data.goldPrice * 100,
					currency: "usd",
					product: goldProductId,
					nickname: "Gold Plan",
					recurring: { interval: "month" },
				});
				await stripeClient.products.update(goldProductId, {
					default_price: newPrice.id,
				});
				goldPriceId = newPrice.id;

				const prices = await stripeClient.prices.list({ product: goldProductId });
				for (const price of prices.data) {
					if (price.id !== goldPriceId && price.active) {
						await stripeClient.prices.update(price.id, { active: false });
					}
				}
			} else {
				goldPriceId = goldProduct.default_price as string;
			}
		} else {
			const newPrice = await stripeClient.prices.create({
				unit_amount: data.goldPrice * 100,
				currency: "usd",
				product: goldProductId,
				nickname: "Gold Plan",
				recurring: { interval: "month" },
			});
			await stripeClient.products.update(goldProductId, {
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
		const prices = await stripeClient.prices.list({ limit: 3 });
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
	const coupons = await stripeClient.promotionCodes.list({ limit: 100 });

	return sanitizeCoupons(coupons);
}

async function fetchCustomerDetails(customerId: string) {
	try {
		const customer = await stripeClient.customers.retrieve(customerId);
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
	const defaultSubscriptionList = stripeClient.subscriptions.list({
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
	const subscription = await stripeClient.subscriptions.retrieve(subscriptionId);
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
export async function subscriptionExpireRemainderService() {
	await subscriptionExpireReminder({ name: "John Doe", email: "G9VqE@example.com", expiryDate: "2023-09-30" });
}