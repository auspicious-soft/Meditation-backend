import { Request, Response } from "express";
import { httpStatusCode } from "src/lib/constant";
import { errorResponseHandler } from "src/lib/errors/error-response-handler";
import { bestForModel } from "src/models/bestfor/bestfor-schema";


const capitalizeFirstLetter = (string: string): string => {
  if (!string) return string;
  return string.charAt(0).toUpperCase() + string.slice(1);
};

export const createBestForService = async(req: Request,res: Response)=>{
  const { name } = req.body;
   // Check if required fields are provided
    if (!name) {
      return errorResponseHandler(
        "name name is required",
        httpStatusCode.BAD_REQUEST,
        res
      );
    }
    
    // Capitalize first letter of name
    const capitalizedName = capitalizeFirstLetter(name);
    const isAvailable = await bestForModel.find({
      name: capitalizedName
    })
    if (isAvailable.length > 0) {
      return errorResponseHandler(
        "BestFor name already exists",
        httpStatusCode.CONFLICT,
        res
      );
    }
    
    // Create new level
    const newLevel = new bestForModel({
      name: capitalizedName
    });
    
    // Save to database
    const savedLevel = await newLevel.save();
    
    return {
      success: true,
      message: "BestFor created successfully",
      data: savedLevel
    };
}

export const getAllBestForService = async (req: Request, res: Response) => {
 
    const bestForList = await bestForModel.find();
    return {
      success: true,
      message: "BestFor fetched successfully",
      data: bestForList,
    };
};

export const getBestForByIdService = async (req: Request, res: Response) => {
  
    const { id } = req.params;
    const bestFor = await bestForModel.findById(id);
    if (!bestFor) {
      return errorResponseHandler("BestFor not found", httpStatusCode.NOT_FOUND, res);
    }
    return {
      success: true,
      message: "BestFor fetched successfully",
      data: bestFor,
    };

};

export const updateBestForService = async (req: Request, res: Response) => {
 
    const { id } = req.params;
    const { name } = req.body;

    if (name) {
      req.body.name = capitalizeFirstLetter(name);
    }

    const updatedBestFor = await bestForModel.findByIdAndUpdate(
      id,
      { ...req.body },
      { new: true }
    );

    if (!updatedBestFor) {
      return errorResponseHandler("BestFor not found", httpStatusCode.NOT_FOUND, res);
    }

    return {
      success: true,
      message: "BestFor updated successfully",
      data: updatedBestFor,
    };
};

export const deleteBestForService = async (req: Request, res: Response) => {
    const { id } = req.params;
    const deletedBestFor = await bestForModel.findByIdAndDelete(id);
    if (!deletedBestFor) {
      return errorResponseHandler("BestFor not found", httpStatusCode.NOT_FOUND, res);
    }
    return {
      success: true,
      message: "BestFor deleted successfully",
    };
};