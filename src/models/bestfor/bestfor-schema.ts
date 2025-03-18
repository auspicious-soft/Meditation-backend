import mongoose from "mongoose";

const BestForSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true
   },
  icon: { 
    type: String
   },
  isActive: {
     type: Boolean, 
     default: true
     },
},{
  timestamps: true
});

export const bestForModel = mongoose.model('BestFor',BestForSchema);