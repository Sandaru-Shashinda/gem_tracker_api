import mongoose from "mongoose"
import { CONTACT_STATUSES } from "../constants/index.js"

/**
 * A message sent from the public "Send Us a Message" form on grc.lk.
 *
 * Written by an unauthenticated visitor, so every field here is untrusted input:
 * the controller picks the four fields below by hand rather than passing the body
 * through, and `status` / `handledBy` are only ever set by the laboratory side.
 */
const ContactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true, maxlength: 40 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
    message: { type: String, trim: true, maxlength: 5000, default: "" },

    status: {
      type: String,
      enum: Object.values(CONTACT_STATUSES),
      default: CONTACT_STATUSES.NEW,
    },

    /** Which front end the message came from, so a second site is distinguishable later. */
    source: { type: String, default: "grc.lk", maxlength: 120 },

    /** Who on the GRC side picked the message up, stamped when it leaves NEW. */
    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    handledAt: Date,

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
)

// The inbox is always "not deleted, newest first", optionally narrowed to one status.
ContactMessageSchema.index({ isDeleted: 1, status: 1, createdAt: -1 })
// Backs the repeat-submission check in the controller.
ContactMessageSchema.index({ email: 1, createdAt: -1 })

export default mongoose.model("ContactMessage", ContactMessageSchema)
