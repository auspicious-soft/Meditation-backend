import { Request, Response } from "express";
import { errorResponseHandler } from "../../lib/errors/error-response-handler";
import { usersModel } from "../../models/user/user-schema";
import bcrypt from "bcryptjs";
import { adminModel } from "../../models/admin/admin-schema";
import { generatePasswordResetToken, generatePasswordResetTokenByPhone, getPasswordResetTokenByToken } from "../../utils/mails/token";
import { sendPasswordResetEmail, sendUserLoginCredentialsEmail, sendUserSignupEmail, sendUserVerificationEmail } from "../../utils/mails/mail";
import { generatePasswordResetTokenByPhoneWithTwilio } from "../../utils/sms/sms";
import { httpStatusCode } from "../../lib/constant";
import { customAlphabet } from "nanoid";
import { companyModels } from "src/models/company/company-schema";
import { queryBuilder } from "src/utils";
import { passwordResetTokenModel } from "src/models/password-token-schema";
import { createJoinRequestService } from "../join-requests/join-requests-service";
import { joinRequestsModel } from "src/models/join-requests/join-requests-schema";
import { collectionModel } from "src/models/collection/collection-schema";
import { userAudioHistoryModel } from "src/models/useraudiohistory/user-audio-history";
import { bestForModel } from "src/models/bestfor/bestfor-schema";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { AudioModel } from "src/models/audio/audio-schema";

const schemas = [usersModel, companyModels, adminModel];

// export const signupService = async (payload: any, res: Response) => {
//    const {email,lastName,firstName,password,dob,gender,companyName} = payload

//    let existingUser = null;
//   for (const schema of schemas) {
//     existingUser = await (schema as any).findOne({ email });
//     if (existingUser) break;
//   }

//   if (existingUser) {
//     return errorResponseHandler("User email already exists", httpStatusCode.CONFLICT, res);
//   }
//     const hashedPassword = await bcrypt.hash(password, 10)
//     const identifier = customAlphabet("0123456789", 5);
//     const newUser = new usersModel({
//         identifier: identifier(),
//         email,
//         firstName,
//         lastName,
//         password: hashedPassword,
//         dob: new Date(dob).toISOString().slice(0, 10),
//         gender,
//         companyName
//     })
//      await newUser.save()

//      const userData = newUser.toObject() as any;
//      delete userData.password;
//     // const EmailVerificationToken = await generatePasswordResetToken(userData.email);
//     // if(EmailVerificationToken){
//     //     await sendUserVerificationEmail(userData.email, EmailVerificationToken.token);
//     // }else{
//     //     return errorResponseHandler("Failed to send email verification", httpStatusCode.INTERNAL_SERVER_ERROR, res)
//     // }
//     return {
//         success: true,
//         message: "Email verification code send successfully verify email to signup successfully",
//         data: userData
//     }
// }

export const signupService = async (payload: any, res: Response) => {
	const { email, lastName, firstName, password, dob, gender, companyName } = payload;
	console.log("companyName: ", companyName);

	// Check if the company exists
	const company = await companyModels.find({ companyName });
	if (company === null || company.length === 0) {
		return errorResponseHandler("Company not found", httpStatusCode.NOT_FOUND, res);
	}

	// Check if the user already exists
	let existingUser = null;
	for (const schema of schemas) {
		existingUser = await (schema as any).findOne({ email });
		if (existingUser) break;
	}
	const joinRequest = await joinRequestsModel.find({ userId: existingUser?._id });
	if (existingUser && existingUser.role !== "user") {
		return errorResponseHandler("User email already exists", httpStatusCode.CONFLICT, res);
	}
	if (existingUser && existingUser.role == "user" && existingUser.emailVerified === true) {
		return errorResponseHandler("Email already exist, try Login", httpStatusCode.CONFLICT, res);
	}
	if (existingUser && existingUser.role == "user" && existingUser.emailVerified === false && joinRequest) {
		const result = await createJoinRequestService({ companyId: company[0]?._id, userId: existingUser._id });
		return { success: true, message: result.message };
	}

	// Hash the password
	const hashedPassword = await bcrypt.hash(password, 10);
	const identifier = customAlphabet("0123456789", 5);

	// Create a new user
	const newUser = new usersModel({
		identifier: identifier(),
		email,
		firstName,
		lastName,
		password: hashedPassword,
		dob: new Date(dob).toISOString().slice(0, 10),
		gender,
		companyName: company[0]?.companyName,
	});

	await newUser.save();
	const result = await createJoinRequestService({ companyId: company[0]?._id, userId: newUser?._id });
	const userData = newUser.toObject() as any;
	delete userData.password;

	return {
		success: true,
		message: "Email verification code sent successfully. Verify email to complete signup.",
		data: {
			user: userData,
		},
	};
};

