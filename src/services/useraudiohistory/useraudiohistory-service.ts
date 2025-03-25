import { Request, Response } from "express";
import { userAudioHistoryModel } from "src/models/useraudiohistory/user-audio-history";

export const UserAudioHistoryService = async(req: Request, res: Response) =>{
    const { user_id, audio_id, type } = req.body;
    console.log('user_id, audio_id, type : ', user_id, audio_id, type );

        // Validate input
        if (!user_id || !audio_id || !type) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'user_id, audio_id, and type are required' 
            });
        }

        // Validate type
        const validTypes = ['LISTEN', 'DOWNLOAD'];
        if (!validTypes.includes(type.toUpperCase())) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Invalid type. Must be "LISTEN" or "DOWNLOAD"' 
            });
        }

        // Prepare update based on type
        let update = {};
        if (type.toUpperCase() === 'LISTEN') {
            update = { 
                $set: { has_listened: true }, 
            };
        } else if (type.toUpperCase() === 'DOWNLOAD') {
            update = { 
                $set: { has_downloaded: true } 
            };
        }

        // Upsert: Update if exists, create if not
        const history = await userAudioHistoryModel.findOneAndUpdate(
            { user_id, audio_id }, // Query to find existing document
            update, // Dynamic update based on type
            { upsert: true, new: true } // Create if not exists, return updated doc
        );

        return{
            status: 'success',
            message: `${type.toUpperCase()} activity recorded`,
            history_id: history._id
        };
}

// export const getUserAudioHistoryService = async(req: Request, res: Response) =>{
//     const { user_id } = req.params;
//         const history = await userAudioHistoryModel.find({ user_id }).populate('audio_id', 'title audioUrl imageUrl duration');
//         return {
//             status: 'success',
//             data: history.map(entry => ({
//                 audio_id: entry.audio_id._id,
//                 title: entry.audio_id.title,
//                 has_listened: entry.has_listened,
//                 has_downloaded: entry.has_downloaded,
//                 listen_count: entry.listen_count
//             }))
//         };
// }