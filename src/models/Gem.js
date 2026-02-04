import mongoose from "mongoose"
import { GEM_STATUSES } from "../const/const.js"

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
    imageUrl: String,
    googleDriveFileId: String,

    // assignees (from Intake)
    assignedTester1: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedTester2: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    // Intake specific
    intake: {
      helperId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      timestamp: Date,
    },

    test1: {
      ri: Number,
      sg: Number,
      hardness: Number,
      observations: {
        grade: String,
        shape: String,
        cut: String,
        transparency: String,
        messurementX: Number,
        messurementY: Number,
        messurementZ: Number,
        species: String,
        variety: String,
        spectroscopy: String,
        origin: String,
        cuttingGrade: String,
        polishingGrade: String,
        proportionGrade: String,
        clarityGrade: String,
        comments: String,
        itemDescription: String,
        specialNote: String,
      },
      testerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      timestamp: Date,
      correctionRequested: { type: Boolean, default: false },
      correctionNote: String,
    },

    test2: {
      ri: Number,
      sg: Number,
      hardness: Number,
      observations: {
        grade: String,
        shape: String,
        cut: String,
        transparency: String,
        messurementX: Number,
        messurementY: Number,
        messurementZ: Number,
        species: String,
        variety: String,
        spectroscopy: String,
        origin: String,
        cuttingGrade: String,
        polishingGrade: String,
        proportionGrade: String,
        clarityGrade: String,
        comments: String,
        itemDescription: String,
        specialNote: String,
      },
      testerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      timestamp: Date,
      correctionRequested: { type: Boolean, default: false },
      correctionNote: String,
    },

    finalApproval: {
      ri: Number,
      sg: Number,
      hardness: Number,
      finalObservations: {
        grade: String,
        shape: String,
        cut: String,
        transparency: String,
        messurementX: Number,
        messurementY: Number,
        messurementZ: Number,
        species: String,
        variety: String,
        spectroscopy: String,
        origin: String,
        cuttingGrade: String,
        polishingGrade: String,
        proportionGrade: String,
        clarityGrade: String,
        comments: String,
        itemDescription: String,
        specialNote: String,
      },
      approverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      timestamp: Date,
    },

    reportId: { type: mongoose.Schema.Types.ObjectId, ref: "Report" },
  },
  { timestamps: true },
)

export default mongoose.model("Gem", GemSchema)