export const verifyEmailService = async (req: any, res: Response) => {
	const { token } = req.body;
	console.log("token:", token);
	const tokenData = await getPasswordResetTokenByToken(token);
	console.log("tokenData:", tokenData);
	if (!tokenData) return errorResponseHandler("Invalid token", httpStatusCode.FORBIDDEN, res);
	const getUser = await usersModel.findOne({ email: tokenData.email });
	if (!getUser) return errorResponseHandler("User not found with this signup first.", httpStatusCode.NOT_FOUND, res);
	const user = await usersModel.findByIdAndUpdate(getUser._id, { emailVerified: true }, { new: true });
	if (!user) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);
	await sendUserSignupEmail(user.email, user.firstName, user.lastName);
	await passwordResetTokenModel.findByIdAndDelete(tokenData._id);
	return { success: true, message: "Email verified successfully" };
};

// export const loginService = async (payload: any, res: Response) => {
//     const { email, phoneNumber, password } = payload
//     const query = email ? { email } : { phoneNumber };
//     const client = await usersModel.findOne(query).select('+password')
//     if (!client) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res)
//     const isPasswordValid = bcrypt.compareSync(password, client.password)
//     if (!isPasswordValid) return errorResponseHandler("Invalid password", httpStatusCode.UNAUTHORIZED, res)
//     const clientObject: any = client.toObject()
//     delete clientObject.password
//     return { success: true, message: "Login successful", data: clientObject }
// }

export const loginService = async (payload: any, req: any, res: Response) => {
	const { email, password } = payload;
	let user: any = null;

	for (const schema of schemas) {
		user = await (schema as any).findOne({ email }).select("+password");
		if (user) break;
	}
	if (!user) {
		return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);
	}
	if (!user.emailVerified) {
		return errorResponseHandler("Please verify email to login", httpStatusCode.FORBIDDEN, res);
	}
	if (user.isBlocked) {
		return errorResponseHandler("User is blocked", httpStatusCode.FORBIDDEN, res);
	}

	if (!user.isAccountActive) {
		return errorResponseHandler("User account is not activated", httpStatusCode.FORBIDDEN, res);
	}

	const isPasswordValid = await bcrypt.compare(password, user.password);
	if (!isPasswordValid) {
		return errorResponseHandler("Invalid password", httpStatusCode.UNAUTHORIZED, res);
	}

	const userObject = user.toObject();
	delete userObject.password;

	const isMobileApp = req.headers["x-client-type"] === "mobile";

	let token;
	if (isMobileApp) {
		token = jwt.sign({ id: user._id, role: user.role }, process.env.MOBILE_JWT_SECRET as string);
	}

	return {
		success: true,
		message: "Login successful",
		data: {
			user: userObject,
			token: token || undefined,
		},
	};
};

export const editUserInfoService = async (id: string, payload: any, res: Response) => {
	const user = await usersModel.findById(id);
	if (!user) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);

	if (payload.password) {
		payload.password = await bcrypt.hash(payload.password, 10);
	}

	const updateduser = await usersModel.findByIdAndUpdate(id, { ...payload }, { new: true });
	if (!updateduser) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);
	return {
		success: true,
		message: "User updated successfully",
		data: updateduser,
	};
};

export const getUserInfoService = async (id: string, res: Response) => {
	const user = await usersModel.findById(id);
	if (!user) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);
	return {
		success: true,
		message: "User info fetched successfully",
		data: user,
	};
};

export const getAllUsersService = async (payload: any) => {
	const page = parseInt(payload.page as string) || 1;
	const limit = parseInt(payload.limit as string) || 10;
	const skip = (page - 1) * limit;

	const { query } = queryBuilder(payload, ["firstName", "email", "identifier"]);
	const companies = await usersModel.find(query).sort().skip(skip).limit(limit);
	const totalCompanies = await usersModel.countDocuments(query);

	return {
		success: true,
		data: companies,
		total: totalCompanies,
		page,
		limit,
		statusCode: httpStatusCode.OK,
	};
};

export const getUserInfoByEmailService = async (email: string, res: Response) => {
	const client = await usersModel.findOne({ email });
	if (!client) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);
	return {
		success: true,
		message: "Client info fetched successfully",
		data: client,
	};
};

