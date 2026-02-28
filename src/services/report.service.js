import Report from "../models/Report.js"

export const generateReportId = async () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = (now.getMonth() + 1).toString().padStart(2, "0")

  // Reset counter every month
  const startOfMonth = new Date(year, now.getMonth(), 1)
  const reportCount = await Report.countDocuments({
    createdAt: { $gte: startOfMonth },
  })

  const sequence = (reportCount + 1).toString().padStart(5, "0")
  return `REP-${year}-${month}-${sequence}`
}
