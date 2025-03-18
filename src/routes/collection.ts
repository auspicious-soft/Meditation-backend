import { Router } from "express";
import { createCollection, deleteCollection, getAllCollections, getCollectionById, getCollectionWithAudio, getFilteredCollections, updateCollection } from "src/controllers/collection/collection-controller";

const router = Router()

router.post("/create-collection",createCollection)
router.get("/", getAllCollections);
router.route("/:id").get(getCollectionById).put(updateCollection);
router.get("/:id/audio", getCollectionWithAudio);
router.get("/filter",getFilteredCollections)

export {router}