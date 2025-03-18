import mongoose from "mongoose";

const AudioSchema = new mongoose.Schema(
  {
    songName: {
      type: String,
      required: true,
      trim: true
    },
    collectionType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "collection",
      required: true
    },
    audioUrl: {
      type: String,
      required: true
    },
    imageUrl: {
      type: String,
      required: true
    },
    description:{
      type: String,
      required: true
    },
    duration: {
      type: String,
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

export const AudioModel = mongoose.model("audios", AudioSchema);