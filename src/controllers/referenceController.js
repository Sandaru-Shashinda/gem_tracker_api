import GemReference from "../models/GemReference.js"

// @desc    Get gem references based on parameters
// @route   GET /api/references/search
// @access  Private
export const searchReferences = async (req, res) => {
  const { ri, sg, hardness } = req.query

  const query = {}

  // Search Logic: Find gems where the input value falls within the gem's range (with tolerance)

  if (ri) {
    const riVal = parseFloat(ri)
    // Tolerance of 0.1 for Refractive Index matches (based on user request)
    query.refractiveIndexMin = { $lte: riVal + 0.1 }
    query.refractiveIndexMax = { $gte: riVal - 0.1 }
  }

  if (sg) {
    const sgVal = parseFloat(sg)
    // Tolerance of 0.5 for Specific Gravity (based on user request e.g. 2.68 -> 2-3)
    query.specificGravityMin = { $lte: sgVal + 0.5 }
    query.specificGravityMax = { $gte: sgVal - 0.5 }
  }

  if (hardness) {
    const hVal = parseFloat(hardness)
    // Exact range check for hardness
    query.hardnessMin = { $lte: hVal }
    query.hardnessMax = { $gte: hVal }
  }

  try {
    const references = await GemReference.find(query)
    res.json(references)
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message })
  }
}

// @desc    Get all gem references
// @route   GET /api/references
// @access  Private
export const getAllReferences = async (req, res) => {
  try {
    const references = await GemReference.find({}).sort({ variety: 1 })
    res.json(references)
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message })
  }
}

// @desc    Get all unique species
// @route   GET /api/references/species
// @access  Private
export const getAllSpecies = async (req, res) => {
  try {
    const species = await GemReference.distinct("species")
    res.json(species.filter(Boolean).sort())
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message })
  }
}

// @desc    Seed references (Admin)
// @route   POST /api/references/seed
// @access  Private/Admin
export const seedReferences = async (req, res) => {
  const { data } = req.body

  if (data && Array.isArray(data)) {
    try {
      // 1. Clear existing data
      await GemReference.deleteMany({})

      // 2. Transform the incoming JSON to match the Schema
      const formattedData = data.map((item) => {
        // Parse Specific Gravity string (e.g., "3.18" or "2.3-4.5")
        let specificGravityMin = null
        let specificGravityMax = null

        if (item.specific_gravity) {
          // Remove any whitespace and split by '-'
          const parts = item.specific_gravity.toString().replace(/\s/g, "").split("-")
          const val1 = parseFloat(parts[0])

          if (parts.length === 2) {
            const val2 = parseFloat(parts[1])
            specificGravityMin = Math.min(val1, val2)
            specificGravityMax = Math.max(val1, val2)
          } else {
            specificGravityMin = val1
            specificGravityMax = val1
          }
        }

        return {
          species: item.species,
          variety: item.variety,
          // Map JSON keys to Schema keys
          refractiveIndexMin: item.refractive_index_min,
          refractiveIndexMax: item.refractive_index_max,
          hardnessMin: item.hardness_min,
          hardnessMax: item.hardness_max,
          specificGravityMin: specificGravityMin,
          specificGravityMax: specificGravityMax,
        }
      })

      // 3. Insert new data
      const created = await GemReference.insertMany(formattedData)
      res.status(201).json(created)
    } catch (error) {
      res.status(500).json({ message: "Seeding failed", error: error.message })
    }
  } else {
    res.status(400).json({ message: "Invalid data format. Expected an array." })
  }
}
