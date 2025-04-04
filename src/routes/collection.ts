import { Router } from "express";
import { createCollection, deleteCollection, getAllCollections, getAllCollectionsForAdmin, getCollectionById, getCollectionWithAudio, getFilteredCollections, updateCollection } from "src/controllers/collection/collection-controller";

const router = Router()


router.get("/", getAllCollectionsForAdmin);
router.route("/:id").get(getCollectionById);
router.get("/:id/audio", getCollectionWithAudio);
router.get("/filter",getFilteredCollections)

export {router}