import axios from "axios"
import { configDotenv } from "dotenv"
import { Request, Response } from "express"
import { SortOrder } from "mongoose"

configDotenv()

const { AWS_REGION, AWS_BUCKET_NAME } = process.env;

export const checkValidAdminRole = (req: Request, res: Response, next: any) => {
    const { role } = req.headers
    if (role !== 'admin') return res.status(403).json({ success: false, message: "Invalid role" })
    else return next()
}
export const checkValidCompanyRole = (req: Request, res: Response, next: any) => {
    const { role } = req.headers
    if (role !== 'company') return res.status(403).json({ success: false, message: "Invalid role" })
    else return next()
}

interface Payload {
    description?: string;
    order?: string;
    orderColumn?: string;
}

export const queryBuilder = (payload: Payload, querySearchKeyInBackend = ["name"]) => {
  
    let { description = "", order = "", orderColumn = "" } = payload;
    const query = description ? { $or: querySearchKeyInBackend.map((key) => ({ [key]: { $regex: description, $options: "i" } })) } : {};
    const sort: { [key: string]: SortOrder } = order && orderColumn ? { [orderColumn]: order === "asc" ? 1 : -1 } : {};
  
    return { query, sort };
  };
export const convertToBoolean = (value: string) => {
    if (value === 'true') return true
    else if (value === 'false') return false
    else return value
}

export function timestampToDateString(timestamp: number): string {
    return new Date(timestamp * 1000).toISOString(); // e.g., "2025-05-16T07:37:58.000Z"
  }