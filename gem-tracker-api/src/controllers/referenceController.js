import GemReference from "../models/GemReference.js"

// @desc    Get gem references based on parameters
// @route   GET /api/references/search
// @access  Private
export const searchReferences = async (req, res) => {
  const { ri, sg } = req.query

  const query = {}

  if (ri) {
    const riVal = parseFloat(ri)
    query.riMin = { $lte: riVal + 0.05 }
    query.riMax = { $gte: riVal - 0.05 }
  }

  if (sg) {
    const sgVal = parseFloat(sg)
    query.sgMin = { $lte: sgVal + 0.2 }
    query.sgMax = { $gte: sgVal - 0.2 }
  }

  const references = await GemReference.find(query)
  res.json(references)
}

// @desc    Seed references (Admin)
// @route   POST /api/references/seed
// @access  Private/Admin
export const seedReferences = async (req, res) => {
  const { data } = req.body
  if (data && Array.isArray(data)) {
    await GemReference.deleteMany({})
    const created = await GemReference.insertMany(data)
    res.status(201).json(created)
  } else {
    res.status(400).json({ message: "Invalid data" })
  }
}
