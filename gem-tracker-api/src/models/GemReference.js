import mongoose from "mongoose"

const GemReferenceSchema = new mongoose.Schema({
  species: String,
  variety: String,
  riMin: Number,
  riMax: Number,
  sgMin: Number,
  sgMax: Number,
  hardness: String,
})

// Index for efficient range queries
GemReferenceSchema.index({ riMin: 1, riMax: 1, sgMin: 1, sgMax: 1 })

export default mongoose.model("GemReference", GemReferenceSchema)
