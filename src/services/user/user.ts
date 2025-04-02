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
import { joinRequestsModel } from "src/models/user-join-requests/user-join-requests-schema";
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

export const signupService = async (payload: any,req:Request, res: Response) => {
	console.log('payload: ', payload);
	const { email, lastName, firstName, password, dob, gender, companyName } = payload;

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
		return { success: true, message: "Request sent successfully" };
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

	let token;
	// if (isMobileApp) {
		token = jwt.sign({ id: userData._id, role: userData.role }, process.env.JWT_SECRET_PHONE as string);
	// }
	return {
		success: true,
		message: "Request sent successfully",
		data: {
			 userData, token
		},
	};
};

export const verifyEmailService = async (req: any, res: Response) => {
	const { otp } = req.body;
	console.log("token:", otp);
	const tokenData = await getPasswordResetTokenByToken(otp);
	console.log('tokenData: ', tokenData);
	if (!tokenData) return errorResponseHandler("Invalid Otp", httpStatusCode.FORBIDDEN, res);
	const getUser = await usersModel.findOne({ email: tokenData.email });
	if (!getUser) return errorResponseHandler("User not found.", httpStatusCode.NOT_FOUND, res);
	const user = await usersModel.findByIdAndUpdate(getUser._id, { emailVerified: true }, { new: true });
	if (!user) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);
	await sendUserSignupEmail(user.email, user.firstName+" "+ user.lastName);
	// await passwordResetTokenModel.findByIdAndDelete(tokenData._id);
	const userData = user.toObject() as any;
	delete userData.password;
	const token = jwt.sign({ id: userData._id, role: userData.role }, process.env.JWT_SECRET_PHONE as string);	
	return { success: true, message: "Email verified successfully", data: token};
};

// export const verifyEmailService = async (req: any, res: Response) => {
//     const { otp, type } = req.body; // Add a `type` field to determine the model (e.g., "user" or "company")
// 	let role = req.headers["role"]; // Extract role from headers
//     console.log("token:", otp, "role:", role);

//     if (!role) {
//         role = "user"; // Default to "user" if role is not provided
//     }

//     const tokenData = await getPasswordResetTokenByToken(otp);
//     console.log('tokenData: ', tokenData);
//     if (!tokenData) return errorResponseHandler("Invalid Otp", httpStatusCode.FORBIDDEN, res);

//     // Determine the model based on the `type` field
// 	const model = role === "company" ? companyModels : usersModel;

// 	const entity = await (model as any).findOne({ email: tokenData.email });
//     if (!entity) return errorResponseHandler(`${type === "company" ? "Company" : "User"} not found.`, httpStatusCode.NOT_FOUND, res);

// 	const updatedEntity = await (model as any).findByIdAndUpdate(entity._id, { emailVerified: true }, { new: true });
//     if (!updatedEntity) return errorResponseHandler(`${type === "company" ? "Company" : "User"} not found`, httpStatusCode.NOT_FOUND, res);

//     if (type === "user") {
//         await sendUserSignupEmail(updatedEntity.email, updatedEntity.firstName, updatedEntity.lastName);
//     }

//     await passwordResetTokenModel.findByIdAndDelete(tokenData._id);

//     const entityData = updatedEntity.toObject() as any;
//     delete entityData.password;

//     const token = jwt.sign(
//         { id: entityData._id, role: entityData.role },
//         process.env.JWT_SECRET_PHONE as string
//     );

//     return {
//         success: true,
//         message: `${type === "company" ? "Company" : "Email"} verified successfully`,
//         data: token,
//     };
// };

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
		token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET_PHONE as string);
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
export const getBlockedUserService=async(req: Request, res: Response)=>{
	// Extract page and limit from query parameters, with defaults
	const page = parseInt((req.query.page as string) || '1', 10);
	const limit = parseInt((req.query.limit as string) || '10', 10);

	// Validate page and limit
	if (page < 1 || limit < 1) {
		return res.status(400).json({
			success: false,
			message: 'Page and limit must be positive integers',
		});
	}

	// Calculate skip value for pagination
	const skip = (page - 1) * limit;

	// Query for blocked users with pagination
	const blockedUsers = await usersModel
		.find({ isBlocked: true })
		.skip(skip)
		.limit(limit)
		.select('-password') // Exclude password field from response
		.lean(); // Convert to plain JavaScript objects

	// Get total count of blocked users for pagination metadata
	const totalBlockedUsers = await usersModel.countDocuments({ isBlocked: true });

	// Calculate total pages
	const totalPages = Math.ceil(totalBlockedUsers / limit);

	// Prepare response
	return {
		success: true,
		message: 'Blocked users retrieved successfully',
		data: {
			users: blockedUsers,
			pagination: {
				currentPage: page,
				limit,
				totalUsers: totalBlockedUsers,
				totalPages,
				hasNextPage: page < totalPages,
				hasPreviousPage: page > 1,
			},
		},
	};
}

