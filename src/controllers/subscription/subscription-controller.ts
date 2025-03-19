import { Request, Response } from 'express';
import { httpStatusCode } from 'src/lib/constant';
import { errorParser } from 'src/lib/errors/error-response-handler';
import { getAllCouponsService, getAllSubscriptions, getPricesService, getSubscriptionById, updatePricesService } from 'src/services/subscription/subscription-service';

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
      console.log('coupons: ', coupons);
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