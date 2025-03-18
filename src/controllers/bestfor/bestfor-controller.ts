import { Request, Response } from "express"
import { httpStatusCode } from "src/lib/constant"
import { errorParser } from "src/lib/errors/error-response-handler"
import { createBestForService, deleteBestForService, getAllBestForService, getBestForByIdService, updateBestForService } from "src/services/bestfor/bestfor-service"

export const createBestFor = async (req: Request, res: Response) =>{
  try {
     const response: any = await createBestForService(req, res)
            return res.status(httpStatusCode.CREATED).json(response)
  } catch (error) {
      const { code, message } = errorParser(error)
          return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" })
    }
}

export const getAllBestFor = async (req: Request, res: Response) =>{
  try {
     const response: any = await getAllBestForService(req, res)
            return res.status(httpStatusCode.OK).json(response)
  } catch (error) {
      const { code, message } = errorParser(error)
          return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" })
    }
}

export const getBestForById = async (req: Request, res: Response) =>{
  try {
     const response: any = await getBestForByIdService(req, res)
            return res.status(httpStatusCode.OK).json(response)
  } catch (error) {
      const { code, message } = errorParser(error)
          return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" })
    }
}

export const updateBestFor = async (req: Request, res: Response) =>{
  try {
     const response: any = await updateBestForService(req, res)
            return res.status(httpStatusCode.OK).json(response)
  } catch (error) {
      const { code, message } = errorParser(error)
          return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" })
    }
}

export const deleteBestFor = async (req: Request, res: Response) =>{
  try {
     const response: any = await deleteBestForService(req, res)
            return res.status(httpStatusCode.OK).json(response)
  } catch (error) {
      const { code, message } = errorParser(error)
          return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" })
    }
}