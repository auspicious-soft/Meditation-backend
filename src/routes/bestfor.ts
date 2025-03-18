import { Router } from "express";
import { createBestFor, deleteBestFor, getAllBestFor, getBestForById, updateBestFor } from "src/controllers/bestfor/bestfor-controller";

const router = Router()

router.post("/",createBestFor)
router.get("/", getAllBestFor);
router.route("/:id").get(getBestForById).put(updateBestFor).delete(deleteBestFor);

export { router}