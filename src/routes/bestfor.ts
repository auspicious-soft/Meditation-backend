import { Router } from "express";
import { deleteBestFor, getAllBestFor, getBestForById, updateBestFor } from "src/controllers/bestfor/bestfor-controller";

const router = Router()


router.get("/", getAllBestFor);
router.route("/:id").get(getBestForById).put(updateBestFor)

export { router}