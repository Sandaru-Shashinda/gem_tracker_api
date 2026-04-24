import mongoose from "mongoose"
import { GEM_STATUSES } from "../constants/index.js"

const GemSchema = new mongoose.Schema(
  {
    gemId: { type: String, unique: true, required: true }, // GRC Number
    status: {
      type: String,
      enum: GEM_STATUSES,
      default: GEM_STATUSES.DRAFT_INTAKE,
    },
    currentAssignee: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Basic Info (from Intake)
    color: String,
    weight: Number, // Weight (ct)

    itemDescription: String, // Full textual description
    images: [{ type: mongoose.Schema.Types.ObjectId, ref: "Image" }],

    // assignees (from Intake)
    assignedTester1: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedTester2: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    reportTypes: [String],
    // Intake specific
    intake: {
      helperId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      timestamp: Date,
    },

    reportId: { type: mongoose.Schema.Types.ObjectId, ref: "Report" },
  },
  { timestamps: true },
)

export default mongoose.model("Gem", GemSchema)
