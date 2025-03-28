import { Request, Response } from "express";
import { httpStatusCode } from "src/lib/constant";
import { errorParser } from "src/lib/errors/error-response-handler";
import { createCompanyJoinRequestService, getAllCompanyJoinRequestsService, getCompanyJoinRequestByIdService, updateCompanyJoinRequestService } from "src/services/company-join-requests/company-join-requests-service";
import { createJoinRequestService, deleteJoinRequestService, getAllJoinRequestsService, getJoinRequestByIdService, updateJoinRequestService } from "src/services/join-requests/join-requests-service";

// Create a new join request
export const createCompanyJoinRequest = async (req: any, res: Response) => {
	try {
		const response = await createCompanyJoinRequestService(req.body);
		return res.status(httpStatusCode.CREATED).json(response);
	} catch (error: any) {
		const { code, message } = errorParser(error);
		return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
	}
};

// Get a single join request by ID
export const getCompanyJoinRequestById = async (req: Request, res: Response) => {
	try {
		const response = await getCompanyJoinRequestByIdService(req.params.id, res);
		return res.status(httpStatusCode.OK).json(response);
	} catch (error: any) {
		const { code, message } = errorParser(error);
		return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
	}
};

// Get all join requests
export const getAllCompanyJoinRequests = async (req: Request, res: Response) => {
	try {
		const response = await getAllCompanyJoinRequestsService(res);
		return res.status(httpStatusCode.OK).json(response);
	} catch (error: any) {
		const { code, message } = errorParser(error);
		return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
	}
};

// Update a join request by ID
export const updateCompanyJoinRequest = async (req: Request, res: Response) => {
	try {
		const response = await updateCompanyJoinRequestService(req.params.id, req.query, res);
		return res.status(httpStatusCode.OK).json(response);
	} catch (error: any) {
		const { code, message } = errorParser(error);
		return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
	}
};

// Delete a join request by ID
export const deleteCompanyJoinRequest = async (req: Request, res: Response) => {
	try {
		const response = await deleteJoinRequestService(req.params.id, res);
		return res.status(httpStatusCode.OK).json(response);
	} catch (error: any) {
		const { code, message } = errorParser(error);
		return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
	}
};
