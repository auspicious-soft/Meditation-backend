import { Request, Response } from "express";
import mongoose from "mongoose";
import { httpStatusCode } from "src/lib/constant";
import { errorResponseHandler } from "src/lib/errors/error-response-handler";
import { AudioModel } from "src/models/audio/audio-schema";
import { bestForModel } from "src/models/bestfor/bestfor-schema";
import { collectionModel } from "src/models/collection/collection-schema";
import { levelModel } from "src/models/level/level-schema";
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
// Extract pagination parameters from query
const { page = "1", limit = "10" } = req.query;

// Convert page and limit to numbers and ensure they are positive
const pageNumber = Math.max(1, parseInt(page as string, 10));
const limitNumber = Math.max(1, parseInt(limit as string, 10));
const skip = (pageNumber - 1) * limitNumber;
const totalAudios = await AudioModel.countDocuments();

// Fetch paginated audios
const audios = await AudioModel.find()
  .populate("collectionType")
  .sort({ createdAt: -1 }) // Optional: Sort by createdAt descending
  .skip(skip) // Skip documents for pagination
  .limit(limitNumber); // Limit the number of documents returned

// Calculate total pages
const totalPages = Math.ceil(totalAudios / limitNumber);

return {
  success: true,
  message: "Audios fetched successfully",
  data: {
    audios,
    pagination: {
      total: totalAudios,
      page: pageNumber,
      limit: limitNumber,
      totalPages,
      hasNextPage: pageNumber < totalPages,
      hasPrevPage: pageNumber > 1,
    },
  },
}
};

export const getAudioByIdService = async (req: Request, res: Response) => {
 
    const { id } = req.params;
    const audio = await AudioModel.findById(id).populate("collectionType")
    .populate("levels")
    .populate("bestFor");
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

    const { id } = req.params;
    const { songName, collectionType, audioUrl, imageUrl, duration } = req.body;

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

    const updatedAudio = await AudioModel.findByIdAndUpdate(
      id,
      {
        songName: songName ? capitalizeFirstLetter(songName) : undefined,
        collectionType,
        audioUrl,
        imageUrl,
        duration,
      },
      { new: true }
    ).populate("collectionType")
    .populate("levels")
    .populate("bestFor");

    if (!updatedAudio) {
      return errorResponseHandler("Audio not found", httpStatusCode.NOT_FOUND, res);
    }

    return {
      success: true,
      message: "Audio updated successfully",
      data: updatedAudio,
    };
};

export const deleteAudioService = async (req: Request, res: Response) => {
 
    const { id } = req.params;
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