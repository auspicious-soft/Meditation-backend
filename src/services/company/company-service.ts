import bcrypt from "bcryptjs";
import e, { Response } from "express";
import { errorResponseHandler } from "../../lib/errors/error-response-handler";
import { httpStatusCode } from "../../lib/constant";
import { sendCompanyCreationEmail } from "src/utils/mails/mail";
import { companyModels } from "src/models/company/company-schema";
import { customAlphabet } from "nanoid";
import { queryBuilder } from "src/utils";
import { adminModel } from "src/models/admin/admin-schema";
import { usersModel } from "src/models/user/user-schema";
import stripe from "src/configF/stripe";
import Stripe from "stripe";

const schemas = [adminModel, usersModel, companyModels]; // Add all schemas to the array

export const companyCreateService = async (
  payload: any,
  req: any,
  res: Response
) => {
  const { companyName, email, password } = payload;

  if (
    [companyName, email, password].some(
      (field) => !field || field.trim() === ""
    )
  ) {
    return errorResponseHandler(
      "All fields are required to create a company",
      httpStatusCode.BAD_REQUEST,
      res
    );
  }

  let existingUser = null;
  for (const schema of schemas) {
    existingUser = await (schema as any).findOne({ email });
    if (existingUser) break;
  }

  if (existingUser) {
    return errorResponseHandler("email already exists", httpStatusCode.CONFLICT, res);
  }

  // Check if the company name already exists
  const existingCompanyName = await companyModels.findOne({ companyName });
  if (existingCompanyName) {
    return errorResponseHandler(
      "Company name already exists",
      httpStatusCode.CONFLICT,
      res
    );
  }
  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);
  const identifier = customAlphabet("0123456789", 5);
  // Create a new company
  const newCompany = new companyModels({
    companyName,
    identifier: identifier(),
    email: email.toLowerCase().trim(),
    password: hashedPassword,
  });

  // Save the company to the database
  await newCompany.save();

  // Send email to the company
  await sendCompanyCreationEmail(email, companyName);

  const companyData = newCompany.toObject() as any;
  delete companyData.password;

  return {
    success: true,
    message: "Company created successfully",
    data: companyData,
  };
};

export const getCompaniesService = async (payload: any) => {
  const page = parseInt(payload.page as string) || 1;
  const limit = parseInt(payload.limit as string) || 10;
  const skip = (page - 1) * limit;

  const { query} = queryBuilder(payload, ["companyName", "email"]);
  const companies = await companyModels
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  const totalCompanies = await companyModels.countDocuments(query);

  return {
    success: true,
    data: companies,
    total: totalCompanies,
    page,
    limit,
    statusCode: httpStatusCode.OK,
  };
};

