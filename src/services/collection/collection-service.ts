import { Request, Response } from "express";
import { bestForModel } from "src/models/bestfor/bestfor-schema";
import { collectionModel } from "src/models/collection/collection-schema";
import { levelModel } from "src/models/level/level-schema";
import { errorResponseHandler } from "../../lib/errors/error-response-handler";
import { httpStatusCode } from "../../lib/constant";
import mongoose from "mongoose";
import { AudioModel } from "src/models/audio/audio-schema";

export const createCollectionService = async (req: Request, res: Response) => {
  const { name, imageUrl, levels, bestFor, description } = req.body;

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

    console.log("Existing levels in DB:", existingLevels.map((lvl) => lvl._id));

    if (existingLevels.length !== levels.length) {
      return errorResponseHandler(
        "One or more selected levels do not exist or are inactive",
        httpStatusCode.BAD_REQUEST,
        res
      );
    }
  }

  // Validate bestFor - Ensure all IDs are valid ObjectIds and exist
  if (bestFor && bestFor.length > 0) {
    // Check if all bestFor IDs are valid ObjectIds
    if (!bestFor.every((id: string) => mongoose.Types.ObjectId.isValid(id))) {
      return errorResponseHandler(
        "One or more provided 'best for' IDs are invalid",
        httpStatusCode.BAD_REQUEST,
        res
      );
    }

    // Check if all bestFor entries exist and are active
    const existingBestFor = await bestForModel.find({
      _id: { $in: bestFor },
      isActive: true,
    });

    console.log("Existing bestFor in DB:", existingBestFor.map((bf) => bf._id));

    if (existingBestFor.length !== bestFor.length) {
      return errorResponseHandler(
        "One or more selected 'best for' tags do not exist or are inactive",
        httpStatusCode.BAD_REQUEST,
        res
      );
    }
  }

  const newCollection = new collectionModel({
    name,
    imageUrl,
    levels: levels || [],
    bestFor: bestFor || [], // Store as an array
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
// Extract pagination parameters from query
const { page = "1", limit = "10" } = req.query;

// Convert page and limit to numbers and ensure they are positive
const pageNumber = Math.max(1, parseInt(page as string, 10));
const limitNumber = Math.max(1, parseInt(limit as string, 10));
const skip = (pageNumber - 1) * limitNumber;

// Get total number of collections
const totalCollections = await collectionModel.countDocuments();

// Fetch paginated collections
const collections = await collectionModel
    .find()
    .populate("levels")
    .populate("bestFor")
    .sort({ createdAt: -1 }) // Sort by createdAt descending
    .skip(skip) // Skip documents for pagination
    .limit(limitNumber); // Limit the number of documents returned

// Add audio count for each collection
const collectionsWithAudioCount = await Promise.all(
    collections.map(async (collection) => {
        const audioCount = await AudioModel.countDocuments({
            collectionType: collection._id,
            isActive: true
        });
        return {
            ...collection.toObject(), // Convert Mongoose document to plain object
            audioCount
        };
    })
);


// Calculate total pages
const totalPages = Math.ceil(totalCollections / limitNumber);

// Return response
return {
    success: true,
    message: "Collections fetched successfully",
    data: {
        collections: collectionsWithAudioCount,
        pagination: {
            total: totalCollections,
            page: pageNumber,
            limit: limitNumber,
            totalPages,
            hasNextPage: pageNumber < totalPages,
            hasPrevPage: pageNumber > 1,
        }
    }
};
}

// export const getAllCollectionsService = async (req: Request, res: Response) => {

//     // const { bestFor, isActive } = req.query;
    
//     // Build filter based on query params
//     // const filter: any = {};
//     // if (bestFor) filter.bestFor = bestFor;
//     // if (isActive !== undefined) filter.isActive = isActive === 'true';   
//     const { page = "1", limit = "10" } = req.query;

//   // Convert page and limit to numbers and ensure they are positive
//   const pageNumber = Math.max(1, parseInt(page as string, 10));
//   const limitNumber = Math.max(1, parseInt(limit as string, 10));
//   const skip = (pageNumber - 1) * limitNumber;
//   const totalCollections = await collectionModel.countDocuments();

//   // Fetch paginated collections
//   const collections = await collectionModel
//     .find()
//     .populate("levels")
//     .populate("bestFor")
//     .sort({ createdAt: -1 }) // Sort by createdAt descending
//     .skip(skip) // Skip documents for pagination
//     .limit(limitNumber); // Limit the number of documents returned

//   // Calculate total pages
//   const totalPages = Math.ceil(totalCollections / limitNumber);

//   return {
//     success: true,
//     message: "Collections fetched successfully",
//     data: {
//       collections,
//       pagination: {
//         total: totalCollections,
//         page: pageNumber,
//         limit: limitNumber,
//         totalPages,
//         hasNextPage: pageNumber < totalPages,
//         hasPrevPage: pageNumber > 1,
//       }

// }}}

export const getCollectionByIdService = async (id: any, res: Response) => {
    
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
  console.log("id:", id);
  const { name, imageUrl, levels, bestFor, description } = req.body;
  console.log("req.body:", req.body);

  // Validate all fields are provided
  if (!name || !imageUrl || !description || !levels || !bestFor) {
    return errorResponseHandler(
      "All fields (name, imageUrl, levels, bestFor, description) are required",
      httpStatusCode.BAD_REQUEST, // Changed to BAD_REQUEST for missing fields
      res
    );
  }

  // Validate collection ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return errorResponseHandler(
      "Invalid collection ID",
      httpStatusCode.BAD_REQUEST,
      res
    );
  }

  // Validate levels
  if (!Array.isArray(levels) || levels.length === 0) {
    return errorResponseHandler(
      "Levels must be a non-empty array",
      httpStatusCode.BAD_REQUEST,
      res
    );
  }

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

  // Validate bestFor
  if (!Array.isArray(bestFor) || bestFor.length === 0) {
    return errorResponseHandler(
      "BestFor must be a non-empty array",
      httpStatusCode.BAD_REQUEST,
      res
    );
  }

  if (!bestFor.every((bestForId: string) => mongoose.Types.ObjectId.isValid(bestForId))) {
    return errorResponseHandler(
      "One or more provided 'best for' IDs are invalid",
      httpStatusCode.BAD_REQUEST,
      res
    );
  }

  const existingBestFor = await bestForModel.find({
    _id: { $in: bestFor },
    isActive: true,
  });

  if (existingBestFor.length !== bestFor.length) {
    return errorResponseHandler(
      "One or more selected 'best for' tags do not exist or are inactive",
      httpStatusCode.BAD_REQUEST,
      res
    );
  }

  // Prepare update object
  const updateData = {
    name,
    imageUrl,
    levels,
    bestFor,
    description,
  };

  // Update the collection using findByIdAndUpdate
  const updatedCollection = await collectionModel.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true } // new: true returns the updated document, runValidators ensures schema validation
  )
    .populate("levels")
    .populate("bestFor");

  if (!updatedCollection) {
    return errorResponseHandler(
      "Collection not found",
      httpStatusCode.NOT_FOUND,
      res
    );
  }

  // Send response with status 200
  return{
    success: true,
    message: "Collection updated successfully",
    data: updatedCollection,
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

export const searchCollectionsService = async (req: any, res: Response) => {

  // Extract query parameters
  const { name, levels, bestFor } = req.query;

  // Initialize query with base filter for active collections
  let query: any = { isActive: true };

  // Handle songName parameter
  if (name) {
      query.name = { $regex: name, $options: 'i' };
  }

  // Handle levels parameter
  if (levels) {
      const levelNames = levels.split(',').map((name: string) => name.trim());
      const levelDocs = await levelModel.find({ 
          name: { $in: levelNames }, 
          isActive: true 
      });
      const levelIds = levelDocs.map(doc => doc._id);
      if (levelIds.length > 0) {
          query.levels = { $in: levelIds };
      } else {
          query._id = null; // No matching levels, return no results
      }
  }

  // Handle bestFor parameter (supports multiple values)
  if (bestFor) {
      const bestForNames = bestFor.split(',').map((name: string) => name.trim());
      const bestForDocs = await bestForModel.find({ 
          name: { $in: bestForNames }, 
          isActive: true 
      });
      const bestForIds = bestForDocs.map(doc => doc._id);
      if (bestForIds.length > 0) {
          query.bestFor = { $in: bestForIds };
      } else {
          query._id = null; // No matching bestFor, return no results
      }
  }

  // Execute query and populate referenced fields
  const collections = await collectionModel.find(query)
      .populate('levels')
      .populate('bestFor');

  // Add audio count for each collection
  const collectionsWithAudioCount = await Promise.all(
      collections.map(async (collection) => {
          const audioCount = await AudioModel.countDocuments({
              collectionType: collection._id,
              isActive: true
          });
          return {
              ...collection.toObject(), // Convert Mongoose document to plain object
              audioCount
          };
      })
  );

  // Return the results
  return{
    success: true,
    message: "Collections fetched successfully",
    data: collectionsWithAudioCount
  };

}