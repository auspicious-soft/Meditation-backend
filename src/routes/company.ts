import { Router } from "express";
import { createCompany, deleteCompanyById, getAllCompanies, getCompanyById, updateCompany } from "src/controllers/company/company";



const router = Router();


router.get("/get-all-companies", getAllCompanies);
router.get("/get-company-by-id/:id", getCompanyById);
router.put("/update-company", updateCompany);
router.delete("/delete-company/:id", deleteCompanyById);

export { router }