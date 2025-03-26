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
} from "../controllers/user/user";
import { checkAuth } from "src/middleware/check-auth";
import { UserAudioHistory } from "src/controllers/useraudiohistory/useraudiohistory-controller";
import { getfilterOptions, searchAudios } from "src/controllers/audio/audio-controller";

const router = Router();

router.post("/signup", signup);
router.post("/resend-otp", resendOtp);
router.post("/login", login);
router.patch("/verify-email", verifyEmail);
router.get("/get-all-users", getAllUsers);
router.get("/dashboard", checkAuth, getDashboardStats);
router.post("/audio-history", UserAudioHistory);
router.route("/:id").get(getUserInfo).put(editUserInfo);

//HOME PAGE
router.post("/home", getHomePage);

//SEARCH Routes
router.get("/search/audio", searchAudios);
router.get("/audio/filters", getfilterOptions);





export { router };