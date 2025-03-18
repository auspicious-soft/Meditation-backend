import bcrypt from "bcryptjs";
import e, { Response } from "express";
import { errorResponseHandler } from "../../lib/errors/error-response-handler";
import { httpStatusCode } from "../../lib/constant";
import { sendCompanyCreationEmail } from "src/utils/mails/mail";
import { companyModels } from "src/models/company/company-schema";
import { customAlphabet } from "nanoid";
import { queryBuilder } from "src/utils";
import { adminModel } from "src/models/admin/admin-schema";
import { usersModel } from "src/models/user/user-schema";

const schemas = [adminModel, usersModel, companyModels]; // Add all schemas to the array

export const companyCreateService = async (
  payload: any,
  req: any,
  res: Response
) => {
  const { companyName, email, password } = payload;

  if (
    [companyName, email, password].some(
      (field) => !field || field.trim() === ""
    )
  ) {
    return errorResponseHandler(
      "All fields are required to create a company",
      httpStatusCode.BAD_REQUEST,
      res
    );
  }

  

  let existingUser = null;
  for (const schema of schemas) {
    existingUser = await (schema as any).findOne({ email });
    if (existingUser) break;
  }

  if (existingUser) {
    return errorResponseHandler("email already exists", httpStatusCode.CONFLICT, res);
  }

  // Check if the company name already exists
  const existingCompanyName = await companyModels.findOne({ companyName });
  if (existingCompanyName) {
    return errorResponseHandler(
      "Company name already exists",
      httpStatusCode.CONFLICT,
      res
    );
  }
  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);
  const identifier = customAlphabet("0123456789", 5);
  // Create a new company
  const newCompany = new companyModels({
    companyName,
    identifier: identifier(),
    email: email.toLowerCase().trim(),
    password: hashedPassword,
  });

  // Save the company to the database
  await newCompany.save();

  // Send email to the company
  await sendCompanyCreationEmail(email, companyName);

  const companyData = newCompany.toObject() as any;
  delete companyData.password;

  return {
    success: true,
    message: "Company created successfully",
    data: companyData,
  };
};

export const getCompaniesService = async (payload: any) => {
  const page = parseInt(payload.page as string) || 1;
  const limit = parseInt(payload.limit as string) || 10;
  const skip = (page - 1) * limit;

  const { query} = queryBuilder(payload, ["companyName", "email"]);
  const companies = await companyModels
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  const totalCompanies = await companyModels.countDocuments(query);

  return {
    success: true,
    data: companies,
    total: totalCompanies,
    page,
    limit,
    statusCode: httpStatusCode.OK,
  };
};

export const updateCompanyService = async (payload: any, req: any, res: Response) => {
  const { companyName, email, password } = payload;

  if (
    [companyName, email, password].some(
      (field) => !field || field.trim() === ""
    )
  ) {
    return errorResponseHandler(
      "All fields are required to update a company",
      httpStatusCode.BAD_REQUEST,
      res
    );
  }

  const existingCompany = await companyModels.findOne({ email });
  // Check if the email exists
  if (!existingCompany) {
    return errorResponseHandler(
      "Company does not exist",
      httpStatusCode.NOT_FOUND,
      res
    );
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Update the company
  const updatedCompany = await companyModels.findOneAndUpdate(
    { email },
    {
      companyName,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
    },
    { new: true }
  );
  
  if (!updatedCompany) {
    return errorResponseHandler(
      "Failed to update the company",
      httpStatusCode.INTERNAL_SERVER_ERROR,
      res
    );
  }

  const companyData = updatedCompany.toObject() as any;
  delete companyData.password;

  return {
    success: true,
    message: "Company updated successfully",
    data: companyData,
    statusCode: httpStatusCode.OK,
  };
};

export const getCompanyByIdService = async (id: string,res:Response) => {
  const company = await companyModels.findById(id);
  if (!company) {
    return errorResponseHandler(
      "Company not found",
      httpStatusCode.NOT_FOUND,
      res
    );
  }

  const companyData = company.toObject() as any;
  delete companyData.password;

  return {
    success: true,
    data: companyData,
    statusCode: httpStatusCode.OK,
  };
}

export const deleteCompanyService = async (id: string, res: Response) => {
  const company = await companyModels.findByIdAndDelete(id);
  if (!company) {
    return errorResponseHandler(
      "Company not found",
      httpStatusCode.NOT_FOUND,
      res
    );
  }

  return {
    success: true,
    message: "Company deleted successfully",
    statusCode: httpStatusCode.OK,
  };
};