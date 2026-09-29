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

/**
 * Raises the report a gem's certificate is written against.
 *
 * The size is the one the customer asked for at intake. It used to be the card every
 * time, because the only caller was the approval step and the size was picked
 * afterwards on the configuration page — a custom gem never reaches that page, so its
 * report has to be raised at the size it was taken in for.
 */
export const createReportForGem = async (gemId, reportType = REPORT_TYPES.SMALL) => {
  const existing = await Report.findOne({ gemId })
  if (existing) return existing._id

  const type = Object.values(REPORT_TYPES).includes(reportType) ? reportType : REPORT_TYPES.SMALL

  const reportId = await generateReportId()
  const report = new Report({
    gemId,
    reportType: type,
    reportId,
    issuedDate: new Date(),
  })
  const saved = await report.save()
  return saved._id
}
