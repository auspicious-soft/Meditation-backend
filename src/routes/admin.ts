import { Router } from "express";
import {  deleteAUser, forgotPassword, getAnalytics, getDashboardStats,  login,  newPassswordAfterOTPVerified,} from "../controllers/admin/admin";
// import { checkAdminAuth } from "../middleware/check-auth";
import { upload } from "../configF/multer";
import { checkMulter } from "../lib/errors/error-response-handler"
import { verifyOtpPasswordReset } from "src/controllers/user/user";
import { checkAuth } from "src/middleware/check-auth";
import { createCollection, deleteCollection, updateCollection } from "src/controllers/collection/collection-controller";
import { deleteAudio, uploadAudio } from "src/controllers/audio/audio-controller";
import { createCompany, deleteCompanyById, getAllCompanies } from "src/controllers/company/company";
import { createBestFor, deleteBestFor } from "src/controllers/bestfor/bestfor-controller";
import { createLevel, deleteLevel } from "src/controllers/level/level-controller";
import { getAllCoupons, getAllSubscriptionsHandler, getPrices, getSubscriptionByIdHandler, subscriptionExpireInAWeek, subscriptionExpireRemainder, updatePrices } from "src/controllers/subscription/subscription-controller";
import { sendNotificationToUser, sendNotificationToUsers } from "src/controllers/notifications/notifications-controller";

const router = Router();

router.post("/upload-audio",uploadAudio)
router.post("/upload-collection",createCollection)
router.post("/create-company", createCompany);
router.post("/create-bestfor",createBestFor)
router.post("/create-level", createLevel);
router.delete("/delete-collection/:id",deleteCollection)
router.delete("/delete-company/:id", deleteCompanyById);
router.delete("/delete-user/:id", deleteAUser);
router.delete("/delete-audio/:id", deleteAudio);
router.delete("/delete-bestfor/:id",deleteBestFor);
router.delete("/delete-level/:id",deleteLevel)
router.get("/dashboard", getDashboardStats)
router.get("/get-all-companies", getAllCompanies);
router.put("/update/collection/:id",updateCollection)

//Analysis
router.get("/analysis", getAnalytics)

//plan expire remainder
router.post("/subscription-expire-remainder/:id", subscriptionExpireRemainder)

//stripe
router.post('/update-prices', updatePrices);
router.get('/prices', getPrices);
router.get('/coupons', getAllCoupons);
router.get('/subscriptions', getAllSubscriptionsHandler);
router.get('/subscriptions/:subscriptionId', getSubscriptionByIdHandler);
router.get('/subscriptions-expire-in-a-week', subscriptionExpireInAWeek);

//notifications route
router.post("/send-notification", sendNotificationToUsers)
router.post("/send-notification-to-specific-users", sendNotificationToUser)

export { router }