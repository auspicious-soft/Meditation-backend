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


export const searchAudiosService = async (payload: any, res: Response) => {
    const { songName, levels, bestFor } = payload;

    let query: any = {};
    
    if (songName) {
        if (typeof songName !== 'string') {
            return {
                success: false,
                message: 'songName must be a string'
            };
        }
        query.songName = { $regex: songName, $options: 'i' }; // Case-insensitive search
    }
    
    // Build collection-related filters
    const collectionMatch: any = {};
    
    // Add levels filter if provided (by name)
    if (levels) {
        collectionMatch['levels.name'] = { 
            $in: Array.isArray(levels) ? levels : [levels] 
        };
    }
    
    // Add bestFor filter if provided (by name)
    if (bestFor) {
        collectionMatch['bestFor.name'] = bestFor;
    }
    
        // If we have collection filters, use aggregation
        if (Object.keys(collectionMatch).length > 0) {
            const audios = await AudioModel.aggregate([
                // Match audio documents first
                { $match: query },
                
                // Lookup to join with collections
                {
                    $lookup: {
                        from: 'collections', // Must match your collection name in MongoDB
                        localField: 'collectionType',
                        foreignField: '_id',
                        as: 'collectionData'
                    }
                },
                
                // Unwind the collectionData array
                { $unwind: '$collectionData' },
                
                // Lookup for levels
                {
                    $lookup: {
                        from: 'levels', // Assuming 'levels' is your levels collection name
                        localField: 'collectionData.levels',
                        foreignField: '_id',
                        as: 'collectionData.levelsData'
                    }
                },
                
                // Lookup for bestFor
                {
                    $lookup: {
                        from: 'bestfors', // Assuming 'bestfors' is your bestFor collection name
                        localField: 'collectionData.bestFor',
                        foreignField: '_id',
                        as: 'collectionData.bestForData'
                    }
                },
                
                // Match against collection filters using the populated data
                { 
                    $match: {
                        $and: [
                            ...(levels ? [{
                                'collectionData.levelsData.name': { 
                                    $in: Array.isArray(levels) ? levels : [levels] 
                                }
                            }] : []),
                            ...(bestFor ? [{
                                'collectionData.bestForData.name': bestFor
                            }] : [])
                        ]
                    }
                },
                
                // Project to shape the output
                {
                    $project: {
                        songName: 1,
                        audioUrl: 1,
                        imageUrl: 1,
                        description: 1,
                        duration: 1,
                        isActive: 1,
                        collectionType: {
                            $mergeObjects: [
                                '$collectionData',
                                {
                                    levels: '$collectionData.levelsData',
                                    bestFor: { $arrayElemAt: ['$collectionData.bestForData', 0] }
                                }
                            ]
                        }
                    }
                }
            ]);
            
            return {
                success: true,
                message: "Audios fetched successfully with filters",
                data: audios
            };
        } else {
            // If no collection filters, use simple find with populate
            const audios = await AudioModel.find(query)
                .populate({
                    path: 'collectionType',
                    populate: [
                        { path: 'levels', model: 'levels' },
                        { path: 'bestFor', model: 'BestFor' }
                    ]
                });
                
            return {
                success: true,
                message: "Audios fetched successfully with filters",
                data: audios
            };
        }
    
};