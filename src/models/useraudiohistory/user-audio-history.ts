import mongoose from "mongoose";

const userAudioHistorySchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    audio_id: { type: mongoose.Schema.Types.ObjectId, ref: 'audios', required: true },
    has_listened: { type: Boolean, default: false }, // True if user has listened
    has_downloaded: { type: Boolean, default: false }, // True if user has downloaded    
}, { 
    // Ensure uniqueness for user_id and track_id combination
    unique: [{ user_id: 1, audio_id: 1 }],
    timestamps: true
});

export const userAudioHistoryModel = mongoose.model('userAudioHistory', userAudioHistorySchema);