import { Router } from "express";
import { createCompany, deleteCompanyById, getAllCompanies, getCompanyById, updateCompany } from "src/controllers/company/company";
import { getAllNotificationsOfUser, markAllNotificationsAsRead } from "src/controllers/notifications/notifications-controller";
import { cancelSubscription, createSubscription } from "src/controllers/subscription/subscription-controller";



const router = Router();


router.get("/get-all-companies", getAllCompanies);
router.get("/get-company-by-id/:id", getCompanyById);
router.put("/update-company", updateCompany);
router.delete("/delete-company/:id", deleteCompanyById);

router.post("/create-subscription/:id", createSubscription);
router.post("/cancel-subscription/:id", cancelSubscription);
//notifications route
router.route("/:id/notifications").get( getAllNotificationsOfUser).put( markAllNotificationsAsRead)

export { router }