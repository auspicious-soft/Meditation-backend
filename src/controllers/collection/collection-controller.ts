import { Request, Response } from "express"
import { httpStatusCode } from "src/lib/constant"
import { errorParser } from "src/lib/errors/error-response-handler"
import { createCollectionService, deleteCollectionService, getAllCollectionsService, getCollectionByIdService, getCollectionWithAudioService, getFilteredCollectionsService, updateCollectionService } from "src/services/collection/collection-service"

export const createCollection = async (req: Request, res: Response) =>{
  try {
     const response: any = await createCollectionService(req, res)
            return res.status(httpStatusCode.CREATED).json(response)
  } catch (error) {
      const { code, message } = errorParser(error)
          return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" })
    }
}

export const getAllCollections = async (req: Request, res: Response) =>{
  try {
     const response: any = await getAllCollectionsService(req, res)
            return res.status(httpStatusCode.CREATED).json(response)
  } catch (error) {
      const { code, message } = errorParser(error)
          return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" })
    }
}

export const getCollectionById = async (req: Request, res: Response) =>{
  try {
     const response: any = await getCollectionByIdService(req?.params?.id, res)
            return res.status(httpStatusCode.CREATED).json(response)
  } catch (error) {
      const { code, message } = errorParser(error)
          return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" })
    }
}

export const getCollectionWithAudio = async (req: Request, res: Response) =>{
  try {
     const response: any = await getCollectionWithAudioService(req, res)
            return res.status(httpStatusCode.CREATED).json(response)
  } catch (error) {
      const { code, message } = errorParser(error)
          return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" })
    }
}

export const updateCollection = async (req: Request, res: Response) =>{
  try {
     const response: any = await updateCollectionService(req, res)
            return res.status(httpStatusCode.OK).json(response)
  } catch (error) {
      const { code, message } = errorParser(error)
          return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" })
    }
}

export const deleteCollection = async (req: Request, res: Response) =>{
  try {
     const response: any = await deleteCollectionService(req, res)
            return res.status(httpStatusCode.OK).json(response)
  } catch (error) {
      const { code, message } = errorParser(error)
          return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" })
    }
}
export const getFilteredCollections = async (req: Request, res: Response) =>{
  try {
     const response: any = await getFilteredCollectionsService(req, res)
            return res.status(httpStatusCode.CREATED).json(response)
  } catch (error) {
      const { code, message } = errorParser(error)
          return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" })
    }
}