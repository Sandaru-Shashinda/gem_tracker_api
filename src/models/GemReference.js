import mongoose from "mongoose"

const GemReferenceSchema = new mongoose.Schema({
  species: String,
  variety: String,
  // Using Min/Max for all rangeable numerical properties
  refractiveIndexMin: Number,
  refractiveIndexMax: Number,

  specificGravityMin: Number,
  specificGravityMax: Number,

  hardnessMin: Number,
  hardnessMax: Number,
})

// Index for efficient range queries on all numerical fields
GemReferenceSchema.index({
  refractiveIndexMin: 1,
  refractiveIndexMax: 1,
  specificGravityMin: 1,
  specificGravityMax: 1,
  hardnessMin: 1,
  hardnessMax: 1,
})

export default mongoose.model("GemReference", GemReferenceSchema)
