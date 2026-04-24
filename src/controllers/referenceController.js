import GemReference from "../models/GemReference.js"

const RI_EXPAND    = 0.5
const SG_EXPAND    = 1.0
const H_EXPAND     = 1.5

const RI_DECAY_TOL = 0.05
const SG_DECAY_TOL = 0.30
const H_DECAY_TOL  = 1.0

const WEIGHTS   = { ri: 0.40, sg: 0.35, hardness: 0.25 }
const MIN_SCORE = 15

function scorePoint(val, refMin, refMax, decayTol) {
  if (val >= refMin && val <= refMax) return 1.0
  const dist = val < refMin ? refMin - val : val - refMax
  return Math.exp(-dist / decayTol)
}

function scoreRange(testMin, testMax, refMin, refMax, decayTol) {
  if (testMin === testMax) return scorePoint(testMin, refMin, refMax, decayTol)
  const intersection = Math.max(0, Math.min(testMax, refMax) - Math.max(testMin, refMin))
  if (intersection > 0) {
    const union = Math.max(testMax, refMax) - Math.min(testMin, refMin)
    return intersection / union
  }
  const gap = refMin > testMax ? refMin - testMax : testMin - refMax
  return Math.exp(-gap / decayTol)
}

// @desc    Get gem references based on parameters
// @route   GET /api/references/search
// @access  Private
export const searchReferences = async (req, res) => {
  try {
    const { riMin, riMax, sg, hardnessMin, hardnessMax } = req.query

    const riMinVal = riMin      ? parseFloat(riMin)      : null
    const riMaxVal = riMax      ? parseFloat(riMax)      : null
    const sgVal    = sg         ? parseFloat(sg)         : null
    const hMinVal  = hardnessMin ? parseFloat(hardnessMin) : null
    const hMaxVal  = hardnessMax ? parseFloat(hardnessMax) : null

    const effectiveRiMin = riMinVal ?? riMaxVal
    const effectiveRiMax = riMaxVal ?? riMinVal
    const effectiveHMin  = hMinVal  ?? hMaxVal
    const effectiveHMax  = hMaxVal  ?? hMinVal

    const hasRi       = effectiveRiMin !== null
    const hasSg       = sgVal !== null
    const hasHardness = effectiveHMin !== null

    if (!hasRi && !hasSg && !hasHardness) return res.json([])

    const query = {}
    if (hasRi) {
      query.refractiveIndexMin = { $lte: effectiveRiMax + RI_EXPAND }
      query.refractiveIndexMax = { $gte: effectiveRiMin - RI_EXPAND }
    }
    if (hasSg) {
      query.specificGravityMin = { $lte: sgVal + SG_EXPAND }
      query.specificGravityMax = { $gte: sgVal - SG_EXPAND }
    }
    if (hasHardness) {
      query.hardnessMin = { $lte: effectiveHMax + H_EXPAND }
      query.hardnessMax = { $gte: effectiveHMin - H_EXPAND }
    }

    const candidates = await GemReference.find(query).lean()

    const rawWeightSum = (hasRi ? WEIGHTS.ri : 0)
                       + (hasSg ? WEIGHTS.sg : 0)
                       + (hasHardness ? WEIGHTS.hardness : 0)
    const wRi = hasRi       ? WEIGHTS.ri       / rawWeightSum : 0
    const wSg = hasSg       ? WEIGHTS.sg       / rawWeightSum : 0
    const wH  = hasHardness ? WEIGHTS.hardness / rawWeightSum : 0

    const results = candidates
      .map((ref) => {
        let score = 0
        if (hasRi)       score += wRi * scoreRange(effectiveRiMin, effectiveRiMax, ref.refractiveIndexMin, ref.refractiveIndexMax, RI_DECAY_TOL)
        if (hasSg)       score += wSg * scorePoint(sgVal, ref.specificGravityMin, ref.specificGravityMax, SG_DECAY_TOL)
        if (hasHardness) score += wH  * scoreRange(effectiveHMin, effectiveHMax, ref.hardnessMin, ref.hardnessMax, H_DECAY_TOL)
        return { ...ref, matchScore: Math.round(score * 100) }
      })
      .filter((ref) => ref.matchScore >= MIN_SCORE)
      .sort((a, b) => b.matchScore - a.matchScore)

    res.json(results)
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
      await GemReference.deleteMany({})

      const formattedData = data.map((item) => {
        let specificGravityMin = null
        let specificGravityMax = null

        if (item.specific_gravity) {
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
          refractiveIndexMin: item.refractive_index_min,
          refractiveIndexMax: item.refractive_index_max,
          hardnessMin: item.hardness_min,
          hardnessMax: item.hardness_max,
          specificGravityMin,
          specificGravityMax,
        }
      })

      const created = await GemReference.insertMany(formattedData)
      res.status(201).json(created)
    } catch (error) {
      res.status(500).json({ message: "Seeding failed", error: error.message })
    }
  } else {
    res.status(400).json({ message: "Invalid data format. Expected an array." })
  }
}
