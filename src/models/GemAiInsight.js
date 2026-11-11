import mongoose from "mongoose"

/**
 * One AI read of a gem: what it was given and what it said.
 *
 * Kept for two reasons. The free Gemini tier allows few requests a day, so asking again
 * with exactly the same photos and readings answers from here instead of spending one.
 * And laid beside the gem's final approval later, these are the record of how often
 * each suggestion turned out right.
 *
 * The inputs are only instrument readings and photos — never another stage's findings —
 * so a result is safe to hand to anyone who enters the same readings.
 */
const GemAiInsightSchema = new mongoose.Schema(
  {
    gem: { type: mongoose.Schema.Types.ObjectId, ref: "Gem", required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    /** sha256 of the prompt version, the normalised readings and the photos used. */
    inputHash: { type: String, required: true },
    readings: { type: mongoose.Schema.Types.Mixed },
    /** Photos the AI was given that it could read. */
    imageCount: Number,
    /** Photos it was given; more than imageCount when some could not be read. */
    imageSourceCount: Number,
    model: String,
    result: { type: mongoose.Schema.Types.Mixed },
  },
  // minimize off: a photo-less result has `fields: {}`, which Mongoose would otherwise drop.
  { timestamps: true, minimize: false },
)

GemAiInsightSchema.index({ gem: 1, inputHash: 1 })
GemAiInsightSchema.index({ gem: 1, requestedBy: 1, createdAt: -1 })

export default mongoose.model("GemAiInsight", GemAiInsightSchema)
