import { Request, Response } from "express"
import { errorResponseHandler } from "../../lib/errors/error-response-handler"
import { usersModel } from "../../models/user/user-schema"
import bcrypt from "bcryptjs"
import { adminModel } from "../../models/admin/admin-schema";
import { generatePasswordResetToken, generatePasswordResetTokenByPhone, getPasswordResetTokenByToken } from "../../utils/mails/token"
import { sendPasswordResetEmail, sendUserLoginCredentialsEmail, sendUserSignupEmail, sendUserVerificationEmail } from "../../utils/mails/mail"
import { generatePasswordResetTokenByPhoneWithTwilio } from "../../utils/sms/sms"
import { httpStatusCode } from "../../lib/constant"
import { customAlphabet } from "nanoid"
import { companyModels } from "src/models/company/company-schema";
import { queryBuilder } from "src/utils";
import { passwordResetTokenModel } from "src/models/password-token-schema";

const schemas = [usersModel, companyModels,adminModel]; 

export const signupService = async (payload: any, res: Response) => {
   const {email,lastName,firstName,password,dob,gender,companyName} = payload

   let existingUser = null;
  for (const schema of schemas) {
    existingUser = await (schema as any).findOne({ email });
    if (existingUser) break;
  }

  if (existingUser) {
    return errorResponseHandler("User email already exists", httpStatusCode.CONFLICT, res);
  }
    const hashedPassword = await bcrypt.hash(password, 10)
    const identifier = customAlphabet("0123456789", 5);
    const newUser = new usersModel({
        identifier: identifier(),
        email,  
        firstName,
        lastName,
        password: hashedPassword,
        dob: new Date(dob).toISOString().slice(0, 10),
        gender,
        companyName
    })
     await newUser.save()

    
     const userData = newUser.toObject() as any;
    delete userData.password;
    const EmailVerificationToken = await generatePasswordResetToken(userData.email);
    if(EmailVerificationToken){
        await sendUserVerificationEmail(userData.email, EmailVerificationToken.token);
    }else{
        return errorResponseHandler("Failed to send email verification", httpStatusCode.INTERNAL_SERVER_ERROR, res)
    }
    return {
        success: true,
        message: "Email verification code send successfully verify email to signup successfully",
        data: userData
    }
}

export const verifyEmailService = async (req: any, res: Response) => {
    const {token} = req.body
    console.log('token:', token);
    const tokenData = await getPasswordResetTokenByToken(token);
    console.log('tokenData:', tokenData);
    if (!tokenData) return errorResponseHandler("Invalid token", httpStatusCode.FORBIDDEN, res);
    const getUser = await usersModel.findOne({email: tokenData.email})
    if(!getUser) return errorResponseHandler("User not found with this signup first." , httpStatusCode.NOT_FOUND, res)
    const user = await usersModel.findByIdAndUpdate(getUser._id, { emailVerified: true }, { new: true });
    if (!user) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);
    await sendUserSignupEmail(user.email, user.firstName, user.lastName);
    await passwordResetTokenModel.findByIdAndDelete(tokenData._id);
    return { success: true, message: "Email verified successfully" };
}

export const loginService = async (payload: any, res: Response) => {
    const { email, phoneNumber, password } = payload
    const query = email ? { email } : { phoneNumber };
    const client = await usersModel.findOne(query).select('+password')
    if (!client) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res)
    const isPasswordValid = bcrypt.compareSync(password, client.password)
    if (!isPasswordValid) return errorResponseHandler("Invalid password", httpStatusCode.UNAUTHORIZED, res)
    const clientObject: any = client.toObject()
    delete clientObject.password
    return { success: true, message: "Login successful", data: clientObject }
}

export const editUserInfoService = async (id: string, payload: any, res: Response) => {
    const user = await usersModel.findById(id);
    if (!user) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);
    
    if (payload.password) {
        payload.password = await bcrypt.hash(payload.password, 10);
      }    

    const updateduser = await usersModel.findByIdAndUpdate(id,{ ...payload },{ new: true});
    if (!updateduser) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);
    return {
        success: true,
        message: "User updated successfully",
        data: updateduser,
    };
}

export const getUserInfoService = async (id: string, res: Response) => {
    const user = await usersModel.findById(id);
    if (!user) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);
    return {
        success: true,
        message: "User info fetched successfully",
        data: user
    };
}

export const getAllUsersService = async (payload: any) => {
      const page = parseInt(payload.page as string) || 1;
       const limit = parseInt(payload.limit as string) || 10;
       const skip = (page - 1) * limit;
     
       const { query} = queryBuilder(payload, ["firstName", "email","identifier"]);
       const companies = await usersModel
         .find(query)
         .sort()
         .skip(skip)
         .limit(limit);
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
    const client = await usersModel.findOne({ email })
    if (!client) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res)
    return {
        success: true,
        message: "Client info fetched successfully",
        data: client
    }
}

