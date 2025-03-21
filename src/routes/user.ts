import { Router } from "express";
import {
  login,
  signup,
  getDashboardStats,
  getUserInfo,
  editUserInfo,
  getAllUsers,
  verifyEmail,
} from "../controllers/user/user";
import { checkAuth } from "src/middleware/check-auth";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.patch("/verify-email", verifyEmail);
router.get("/get-all-users", getAllUsers);
router.get("/dashboard", checkAuth, getDashboardStats);
router.route("/:id").get(getUserInfo).put(editUserInfo);




export { router };