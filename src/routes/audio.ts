import { Router } from "express";
import { deleteAudio, getAllAudio, getAudioById, updateAudio, uploadAudio } from "src/controllers/audio/audio-controller";

const router = Router()

router.post("/",uploadAudio)
router.get("/", getAllAudio);
router.route("/:id").get(getAudioById).put(updateAudio).delete(deleteAudio);

export {router}