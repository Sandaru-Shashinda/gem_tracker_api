import Gem from "../models/Gem.js"
import GemTest1 from "../models/GemTest1.js"
import GemTest2 from "../models/GemTest2.js"
import GemFinalApproval from "../models/GemFinalApproval.js"
import { GEM_STATUSES } from "../constants/index.js"

export const generateGemId = async () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = (now.getMonth() + 1).toString().padStart(2, "0")

  const startOfMonth = new Date(year, now.getMonth(), 1)
  const gemCount = await Gem.countDocuments({
    createdAt: { $gte: startOfMonth },
  })

  const sequence = (gemCount + 1).toString().padStart(5, "0")
  return `GRC-${year}-${month}-${sequence}`
}

export const buildGemQuery = (queryParams, user) => {
  const query = {}

  if (queryParams.gemId) {
    const sanitizedGemId = queryParams.gemId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    query.gemId = { $regex: sanitizedGemId, $options: "i" }
  }

  if (queryParams.status && Object.values(GEM_STATUSES).includes(queryParams.status)) {
    query.status = queryParams.status
  }

  if (queryParams.currentAssignee) {
    query.currentAssignee = queryParams.currentAssignee
  }

  if (queryParams.startDate || queryParams.endDate) {
    query.createdAt = {}
    if (queryParams.startDate) query.createdAt.$gte = new Date(queryParams.startDate)
    if (queryParams.endDate) query.createdAt.$lte = new Date(queryParams.endDate)
  }

  return query
}

export const populateGemStages = async (gem) => {
  const gemId = gem._id
  const [test1, test2, finalApproval] = await Promise.all([
    GemTest1.findOne({ gemId }).populate("testerId", "name role").lean(),
    GemTest2.findOne({ gemId }).populate("testerId", "name role").lean(),
    GemFinalApproval.findOne({ gemId }).populate("approverId", "name role").lean(),
  ])
  const { test1: _t1, test2: _t2, finalApproval: _fa, ...base } = gem.toObject ? gem.toObject() : gem
  return { ...base, test1: test1 || null, test2: test2 || null, finalApproval: finalApproval || null }
}
