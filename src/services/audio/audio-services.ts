import { Request, Response } from "express";
import mongoose, { isValidObjectId } from "mongoose";
import { deleteFileFromS3 } from "src/configF/s3";
import { httpStatusCode } from "src/lib/constant";
import { errorResponseHandler } from "src/lib/errors/error-response-handler";
import { AudioModel } from "src/models/audio/audio-schema";
import { bestForModel } from "src/models/bestfor/bestfor-schema";
import { collectionModel } from "src/models/collection/collection-schema";
import { levelModel } from "src/models/level/level-schema";
import { userAudioHistoryModel } from "src/models/useraudiohistory/user-audio-history";
import { queryBuilder } from "src/utils";

const capitalizeFirstLetter = (string: string) => {
  if (!string) return string;
  return string
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const uploadAudioService = async(req : Request, res : Response)=>{
  const { songName, collectionType, audioUrl, imageUrl, duration, description, levels, bestFor } = req.body;
    
    // Validate required fields
    if (!songName || !collectionType || !audioUrl || !imageUrl || !duration || !description || !levels || !bestFor) {
      return errorResponseHandler(
        "All Fields are required to upload audio",
        httpStatusCode.BAD_REQUEST,
        res
      );
    }

    // Validate duration format (HH:mm:ss)
    if (duration) {
      const durationRegex = /^(\d{1,3}):([0-5][0-9]):([0-5][0-9])$/;
      if (!durationRegex.test(duration)) {
        return errorResponseHandler(
          "Invalid duration format. Expected format is HH:mm:ss",
          httpStatusCode.BAD_REQUEST,
          res
        ); 
      }
    }

    // Check if collectionType exists in CollectionModel
    const collectionExists = await collectionModel.findById(collectionType);
    if (!collectionExists) {
      return errorResponseHandler(
        "Invalid collection type. Collection not found",
        httpStatusCode.BAD_REQUEST,
        res
      );
    }
    
    // Create new audio entry
    const newAudio = new AudioModel({
      songName: songName ? capitalizeFirstLetter(songName) : undefined,
      collectionType,
      audioUrl,
      imageUrl,
      duration: duration || 0,
      description,
      levels,
      bestFor
    });
    
    // Save to database
    const savedAudio = await newAudio.save();
    
    // Populate references
    const populatedAudio = await AudioModel.findById(savedAudio._id)
      .populate("collectionType")
    
    return {
      success: true,
      message: "Audio created successfully",
      data: populatedAudio
    };
};

export const getAllAudiosService = async (req: Request, res: Response) => {

 const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 0;
  const offset = (page - 1) * limit;
  const { query, sort } = queryBuilder(req.query, ["songName"]);
  console.log('query: ', query);
  const totalDataCount =
    Object.keys(query).length < 1
      ? await AudioModel.countDocuments()
      : await AudioModel.countDocuments(query);
// Convert page and limit to numbers and ensure they are positive
// const pageNumber = Math.max(1, parseInt(page as string, 10));
// const limitNumber = Math.max(1, parseInt(limit as string, 10));
// const skip = (pageNumber - 1) * limitNumber;
const totalAudios = await AudioModel.countDocuments();

// Fetch paginated audios
const audios = await AudioModel.find(query)
  .populate("collectionType")
  .sort({ createdAt: -1 }) // Optional: Sort by createdAt descending
  .skip(offset) // Skip documents for pagination
  .limit(limit); // Limit the number of documents returned

// Calculate total pages
const totalPages = Math.ceil(totalAudios / limit);

return {
  success: true,
  message: "Audios fetched successfully",
  data: {
    audios,
    pagination: {
      total: totalAudios,
      page ,
      limit,
      totalPages,
      totalDataCount,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  },
}
};

export const getAudioByIdService = async (req: Request, res: Response) => {
 
    const { id } = req.params;
    const audio = await AudioModel.findById(id).populate("collectionType")
    .populate("levels")
    .populate("bestFor")
    .populate("collectionType");
    if (!audio) {
      return errorResponseHandler("Audio not found", httpStatusCode.NOT_FOUND, res);
    }
    return {
      success: true,
      message: "Audio fetched successfully",
      data: audio,
    };
};

export const updateAudioService = async (req: Request, res: Response) => {
  // Extract id from params and all relevant fields from body
  const { id } = req.params;
  const { songName, collectionType, audioUrl, imageUrl, duration, levels, bestFor,description } = req.body;

  // Validate duration format (HH:mm:ss)
  if (duration) {
    const durationRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
    if (!durationRegex.test(duration)) {
      return errorResponseHandler(
        "Invalid duration format. Expected format is HH:mm:ss",
        httpStatusCode.BAD_REQUEST,
        res
      );
    }
  }

  // Validate levels (array of valid ObjectIds)
  if (levels) {
    if (!Array.isArray(levels) || levels.length === 0) {
      return errorResponseHandler(
        "Levels must be a non-empty array of ObjectIds",
        httpStatusCode.BAD_REQUEST,
        res
      );
    }
    const invalidLevels = levels.filter((level) => !isValidObjectId(level));
    if (invalidLevels.length > 0) {
      return errorResponseHandler(
        `Invalid ObjectId(s) in levels: ${invalidLevels.join(", ")}`,
        httpStatusCode.BAD_REQUEST,
        res
      );
    }
  }

  // Validate bestFor (array of valid ObjectIds)
  if (bestFor) {
    if (!Array.isArray(bestFor) || bestFor.length === 0) {
      return errorResponseHandler(
        "BestFor must be a non-empty array of ObjectIds",
        httpStatusCode.BAD_REQUEST,
        res
      );
    }
    const invalidBestFor = bestFor.filter((bf) => !isValidObjectId(bf));
    if (invalidBestFor.length > 0) {
      return errorResponseHandler(
        `Invalid ObjectId(s) in bestFor: ${invalidBestFor.join(", ")}`,
        httpStatusCode.BAD_REQUEST,
        res
      );
    }
  }

  // Update the audio document with all fields
  const updatedAudio = await AudioModel.findByIdAndUpdate(
    id,
    {
      songName: songName ? capitalizeFirstLetter(songName) : undefined,
      collectionType,
      audioUrl,
      imageUrl,
      duration,
      levels,    // Array of ObjectId strings
      bestFor,
      description,   // Array of ObjectId strings
    },
    { new: true } // Return the updated document
  )
    .populate("collectionType")
    .populate("levels")
    .populate("bestFor");

  // Check if the audio was found and updated
  if (!updatedAudio) {
    return errorResponseHandler("Audio not found", httpStatusCode.NOT_FOUND, res);
  }

  // Return the success response with the updated audio data
  return {
    success: true,
    message: "Audio updated successfully",
    data: updatedAudio,
  };
};

export const deleteAudioService = async (req: Request, res: Response) => {
 
    const { id } = req.params;
    const audio = await AudioModel.findById(id);
    if (!audio) {
      return errorResponseHandler("Audio not found", httpStatusCode.NOT_FOUND, res);
    }
    if(audio.audioUrl) {
      await deleteFileFromS3(audio.audioUrl)
    }
    if(audio.imageUrl){
      await deleteFileFromS3(audio.imageUrl)
    } 
    const deletedAudio = await AudioModel.findByIdAndDelete(id);
    if (!deletedAudio) {
      return errorResponseHandler("Audio not found", httpStatusCode.NOT_FOUND, res);
    }
    return {
      success: true,
      message: "Audio deleted successfully",
      data:null
    };
};
export const getfilterOptionsService = async (req: Request, res: Response) => {
      const bestForList = await bestForModel.find();
    const levels = await levelModel.find();

   
    return {
      success: true,
      message: "filters fetched successfully",
      data:{bestForList,levels}
    };
};

export const searchAudiosService = async (req: any, res: Response) => {
        // Extract query parameters
        const { songName, levels, bestFor } = req.query;

        // Initialize query with base filter for active audios
        let query: Record<string, any> = { isActive: true };

        // Handle songName parameter
        if (songName) {
            query.songName = { $regex: songName, $options: 'i' };
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

        // Handle bestFor parameter
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
        const audios = await AudioModel.find(query)
        .populate('levels')
        .populate('bestFor')
        .populate('collectionType');

        // Return the results
        return {
          success: true,
          message: "Audios fetched successfully",
          data:audios
        };
   
}



export const getTrendingAudiosService = async (req: any, res: Response) => {
  // Extract query parameters (if any, for future use)
  const trendingAudio = await userAudioHistoryModel.aggregate([
      {
          $group: {
              _id: "$audio_id",
              count: { $sum: 1 },
          },
      },
      {
          $sort: { count: -1 },
      },
      // Removed $limit to fetch all audios (already commented out in your code)
      {
          $lookup: {
              from: "audios",
              localField: "_id",
              foreignField: "_id",
              as: "audioDetails",
          },
      },
      {
          $unwind: {
              path: "$audioDetails",
              preserveNullAndEmptyArrays: true, // Changed to true to keep audios even if audioDetails is not found
          },
      },
      // Populate collectionType for audioDetails (if audioDetails exists)
      {
          $lookup: {
              from: "collections",
              localField: "audioDetails.collectionType",
              foreignField: "_id",
              as: "audioDetails.collectionType",
          },
      },
      {
          $unwind: {
              path: "$audioDetails.collectionType",
              preserveNullAndEmptyArrays: true, // Keep audios even if collectionType is not found
          },
      },
      // Populate bestFor and levels for collectionType (if collectionType exists)
      {
          $lookup: {
              from: "bestfors",
              localField: "audioDetails.collectionType.bestFor",
              foreignField: "_id",
              as: "audioDetails.collectionType.bestFor",
          },
      },
      {
          $unwind: {
              path: "$audioDetails.collectionType.bestFor",
              preserveNullAndEmptyArrays: true,
          },
      },
      {
          $lookup: {
              from: "levels",
              localField: "audioDetails.collectionType.levels",
              foreignField: "_id",
              as: "audioDetails.collectionType.levels",
          },
      },
      // Populate bestFor and levels for audioDetails (if audioDetails exists)
      {
          $lookup: {
              from: "bestfors",
              localField: "audioDetails.bestFor",
              foreignField: "_id",
              as: "audioDetails.bestFor",
          },
      },
      {
          $lookup: {
              from: "levels",
              localField: "audioDetails.levels",
              foreignField: "_id",
              as: "audioDetails.levels",
          },
      },
      // Optional: Project to clean up the output (if needed)
      {
          $project: {
              _id: 1,
              count: 1,
              audioDetails: {
                  _id: 1,
                  title: 1, // Include other fields from audioDetails as needed
                  bestFor: 1,
                  levels: 1,
                  collectionType: {
                      _id: 1,
                      name: 1, // Include other fields from collectionType as needed
                      bestFor: 1,
                      levels: 1,
                  },
              },
          },
      },
  ]);

  return {
      success: true,
      message: "Trending Audios fetched successfully",
      data: trendingAudio,
  };
};