import { Request, Response } from "express";
import { httpStatusCode } from "src/lib/constant";
import { errorParser } from "src/lib/errors/error-response-handler";
import {  UserAudioHistoryService } from "src/services/useraudiohistory/useraudiohistory-service";


export const UserAudioHistory = async (req: Request, res: Response) => {
  try {
    const response = await UserAudioHistoryService(req, res);
    return res.status(httpStatusCode.CREATED).json(response)
  } catch (error: any) {
    const { code, message } = errorParser(error);
    return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: message || "An error occurred while creating the company",
    });
  }
};

// export const getUserAudioHistory = async (req: Request, res: Response) => {
//   try {
//     const response = await getUserAudioHistoryService(req, res);
//     return res.status(httpStatusCode.CREATED).json(response)
//   } catch (error: any) {
//     const { code, message } = errorParser(error);
//     return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
//       success: false,
//       message: message || "An error occurred while creating the company",
//     });
//   }
// };
