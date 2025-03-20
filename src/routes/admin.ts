import { Router } from "express";
import {  deleteAUser,getDashboardStats} from "../controllers/admin/admin";
import { checkAuth } from "src/middleware/check-auth";
import { createCollection, deleteCollection } from "src/controllers/collection/collection-controller";
import { deleteAudio, uploadAudio } from "src/controllers/audio/audio-controller";
import { createCompany } from "src/controllers/company/company";
import { createBestFor, deleteBestFor } from "src/controllers/bestfor/bestfor-controller";
import { createLevel, deleteLevel } from "src/controllers/level/level-controller";

const router = Router();

router.post("/ulpoad-audio",uploadAudio)
router.post("/ulpoad-collection",createCollection)
router.post("/create-company", createCompany);
router.post("/create-bestfor",createBestFor)
router.post("/create-level", createLevel);
router.delete("/delete-collection/:id",deleteCollection)
router.delete("/delete-user/:id", deleteAUser);
router.delete("/delete-audio/:id", deleteAudio);
router.delete("/delete-bestfor/:id",deleteBestFor);
router.delete("/delete-level/:id",deleteLevel)
router.get("/dashboard", checkAuth, getDashboardStats)

export { router }