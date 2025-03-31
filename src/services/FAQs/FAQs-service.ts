import { Response, Request } from "express";
import { httpStatusCode } from "src/lib/constant";
import { errorResponseHandler } from "src/lib/errors/error-response-handler";
import { faqsModel } from "src/models/FAQs/FAQs-schema";

// Create FAQ
export const createFAQService = async (payload: any, res: Response) => {
    try {
        const faq = await faqsModel.create(payload);
        return { success: true, message: "FAQ created successfully", data: faq };
    } catch (error) {
        console.error('Error in createFAQService:', error);
        throw error;
    }
};

// Get All FAQs
export const getAllFAQsService = async (res: Response) => {
    try {
        const faqs = await faqsModel.find().sort({ createdAt: -1 });
        return { success: true, message: "FAQs fetched successfully", data: faqs };
    } catch (error) {
        console.error('Error in getAllFAQsService:', error);
        throw error;
    }
};

// Get Single FAQ
export const getAllFAQService = async ( res: Response) => {
    try {
        const faq = await faqsModel.find();
        if (!faq) return errorResponseHandler("FAQ not found", httpStatusCode.NOT_FOUND, res);
        return { success: true, message: "FAQs fetched successfully", data: faq };
    } catch (error) {
        console.error('Error in getFAQByIdService:', error);
        throw error;
    }
};
export const getFAQByIdService = async (id: string, res: Response) => {
    try {
        const faq = await faqsModel.findById(id);
        if (!faq) return errorResponseHandler("FAQ not found", httpStatusCode.NOT_FOUND, res);
        return { success: true, message: "FAQ fetched successfully", data: faq };
    } catch (error) {
        console.error('Error in getFAQByIdService:', error);
        throw error;
    }
};

// Update FAQ
export const updateFAQService = async (id: string, payload: any, res: Response) => {
    try {
        const faq = await faqsModel.findByIdAndUpdate(id, payload, { new: true });
        if (!faq) return errorResponseHandler("FAQ not found", httpStatusCode.NOT_FOUND, res);
        return { success: true, message: "FAQ updated successfully", data: faq };
    } catch (error) {
        console.error('Error in updateFAQService:', error);
        throw error;
    }
};

// Delete FAQ
export const deleteFAQService = async (id: string, res: Response) => {
    try {
        const faq = await faqsModel.findByIdAndDelete(id);
        if (!faq) return errorResponseHandler("FAQ not found", httpStatusCode.NOT_FOUND, res);
        return { success: true, message: "FAQ deleted successfully" };
    } catch (error) {
        console.error('Error in deleteFAQService:', error);
        throw error;
    }
};