import mongoose from "mongoose"

const observationsSchema = {
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
  // Colour breakdown printed in the large report. Tone and saturation are
  // graded Low | Medium | High.
  hue: String,
  tone: String,
  saturation: String,
  comments: String,
  itemDescription: String,
  specialNote: String,
  treatment: String,
  // Per-treatment checklist printed on the large report. Each value is "Yes" | "No"
  // or "" / absent when the lab has not assessed it — a deliberate tri-state, since
  // "not tested" and "tested, not present" are different claims on a certificate.
  // Keys and their section grouping are mirrored in the app's lib/treatments.ts.
  treatments: {
    heatTreatment: String,
    irradiationTreatment: String,
    hpht: String,
    diffusionTreatment: String,
    dyeing: String,
    bleaching: String,
    fractureFillingOil: String,
    fractureFillingResinGlass: String,
    laserDrilling: String,
    coating: String,
  },
  colourGrade: Number,
  finalGrade: Number,
  isHeated: { type: Boolean, default: false },
  showHeatInReport: { type: Boolean, default: false },
  isEmerald: { type: Boolean, default: false },
  isMixCut: { type: Boolean, default: false },
}

const GemTest2Schema = new mongoose.Schema(
  {
    gemId: { type: mongoose.Schema.Types.ObjectId, ref: "Gem", required: true, unique: true },
    // R.I. is a range: a doubly refractive stone gives two readings (birefringence).
    // riMax is absent for a singly refractive stone and every reader treats that as
    // "the same reading as riMin". Records written while R.I. was a single value keep
    // their `ri`, which the app reads as a fallback for both ends.
    riMin: Number,
    riMax: Number,
    ri: Number,
    sg: Number,
    // One reading — what the lab measured. The species' published hardness range lives
    // on GemReference and is what this value is scored against.
    hardness: Number,
    observations: observationsSchema,
    testerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    timestamp: Date,
    selectedVariety: String,
    correctionRequested: { type: Boolean, default: false },
    correctionNote: String,
  },
  { timestamps: true },
)

export default mongoose.model("GemTest2", GemTest2Schema)
