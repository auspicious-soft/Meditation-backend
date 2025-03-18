import { Router } from "express";
import {  deleteAUser, forgotPassword, getDashboardStats,  login,  newPassswordAfterOTPVerified,} from "../controllers/admin/admin";



// import { checkAdminAuth } from "../middleware/check-auth";
import { upload } from "../configF/multer";
import { checkMulter } from "../lib/errors/error-response-handler"
import { verifyOtpPasswordReset } from "src/controllers/user/user";
import { checkAuth } from "src/middleware/check-auth";
import { newPassswordAfterOTPVerifiedService } from "src/services/admin/admin-service";
import { deleteCollection } from "src/controllers/collection/collection-controller";



const router = Router();

router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.patch("/otp-new-password-verification", newPassswordAfterOTPVerified);
router.delete("/collection/:id",deleteCollection)
router.delete("/delete-user/:id", deleteAUser);
router.get("/dashboard", checkAuth, getDashboardStats)


export { router }