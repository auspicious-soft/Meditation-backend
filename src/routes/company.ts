import { Router } from "express";
import { createCompany, deleteCompanyById, getAllCompanies, getCompanyById, getCompanyDashboard, updateCompany } from "src/controllers/company/company";
import { createJoinRequest, deleteJoinRequest, getAllJoinRequests, getJoinRequestById, updateJoinRequest } from "src/controllers/join-requests/join-requests-controller";
import { getAllNotificationsOfUser, markAllNotificationsAsRead, markSingleNotificationAsRead } from "src/controllers/notifications/notifications-controller";
import { cancelSubscription, createSubscription } from "src/controllers/subscription/subscription-controller";
import { createUser, deactivateUser, deleteUser, editUserInfo, getAllUserForCompany, getUserInfo } from "src/controllers/user/user";



const router = Router();
//Dashboard routes
router.get("/dashboard/:id", getCompanyDashboard);

router.get("/get-all-companies", getAllCompanies);
router.get("/get-company-by-id/:id", getCompanyById);
router.put("/update-company", updateCompany);
router.delete("/delete-company/:id", deleteCompanyById);

router.post("/create-subscription/:id", createSubscription);
router.post("/cancel-subscription/:id", cancelSubscription);
//notifications route
router.route("/:id/notifications").get( getAllNotificationsOfUser).put( markAllNotificationsAsRead)
router.route("/:id/notifications/mark-as-read").put(markSingleNotificationAsRead)

//user routes
router.route("/users").post(createUser).get(getAllUserForCompany);
router.route("/users/:id").get(getUserInfo).put(editUserInfo).delete(deleteUser);
router.patch("/users/:id/deactivate", deactivateUser);

//join-requests routes
router.post("/join-requests", createJoinRequest);
router.get("/join-requests/:id", getJoinRequestById);
router.get("/join-requests", getAllJoinRequests);
router.put("/join-requests/:id", updateJoinRequest);
router.delete("/join-requests/:id", deleteJoinRequest);

export { router }