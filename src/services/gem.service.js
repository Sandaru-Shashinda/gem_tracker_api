import Gem from "../models/Gem.js"
import { GEM_STATUSES, ROLES } from "../const/const.js"

// Helper Functions
export const generateGemId = async () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = (now.getMonth() + 1).toString().padStart(2, "0")

  // Reset counter every month
  const startOfMonth = new Date(year, now.getMonth(), 1)
  const gemCount = await Gem.countDocuments({
    createdAt: { $gte: startOfMonth },
  })

  const sequence = (gemCount + 1).toString().padStart(5, "0")
  return `GRC-${year}-${month}-${sequence}`
}

export const buildGemQuery = (queryParams, user) => {
  const query = {}

  // Filter by Gem ID (search) - sanitize regex input
  if (queryParams.gemId) {
    const sanitizedGemId = queryParams.gemId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    query.gemId = { $regex: sanitizedGemId, $options: "i" }
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
  if (!data.hardnessMin || typeof data.hardnessMin !== "number") {
    errors.push("Valid minimum hardness is required")
  }
  if (!data.observations?.variety) {
    errors.push("Variety is required")
  }

  return errors
}
