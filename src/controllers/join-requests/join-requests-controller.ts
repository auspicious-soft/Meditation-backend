import { Request, Response } from "express";
import { httpStatusCode } from "src/lib/constant";
import { errorParser } from "src/lib/errors/error-response-handler";
import { createJoinRequestService, deleteJoinRequestService, getAllJoinRequestsService, getJoinRequestByIdService, updateJoinRequestService } from "src/services/join-requests/join-requests-service";

// Create a new join request
export const createJoinRequest = async (req: any, res: Response) => {
    try {
        const response = await createJoinRequestService(req.body);
        return res.status(httpStatusCode.CREATED).json(response);
    } catch (error: any) {
        const { code, message } = errorParser(error);
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
};

// Get a single join request by ID
export const getJoinRequestById = async (req: Request, res: Response) => {
    try {
        const response = await getJoinRequestByIdService(req.params.id,res);
        return res.status(httpStatusCode.OK).json(response);
    } catch (error: any) {
        const { code, message } = errorParser(error);
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
};

// Get all join requests
export const getAllJoinRequests = async (req: Request, res: Response) => {
    try {
        const response = await getAllJoinRequestsService(req.params.id,res);
        return res.status(httpStatusCode.OK).json(response);
    } catch (error: any) {
        const { code, message } = errorParser(error);
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
};

// Update a join request by ID
export const updateJoinRequest = async (req: Request, res: Response) => {
    try {
        const response = await updateJoinRequestService(req.params.id, req.query, res);
        return res.status(httpStatusCode.OK).json(response);
    } catch (error: any) {
        const { code, message } = errorParser(error);
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
};

// Delete a join request by ID
export const deleteJoinRequest = async (req: Request, res: Response) => {
    try {
        const response = await deleteJoinRequestService(req.params.id,res);
        return res.status(httpStatusCode.OK).json(response);
    } catch (error: any) {
        const { code, message } = errorParser(error);
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
};