export const updateUserDetailsService = async (user: any,payload: any, res: Response) => {
	const id = user?.id ?? null;
	if (!id) return errorResponseHandler("User not authenticated", httpStatusCode.UNAUTHORIZED, res);
	const userDetails = await usersModel.findById(id);
	if (!userDetails) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);
	const updateduser = await usersModel.findByIdAndUpdate(id, { ...payload }, { new: true });
	if (!updateduser) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);
	return {
		success: true,
		message: "Details updated successfully",
		data: updateduser,
	};
};
export const resendOtpService = async (email: string, res: Response) => {
	const userData = await usersModel.find({ email });
	if (!userData) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);
	const EmailVerificationToken = await generatePasswordResetToken(email);
			if (EmailVerificationToken) {
				await sendUserVerificationEmail(email, EmailVerificationToken.token);
			} else {
				return errorResponseHandler("Failed to send email verification", httpStatusCode.INTERNAL_SERVER_ERROR, res);
			}
	return {
		success: true,
		message: "Resend otp successfully",
	};
};

export const getUserInfoService = async (userData: any, res: Response) => {
	const user = await usersModel.findById(userData.id);
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
	if (!existingToken) return errorResponseHandler("Invalid OTP", httpStatusCode.BAD_REQUEST, res);

	const hasExpired = new Date(existingToken.expires) < new Date();
	if (hasExpired) return errorResponseHandler("OTP expired", httpStatusCode.BAD_REQUEST, res);
	return { success: true, message: "OTP verified successfully" };
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

	const existingCompany = await companyModels.findOne({ companyName });
	if (!existingCompany) return errorResponseHandler("Company doesn't exist.", httpStatusCode.CONFLICT, res);

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
		isVerifiedByCompany: "approved",
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
export const getAllUserForCompanyService = async (company: any,payload: any, res: Response) => {
	const page = parseInt(payload.page as string) || 1;
	const limit = parseInt(payload.limit as string) || 10;
	const skip = (page - 1) * limit;
	const companyDetails = await companyModels.find({_id:company.currentUser});
	const users = await usersModel.find({companyName:companyDetails[0]?.companyName, isVerifiedByCompany:"approved"}) .sort({ createdAt: -1 })
	.skip(skip)
	.limit(limit);
	const totalUsers = await usersModel.countDocuments({companyName:companyDetails[0]?.companyName, isVerifiedByCompany:"approved"});
	if (!users) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);

	return {
		success: true,
		message: "User fetched successfully",
		data: {
			users,
		
			totalUsers,
			page,
			limit,
		},
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

// export const getHomePageService = async (payload: any, res: Response) => {
// 	//TODO: SUGGESTED COLLECTION ACCORDING TO THE SEARCH OF USER
// 	const suggestedCollection = await collectionModel.find().limit(1);
// 	if (!suggestedCollection) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);
    
// 	const trendingAudio = await userAudioHistoryModel.aggregate([
// 		{
// 			$group: {
// 				_id: "$audio_id", // Ensure this field exists in userAudioHistoryModel
// 				count: { $sum: 1 },
// 			},
// 		},
// 		{
// 			$sort: { count: -1 },
// 		},
// 		{
// 			$limit: 5,
// 		},
// 		{
// 			$lookup: {
// 				from: "audios", // Ensure the collection name is correct
// 				localField: "_id", // Ensure this matches the field in userAudioHistoryModel
// 				foreignField: "_id", // Ensure this matches the field in the audios collection
// 				as: "audioDetails",
// 			},
// 		},
// 		{
// 			$unwind: {
// 				path: "$audioDetails",
// 				preserveNullAndEmptyArrays: false, // Exclude unmatched documents
// 			},
// 		},
// 	]);

// 	const collection = await collectionModel.find();
	
// 	const meditationType = await bestForModel.aggregate([
// 		{
// 			$lookup: {
// 				from: "collections", // Ensure the collection name is correct
// 				localField: "_id", // Ensure this matches the field in bestForModel
// 				foreignField: "bestFor", // Ensure this matches the field in the collections collection
// 				as: "collections",
// 			},
// 		},
// 		{
// 			$unwind: {
// 				path: "$collections",
// 				preserveNullAndEmptyArrays: false, // Exclude unmatched documents
// 			},
// 		},
// 		{
// 			$lookup: {
// 				from: "audios", // Ensure the collection name is correct
// 				localField: "collections._id", // Ensure this matches the field in collections
// 				foreignField: "collectionType", // Ensure this matches the field in the audios collection
// 				as: "audios",
// 			},
// 		},
// 		{
// 			$group: {
// 				_id: "$_id",
// 				name: { $first: "$name" },
// 				audioCount: { $sum: { $size: "$audios" } },
// 			},
// 		},
// 	]);
// 	const bestForType = await bestForModel.find({ name: "Breathing" });
// 	const breathing = await AudioModel.find()
// 		.populate({
// 			path: "collectionType",
// 			match: { bestFor: new mongoose.Types.ObjectId(bestForType[0]._id) }, // Ensure 'breathing' is replaced with the correct ID
// 		})
// 		.exec();
// 	return {
// 		success: true,
// 		message: `Home page fetched successfully`,
// 		data: {
// 			suggestedCollection,
// 			trendingAudio,
// 			collection,
// 			breathing,
// 			meditationType,
// 		},
// 	};
// };


// export const getHomePageService = async (payload: any, res: Response) => {
//     // Suggested Collection with population
//     const suggestedCollection = await collectionModel
//         .find()
//         .limit(1)
//         .populate('bestFor')  // Populate bestFor
//         .populate('levels');  // Populate levels
//     if (!suggestedCollection) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);
    
//     // Trending Audio with population
//     const trendingAudio = await userAudioHistoryModel.aggregate([
//         {
//             $group: {
//                 _id: "$audio_id",
//                 count: { $sum: 1 },
//             },
//         },
//         {
//             $sort: { count: -1 },
//         },
//         {
//             $limit: 5,
//         },
//         {
//             $lookup: {
//                 from: "audios",
//                 localField: "_id",
//                 foreignField: "_id",
//                 as: "audioDetails",
//             },
//         },
//         {
//             $unwind: {
//                 path: "$audioDetails",
//                 preserveNullAndEmptyArrays: false,
//             },
//         },
//         {
//             $lookup: {
//                 from: "bestfors",  // Assuming this is the collection name for bestFor
//                 localField: "audioDetails.bestFor",
//                 foreignField: "_id",
//                 as: "audioDetails.bestFor",
//             },
//         },
//         {
//             $lookup: {
//                 from: "levels",  // Assuming this is the collection name for levels
//                 localField: "audioDetails.levels",
//                 foreignField: "_id",
//                 as: "audioDetails.levels",
//             },
//         },
//     ]);

//     // Collection with population
//     const collection = await collectionModel
//         .find()
//         .populate('bestFor')
//         .populate('levels');
    
//     const meditationType = await bestForModel.aggregate([
//         {
//             $lookup: {
//                 from: "collections",
//                 localField: "_id",
//                 foreignField: "bestFor",
//                 as: "collections",
//             },
//         },
//         {
//             $unwind: {
//                 path: "$collections",
//                 preserveNullAndEmptyArrays: false,
//             },
//         },
//         {
//             $lookup: {
//                 from: "audios",
//                 localField: "collections._id",
//                 foreignField: "collectionType",
//                 as: "audios",
//             },
//         },
//         {
//             $group: {
//                 _id: "$_id",
//                 name: { $first: "$name" },
//                 audioCount: { $sum: { $size: "$audios" } },
//             },
//         },
//     ]);

//     const bestForType = await bestForModel.find({ name: "Breathing" });

//     // Breathing with population
//     const breathing = await AudioModel
//         .find()
//         .populate({
//             path: "collectionType",
//             match: { bestFor: new mongoose.Types.ObjectId(bestForType[0]._id) },
//             populate: [
//                 { path: 'bestFor' },
//                 { path: 'levels' }
//             ]
//         })
//         .populate('bestFor')
//         .populate('levels')
//         .exec();

//     return {
//         success: true,
//         message: `Home page fetched successfully`,
//         data: {
//             suggestedCollection,
//             trendingAudio,
//             collection,
//             breathing,
//             meditationType,
//         },
//     };
// };


export const getHomePageService = async (payload: any, res: Response) => {
    // Suggested Collection with population
    const suggestedCollection = await collectionModel
        .find()
        .limit(1)
        .populate('bestFor')
        .populate('levels');
    if (!suggestedCollection) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);
    
    // Trending Audio with population
    const trendingAudio = await userAudioHistoryModel.aggregate([
        {
            $group: {
                _id: "$audio_id",
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
                from: "audios",
                localField: "_id",
                foreignField: "_id",
                as: "audioDetails",
            },
        },
        {
            $unwind: {
                path: "$audioDetails",
                preserveNullAndEmptyArrays: false,
            },
        },
        {
            $lookup: {
                from: "bestfors",
                localField: "audioDetails.bestFor",
                foreignField: "_id",
                as: "audioDetails.bestFor",
            },
        },
        {
            $lookup: {
                from: "levels",
                localField: "audioDetails.levels",
                foreignField: "_id",
                as: "audioDetails.levels",
            },
        },
    ]);

    // Collection with audio count and audio details
    const collection = await collectionModel.aggregate([
        {
            $lookup: {
                from: "audios",
                localField: "_id",
                foreignField: "collectionType",
                as: "audios",
            },
        },
        {
            $project: {
                name: 1, // Include other fields you need
                bestFor: 1,
                levels: 1,
                audioCount: { $size: "$audios" },
                audios: 1, // Keep the audios array
            },
        },
        {
            $sort: { audioCount: -1 }, // Sort by audio count descending
        },
        {
            $limit: 1, // Get only the top collection
        },
        {
            $lookup: {
                from: "bestfors",
                localField: "bestFor",
                foreignField: "_id",
                as: "bestFor",
            },
        },
        {
            $unwind: {
                path: "$bestFor",
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $lookup: {
                from: "levels",
                localField: "levels",
                foreignField: "_id",
                as: "levels",
            },
        },
        // Add population for audios' bestFor and levels
        {
            $unwind: {
                path: "$audios",
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $lookup: {
                from: "bestfors",
                localField: "audios.bestFor",
                foreignField: "_id",
                as: "audios.bestFor",
            },
        },
        {
            $lookup: {
                from: "levels",
                localField: "audios.levels",
                foreignField: "_id",
                as: "audios.levels",
            },
        },
        {
            $group: {
                _id: "$_id",
                name: { $first: "$name" },
                bestFor: { $first: "$bestFor" },
                levels: { $first: "$levels" },
                audioCount: { $first: "$audioCount" },
                audios: { $push: "$audios" },
            },
        },
    ]);

    const meditationType = await bestForModel.aggregate([
        {
            $lookup: {
                from: "collections",
                localField: "_id",
                foreignField: "bestFor",
                as: "collections",
            },
        },
        {
            $unwind: {
                path: "$collections",
                preserveNullAndEmptyArrays: false,
            },
        },
        {
            $lookup: {
                from: "audios",
                localField: "collections._id",
                foreignField: "collectionType",
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

    // Breathing with population
    const breathing = await AudioModel
        .find()
        .populate({
            path: "collectionType",
            match: { bestFor: new mongoose.Types.ObjectId(bestForType[0]._id) },
            populate: [
                { path: 'bestFor' },
                { path: 'levels' }
            ]
        })
        .populate('bestFor')
        .populate('levels')
        .exec();

    return {
        success: true,
        message: `Home page fetched successfully`,
        data: {
            suggestedCollection,
            trendingAudio,
            collection: collection[0], // Return single object instead of array
            breathing,
            meditationType,
        },
    };
};