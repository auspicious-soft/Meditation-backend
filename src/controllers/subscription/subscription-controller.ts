import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { httpStatusCode } from 'src/lib/constant';
import { errorParser } from 'src/lib/errors/error-response-handler';
import { afterSubscriptionCreatedService, cancelSubscriptionService, createSubscriptionService, getAllCouponsService, getAllSubscriptions, getPricesService, getSubscriptionById, subscriptionExpireInAWeekService, subscriptionExpireRemainderService, updatePricesService } from 'src/services/subscription/subscription-service';

export const updatePrices = async (req: any, res: Response) => {
  try {
    const { silverPrice, bronzePrice, goldPrice } = req.body;
    const result = await updatePricesService({ silverPrice, bronzePrice, goldPrice });
    res.status(200).json(result);
  } catch (error) {
   const { code, message } = errorParser(error);
       return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
         success: false,
         message: message || "An error occurred while creating the company",
       });
  }
};

export const getPrices = async (req: Request, res: Response) => {
  try {
    const prices = await getPricesService();
    res.status(200).json(prices);
  } catch (error) {
    const { code, message } = errorParser(error);
    return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: message || "An error occurred while creating the company",
    });
  }
};
export const getAllCoupons = async (req: Request, res: Response) => {
    try {
      const coupons = await getAllCouponsService();
      res.status(200).json({
        success: true,
        data: coupons,
        // count: coupons.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving coupons',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  export async function getAllSubscriptionsHandler( res: Response){
    try {
      const subscriptions = await getAllSubscriptions();
      res.status(200).json({
        success: true,
        data: subscriptions,
        count: subscriptions.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving subscriptions',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  
  export async function getSubscriptionByIdHandler(req: Request, res: Response) {
    try {
      const { subscriptionId } = req.params;
      if (!subscriptionId) {
        res.status(400).json({
          success: false,
          message: 'Subscription ID is required',
        });
        return;
      }
      
      const subscription = await getSubscriptionById(subscriptionId);
      res.status(200).json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: 'Subscription not found or error occurred',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  export const subscriptionExpireInAWeek = async (req: Request, res: Response) => {
    try {
      const response = await subscriptionExpireInAWeekService();
      // return res.status(response.httpStatusCode).json(response);
      res.status(200).json({
        success: true,
        data: response,
      });
    } catch (error: any) {
      const { code, message } = errorParser(error);
      return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: message || "An error occurred while retrieving the companies",
      });
    }
  };
  export const createSubscription = async (req: Request, res: Response) => {
    try {
      const response = await createSubscriptionService(req.params, req.body,res);
      // return res.status(response.httpStatusCode).json(response);
      res.status(200).json({
        success: true,
        data: response,
      });
    } catch (error: any) {
      const { code, message } = errorParser(error);
      return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: message || "An error occurred while retrieving the companies",
      });
    }
  };

  // WEBHOOK
export const afterSubscriptionCreated = async (req: Request, res: Response) => {
  const session = await mongoose.startSession()
  session.startTransaction()
  try {
      const response = await afterSubscriptionCreatedService(req, session, res)
      return res.status(httpStatusCode.OK).json(response);
  } catch (error) {
      await session.abortTransaction()
      const { code, message } = errorParser(error);
      return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
  } finally {
      session.endSession()
  }
}
export const cancelSubscription = async (req: Request, res: Response) => {
  try {
      const response = await cancelSubscriptionService( req.params.id, res)
      return res.status(httpStatusCode.CREATED).json(response)
  } catch (error) {
      const { code, message } = errorParser(error)
      return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
  }
}
export const subscriptionExpireRemainder = async (req: Request, res: Response) => {
  try {
      const response = await subscriptionExpireRemainderService(req.params.id, res)
      return res.status(httpStatusCode.OK).json(response)
  } catch (error) {
      const { code, message } = errorParser(error)
      return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
  }
}
