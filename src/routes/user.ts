import { Router } from "express";
import {
  login,
  signup,
  getDashboardStats,
  getUserInfo,
  editUserInfo,
  getAllUsers,
  verifyEmail,
  getHomePage,
  resendOtp,
  updateUserDetails,
} from "../controllers/user/user";
import { checkAuth } from "src/middleware/check-auth";
import { UserAudioHistory } from "src/controllers/useraudiohistory/useraudiohistory-controller";
import { getAudioById, getfilterOptions, searchAudios } from "src/controllers/audio/audio-controller";
import { getAllCollections, getCollectionById, getCollectionWithAudio } from "src/controllers/collection/collection-controller";
import { searchCollections } from "src/controllers/company/company";

const router = Router();

router.post("/signup", signup);
router.post("/resend-otp", resendOtp);
router.post("/login", login);
router.patch("/email/verify", verifyEmail);

router.get("/dashboard", checkAuth, getDashboardStats);
router.post("/audio-history", UserAudioHistory);
router.route("/:id").get(getUserInfo).put(editUserInfo);

//HOME PAGE
router.post("/home", getHomePage);

//SEARCH Routes
router.get("/search/audio", searchAudios);
router.get("/audio/filters", getfilterOptions);

//Collection routes
router.get("/discover/collections", getAllCollections);
router.get("/collections/:id/audios", getCollectionWithAudio);
router.get("/search/collections", searchCollections);

//User-details routes
router.put("/update/details",checkAuth, updateUserDetails);

//Audio routes
router.get("/audio/:id", getAudioById);





export { router };