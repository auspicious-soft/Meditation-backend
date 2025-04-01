import { Response } from "express";
import { httpStatusCode } from "src/lib/constant";
import { errorResponseHandler } from "src/lib/errors/error-response-handler";
import { Request } from "express";
import { joinRequestsModel } from "src/models/user-join-requests/user-join-requests-schema";
import { usersModel } from "src/models/user/user-schema";
import { generatePasswordResetToken } from "src/utils/mails/token";
import { sendUserVerificationEmail } from "src/utils/mails/mail";
import { companyJoinRequestsModel } from "src/models/company-join-requests/company-join-requests-schema";
import { companyModels } from "src/models/company/company-schema";

export const createCompanyJoinRequestService = async (payload: any) => {
	// Check if a join request already exists for the userId with a status other than "Rejected"
	const existingRequest = await companyJoinRequestsModel.findOne({
		companyId: payload.companyId,
		status: { $ne: "Rejected" },
	});

	if (existingRequest) {
		return { message: "Already join request sent" };
	}

	// Create a new join request
	const newJoinRequest = await companyJoinRequestsModel.create(payload);
};

export const getCompanyJoinRequestByIdService = async (id: string, res: Response) => {
	try {
		// TODO: take the company id from token
		const joinRequest = await companyJoinRequestsModel.find().populate("companyId");
		if (!joinRequest) return errorResponseHandler("Join request not found", httpStatusCode.NOT_FOUND, res);

		return res.status(httpStatusCode.OK).json({ success: true, data: joinRequest });
	} catch (error) {
		console.error("Error in getJoinRequestById:", error);
		return errorResponseHandler("Failed to fetch join request", httpStatusCode.INTERNAL_SERVER_ERROR, res);
	}
};
export const getAllCompanyJoinRequestsService = async (res: Response) => {
	const joinRequest = await companyJoinRequestsModel.find({status:"Pending"}).populate("companyId").select("_id companyId status email identifier");
	if (!joinRequest) return errorResponseHandler("Join request not found", httpStatusCode.NOT_FOUND, res);

	return { success: true, data: joinRequest };
};
  
export const updateCompanyJoinRequestService = async (id: string, payload: any, res: Response) => {
	console.log('id: ', id);
	
	const joinRequest = await companyJoinRequestsModel.find({ companyId: id });
	const companyData = await companyModels.findById(id);
	if (!joinRequest) return errorResponseHandler("Join request not found", httpStatusCode.NOT_FOUND, res);
	if (!companyData) return errorResponseHandler("Company data not found", httpStatusCode.NOT_FOUND, res);
	let updatedJoinRequest;
	if (payload.status === "deny") {
		updatedJoinRequest = await companyJoinRequestsModel.findOneAndUpdate({companyId : id},{ status: "Rejected" }, { new: true });
		await companyModels.findByIdAndUpdate(id, { isVerifiedByAdmin: "rejected" }, { new: true });
	} else if (payload.status === "approve") {
		updatedJoinRequest = await companyJoinRequestsModel.findOneAndUpdate({companyId : id}, { status: "Approved" }, { new: true });
		await companyModels.findByIdAndUpdate(id, { isVerifiedByAdmin: "approved" }, { new: true });
		const EmailVerificationToken = await generatePasswordResetToken(companyData.email);
		if (EmailVerificationToken) {
			await sendUserVerificationEmail(companyData.email, EmailVerificationToken.token);
		} else {
			return errorResponseHandler("Failed to send email verification", httpStatusCode.INTERNAL_SERVER_ERROR, res);
		}
	}
	return { success: true, data: updatedJoinRequest };
};

export const deleteJoinRequestService = async (id: string, res: Response) => {
	try {
		const deletedJoinRequest = await companyJoinRequestsModel.findByIdAndDelete(id);
		if (!deletedJoinRequest) return errorResponseHandler("Join request not found", httpStatusCode.NOT_FOUND, res);

		return res.status(httpStatusCode.OK).json({ success: true, message: "Join request deleted successfully" });
	} catch (error) {
		console.error("Error in deleteJoinRequest:", error);
		return errorResponseHandler("Failed to delete join request", httpStatusCode.INTERNAL_SERVER_ERROR, res);
	}
};
