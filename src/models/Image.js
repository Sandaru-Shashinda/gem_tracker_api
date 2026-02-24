import mongoose from "mongoose"

const ImageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // Display name or custom name
    originalName: { type: String }, // Original file name
    url: { type: String }, // Can be a data URI or proxy URL
    data: { type: String, required: true }, // Base64 encoded image data
    category: { type: String, default: "general" },

    description: { type: String },
    tags: [{ type: String }],
    mimeType: { type: String },
    size: { type: Number },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
)

export default mongoose.model("Image", ImageSchema)
