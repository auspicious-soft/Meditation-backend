import { Schema, model } from 'mongoose';

const companyJoinRequestsSchema = new Schema({
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

export const companyJoinRequestsModel = model('companyJoinRequests', companyJoinRequestsSchema)