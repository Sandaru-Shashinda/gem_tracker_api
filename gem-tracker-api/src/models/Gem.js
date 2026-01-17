import mongoose from "mongoose"

const GemSchema = new mongoose.Schema(
  {
    gemId: { type: String, unique: true, required: true }, // GRC Number
    status: {
      type: String,
      enum: ["INTAKE", "READY_FOR_T1", "READY_FOR_T2", "READY_FOR_APPROVAL", "COMPLETED"],
      default: "INTAKE",
    },

    // Basic Info (Mostly from Intake)
    color: String,
    emeraldWeight: Number, // Weight of the main stone (ct)
    diamondWeight: Number, // Total weight of side stones (ct)
    totalArticleWeight: Number, // Total weight in grams (g)
    shape: String,
    cut: String,
    itemDescription: String, // Full textual description

    // Intake specific
    intake: {
      helperId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      timestamp: Date,
    },

    // Measurements & Observations (From Testers/Approver)
    measurements: {
      cluster: String, // e.g. 20.88 x 19.05 x 13.80 mm
      stone: String, // e.g. 14.25 x 12.25 x 8.75 mm
      transparency: String,
      geographicOrigin: String,
      cutting: String,
      polishing: String,
      proportion: String,
      clarity: String,
      species: String,
      variety: String,
      comments: String,
    },

    test1: {
      ri: Number,
      sg: Number,
      hardness: Number,
      observations: {
        shape: String,
        cut: String,
        transparency: String,
        clarity: String,
        origin: String,
        species: String,
        variety: String,
      },
      notes: String,
      testerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      timestamp: Date,
    },

    test2: {
      ri: Number,
      sg: Number,
      hardness: Number,
      observations: {
        shape: String,
        cut: String,
        transparency: String,
        clarity: String,
        origin: String,
        species: String,
        variety: String,
      },
      notes: String,
      testerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      timestamp: Date,
    },

    finalApproval: {
      ri: Number,
      sg: Number,
      hardness: Number,
      finalObservations: {
        cluster: String,
        stone: String,
        shape: String,
        cut: String,
        transparency: String,
        origin: String,
        species: String,
        variety: String,
        cuttingGrade: String,
        polishingGrade: String,
        proportionGrade: String,
        clarityGrade: String,
        comments: String,
      },
      itemDescription: String,
      reportUrl: String,
      qrCode: String,
      approverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      timestamp: Date,
    },
  },
  { timestamps: true },
)

export default mongoose.model("Gem", GemSchema)
