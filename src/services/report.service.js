import Report from "../models/Report.js"
import { REPORT_TYPES } from "../constants/index.js"

export const generateReportId = async () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = (now.getMonth() + 1).toString().padStart(2, "0")

  const startOfMonth = new Date(year, now.getMonth(), 1)
  const reportCount = await Report.countDocuments({
    createdAt: { $gte: startOfMonth },
  })

  const sequence = (reportCount + 1).toString().padStart(5, "0")
  return `REP-${year}-${month}-${sequence}`
}

export const createReportForGem = async (gemId) => {
  const existing = await Report.findOne({ gemId })
  if (existing) return existing._id

  const reportId = await generateReportId()
  const report = new Report({
    gemId,
    reportType: REPORT_TYPES.SMALL,
    reportId,
    issuedDate: new Date(),
  })
  const saved = await report.save()
  return saved._id
}
