import mongoose from "mongoose"

/**
 * A suggestion the lab has taken off a free-text field's dropdown.
 *
 * The dropdowns are built from what has been saved on gems (see getIdentifications), so a
 * typo saved once would be offered forever. Deleting it there would mean rewriting the
 * gem records it came from; instead the value is listed here and left out of the
 * dropdown, and the records keep what was actually written on them.
 */
const HiddenSuggestionSchema = new mongoose.Schema(
  {
    /** Which dropdown: a key of the identifications response (species, varieties, or a history list). */
    field: { type: String, required: true },
    /** The value as it was shown, for the References page. */
    value: { type: String, required: true },
    /** Trimmed and lower-cased — the dropdown lists match the same way. */
    key: { type: String, required: true },
    hiddenBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
)

HiddenSuggestionSchema.index({ field: 1, key: 1 }, { unique: true })

export default mongoose.model("HiddenSuggestion", HiddenSuggestionSchema)
