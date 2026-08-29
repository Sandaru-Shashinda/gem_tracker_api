import mongoose from "mongoose"
import { REPORT_TYPES } from "../constants/index.js"

const reportSchema = new mongoose.Schema(
  {
    gemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gem",
      required: true,
    },
    reportType: {
      type: String,
      enum: Object.values(REPORT_TYPES),
      required: true,
    },

    qrCode: {
      type: String,
    },
    issuedDate: {
      type: Date,
      default: Date.now,
    },
    reportId: {
      type: String,
      required: true,
      unique: true,
    },
    reportUrl: {
      type: String,
    },
    isClientDataAdd: {
      type: Boolean,
      default: false,
    },
    // The consultant gemologist whose name is printed on the left-hand signature
    // field of the medium and large reports. Held as a reference so the printed
    // name tracks the user record instead of a copy of it.
    signedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },

  { timestamps: true },
)

const Report = mongoose.model("Report", reportSchema)

export default Report
