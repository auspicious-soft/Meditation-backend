import { Request, Response } from "express";
import { httpStatusCode } from "src/lib/constant";
import { errorResponseHandler } from "src/lib/errors/error-response-handler";
import { levelModel } from "src/models/level/level-schema";

const capitalizeFirstLetter = (string: string) => {
  if (!string) return string;
  return string
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const createLevelService = async (req: Request, res: Response) => {
  const { name } = req.body;

  // Check if required fields are provided
  if (!name) {
    return errorResponseHandler(
      "Level name is required",
      httpStatusCode.BAD_REQUEST,
      res
    );
  }

  // Capitalize first letter of name
  const capitalizedName = capitalizeFirstLetter(name);

  const isAvailable = await levelModel.find({
    name: capitalizedName,
    isActive: true,
  })

  if (isAvailable.length > 0) {
    return errorResponseHandler(
      "Level name already exists",
      httpStatusCode.CONFLICT,
      res
    );
  }
  // Create new level
  const newLevel = new levelModel({
    name: capitalizedName,
  });

  // Save to database
  const savedLevel = await newLevel.save();

  return {
    success: true,
    message: "Level created successfully",
    data: savedLevel,
  };
};

export const getAllLevelsService = async (req: Request, res: Response) => {
  const levels = await levelModel.find();
  return {
    success: true,
    message: "Levels fetched successfully",
    data: levels,
  };
};

export const getLevelByIdService = async (req: Request, res: Response) => {
  const { id } = req.params;
  const level = await levelModel.findById(id);
  if (!level) {
    return errorResponseHandler(
      "Level not found",
      httpStatusCode.NOT_FOUND,
      res
    );
  }
  return {
    success: true,
    message: "Level fetched successfully",
    data: level,
  };
};

export const updateLevelService = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;

  if (name) {
    req.body.name = capitalizeFirstLetter(name);
  }

  const updatedLevel = await levelModel.findByIdAndUpdate(
    id,
    { ...req.body },
    { new: true }
  );

  if (!updatedLevel) {
    return errorResponseHandler(
      "Level not while updating found",
      httpStatusCode.NOT_FOUND,
      res
    );
  }

  return {
    success: true,
    message: "Level updated successfully",
    data: updatedLevel,
  };
};

export const deleteLevelService = async (req: Request, res: Response) => {
  const { id } = req.params;
  const deletedLevel = await levelModel.findByIdAndDelete(id);
  if (!deletedLevel) {
    return errorResponseHandler(
      "Level not found",
      httpStatusCode.NOT_FOUND,
      res
    );
  }
  return {
    success: true,
    message: "Level deleted successfully",
  };
};