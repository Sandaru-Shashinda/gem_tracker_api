import Report from "../models/Report.js"

export const generateReportId = async () => {
  const reportCount = await Report.countDocuments()
  return `REP-${new Date().getFullYear()}-${(reportCount + 1).toString().padStart(3, "0")}`
}
