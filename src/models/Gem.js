import mongoose from "mongoose"
import { GEM_STATUSES } from "../constants/index.js"

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
    // The gem's *latest* colour and weight: intake records them first, then each test
    // and approval stage pushes its own reading up here as it saves. Every stage also
    // keeps its own copy, so these two answer "where does the gem stand now" — which is
    // what the queue table, the reports, the public verification endpoint and the
    // approval form's seed all want — without those readers walking the stages.
    color: String,
    weight: Number, // Weight (ct)

    itemDescription: String, // Full textual description
    images: [{ type: mongoose.Schema.Types.ObjectId, ref: "Image" }],

    // assignees (from Intake)
    assignedTester1: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedTester2: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    reportTypes: [String],

    // When true the gem bypasses Test 1 / Test 2 and goes straight to final approval
    skipTesting: { type: Boolean, default: false },
    // Intake specific
    intake: {
      helperId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      timestamp: Date,
    },

    reportId: { type: mongoose.Schema.Types.ObjectId, ref: "Report" },
  },
  { timestamps: true },
)

export default mongoose.model("Gem", GemSchema)
