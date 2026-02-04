import mongoose from "mongoose"
import { REPORT_TYPES } from "../const/const.js"

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
  },

  { timestamps: true },
)

const Report = mongoose.model("Report", reportSchema)

export default Report
