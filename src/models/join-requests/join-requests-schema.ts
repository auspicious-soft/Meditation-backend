import { Schema, model } from 'mongoose';

const joinRequestsSchema = new Schema({
    userId: {
        type: Schema.ObjectId,
        ref: "users",
    },
    companyId: {
        type: Schema.ObjectId,
        ref: "companies",
    },
    status: {
        type: String,
        enum:["Pending","Approved","Rejected"],
        default:"Pending",
        required: true
    },

},
    { timestamps: true }
)

export const joinRequestsModel = model('joinRequests', joinRequestsSchema)