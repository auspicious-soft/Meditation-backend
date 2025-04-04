import { Resend } from "resend";
import ForgotPasswordEmail from "./templates/forgot-password-reset";
import { configDotenv } from "dotenv";

configDotenv()
const resend = new Resend(process.env.RESEND_API_KEY)

export const sendPasswordResetEmail = async (email: string, token: string) => {
  return await resend.emails.send({
    from: process.env.COMPANY_RESEND_GMAIL_ACCOUNT as string,
    to: email,
    subject: "Reset your password",
    react: ForgotPasswordEmail({ otp: token }),
  });
};

export const sendCompanyCreationEmail = async (email: string, companyName: string, password: string) => {
  return await resend.emails.send({
    from: process.env.COMPANY_RESEND_GMAIL_ACCOUNT as string,
    to: email,
    subject: "Company Added Successfully",
    html: `
      <h3>Welcome to our platform, ${companyName}!</h3>
      <p>Your company has been Added successfully.Thank you for choosing us.</p>
      <p>Below are your login credentials:</p>
      <p>email: ${email}</p>
      <p>password: ${password}</p>
      
    `,
  });
};
export const sendCompanySignupEmail = async (email: string, companyName: string) => {
  return await resend.emails.send({
    from: process.env.COMPANY_RESEND_GMAIL_ACCOUNT as string,
    to: email,
    subject: "Registration Successful!",
    html: `
      <h3>Welcome to our platform, ${companyName}!</h3>
      <p>Your company has been registered successfully. Thank you for choosing us!</p>
      <p>If you do not receive an approval email within 48 hours, please contact us.</p>
      <p>Below are your login credentials:</p>

      <p>If you need any assistance, feel free to <a href="mailto:support@inscape.life">Contact Us</a>.</p>
    `,
  });
};

export const sendUserSignupEmail = async (email: string, firstName: string) => {
  return await resend.emails.send({
    from: process.env.COMPANY_RESEND_GMAIL_ACCOUNT as string,
    to: email,
    subject: "Welcome to our platform",
    html: `
      <h3>Welcome to our platform, ${firstName} !</h3>
      <p>Your account has been created successfully.Thank you for choosing us.</p>
      
    `,
  });
}

