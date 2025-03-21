import { Request, Response } from "express";
import { bestForModel } from "src/models/bestfor/bestfor-schema";
import { collectionModel } from "src/models/collection/collection-schema";
import { levelModel } from "src/models/level/level-schema";
import { errorResponseHandler } from "../../lib/errors/error-response-handler";
import { httpStatusCode } from "../../lib/constant";
import mongoose from "mongoose";
import { AudioModel } from "src/models/audio/audio-schema";

export const createCollectionService = async (req: Request, res: Response) => {
  const { name, imageUrl, levels, bestFor,description } = req.body;

  console.log("Received levels:", levels);
  console.log("Received bestFor:", bestFor);

  // Validate levels - Ensure all IDs are valid ObjectIds
  if (levels && levels.length > 0) {
    if (!levels.every((id: string) => mongoose.Types.ObjectId.isValid(id))) {
      return errorResponseHandler(
        "One or more provided level IDs are invalid",
        httpStatusCode.BAD_REQUEST,
        res
      );
    }

    // Check if levels exist and are active
    const existingLevels = await levelModel.find({
      _id: { $in: levels },
      isActive: true,
    });

    console.log("Existing levels in DB:", existingLevels.map(lvl => lvl._id));

    if (existingLevels.length !== levels.length) {
      return errorResponseHandler(
        "One or more selected levels do not exist or are inactive",
        httpStatusCode.BAD_REQUEST,
        res
      );
    }
  }

  // Validate bestFor - Ensure it exists and is active
  if (bestFor) {
    if (!mongoose.Types.ObjectId.isValid(bestFor)) {
      return errorResponseHandler(
        "Invalid 'best for' ID",
        httpStatusCode.BAD_REQUEST,
        res
      );
    }

    const bestForExists = await bestForModel.findOne({
      _id: bestFor,
      isActive: true,
    });

    console.log("BestFor Exists:", bestForExists);

    if (!bestForExists) {
      return errorResponseHandler(
        "Selected 'best for' tag does not exist or is inactive",
        httpStatusCode.BAD_REQUEST,
        res
      );
    }
  }

  const newCollection = new collectionModel({
    name,
    imageUrl,
    levels: levels || [],
    bestFor,
    description,
  });

  await newCollection.save();

  // Populate the references before returning
  const populatedCollection = await collectionModel
    .findById(newCollection._id)
    .populate("levels")
    .populate("bestFor");

  return {
    success: true,
    message: "Collection created successfully",
    data: populatedCollection,
  };
};

// Get all collections
export const getAllCollectionsService = async (req: Request, res: Response) => {

    // const { bestFor, isActive } = req.query;
    
    // Build filter based on query params
    // const filter: any = {};
    // if (bestFor) filter.bestFor = bestFor;
    // if (isActive !== undefined) filter.isActive = isActive === 'true';
    
    const collections = await collectionModel
      .find()
      .populate("levels")
      .populate("bestFor")
      .sort({ createdAt: -1 });
    
    return {
      success: true,
      message: "Collections fetched successfully",
      count: collections.length,
      data: collections
    };

};

export const getCollectionByIdService = async (req: Request, res: Response) => {

    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHandler(
        "Invalid collection ID",
        httpStatusCode.BAD_REQUEST,
        res
      );
    }
    
    const collection = await collectionModel
      .findById(id)
      .populate("levels")
      .populate("bestFor");
    
    if (!collection) {
      return errorResponseHandler(
        "Collection not found",
        httpStatusCode.NOT_FOUND,
        res
      );
    }   
    return {
      success: true,
      message: "Collection fetched successfully",
      data: collection
    };
};

export const getCollectionWithAudioService = async (req: Request, res: Response) => {

    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHandler(
        "Invalid collection ID",
        httpStatusCode.BAD_REQUEST,
        res
      );
    }
    
    // Find the collection
    const collection = await collectionModel
      .findById(id)
      .populate("levels","name")
      .populate("bestFor","name");
    
    if (!collection) {
      return errorResponseHandler(
        "Collection not found",
        httpStatusCode.NOT_FOUND,
        res
      );
    }
    
    // Find all audio files associated with this collection
    const audioFiles = await AudioModel.find({
      collectionType: id,
    })
      .populate("levels")
      .populate("bestFor")
      .sort({ createdAt: -1 });
    
    // Create response object with collection and its audio files
    const response = {
      collection,
      audioFiles
    };
    
    return{
      success: true,
      message: "Collection with audio files fetched successfully",
      data: response
    };

};

