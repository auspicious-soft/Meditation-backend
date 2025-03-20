import { adminModel } from "../../models/admin/admin-schema";
import bcrypt from "bcryptjs";
import { Response } from "express";
import { errorResponseHandler } from "../../lib/errors/error-response-handler";
import { httpStatusCode } from "../../lib/constant";
import { queryBuilder } from "../../utils";
import { sendPasswordResetEmail } from "src/utils/mails/mail";
import {
  generatePasswordResetToken,
  getPasswordResetTokenByToken,
  generatePasswordResetTokenByPhone,
} from "src/utils/mails/token";
import { generatePasswordResetTokenByPhoneWithTwilio } from "../../utils/sms/sms";
import { passwordResetTokenModel } from "src/models/password-token-schema";
import { usersModel } from "src/models/user/user-schema";
import { companyModels } from "../../models/company/company-schema"; 
import jwt from "jsonwebtoken";
import { getAllSubscriptionsHandler } from "src/controllers/subscription/subscription-controller";
import { getAllSubscriptions } from "../subscription/subscription-service";

const schemas = [adminModel, usersModel, companyModels];

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
  if(!user.emailVerified){
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
    token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.MOBILE_JWT_SECRET as string      
    );
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

export const forgotPasswordService = async (payload: any, res: Response) => {
  const { email } = payload;
  const countryCode = "+45";
  const toNumber = Number(email);
  const isEmail = isNaN(toNumber);
  let user: any = null;

  for (const schema of schemas) {
    if (isEmail) {
      user = await (schema as any)
        .findOne({ email: email })
        .select("+password");
    }
    if (user) break; // Exit the loop if user is found
  }

  if (!user)
    return errorResponseHandler(
      "User not found while trying to reset password",
      httpStatusCode.NOT_FOUND,
      res
    );

  if (isEmail) {
    const passwordResetToken = await generatePasswordResetToken(email);
    if (passwordResetToken) {
      const err = await sendPasswordResetEmail(email, passwordResetToken.token);
      console.log("err:", err);
      return { success: true, message: "Password reset email sent with OTP" };
    }
  } 

  return errorResponseHandler(
    "Failed to generate password reset token",
    httpStatusCode.INTERNAL_SERVER_ERROR,
    res
  );
};

export const newPassswordAfterOTPVerifiedService = async (
  payload: { password: string; otp: string },
  res: Response
) => {
  const { password, otp } = payload;
  const existingToken = await getPasswordResetTokenByToken(otp);
  if (!existingToken)
    return errorResponseHandler("Invalid OTP", httpStatusCode.BAD_REQUEST, res);
  const hasExpired = new Date(existingToken.expires) < new Date();
  if (hasExpired)
    return errorResponseHandler("OTP expired", httpStatusCode.BAD_REQUEST, res);

  let user: any = null;
  for (const schema of schemas) {
    if (existingToken.email) {
      user = await (schema as any).findOne({ email: existingToken.email });
    } else if (existingToken.phoneNumber) {
      user = await (schema as any).findOne({
        phoneNumber: existingToken.phoneNumber,
      });
    }
    if (user) break; // Exit the loop if user is found
  }

  if (!user)
    return errorResponseHandler(
      "User not found",
      httpStatusCode.NOT_FOUND,
      res
    );

  const hashedPassword = await bcrypt.hash(password, 10);
  const response = await user.updateOne(
    { password: hashedPassword },
    { new: true }
  );
  await passwordResetTokenModel.findByIdAndDelete(existingToken._id);
  return {
    success: true,
    message: "Password updated successfully",
    data: response,
  };
};