export const forgotPasswordService = async (payload: any, res: Response) => {
	const { email, phoneNumber, password } = payload;
	const query = email ? { email } : { phoneNumber };

	const client = await usersModel.findOne(query);
	if (!client) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);

	if (email) {
		const passwordResetToken = await generatePasswordResetToken(email);
		if (passwordResetToken !== null) {
			await sendPasswordResetEmail(email, passwordResetToken.token);
			return { success: true, message: "Password reset email sent with otp" };
		}
	} else {
		const generatePasswordResetTokenBysms = await generatePasswordResetTokenByPhone(phoneNumber);

		if (generatePasswordResetTokenBysms !== null) {
			await generatePasswordResetTokenByPhoneWithTwilio(phoneNumber, generatePasswordResetTokenBysms.token);
			return { success: true, message: "Password reset sms sent with otp" };
		}
	}
};

export const verifyOtpPasswordResetService = async (token: string, res: Response) => {
	const existingToken = await getPasswordResetTokenByToken(token);
	if (!existingToken) return errorResponseHandler("Invalid token", httpStatusCode.BAD_REQUEST, res);

	const hasExpired = new Date(existingToken.expires) < new Date();
	if (hasExpired) return errorResponseHandler("OTP expired", httpStatusCode.BAD_REQUEST, res);
	return { success: true, message: "Token verified successfully" };
};

export const newPassswordAfterOTPVerifiedService = async (payload: { password: string; otp: string }, res: Response) => {
	const { password, otp } = payload;
	const existingToken = await getPasswordResetTokenByToken(otp);
	if (!existingToken) return errorResponseHandler("Invalid OTP", httpStatusCode.BAD_REQUEST, res);

	// console.log("existingToken", existingToken);

	const hasExpired = new Date(existingToken.expires) < new Date();
	if (hasExpired) return errorResponseHandler("OTP expired", httpStatusCode.BAD_REQUEST, res);

	let existingClient: any;

	if (existingToken.email) {
		existingClient = await adminModel.findOne({ email: existingToken.email });
		if (!existingClient) {
			existingClient = await usersModel.findOne({ email: existingToken.email });
		}
		if (!existingClient) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);
	} else if (existingToken.phoneNumber) {
		existingClient = await usersModel.findOne({ phoneNumber: existingToken.phoneNumber });
		if (!existingClient) {
			existingClient = await usersModel.findOne({ phoneNumber: existingToken.phoneNumber });
		}
		if (!existingClient) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);
	}

	// console.log('existingClient',existingClient)

	const hashedPassword = await bcrypt.hash(password, 10);

	if (existingClient.role == "admin") {
		const response = await adminModel.findByIdAndUpdate(existingClient._id, { password: hashedPassword }, { new: true });
	} else {
		const response = await usersModel.findByIdAndUpdate(existingClient._id, { password: hashedPassword }, { new: true });
	}

	// await passwordResetTokenModel.findByIdAndDelete(existingToken._id)

	return {
		success: true,
		message: "Password updated successfully",
	};
};

export const passwordResetService = async (req: Request, res: Response) => {
	const { currentPassword, newPassword } = req.body;
	const getAdmin = await usersModel.findById(req.params.id).select("+password");
	if (!getAdmin) return errorResponseHandler("Admin not found", httpStatusCode.NOT_FOUND, res);

	const passwordMatch = bcrypt.compareSync(currentPassword, getAdmin.password);
	if (!passwordMatch) return errorResponseHandler("Current password invalid", httpStatusCode.BAD_REQUEST, res);
	const hashedPassword = bcrypt.hashSync(newPassword, 10);
	const response = await usersModel.findByIdAndUpdate(req.params.id, { password: hashedPassword });
	return {
		success: true,
		message: "Password updated successfully",
		data: response,
	};
};

// Create a new user
export const createUserService = async (payload: any, res: Response) => {
	const { email, firstName, lastName, password, dob, gender, companyName } = payload;

	const existingUser = await usersModel.findOne({ email });
	if (existingUser) return errorResponseHandler("User email already exists", httpStatusCode.CONFLICT, res);

	const hashedPassword = await bcrypt.hash(password, 10);
	const identifier = customAlphabet("0123456789", 5);
	const newUser = new usersModel({
		identifier: identifier(),
		email,
		firstName,
		lastName,
		password: hashedPassword,
		dob: new Date(dob).toISOString().slice(0, 10),
		gender,
		companyName,
	});
	await newUser.save();
	console.log('email: ', email);
	await sendUserLoginCredentialsEmail(email, firstName, lastName, password, companyName);
	const userData = newUser.toObject();

	return {
		success: true,
		message: "User created successfully",
		data: userData,
	};
};

