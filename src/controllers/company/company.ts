import { Request, Response } from "express";
import {
  companyCreateService,
  companySignupService,
  deleteCompanyService,
  getCompaniesService,
  getCompanyByIdService,
  getCompanyDashboardService,
  updateCompanyService,
  verifyCompanyEmailService,
} from "../../services/company/company-service";
import { errorParser } from "../../lib/errors/error-response-handler";
import { httpStatusCode } from "../../lib/constant";
import { searchCollectionsService } from "src/services/collection/collection-service";

export const companySignup = async (req: Request, res: Response) => {
  
  try {
    const response = await companySignupService(req.body, req, res);
    return res.status(httpStatusCode.CREATED).json(response)
  } catch (error: any) {
    const { code, message } = errorParser(error);
    return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: message || "An error occurred while creating the company",
    });
  }
};
export const verifyCompanyEmail = async (req: Request, res: Response) => {
  
  try {
    const response = await verifyCompanyEmailService(req, res);
    return res.status(httpStatusCode.CREATED).json(response)
  } catch (error: any) {
    const { code, message } = errorParser(error);
    return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: message || "An error occurred while creating the company",
    });
  }
};
export const createCompany = async (req: Request, res: Response) => {
  
  try {
    const response = await companyCreateService(req.body, req, res);
    return res.status(httpStatusCode.CREATED).json(response)
  } catch (error: any) {
    const { code, message } = errorParser(error);
    return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: message || "An error occurred while creating the company",
    });
  }
};

export const getAllCompanies = async (req: Request, res: Response) => {
  try {
    const response = await getCompaniesService(req.query);
    return res.status(httpStatusCode.OK).json(response);
  } catch (error: any) {
    const { code, message } = errorParser(error);
    return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: message || "An error occurred while retrieving the companies",
    });
  }
};

export const updateCompany = async (req: Request, res: Response) => {
  try {
    const response = await updateCompanyService(req.body, req, res);
    return res.status(response.statusCode).json(response);
  } catch (error: any) {
    const { code, message } = errorParser(error);
    return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: message || "An error occurred while updating the company",
    });
  }
}

export const getCompanyById = async (req: Request, res: Response) => {
  try {
    const response = await getCompanyByIdService(req.user,res);
    return res.status(response.statusCode).json(response);
  } catch (error: any) {
    const { code, message } = errorParser(error);
    return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: message || "An error occurred while retrieving the company",
    });
  }
}

export const deleteCompanyById = async (req: Request, res: Response) => {
  try {
    const response = await deleteCompanyService(req.params.id, res);
    return res.status(response.statusCode).json(response);
  } catch (error: any) {
    const { code, message } = errorParser(error);
    return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: message || "An error occurred while deleting the company",
    });
  }
}
export const getCompanyDashboard = async (req: Request, res: Response) => {
  try {
    const response = await getCompanyDashboardService(req.currentUser, req.query, res);
    return res.status(response.statusCode).json(response);
  } catch (error: any) {
    const { code, message } = errorParser(error);
    return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: message || "An error occurred while deleting the company",
    });
  }
}
export const searchCollections = async (req: Request, res: Response) => {
  try {
    const response = await searchCollectionsService(req, res);
    return res.status(httpStatusCode.OK).json(response);
  } catch (error: any) {
    const { code, message } = errorParser(error);
    return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: message || "An error occurred while deleting the company",
    });
  }
}