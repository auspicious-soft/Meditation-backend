import { Response } from "express";
import { httpStatusCode } from "src/lib/constant";
import { errorResponseHandler } from "src/lib/errors/error-response-handler";
import { Request } from "express";
import { joinRequestsModel } from "src/models/user-join-requests/user-join-requests-schema";
import { usersModel } from "src/models/user/user-schema";
import { generatePasswordResetToken } from "src/utils/mails/token";
import { sendUserVerificationEmail } from "src/utils/mails/mail";

export const createJoinRequestService = async (payload: any) => {
	// Check if a join request already exists for the userId with a status other than "Rejected"
	const existingRequest = await joinRequestsModel.findOne({
		userId: payload.userId,
		companyId: payload.companyId,
		status: { $ne: "Rejected" },
	});

	if (existingRequest) {
		return { message: "Already join request sent" };
	}

	// Create a new join request
	const newJoinRequest = await joinRequestsModel.create(payload);
    console.log('success: true, data: newJoinRequest: ',    newJoinRequest);
	// return { success: true, data: newJoinRequest };
};

export const getJoinRequestByIdService = async (id: string, res: Response) => {
	try {
		// TODO: take the company id from token
		const joinRequest = await joinRequestsModel.find({ companyId: id }).populate("userId").populate("companyId");
		if (!joinRequest) return errorResponseHandler("Join request not found", httpStatusCode.NOT_FOUND, res);

		return res.status(httpStatusCode.OK).json({ success: true, data: joinRequest });
	} catch (error) {
		console.error("Error in getJoinRequestById:", error);
		return errorResponseHandler("Failed to fetch join request", httpStatusCode.INTERNAL_SERVER_ERROR, res);
	}
};
export const getAllJoinRequestsService = async (id: string, res: Response) => {
	try {
		const joinRequest = await joinRequestsModel.find();
		if (!joinRequest) return errorResponseHandler("Join request not found", httpStatusCode.NOT_FOUND, res);

		return res.status(httpStatusCode.OK).json({ success: true, data: joinRequest });
	} catch (error) {
		console.error("Error in getJoinRequestById:", error);
		return errorResponseHandler("Failed to fetch join request", httpStatusCode.INTERNAL_SERVER_ERROR, res);
	}
};

export const updateJoinRequestService = async (id: string, payload: any, res: Response) => {
	
		const joinRequest = await joinRequestsModel.find({ userId: id });
		const userData = await usersModel.findById(id);
		if (!joinRequest) return errorResponseHandler("Join request not found", httpStatusCode.NOT_FOUND, res);
		if (!userData) return errorResponseHandler("User data not found", httpStatusCode.NOT_FOUND, res);
		let updatedJoinRequest;
		if (payload.status === "deny") {
			updatedJoinRequest = await joinRequestsModel.findOneAndUpdate({ userId: id }, { status: "Rejected" }, { new: true });
			await usersModel.findByIdAndUpdate(id, { isVerifiedByCompany: "rejected" }, { new: true });
		} else if (payload.status === "approve") {
			updatedJoinRequest = await joinRequestsModel.findOneAndUpdate({ userId: id }, { status: "Approved" }, { new: true });
			console.log('updatedJoinRequest: ', updatedJoinRequest);
			await usersModel.findByIdAndUpdate(id, { isVerifiedByCompany: "approved" }, { new: true });
			const EmailVerificationToken = await generatePasswordResetToken(userData.email);
			if (EmailVerificationToken) {
				await sendUserVerificationEmail(userData.email, EmailVerificationToken.token);
			} else {
				return errorResponseHandler("Failed to send email verification", httpStatusCode.INTERNAL_SERVER_ERROR, res);
			}
		}
		return { success: true, data: updatedJoinRequest };
	
};

export const deleteJoinRequestService = async (id: string, res: Response) => {
	try {
		const deletedJoinRequest = await joinRequestsModel.findByIdAndDelete(id);
		if (!deletedJoinRequest) return errorResponseHandler("Join request not found", httpStatusCode.NOT_FOUND, res);

		return res.status(httpStatusCode.OK).json({ success: true, message: "Join request deleted successfully" });
	} catch (error) {
		console.error("Error in deleteJoinRequest:", error);
		return errorResponseHandler("Failed to delete join request", httpStatusCode.INTERNAL_SERVER_ERROR, res);
	}
};