export const updateCompanyService = async (payload: any, req: any, res: Response) => {
  const { companyName, email, password } = payload;

  if (
    [companyName, email, password].some(
      (field) => !field || field.trim() === ""
    )
  ) {
    return errorResponseHandler(
      "All fields are required to update a company",
      httpStatusCode.BAD_REQUEST,
      res
    );
  }

  const existingCompany = await companyModels.findOne({ email });
  // Check if the email exists
  if (!existingCompany) {
    return errorResponseHandler(
      "Company does not exist",
      httpStatusCode.NOT_FOUND,
      res
    );
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Update the company
  const updatedCompany = await companyModels.findOneAndUpdate(
    { email },
    {
      companyName,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
    },
    { new: true }
  );
  
  if (!updatedCompany) {
    return errorResponseHandler(
      "Failed to update the company",
      httpStatusCode.INTERNAL_SERVER_ERROR,
      res
    );
  }

  const companyData = updatedCompany.toObject() as any;
  delete companyData.password;

  return {
    success: true,
    message: "Company updated successfully",
    data: companyData,
    statusCode: httpStatusCode.OK,
  };
};

export const getCompanyByIdService = async (id: string,res:Response) => {
  const company = await companyModels.findById(id);
  if (!company) {
    return errorResponseHandler(
      "Company not found",
      httpStatusCode.NOT_FOUND,
      res
    );
  }

  const companyData = company.toObject() as any;
  delete companyData.password;

  return {
    success: true,
    data: companyData,
    statusCode: httpStatusCode.OK,
  };
}

export const deleteCompanyService = async (id: string, res: Response) => {
  const company = await companyModels.findByIdAndDelete(id);
  if (!company) {
    return errorResponseHandler(
      "Company not found",
      httpStatusCode.NOT_FOUND,
      res
    );
  }

  return {
    success: true,
    message: "Company deleted successfully",
    statusCode: httpStatusCode.OK,
  };
};

export const getCompanyDashboardService = async (id: string, res: Response) => {
  try {
    const company = await companyModels.findById(id);
    if (!company) {
      return errorResponseHandler(
        "Company not found",
        httpStatusCode.NOT_FOUND,
        res
      );
    }

    const companyCustomerId = company.stripeCustomerId;
    if (!companyCustomerId) {
      return errorResponseHandler(
        "Stripe customer ID not found for the company",
        httpStatusCode.BAD_REQUEST,
        res
      );
    }

    // Fetch transactions using the Stripe customer ID
    const companyTransactions = await getSubscriptionsByCustomer(companyCustomerId);
    console.log("companyTransactions: ", companyTransactions);
    const recentUsers = await usersModel.find({companyName:company.companyName}).sort({ createdAt: -1 }).limit(10);
  
    return {
      success: true,
      message: "Company dashboard data fetched successfully",
      data: {
        // company,
        transactions: companyTransactions,  
        recentUsers
      },
      statusCode: httpStatusCode.OK,

    };
  } catch (error) {
    console.error("Error in getCompanyDashboardService:", error);
    return errorResponseHandler(
      "Failed to fetch company dashboard data",
      httpStatusCode.INTERNAL_SERVER_ERROR,
      res
    );
  }
};


// Explicitly define the params type to include 'customer'
interface CustomBalanceTransactionListParams extends Stripe.BalanceTransactionListParams {
  customer?: string; // Add customer as an optional field
}
// export const getSubscriptionsByCustomer = async (
//   customerId: string
// ): Promise<Stripe.Subscription[]> => {
//   console.log('customerId: ', customerId);
//   try {
//     // Define params for listing subscriptions
//     const subscriptionParams: Stripe.SubscriptionListParams = {
//       customer: customerId,
//       limit: 100, // Maximum limit per request
//     };

//     // Fetch initial set of subscriptions
//     const subscriptions = await stripe.subscriptions.list(subscriptionParams);
//     let allSubscriptions: Stripe.Subscription[] = subscriptions.data;

//     // Handle pagination if there are more subscriptions
//     while (subscriptions.has_more) {
//       const nextParams: Stripe.SubscriptionListParams = {
//         customer: customerId,
//         limit: 100,
//         starting_after: allSubscriptions[allSubscriptions.length - 1].id,
//       };
//       const nextSubscriptions = await stripe.subscriptions.list(nextParams);
//       allSubscriptions = [...allSubscriptions, ...nextSubscriptions.data];
//       subscriptions.has_more = nextSubscriptions.has_more;
//     }

//     return allSubscriptions;
//   } catch (error) {
//     console.error('Error fetching subscriptions:', error);
//     throw new Error('Failed to retrieve customer subscriptions');
//   }
// };


export const getSubscriptionsByCustomer = async (
  customerId: string
) => {
  console.log('customerId: ', customerId);
  try {
    // Define params for listing subscriptions
    const subscriptionParams: Stripe.SubscriptionListParams = {
      customer: customerId,
      limit: 100, // Maximum limit per request
      expand: ['data.customer'], // Expand customer data to get email and name
    };

    // Fetch initial set of subscriptions
    const subscriptions = await stripe.subscriptions.list(subscriptionParams);
    let allSubscriptions: Stripe.Subscription[] = subscriptions.data;

    // Handle pagination if there are more subscriptions
    while (subscriptions.has_more) {
      const nextParams: Stripe.SubscriptionListParams = {
        customer: customerId,
        limit: 100,
        starting_after: allSubscriptions[allSubscriptions.length - 1].id,
        expand: ['data.customer'], // Expand customer data in paginated requests
      };
      const nextSubscriptions = await stripe.subscriptions.list(nextParams);
      allSubscriptions = [...allSubscriptions, ...nextSubscriptions.data];
      subscriptions.has_more = nextSubscriptions.has_more;
    }

    // Map subscriptions to the required details
    const subscriptionDetails: any[] = allSubscriptions.map((sub) => {
      // Extract customer data (expanded via 'data.customer')
      const customer = sub.customer as Stripe.Customer | string;
      const customerData: Stripe.Customer | {} = typeof customer === 'string' ? {} : customer;

      return {
        id: sub.id,
        planName: sub.items.data[0]?.plan?.nickname || sub.items.data[0]?.plan?.id || 'Unknown Plan', 
        price: sub.items.data[0]?.plan?.amount ? sub.items.data[0].plan.amount / 100 : null,
        username: 'name' in customerData && customerData.name !== null ? customerData.name : undefined, 
        email: 'email' in customerData && customerData.email !== null ? customerData.email : undefined, 
        purchaseDate: new Date(sub.created * 1000).toISOString(), 
        expiryDate: new Date(sub.current_period_end * 1000).toISOString(),
      };
    });

    return subscriptionDetails;
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    throw new Error('Failed to retrieve customer subscriptions');
  }
};