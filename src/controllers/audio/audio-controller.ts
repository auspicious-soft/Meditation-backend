import { Request, Response } from "express"
import { httpStatusCode } from "src/lib/constant"
import { errorParser } from "src/lib/errors/error-response-handler"
import { deleteAudioService, getAllAudiosService, getAudioByIdService, updateAudioService, uploadAudioService } from "src/services/audio/audio-services"


export const uploadAudio = async (req: Request, res: Response) =>{
  try {
     const response: any = await uploadAudioService(req, res)
            return res.status(httpStatusCode.CREATED).json(response)
  } catch (error) {
      const { code, message } = errorParser(error)
          return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" })
    }
}

export const getAllAudio = async (req: Request, res: Response) =>{
  try {
     const response: any = await getAllAudiosService(req, res)
            return res.status(httpStatusCode.OK).json(response)
  } catch (error) {
      const { code, message } = errorParser(error)
          return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" })
    }
}

export const getAudioById = async (req: Request, res: Response) =>{
  try {
     const response: any = await getAudioByIdService(req, res)
            return res.status(httpStatusCode.OK).json(response)
  } catch (error) {
      const { code, message } = errorParser(error)
          return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" })
    }
}

export const updateAudio = async (req: Request, res: Response) =>{
  try {
     const response: any = await updateAudioService(req, res)
            return res.status(httpStatusCode.OK).json(response)
  } catch (error) {
      const { code, message } = errorParser(error)
          return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" })
    }
}

export const deleteAudio = async (req: Request, res: Response) =>{
  try {
     const response: any = await deleteAudioService(req, res)
            return res.status(httpStatusCode.OK).json(response)
  } catch (error) {
      const { code, message } = errorParser(error)
          return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" })
    }
}