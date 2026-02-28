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
    images: [{ type: mongoose.Schema.Types.ObjectId, ref: "Image" }],

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
        cuttingShape: String,
        cuttingStyle: String,
        crownStyle: String,
        pavilionStyle: String,
        transparency: String,
        messurementX: Number,
        messurementY: Number,
        messurementZ: Number,
        species: String,
        variety: String,
        spectroscopy: String,
        origin: String,
        cuttingGrade: Number,
        polishingGrade: String,
        proportionGrade: String,
        clarityGrade: String,
        clarityEnhancement: String,
        comments: String,
        itemDescription: String,
        specialNote: String,
        colour: String,
        colourGrade: Number,
        finalGrade: Number,
      },
      testerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      timestamp: Date,
      selectedVariety: String,
      correctionRequested: { type: Boolean, default: false },
      correctionNote: String,
    },

    test2: {
      ri: Number,
      sg: Number,
      hardness: Number,
      observations: {
        grade: String,
        cuttingShape: String,
        cuttingStyle: String,
        crownStyle: String,
        pavilionStyle: String,
        transparency: String,
        messurementX: Number,
        messurementY: Number,
        messurementZ: Number,
        species: String,
        variety: String,
        spectroscopy: String,
        origin: String,
        cuttingGrade: Number,
        polishingGrade: String,
        proportionGrade: String,
        clarityGrade: String,
        clarityEnhancement: String,
        comments: String,
        itemDescription: String,
        specialNote: String,
        colour: String,
        colourGrade: Number,
        finalGrade: Number,
      },
      testerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      timestamp: Date,
      selectedVariety: String,
      correctionRequested: { type: Boolean, default: false },
      correctionNote: String,
    },

    finalApproval: {
      ri: Number,
      sg: Number,
      hardness: Number,
      finalObservations: {
        grade: String,
        cuttingShape: String,
        cuttingStyle: String,
        crownStyle: String,
        pavilionStyle: String,
        transparency: String,
        messurementX: Number,
        messurementY: Number,
        messurementZ: Number,
        species: String,
        variety: String,
        spectroscopy: String,
        origin: String,
        cuttingGrade: Number,
        polishingGrade: String,
        proportionGrade: String,
        clarityGrade: String,
        clarityEnhancement: String,
        comments: String,
        itemDescription: String,
        specialNote: String,
        colour: String,
        colourGrade: Number,
        finalGrade: Number,
      },
      approverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      timestamp: Date,
      finalVariety: String,
    },

    reportId: { type: mongoose.Schema.Types.ObjectId, ref: "Report" },
  },
  { timestamps: true },
)

export default mongoose.model("Gem", GemSchema)
