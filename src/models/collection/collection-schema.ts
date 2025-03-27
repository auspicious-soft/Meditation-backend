import mongoose from "mongoose";

const CollectionSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
		},
		imageUrl: {
			type: String,
		},
		levels: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "levels",
			},
		],
		bestFor: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "BestFor",
			},
		],
		description: {
			type: String,
			required: true,
			trim: true,
		},
		isActive: { type: Boolean, default: true },
	},
	{
		timestamps: true,
	}
);

export const collectionModel = mongoose.model("collection", CollectionSchema);