export const sendUserVerificationEmail = async (email: string, verificationCode: string) => {
  try {
    console.log("Sending verification email with payload:", {
      email,
      verificationCode,
    });
    return await resend.emails.send({
      from: process.env.COMPANY_RESEND_GMAIL_ACCOUNT as string,
      to: email,
      subject: "Verify your email address",
      html: `
        <h3>Verify your email address</h3>
        <p>Please verify your email address by entering the following verification code: ${verificationCode}</p>
        <p>Thank you for signing up!</p>
      `,
    });
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new Error("Failed to send verification email.");
  }

}
export const sendWelcomeEmail = async (
  email: string,
  clientFirstName: string,
  // platformName: string,
  // supportLink: string
) => {
  try {

    const frontendURL = process.env.FRONTEND_URL || "https://panel.inscape.life";

    return await resend.emails.send({
      from: process.env.COMPANY_RESEND_GMAIL_ACCOUNT as string,
      to: email,
      subject: `🎉 Welcome to Inscape – Let’s Build Something Great!`,
      html: `
        <div style="font-family: sans-serif; line-height: 1.5;">
          <h3>Hi ${clientFirstName},</h3>
          <p>Welcome aboard! 🎉</p>
          <p>We’re thrilled to have you join the Inscape family.</p>
          <p>Our mission is to help you <strong>find inner peace</strong>, <strong>reduce stress</strong>, and <strong>improve your mindfulness</strong> through guided meditation. You're now part of a community that’s passionate about living a more balanced and fulfilled life.</p>
          <p>Here’s what to expect next:</p>
          <ul>
            <li>✅ A smooth setup experience</li>
            <li>✅ Personalized support whenever you need it</li>
            <li>✅ Powerful tools designed to help you meditate and unwind</li>
          </ul>
          <p>If you ever have questions or need a hand, don’t hesitate to reach out. We’re here for you every step of the way.</p>
          <p>Let’s get started!</p>
          <p><strong>Access your account:</strong> <a href="${frontendURL}" target="_blank" style="color: #4CAF50;">Login here</a> to start your meditation journey.</p>
          <p>Warm regards,</p>
          <p><strong>Dan</strong><br>Founder, Inscape</p>
          <a href="mailto:${process.env.COMPANY_RESEND_GMAIL_ACCOUNT}" style="color: #4CAF50;">${process.env.COMPANY_RESEND_GMAIL_ACCOUNT}</a>.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Error sending welcome email:", error);
    throw new Error("Failed to send welcome email.");
  }
};

// export const sendCompanyVerificationEmail = async (
//   email: string,
//   verificationCode: string
// ) => {
//   try {
//     console.log("Sending verification email with payload:", {
//       email,
//       verificationCode,
//     });

//     const frontendURL = process.env.FRONTEND_URL || "https://panel.inscape.life/verifyotp";
//     // const verificationLink = `${frontendURL}/verify-email?email=${encodeURIComponent(email)}&code=${encodeURIComponent(verificationCode)}`;
//     // console.log('verificationLink: ', verificationLink);

//     return await resend.emails.send({
//       from: process.env.COMPANY_RESEND_GMAIL_ACCOUNT as string,
//       to: email,
//       subject: "Verify your email address",
//       html: `
//         <h3>Verify your email address</h3>
//         <p>Please verify your email address by entering the following verification code:</p>
//         <h2>${verificationCode}</h2>
//         <p>Or click the link below to verify automatically:</p>
//         <a href="${frontendURL}" target="_blank">${frontendURL}</a>
//         <p>Thank you for signing up!</p>
//       `,
//     });
//   } catch (error) {
//     console.error("Error sending verification email:", error);
//     throw new Error("Failed to send verification email.");
//   }
// };
 
export const subscriptionExpireReminder = async (payload: any) => {
  await resend.emails.send({
      from: process.env.COMPANY_RESEND_GMAIL_ACCOUNT as string,
      to: payload.email,
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
    to: email,
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
// export const sendPromoCodeEmail = async (
//   email: string,
//   firstName: string,
//   promoCode: string,
//   companyName: string,
//   // discount?: string, // e.g., "20% off" or "$10 off"
//   // expirationDate?: string, // e.g., "March 31, 2025"
// ) => {
//   console.log('email: ', email);
//   console.log('firstName: ', firstName);
//   console.log('promoCode: ', promoCode);
//   console.log('companyName: ', companyName);
//   // console.log('discount: ', discount);
//   // console.log('expirationDate: ', expirationDate);
//   return await resend.emails.send({
//     from: process.env.COMPANY_RESEND_GMAIL_ACCOUNT as string,
//     to: email,
//     subject: "Exclusive Promo Code Just for You!",
//     html: `
//       <h3>Exclusive Offer Just for You!</h3>
//       <p>Hello ${firstName},</p>
      
//       <h4>Your Promo Code:</h4>
//       <p style="font-size: 18px; font-weight: bold; color: #007bff;">${promoCode}</p>
      
      
//       <p>Hurry! This offer won’t last forever.</p>
      
//       <a href="https://yourcompany.com" style="background-color: #007bff; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Shop Now</a>
      
//       <br><br>
//       <p>Best regards,</p>
//       <p>The ${companyName} Team</p>
//       `,
//     });
//   };
  // <p>Make sure to use this code at checkout before <strong>${expirationDate}</strong> to claim your discount.</p>
  
  // <p>We’re excited to offer you an exclusive promo code to enjoy ${discount} on your next purchase.</p>


  // export const sendPromoCodeEmail = async (
  //   email: string,
  //   firstName: string,
  //   lastName: string,
  //   promoCode: string,
  //   companyName: string,
  //   discount?: string, // e.g., "20% off" or "$10 off"
  //   expirationDate?: string // e.g., "March 31, 2025"
  // ) => {
  //   try {
  //     console.log("Sending promo code email with payload:", {
  //       email,
  //       firstName,
  //       lastName,
  //       promoCode,
  //       companyName,
  //       discount,
  //       expirationDate,
  //     });
  
  //     const response = await resend.emails.send({
  //       from: process.env.COMPANY_RESEND_GMAIL_ACCOUNT as string,
  //       to: email,
  //       subject: "🎉 Your Exclusive Promo Code is Here!",
  //       html: `
  //         <h3 style="color: #007bff;">🎉 Special Offer Just for You!</h3>
  //         <p>Hello ${firstName} ${lastName},</p>
          
  //         <p>We’re excited to offer you an exclusive promo code ${
  //           discount ? `to enjoy <strong>${discount}</strong>` : ""
  //         } on your next purchase.</p>
          
  //         <h4>Your Promo Code:</h4>
  //         <p style="font-size: 20px; font-weight: bold; color: #007bff; background: #f4f4f4; padding: 10px; display: inline-block; border-radius: 5px;">
  //           ${promoCode}
  //         </p>
          
  //         ${
  //           expirationDate
  //             ? `<p>Use this code before <strong>${expirationDate}</strong> to claim your discount.</p>`
  //             : `<p>Use this code at checkout and enjoy your savings!</p>`
  //         }
          
  //         <p>Hurry! This offer won't last forever.</p>
          
  //         <a href="https://yourcompany.com" style="background-color: #007bff; color: #fff; padding: 12px 20px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 16px;">
  //           🎁 Redeem Your Offer
  //         </a>
          
  //         <br><br>
  //         <p>Best regards,</p>
  //         <p>The ${companyName} Team</p>
  //       `,
  //     });
  
  //     console.log("Email sent successfully:", response);
  //     return response;
  //   } catch (error) {
  //     console.error("Error sending promo code email:", error);
  //     throw new Error("Failed to send promo code email.");
  //   }
  // };
  

  export const sendPromoCodeEmail = async (
    email: string,
    firstName: string,
    promoCode: string,
    // isPercentage:boolean,
    discount?: string, // e.g., "20% off" or "$10 off"
    expirationDate?: string // e.g., "March 31, 2025"
  ) => {
    try {
      console.log("Preparing to send promo code email:", {
        email,
        firstName,
        promoCode,
        discount,
        expirationDate,
      });
      const formattedDiscount = discount ? `${discount}%` : ""; 
      const response = await resend.emails.send({

        from: process.env.COMPANY_RESEND_GMAIL_ACCOUNT as string,
        to: email,
        subject: `🎉 Exclusive ${formattedDiscount || "Special"} Offer Inside – Inscape`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #007bff;">🎉 Unlock Your Exclusive Offer</h2>
        <p>Dear ${firstName},</p>
      
        <p>We are pleased to offer you an exclusive promo code ${
          discount ? `for <strong>${discount}%</strong>` : ""
        } on your next purchase.</p>
      
        <div style="background: #f8f9fa; padding: 15px; border-left: 5px solid #007bff; margin: 15px 0;">
          <strong style="font-size: 20px; color: #007bff;">${promoCode}</strong>
        </div>
      
        <p>
          ${
            expirationDate 
          ? `Use this code before <strong>${expirationDate}</strong> to claim your discount.`
          : `Use this code at checkout to enjoy your savings.`
          }
        </p>
              
        <p>Best regards,</p>
        <p><strong>The Inscape Team</strong></p>
          </div>
        `,
      });
  
      console.log("Promo code email sent successfully:", response);
      return response;
    } catch (error) {
      console.error("Error while sending promo code email:", error);
      throw new Error("Failed to send promo code email.");
    }
  };
  
  // <p style="margin-top: 20px;">
  //   <a href="https://yourcompany.com" 
  //      style="background-color: #007bff; color: #fff; padding: 12px 20px; 
  //             text-decoration: none; border-radius: 5px; font-size: 16px; 
  //             display: inline-block;">
  //     🎁 Redeem Your Offer
  //   </a>
  // </p>