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


export const subscriptionExpireReminder = async (payload: any) => {
  console.log('payload: ', payload);
  await resend.emails.send({
      from: process.env.COMPANY_RESEND_GMAIL_ACCOUNT as string,
      to: "mansi@auspicioussoft.com",
      subject: "Subscription Expiry Reminder",
      text: `Hello ${payload.name },

We hope you're enjoying our services! This is a friendly reminder that your subscription is set to expire on ${payload.expiryDate}.

To continue enjoying uninterrupted access, please renew your subscription before the expiration date.


If you have any questions or need assistance, feel free to contact our support team.

Best regards,  
${process.env.COMPANY_NAME} Team`
});
};
// Renew Now: ${payload.renewalLink}

export const sendUserLoginCredentialsEmail = async (email: string, firstName: string,lastName:string, password: string, companyName: string) => {
  return await resend.emails.send({
    from: process.env.COMPANY_RESEND_GMAIL_ACCOUNT as string,
    // to: email,
    to: "mansi@auspicioussoft.com",
    subject: "Your Login Credentials",
    html: `
      <h3>Your Login Credentials</h3>
      <p>Hello ${firstName} ${lastName},</p>
      <p>Your account has been successfully created. Please use the following credentials to log in:</p>
      <p><strong>Username:</strong> ${email}</p>
      <p><strong>Password:</strong> ${password}</p>
      <p>We recommend you change your password after logging in for security purposes.</p>
      <p>If you did not request this, please ignore this email or contact our support team.</p>
      <br>
      <p>Best regards,</p>
      <p>The ${companyName} Team</p>
    `,
  });
}