export const getAllUsersService = async (payload: any) => {
  const page = parseInt(payload.page as string) || 1;
  const limit = parseInt(payload.limit as string) || 0;
  const offset = (page - 1) * limit;
  const { query, sort } = queryBuilder(payload, ["fullName"]);
  const totalDataCount =
    Object.keys(query).length < 1
      ? await usersModel.countDocuments()
      : await usersModel.countDocuments(query);
  const results = await usersModel
    .find(query)
    .sort(sort)
    .skip(offset)
    .limit(limit)
    .select("-__v");
  if (results.length)
    return {
      page,
      limit,
      success: true,
      total: totalDataCount,
      data: results,
    };
  else {
    return {
      data: [],
      page,
      limit,
      success: false,
      total: 0,
    };
  }
};

export const getAUserService = async (id: string, res: Response) => {
  // const user = await usersModel.findById(id);
  // if (!user) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);
  // const userProjects = await projectsModel.find({ userId: id }).select("-__v");
  // return {
  //     success: true,
  //     message: "User retrieved successfully",
  //     data: {
  //         user,
  //         projects: userProjects.length > 0 ? userProjects : [],
  //     }
  // };
};

export const updateAUserService = async (
  id: string,
  payload: any,
  res: Response
) => {
  const user = await usersModel.findById(id);
  if (!user)
    return errorResponseHandler(
      "User not found",
      httpStatusCode.NOT_FOUND,
      res
    );
  const countryCode = "+45";
  payload.phoneNumber = `${countryCode}${payload.phoneNumber}`;
  const updateduser = await usersModel.findByIdAndUpdate(
    id,
    { ...payload },
    { new: true }
  );
  return {
    success: true,
    message: "User updated successfully",
    data: updateduser,
  };
};

export const deleteAUserService = async (id: string, res: Response) => {
  const user = await usersModel.findById(id);
  if (!user) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);
  await usersModel.findByIdAndDelete(id);
  return {
      success: true,
      message: "User deleted successfully",
      data: null
  };
};

// Dashboard
export const getDashboardStatsService = async (payload: any, res: Response) => {
  // const ongoingProjectCount = await projectsModel.countDocuments({status: { $ne: "1" } });
  // const completedProjectCount = await projectsModel.countDocuments({status: "1" });
  // const workingProjectDetails = await projectsModel.find({status: { $ne: "1" } }).select("projectName projectimageLink projectstartDate projectendDate status"); // Adjust the fields as needed
  // const sevenDaysAgo = new Date(new Date().setDate(new Date().getDate() - 7));
  // const recentProjectDetails = await projectsModel.find({createdAt: { $gte: sevenDaysAgo } }).select("projectName projectimageLink projectstartDate projectendDate"); // Adjust the fields as needed
  // const response = {
  //     success: true,
  //     message: "Dashboard stats fetched successfully",
  //     data: {
  //       ongoingProjectCount,
  //       completedProjectCount,
  //       workingProjectDetails,
  //       recentProjectDetails,
  //     }
  // };
  // return response;
};

export const AnalyticsService = async ( res: Response) => {
  const totalUser = await usersModel.countDocuments();
  const activeUsers = await usersModel.countDocuments({isAccountActive: true});
  const newUser = await usersModel.countDocuments({createdAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 7)) }});
  const totalDownload = 1220;
  const totalAudioPlays = 1220;
  const allSubscription = await getAllSubscriptions()
  const subscriptionExpireToday = allSubscription.filter((sub) => new Date(sub.current_period_end) === new Date(new Date().setDate(new Date().getDate() + 1)))
  // const paymentToday = allSubscription.filter((sub) => new Date(sub.created) === new Date(new Date().setDate(new Date().getDate() )))
  const paymentToday = allSubscription.filter((sub) => {
    const subDate = new Date(sub.created);
    const today = new Date();
  
    // Set both subDate and today to midnight (removing time part)
    subDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
  
    return subDate.getTime() === today.getTime();
  });

  return {
      success: true,
      message: "Analysis fetched successfully",
      data: {
        totalUser,
        activeUsers,
        totalDownload,
        totalAudioPlays,
        newUser,
        subscriptionExpireToday,
        paymentToday

      }
  };
};

