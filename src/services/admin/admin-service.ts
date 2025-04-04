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
import { getAllSubscriptions } from "../subscription/subscription-service";
interface BlockRequestBody {
  isBlocked: boolean;
}
const schemas = [adminModel, usersModel, companyModels];

export const loginService = async (payload: any, req: any, res: Response) => {
  const { email, password } = payload;
  let user: any = null;
  const isMobileApp = req.headers["x-client-type"] === "mobile";
  for (const schema of schemas) {
    user = await (schema as any).findOne({ email }).select("+password");
    if (user) break;
  }
  if (!user) {
    return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);
  }
  if(user.role !== "admin") {
  if( !user.emailVerified){
    return errorResponseHandler("Please verify email to login", httpStatusCode.FORBIDDEN, res);
  }
  if (user.isBlocked) {
    return errorResponseHandler("User is blocked", httpStatusCode.FORBIDDEN, res);
  }

  if (!user.isAccountActive) {
    return errorResponseHandler("User account is not activated", httpStatusCode.FORBIDDEN, res);
  }}
  // if (isMobileApp &&  user.role !== "admin" && user.isVerifiedByCompany !== "approved") {
  //   return errorResponseHandler("User is not verified by company", httpStatusCode.FORBIDDEN, res);
  // }
  // if(!isMobileApp && user.role !== "admin" && user.isVerifiedByAdmin !== "approved" ){
  //   return errorResponseHandler("User is not verified by Admin", httpStatusCode.FORBIDDEN, res);
  // }
  if(isMobileApp && user.role ==="user"){
    const company = await companyModels.find({companyName:user.companyName});    
    if(!company || company.length === 0) return errorResponseHandler("Company not found", httpStatusCode.NOT_FOUND, res);                                                 
    if(company[0].subscriptionStatus === "inactive"){
      return errorResponseHandler("Company subscription is inactive", httpStatusCode.FORBIDDEN, res);
    }
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return errorResponseHandler("Invalid email or password", httpStatusCode.UNAUTHORIZED, res);
  }
  
  const userObject = user.toObject();
  delete userObject.password;

  let token;
  if (isMobileApp) {
    token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET_PHONE as string      
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
export const verifyOtpPasswordResetService = async (token: string, res: Response) => {
  const existingToken = await getPasswordResetTokenByToken(token);
  if (!existingToken) return errorResponseHandler("Invalid otp", httpStatusCode.BAD_REQUEST, res);

  const hasExpired = new Date(existingToken.expires) < new Date();
  if (hasExpired) return errorResponseHandler("OTP expired", httpStatusCode.BAD_REQUEST, res);
  return { success: true, message: "OTP verified successfully" };
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
  const user = await usersModel.findById(id);
  if (!user) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);
  return {
      success: true,
      message: "User retrieved successfully",
      data:user
    
  };
};

export const updateAUserService = async (
  id: string,
  payload: any,
  res: Response
) => {
  if(!payload) return errorResponseHandler(
    "No data provided to update",
    httpStatusCode.BAD_REQUEST,
    res
  )
  const user = await usersModel.findById(id);
  if (!user)
    return errorResponseHandler(
      "User not found",
      httpStatusCode.NOT_FOUND,
      res
    );
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
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const companies = await companyModels.find({
      subscriptionExpiryDate: {
        $gte: today,
        $lte: nextWeek,
      },
    });
    // const recentUsers = await companyModels.find({ createdAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 15)) } });
    const recentUsers = await companyModels.find().sort({ createdAt: -1 }).limit(10);
    if (!recentUsers){
      return {
        success: true,
        message: "No users created in the last 15 days",
        data: [],
      };
    }
    if (!companies){
      return {
        success: true,
        message: "No companies found with subscriptions expiring within a week",
        data: [],
      };
    }

    return {
      success: true,
      message: "Dashboard fetched successfully",
      data: {companies, recentUsers},
    };
  
};

export const AnalyticsService = async ( res: Response) => {
  const totalUser = await usersModel.countDocuments();
  const activeUsers = await usersModel.countDocuments({isAccountActive: true});
  const newUser = await usersModel.find({createdAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 7)) }}).limit(10);
  const totalDownload = 0;
  const totalAudioPlays = 0;
  const allSubscription = await getAllSubscriptions()
  const subscriptionExpireToday = allSubscription.subscriptions.filter((sub) => new Date(sub.current_period_end) === new Date(new Date().setDate(new Date().getDate() + 1)))
  // const paymentToday = allSubscription.filter((sub) => new Date(sub.created) === new Date(new Date().setDate(new Date().getDate() )))
  const paymentToday = allSubscription.subscriptions.filter((sub) => {
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

export const getAdminDetailService = async(req :any, res: Response)=>{
  const admin = await adminModel.findOne({_id: req.currentUser});
  if(!admin) return errorResponseHandler("Admin not found", httpStatusCode.NOT_FOUND, res);
  return {
    success: true,
    message: "Admin fetched successfully",
    data: admin
  }
}
export const updateAdminService = async(req :any, res: Response)=>{
  const{firstName, lastName, email} = req.body;
  const updatedAdmin = await adminModel.findByIdAndUpdate(req.currentUser, {
    firstName: firstName,
    lastName: lastName,
    email: email,
    fullName:firstName + " " + lastName
  }, {new: true});
  if(!updatedAdmin) return errorResponseHandler("Admin not found", httpStatusCode.NOT_FOUND, res);
  return {
    success: true,
    message: "Admin updated successfully",
    data: updatedAdmin
  }
}
export const updateAdminProfilepicService = async(req :any, res: Response)=>{
  const updatedAdmin = await adminModel.findByIdAndUpdate(req.currentUser, {profilePic: req.body.profilePic}, {new: true});
  if(!updatedAdmin) return errorResponseHandler("Admin not found", httpStatusCode.NOT_FOUND, res);
  return {
    success: true,
    message: "Admin profile picture updated successfully",
    data: updatedAdmin
  }
}
export const toggleBlockedUserService = async (req: any, res: Response) => {
 const { id } = req.params;

  // Validate ID
  if (!id) {
    return errorResponseHandler("Company ID is required", httpStatusCode.BAD_REQUEST, res);
  }

  // Extract isBlocked from request body
  const body = req.body as unknown;
  const { isBlocked } = body as BlockRequestBody;

  // Validate request body
  if (typeof isBlocked !== "boolean") {
    return errorResponseHandler(
      "isBlocked must be a boolean value",
      httpStatusCode.BAD_REQUEST,
      res
    );
  }

  // Find and update the company
  const company = await usersModel.findByIdAndUpdate(
    id,
    { isBlocked },
    { new: true, runValidators: true } // Return updated document and validate schema
  );

  // Check if company exists
  if (!company) {
    return errorResponseHandler("Company not found", httpStatusCode.NOT_FOUND, res);
  }

  // Prepare response data (excluding password)
  const companyData = company.toObject() as any;
  delete companyData.password;

  // Return success response
  return {
    success: true,
    data: companyData,
    message: `Company ${isBlocked ? "blocked" : "unblocked"} successfully`,
    statusCode: httpStatusCode.OK,
  };
}