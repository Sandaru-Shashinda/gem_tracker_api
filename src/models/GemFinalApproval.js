import mongoose from "mongoose"

const finalObservationsSchema = {
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
  treatment: String,
  colour: String,
  colourGrade: Number,
  finalGrade: Number,
  isHeated: { type: Boolean, default: false },
  isEmerald: { type: Boolean, default: false },
  isMixCut: { type: Boolean, default: false },
}

const GemFinalApprovalSchema = new mongoose.Schema(
  {
    gemId: { type: mongoose.Schema.Types.ObjectId, ref: "Gem", required: true, unique: true },
    riMin: Number,
    riMax: Number,
    sg: Number,
    hardnessMin: Number,
    hardnessMax: Number,
    finalObservations: finalObservationsSchema,
    approverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    timestamp: Date,
    finalVariety: String,
    approverCorrectionRequested: { type: Boolean, default: false },
    approverCorrectionNote: String,
  },
  { timestamps: true },
)

export default mongoose.model("GemFinalApproval", GemFinalApprovalSchema)
