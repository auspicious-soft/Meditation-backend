import { Router } from "express";
import { createLevel, deleteLevel, getAllLevels, getLevelById, updateLevel } from "src/controllers/level/level-controller";

const router = Router();

router.post("/", createLevel);
router.get("/", getAllLevels);
router.route("/:id").get(getLevelById).put( updateLevel).delete(deleteLevel);

export {router}