// Read user by ID
export const getUserForCompanyService = async (id: string, res: Response) => {
	const user = await usersModel.findById(id);
	if (!user) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);

	return {
		success: true,
		message: "User fetched successfully",
		data: user,
	};
};
export const getAllUserForCompanyService = async (payload: any, res: Response) => {
	//TODO : change this to user id FOR COMPANY NAME  from token
	const users = await usersModel.find({ companyName: payload.companyName });
	if (!users) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);

	return {
		success: true,
		message: "User fetched successfully",
		data: users,
	};
};

// // Update user by ID
// export const updateUserService = async (id: string, payload: any, res: Response) => {
//     const user = await usersModel.findById(id);
//     if (!user) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);

//     if (payload.password) {
//         payload.password = await bcrypt.hash(payload.password, 10);
//     }

//     const updatedUser = await usersModel.findByIdAndUpdate(id, { ...payload }, { new: true });
//     return {
//         success: true,
//         message: "User updated successfully",
//         data: updatedUser
//     };
// };

// Delete user by ID
export const deleteUserService = async (id: string, res: Response) => {
	const user = await usersModel.findByIdAndDelete(id);
	if (!user) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);

	return {
		success: true,
		message: "User deleted successfully",
	};
};
export const deactivateUserService = async (id: string, res: Response) => {
	const user = await usersModel.findById(id);
	if (!user) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);

	// Toggle the isActive field
	user.isAccountActive = !user.isAccountActive;
	await user.save();

	return {
		success: true,
		message: `User ${user.isAccountActive ? "activated" : "deactivated"} successfully`,
	};
};

// Dashboard
export const getDashboardStatsService = async (payload: any, res: Response) => {
	// //Ongoing project count
	// const userId = payload.currentUser
	// // console.log("userid",userId);
	// const ongoingProjectCount = await projectsModel.countDocuments({ userId, status: { $ne: "1" } })
	// const completedProjectCount = await projectsModel.countDocuments({ userId,status: "1" })
	// const workingProjectDetails = await projectsModel.find({ userId, status: { $ne: "1" } }).select("projectName projectimageLink status"); // Adjust the fields as needed
	// const response = {
	//     success: true,
	//     message: "Dashboard stats fetched successfully",
	//     data: {
	//         ongoingProjectCount,
	//         completedProjectCount,
	//          workingProjectDetails,
	//     }
	// }
	// return response
};

export const getHomePageService = async (payload: any, res: Response) => {
	//TODO: SUGGESTED COLLECTION ACCORDING TO THE SEARCH OF USER
	const suggestedCollection = await collectionModel.find().limit(1);
	if (!suggestedCollection) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);
    
	const trendingAudio = await userAudioHistoryModel.aggregate([
		{
			$group: {
				_id: "$audio_id", // Ensure this field exists in userAudioHistoryModel
				count: { $sum: 1 },
			},
		},
		{
			$sort: { count: -1 },
		},
		{
			$limit: 5,
		},
		{
			$lookup: {
				from: "audios", // Ensure the collection name is correct
				localField: "_id", // Ensure this matches the field in userAudioHistoryModel
				foreignField: "_id", // Ensure this matches the field in the audios collection
				as: "audioDetails",
			},
		},
		{
			$unwind: {
				path: "$audioDetails",
				preserveNullAndEmptyArrays: false, // Exclude unmatched documents
			},
		},
	]);

	const collection = await collectionModel.find();
	
	const meditationType = await bestForModel.aggregate([
		{
			$lookup: {
				from: "collections", // Ensure the collection name is correct
				localField: "_id", // Ensure this matches the field in bestForModel
				foreignField: "bestFor", // Ensure this matches the field in the collections collection
				as: "collections",
			},
		},
		{
			$unwind: {
				path: "$collections",
				preserveNullAndEmptyArrays: false, // Exclude unmatched documents
			},
		},
		{
			$lookup: {
				from: "audios", // Ensure the collection name is correct
				localField: "collections._id", // Ensure this matches the field in collections
				foreignField: "collectionType", // Ensure this matches the field in the audios collection
				as: "audios",
			},
		},
		{
			$group: {
				_id: "$_id",
				name: { $first: "$name" },
				audioCount: { $sum: { $size: "$audios" } },
			},
		},
	]);
	const bestForType = await bestForModel.find({ name: "Breathing" });
	const breathing = await AudioModel.find()
		.populate({
			path: "collectionType",
			match: { bestFor: new mongoose.Types.ObjectId(bestForType[0]._id) }, // Ensure 'breathing' is replaced with the correct ID
		})
		.exec();
	return {
		success: true,
		message: `Home page fetched successfully`,
		data: {
			suggestedCollection,
			trendingAudio,
			collection,
			breathing,
			meditationType,
		},
	};
};
