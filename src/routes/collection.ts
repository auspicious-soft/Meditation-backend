import { Router } from "express";
import { createCollection, deleteCollection, getAllCollections, getCollectionById, getCollectionWithAudio, getFilteredCollections, updateCollection } from "src/controllers/collection/collection-controller";

const router = Router()


router.get("/", getAllCollections);
router.route("/:id").get(getCollectionById);
router.get("/:id/audio", getCollectionWithAudio);
router.get("/filter",getFilteredCollections)

export {router}