export const forgotPasswordService = async (payload: any, res: Response) => {
    const { email, phoneNumber, password } = payload
    const query = email ? { email } : { phoneNumber };

    const client = await usersModel.findOne(query)
    if (!client) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res)

    if (email) {
        const passwordResetToken = await generatePasswordResetToken(email)
        if (passwordResetToken !== null) {
            await sendPasswordResetEmail(email, passwordResetToken.token)
            return { success: true, message: "Password reset email sent with otp" }
        }

    }
    else {
        const generatePasswordResetTokenBysms = await generatePasswordResetTokenByPhone(phoneNumber)

        if (generatePasswordResetTokenBysms !== null) {
            await generatePasswordResetTokenByPhoneWithTwilio(phoneNumber, generatePasswordResetTokenBysms.token)
            return { success: true, message: "Password reset sms sent with otp" }
        }
    }
}

export const verifyOtpPasswordResetService = async (token: string, res: Response) => {
    const existingToken = await getPasswordResetTokenByToken(token)
    if (!existingToken) return errorResponseHandler("Invalid token", httpStatusCode.BAD_REQUEST, res)

    const hasExpired = new Date(existingToken.expires) < new Date()
    if (hasExpired) return errorResponseHandler("OTP expired", httpStatusCode.BAD_REQUEST, res)
    return { success: true, message: "Token verified successfully" }
}


export const newPassswordAfterOTPVerifiedService = async (payload: { password: string, otp: string }, res: Response) => {
    const { password, otp } = payload
    const existingToken = await getPasswordResetTokenByToken(otp)
    if (!existingToken) return errorResponseHandler("Invalid OTP", httpStatusCode.BAD_REQUEST, res)

        // console.log("existingToken", existingToken);

    const hasExpired = new Date(existingToken.expires) < new Date()
    if (hasExpired) return errorResponseHandler("OTP expired", httpStatusCode.BAD_REQUEST, res)

    let existingClient:any;

    if (existingToken.email) {
        existingClient = await adminModel.findOne({ email: existingToken.email });
        if (!existingClient) {
            existingClient = await usersModel.findOne({ email: existingToken.email });
        }
        if (!existingClient) return errorResponseHandler('User not found', httpStatusCode.NOT_FOUND, res);

    }
    else if (existingToken.phoneNumber) {

        existingClient = await usersModel.findOne({ phoneNumber: existingToken.phoneNumber });
        if (!existingClient) {
            existingClient = await usersModel.findOne({ phoneNumber: existingToken.phoneNumber });
        }
        if (!existingClient) return errorResponseHandler('User not found', httpStatusCode.NOT_FOUND, res);

    }

    // console.log('existingClient',existingClient)

    const hashedPassword = await bcrypt.hash(password, 10)

    if(existingClient.role =='admin'){
        const response = await adminModel.findByIdAndUpdate(existingClient._id, { password: hashedPassword }, { new: true })
    }else{
        const response = await usersModel.findByIdAndUpdate(existingClient._id, { password: hashedPassword }, { new: true }) 
    }



    // await passwordResetTokenModel.findByIdAndDelete(existingToken._id)

    return {
        success: true,
        message: "Password updated successfully"
    }
}

export const passwordResetService = async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body
    const getAdmin = await usersModel.findById(req.params.id).select("+password")
    if (!getAdmin) return errorResponseHandler("Admin not found", httpStatusCode.NOT_FOUND, res)

    const passwordMatch = bcrypt.compareSync(currentPassword, getAdmin.password)
    if (!passwordMatch) return errorResponseHandler("Current password invalid", httpStatusCode.BAD_REQUEST, res)
    const hashedPassword = bcrypt.hashSync(newPassword, 10)
    const response = await usersModel.findByIdAndUpdate(req.params.id, { password: hashedPassword })
    return {
        success: true,
        message: "Password updated successfully",
        data: response
    }
}

// Create a new user
export const createUserService = async (payload: any, res: Response) => {
    const { email, firstName, lastName, password, dob, gender, companyName} = payload;

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
        companyName
    });
    await newUser.save(); 
    await sendUserLoginCredentialsEmail(email,firstName ,lastName, password , companyName);
    const userData = newUser.toObject();

    return {
        success: true,
        message: "User created successfully",
        data: userData
    };
};

// Read user by ID
export const getUserForCompanyService = async (id: string, res: Response) => {
    const user = await usersModel.findById(id);
    if (!user) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);

    return {
        success: true,
        message: "User fetched successfully",
        data: user
    };
};
export const getAllUserForCompanyService = async (payload:any, res: Response) => {
    //TODO : change this to user id FOR COMPANY NAME  from token
    const users = await usersModel.find({companyName:payload.companyName});
    if (!users) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);

    return {
        success: true,
        message: "User fetched successfully",
        data: users
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
        message: "User deleted successfully"
    };
};
export const deactivateUserService = async (id: string, res: Response) => {
    try {
        const user = await usersModel.findById(id);
        if (!user) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);

        // Toggle the isActive field
        user.isAccountActive = !user.isAccountActive;
        await user.save();

        return {
            success: true,
            message: `User ${user.isAccountActive ? "activated" : "deactivated"} successfully`,
        };
    } catch (error) {
        console.error("Error in deactivateUserService:", error);
        return errorResponseHandler("An error occurred", httpStatusCode.INTERNAL_SERVER_ERROR, res);
    }
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
}