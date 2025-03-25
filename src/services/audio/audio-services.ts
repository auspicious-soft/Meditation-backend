import { Request, Response } from "express";
import { httpStatusCode } from "src/lib/constant";
import { errorResponseHandler } from "src/lib/errors/error-response-handler";
import { AudioModel } from "src/models/audio/audio-schema";
import { collectionModel } from "src/models/collection/collection-schema";

const capitalizeFirstLetter = (string: string) => {
  if (!string) return string;
  return string
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const uploadAudioService = async(req : Request, res : Response)=>{
  const { songName, collectionType, audioUrl, imageUrl, duration,description} = req.body;
    
    // Validate required fields
    if (!songName || !collectionType || !audioUrl || !imageUrl || !duration) {
      return errorResponseHandler(
        "songName, collection type, audio URL,duration and image URL are required",
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

    const audios = await AudioModel.find().populate("collectionType");
    return {
      success: true,
      message: "Audios fetched successfully",
      data: audios,
    };

};

export const getAudioByIdService = async (req: Request, res: Response) => {
 
    const { id } = req.params;
    const audio = await AudioModel.findById(id).populate("collectionType");
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
    ).populate("collectionType");

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