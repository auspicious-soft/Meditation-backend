import { Resend } from "resend";
import ForgotPasswordEmail from "./templates/forgot-password-reset";
import { configDotenv } from "dotenv";

configDotenv();
const resend = new Resend(process.env.RESEND_API_KEY);

export const sendPasswordResetEmail = async (email: string, token: string) => {
  return await resend.emails.send({
    from: process.env.COMPANY_RESEND_GMAIL_ACCOUNT as string,
    to: email,
    subject: "Reset your password",
    react: ForgotPasswordEmail({ otp: token }),
  });
};

export const sendCompanyCreationEmail = async (email: string, companyName: string) => {
  return await resend.emails.send({
    from: process.env.COMPANY_RESEND_GMAIL_ACCOUNT as string,
    to: email,
    subject: "Company Added Successfully",
    html: `
      <h3>Welcome to our platform, ${companyName}!</h3>
      <p>Your company has been Added successfully.Thank you for choosing us.</p>
      
    `,
  });
};

export const sendUserSignupEmail = async (email: string, firstName: string,lastName:string) => {
  return await resend.emails.send({
    from: process.env.COMPANY_RESEND_GMAIL_ACCOUNT as string,
    to: email,
    subject: "Welcome to our platform",
    html: `
      <h3>Welcome to our platform, ${firstName} ${lastName}!</h3>
      <p>Your account has been created successfully.Thank you for choosing us.</p>
      
    `,
  });
}

export const sendUserVerificationEmail = async (email: string, verificationCode: string) => {
  return await resend.emails.send({
    from: process.env.COMPANY_RESEND_GMAIL_ACCOUNT as string,
    to: email,
    subject: "Verify your email address",
    html: `
      <h3>Verify your email address</h3>
      <p>Please verify your email address by entering the following verification code: ${verificationCode}</p>
      
    `,
  });
}
