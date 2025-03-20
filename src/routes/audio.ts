import { Router } from "express";
import { deleteAudio, getAllAudio, getAudioById, updateAudio, uploadAudio } from "src/controllers/audio/audio-controller";

const router = Router()


router.get("/", getAllAudio);
router.route("/:id").get(getAudioById).put(updateAudio)

export {router}