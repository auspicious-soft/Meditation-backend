import { Request, Response } from "express"
import { httpStatusCode } from "src/lib/constant"
import { errorParser } from "src/lib/errors/error-response-handler"
import { createLevelService, deleteLevelService, getAllLevelsService, getLevelByIdService, updateLevelService } from "src/services/level/level-service"

export const createLevel = async (req: Request, res: Response) =>{
  try {
     const response: any = await createLevelService(req, res)
            return res.status(httpStatusCode.CREATED).json(response)
  } catch (error) {
      const { code, message } = errorParser(error)
          return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" })
    }
}

export const getAllLevels = async (req: Request, res: Response) => {
    try {
      const response: any = await getAllLevelsService(req, res);
      return res.status(httpStatusCode.OK).json(response);
    } catch (error) {
      const { code, message } = errorParser(error);
      return res
        .status(code || httpStatusCode.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: message || "An error occurred" });
    }
  };
  
  // Get Level by ID
  export const getLevelById = async (req: Request, res: Response) => {
    try {
      const response: any = await getLevelByIdService(req, res);
      return res.status(httpStatusCode.OK).json(response);
    } catch (error) {
      const { code, message } = errorParser(error);
      return res
        .status(code || httpStatusCode.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: message || "An error occurred" });
    }
  };
  
  // Update Level
  export const updateLevel = async (req: Request, res: Response) => {
    try {
      const response: any = await updateLevelService(req, res);
      return res.status(httpStatusCode.OK).json(response);
    } catch (error) {
      const { code, message } = errorParser(error);
      return res
        .status(code || httpStatusCode.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: message || "An error occurred" });
    }
  };
  
  // Delete Level
  export const deleteLevel = async (req: Request, res: Response) => {
    try {
      const response: any = await deleteLevelService(req, res);
      return res.status(httpStatusCode.OK).json(response);
    } catch (error) {
      const { code, message } = errorParser(error);
      return res
        .status(code || httpStatusCode.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: message || "An error occurred" });
    }
  };