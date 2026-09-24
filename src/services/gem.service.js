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

/**
 * Where Test 1 hands the stone on to, and who owns it there.
 *
 * The second reading only happens when someone is assigned to give it. A gem with no
 * Tester 2 is read once and goes straight to approval, rather than sitting in a Test 2
 * queue that nobody owns. The assignment is the only thing consulted, so the answer
 * cannot drift from what intake actually set up — and the app derives the same answer
 * the same way in resolveSubmitStatus.
 */
export const resolveTest1HandOff = (gem) =>
  gem.assignedTester2
    ? { status: GEM_STATUSES.READY_FOR_T2, currentAssignee: gem.assignedTester2 }
    : { status: GEM_STATUSES.READY_FOR_APPROVAL, currentAssignee: null }

export const populateGemStages = async (gem) => {
  const gemId = gem._id
  // Run all queries in parallel; include a lean gem fetch to access embedded
  // legacy stage data that hasn't been migrated to separate collections yet.
  const [test1, test2, finalApproval, rawGem] = await Promise.all([
    GemTest1.findOne({ gemId }).populate("testerId", "name role").lean(),
    GemTest2.findOne({ gemId }).populate("testerId", "name role").lean(),
    GemFinalApproval.findOne({ gemId }).populate("approverId", "name role").lean(),
    Gem.findById(gemId).lean(),
  ])
  const { test1: _t1, test2: _t2, finalApproval: _fa, ...base } = gem.toObject ? gem.toObject() : gem
  return {
    ...base,
    test1: test1 ?? rawGem?.test1 ?? null,
    test2: test2 ?? rawGem?.test2 ?? null,
    finalApproval: finalApproval ?? rawGem?.finalApproval ?? null,
  }
}
