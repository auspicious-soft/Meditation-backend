import { Request, Response } from "express"
import { httpStatusCode } from "../../lib/constant"
import { errorParser } from "../../lib/errors/error-response-handler"
import { clientSignupSchema, passswordResetSchema } from "../../validation/client-user"
import { formatZodErrors } from "../../validation/format-zod-errors"
import { loginService, signupService, forgotPasswordService, newPassswordAfterOTPVerifiedService, passwordResetService, getUserInfoService, getUserInfoByEmailService, editUserInfoService, verifyOtpPasswordResetService, getAllUsersService, verifyEmailService, createUserService, getUserForCompanyService, getAllUserForCompanyService, deactivateUserService, deleteUserService, getDashboardStatsService, getHomePageService, resendOtpService, updateUserDetailsService, getBlockedUserService } from "../../services/user/user"
import { z } from "zod"
import mongoose from "mongoose"

export const signup = async (req: Request, res: Response) => {
    try {
        const response: any = await signupService(req.body,req, res)
        return res.status(httpStatusCode.CREATED).json(response)
    }
    catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" })
    }
}

export const verifyEmail = async(req:Request,res:Response)=>{
    try {
        const response = await verifyEmailService(req, res)               
        return res.status(httpStatusCode.OK).json(response)
    } catch (error) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" })        
    }
}

export const login = async (req: Request, res: Response) => {
    try {
        const response = await loginService(req.body,req, res)
        return res.status(httpStatusCode.OK).json(response)
    }
    catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" })
    }
}

export const forgotPassword = async (req: Request, res: Response) => {
    // const { email } = req.body
    // const validation = z.string().email().safeParse(email)
    // if (!validation.success) return res.status(httpStatusCode.BAD_REQUEST).json({ success: false, message: formatZodErrors(validation.error) })
    try {
        const response = await forgotPasswordService(req.body, res)
        return res.status(httpStatusCode.OK).json(response)
    }
    catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" })
    }
}

export const verifyOtpPasswordReset = async (req: Request, res: Response) => {
    const { otp } = req.body
    try {
        const response = await verifyOtpPasswordResetService(otp, res)
        return res.status(httpStatusCode.OK).json(response)
    }
    catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" })
    }
}

export const newPassswordAfterOTPVerified = async (req: Request, res: Response) => {
    try {
        const response = await newPassswordAfterOTPVerifiedService(req.body, res)
        return res.status(httpStatusCode.OK).json(response)
    }
    catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
}

export const passwordReset = async (req: Request, res: Response) => {
    const validation = passswordResetSchema.safeParse(req.body)
    if (!validation.success) return res.status(httpStatusCode.BAD_REQUEST).json({ success: false, message: formatZodErrors(validation.error) })
    try {
        const response = await passwordResetService(req, res)
        return res.status(httpStatusCode.OK).json(response)
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
}


export const getUserInfo = async (req: Request, res: Response) => {
    try {
        
        const response = await getUserInfoService(req.params, res)
        return res.status(httpStatusCode.OK).json(response)
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
}
export const getCurrentUserInfoHandler = async (req: Request, res: Response) => {
    try {
        
        const response = await getUserInfoService(req.user, res)
        return res.status(httpStatusCode.OK).json(response)
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
}

export const getUserInfoByEmail = async (req: Request, res: Response) => {
    try {
        const response = await getUserInfoByEmailService(req.params.email, res)
        return res.status(httpStatusCode.OK).json(response)
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
}
   
export const editUserInfo = async (req: Request, res: Response) => {
    try {
        const response = await editUserInfoService(req.params.id, req.body, res);
        return res.status(httpStatusCode.OK).json(response)
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
}
export const updateUserDetails = async (req: Request, res: Response) => {
    try {
        console.log('req.user: ', req.user);
        const response = await updateUserDetailsService(req.user, req.body, res);
        return res.status(httpStatusCode.OK).json(response)
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
}

export const getAllUsers = async (req: Request, res: Response) => {
    try { 
        const response = await getAllUsersService(req.query)
        return res.status(httpStatusCode.OK).json(response)
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
}

// Dashboard
export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const response = await getDashboardStatsService(req, res)
        return res.status(httpStatusCode.OK).json(response)
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
}

export const createUser = async (req: Request, res: Response) => {
    try {
        const response = await createUserService(req.body, res);
        return res.status(httpStatusCode.CREATED).json(response);
    } catch (error: any) {
        const { code, message } = errorParser(error);
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
};

export const getAllUserForCompany = async (req: Request, res: Response) => {
    try {
        const response = await getAllUserForCompanyService(req,res);
        return res.status(httpStatusCode.OK).json(response);
    } catch (error: any) {
        const { code, message } = errorParser(error);
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
};

export const deactivateUser = async (req: Request, res: Response) => {
    try {
        const response = await deactivateUserService(req.params.id, res);
        return res.status(httpStatusCode.OK).json(response);
    } catch (error: any) {
        const { code, message } = errorParser(error);
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    try {
        const response = await deleteUserService( req.params.id, res); 
        return res.status(httpStatusCode.OK).json(response);
    } catch (error: any) {
        const { code, message } = errorParser(error);
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
};

export const getHomePage =async(req:Request, res:Response)=>{
    try {
        const response = await getHomePageService( req.params.id, res); 
        return res.status(httpStatusCode.OK).json(response);
    } catch (error: any) {
        const { code, message } = errorParser(error);
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
} 
export const resendOtp =async(req:Request, res:Response)=>{
    try {
        const response = await resendOtpService( req.body.email, res); 
        return res.status(httpStatusCode.OK).json(response);
    } catch (error: any) {
        const { code, message } = errorParser(error);
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
} 
export const getAllBlockedUser =async(req:Request, res:Response)=>{
    try {
        const response = await getBlockedUserService( req.body.email, res); 
        return res.status(httpStatusCode.OK).json(response);
    } catch (error: any) {
        const { code, message } = errorParser(error);
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
} 

