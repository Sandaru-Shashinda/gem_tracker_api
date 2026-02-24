import Gem from "../models/Gem.js"
import { GEM_STATUSES, ROLES } from "../const/const.js"

// Helper Functions
export const generateGemId = async () => {
  const gemCount = await Gem.countDocuments()
  return `GEM-${new Date().getFullYear()}-${(gemCount + 1).toString().padStart(3, "0")}`
}

export const buildGemQuery = (queryParams, user) => {
  const query = {}

  // Filter by Gem ID (search) - sanitize regex input
  if (queryParams.gemId) {
    const sanitizedGemId = queryParams.gemId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    query.gemId = { $regex: sanitizedGemId, $options: "i" }
  }

  // Enforce assignee filter for TESTER role
  if (user?.role === ROLES.TESTER) {
    query.currentAssignee = user._id
    query.status = {
      $in: [
        GEM_STATUSES.READY_FOR_T1,
        GEM_STATUSES.READY_FOR_T2,
        GEM_STATUSES.DRAFT_TEST_1,
        GEM_STATUSES.DRAFT_TEST_2,
      ],
    }
  }

  // Filter by Status
  if (queryParams.status && Object.values(GEM_STATUSES).includes(queryParams.status)) {
    query.status = queryParams.status
  }

  // Filter by Current Assignee (User ID)
  if (queryParams.currentAssignee) {
    query.currentAssignee = queryParams.currentAssignee
  }

  // Filter by Date Range (createdAt)
  if (queryParams.startDate || queryParams.endDate) {
    query.createdAt = {}
    if (queryParams.startDate) {
      query.createdAt.$gte = new Date(queryParams.startDate)
    }
    if (queryParams.endDate) {
      query.createdAt.$lte = new Date(queryParams.endDate)
    }
  }

  return query
}

// Validation middleware (should be in separate file)
export const validateTestInput = (data) => {
  const errors = []

  if (!data.ri || typeof data.ri !== "number") {
    errors.push("Valid RI (refractive index) is required")
  }
  if (!data.sg || typeof data.sg !== "number") {
    errors.push("Valid SG (specific gravity) is required")
  }
  if (!data.hardness || typeof data.hardness !== "number") {
    errors.push("Valid hardness is required")
  }
  if (!data.observations?.variety) {
    errors.push("Variety is required")
  }

  return errors
}