export const updateCollectionService = async (req: Request, res: Response) => {

    const { id } = req.params;
    const { name, image, levels, bestFor, isActive } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHandler(
        "Invalid collection ID",
        httpStatusCode.BAD_REQUEST,
        res
      );
    }
    
    // Find the collection to update
    const collection = await collectionModel.findById(id);
    
    if (!collection) {
      return errorResponseHandler(
        "Collection not found",
        httpStatusCode.NOT_FOUND,
        res
      );
    }
    
    // Validate levels if provided
    if (levels && levels.length > 0) {
      if (!levels.every((levelId: string) => mongoose.Types.ObjectId.isValid(levelId))) {
        return errorResponseHandler(
          "One or more provided level IDs are invalid",
          httpStatusCode.BAD_REQUEST,
          res
        );
      }
      
      const existingLevels = await levelModel.find({
        _id: { $in: levels },
        isActive: true,
      });
      
      if (existingLevels.length !== levels.length) {
        return errorResponseHandler(
          "One or more selected levels do not exist or are inactive",
          httpStatusCode.BAD_REQUEST,
          res
        );
      }
    }
    
    // Validate bestFor if provided
    if (bestFor) {
      if (!mongoose.Types.ObjectId.isValid(bestFor)) {
        return errorResponseHandler(
          "Invalid 'best for' ID",
          httpStatusCode.BAD_REQUEST,
          res
        );
      }
      
      const bestForExists = await bestForModel.findOne({
        _id: bestFor,
        isActive: true,
      });
      
      if (!bestForExists) {
        return errorResponseHandler(
          "Selected 'best for' tag does not exist or is inactive",
          httpStatusCode.BAD_REQUEST,
          res
        );
      }
    }
    
    // Update fields if provided
    if (name) collection.name = name;
    if (image) collection.image = image;
    if (levels) collection.levels = levels;
    if (bestFor !== undefined) collection.bestFor = bestFor;
    if (isActive !== undefined) collection.isActive = isActive;
    
    // Save updates
    await collection.save();
    
    // Populate references
    const updatedCollection = await collectionModel
      .findById(id)
      .populate("levels")
      .populate("bestFor");
    
    return{
      success: true,
      message: "Collection updated successfully",
      data: updatedCollection
    };
};

export const deleteCollectionService = async (req: Request, res: Response) => {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHandler(
        "Invalid collection ID",
        httpStatusCode.BAD_REQUEST,
        res
      );
    }
    
    // Check if collection exists
    const collection = await collectionModel.findById(id);
    
    if (!collection) {
      return errorResponseHandler(
        "Collection not found",
        httpStatusCode.NOT_FOUND,
        res
      );
    }
    
    // Check if there are any audio files associated with this collection
    const associatedAudios = await AudioModel.countDocuments({ collectionType: id });
    
    if (associatedAudios > 0) {
      return errorResponseHandler(
        "Cannot delete collection because it has associated audio files",
        httpStatusCode.BAD_REQUEST,
        res
      );
    }
    
    // Delete collection
    await collectionModel.findByIdAndDelete(id);
    
    return {
      success: true,
      message: "Collection deleted successfully",
      data: null
    };
};

export const getFilteredCollectionsService = async (req: Request, res: Response) => {
  const { bestFor, levels } = req.query;

  // Build filter based on query params
  const filter: any = {};
  if (bestFor) filter.bestFor = { $in: (bestFor as string).split(",") };
  if (levels) filter.levels = { $in: (levels as string).split(",") };

  // Validate ObjectIds in filter
  if (filter.bestFor && !filter.bestFor.$in.every((id: string) => mongoose.Types.ObjectId.isValid(id))) {
    return errorResponseHandler(
      "One or more provided bestFor IDs are invalid",
      httpStatusCode.BAD_REQUEST,
      res
    );
  }
  if (filter.levels && !filter.levels.$in.every((id: string) => mongoose.Types.ObjectId.isValid(id))) {
    return errorResponseHandler(
      "One or more provided level IDs are invalid",
      httpStatusCode.BAD_REQUEST,
      res
    );
  }

  const collections = await collectionModel
    .find(filter)
    .populate("levels")
    .populate("bestFor")
    .sort({ createdAt: -1 });

  return {
    success: true,
    message: "Filtered collections fetched successfully",
    count: collections.length,
    data: collections,
  };
};