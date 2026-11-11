import GemReference from "../models/GemReference.js"

/**
 * Scoring a stone's instrument readings against the published reference table.
 *
 * Shared by the Scientific Suggestions panel (GET /api/references/search) and the AI
 * insights, which only lets the model rank species these readings already allow — so
 * both always agree on which species are still possible.
 */

const RI_EXPAND = 0.5
const SG_EXPAND = 1.0
const H_EXPAND = 1.5

const RI_DECAY_TOL = 0.05
const SG_DECAY_TOL = 0.3
const H_DECAY_TOL = 1.0

const WEIGHTS = { ri: 0.4, sg: 0.35, hardness: 0.25 }
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

// A "-" (no reading from the refractometer) is not a number and is left out of the score.
const finiteOrNull = (v) => {
  if (v === null || v === undefined || v === "") return null
  const n = typeof v === "number" ? v : parseFloat(v)
  return Number.isFinite(n) ? n : null
}

/**
 * The readings in the shape the scorer works with, or null for each one not taken.
 *
 * R.I. is a range: a doubly refractive stone gives two readings, so it is scored as an
 * overlap against each reference's published R.I. range. One reading recorded on its own
 * stands for both ends, and the two are ordered, since a stone can be entered high-then-low.
 */
export const normalizeScoringInput = ({ riMin, riMax, sg, hardness }) => {
  const riMinVal = finiteOrNull(riMin)
  const riMaxVal = finiteOrNull(riMax)
  const lowRi = riMinVal ?? riMaxVal
  const highRi = riMaxVal ?? riMinVal
  return {
    riMin: lowRi === null ? null : Math.min(lowRi, highRi),
    riMax: highRi === null ? null : Math.max(lowRi, highRi),
    sg: finiteOrNull(sg),
    hardness: finiteOrNull(hardness),
  }
}

/** True when at least one reading the reference table can be scored against was taken. */
export const hasScorableReadings = (readings) => {
  const r = normalizeScoringInput(readings)
  return r.riMin !== null || r.sg !== null || r.hardness !== null
}

/**
 * Every reference within reach of the readings, best match first, each carrying a
 * matchScore out of 100. Empty when no reading was taken.
 */
export const scoreReferences = async (readings) => {
  const { riMin, riMax, sg, hardness } = normalizeScoringInput(readings)

  const hasRi = riMin !== null
  const hasSg = sg !== null
  const hasHardness = hardness !== null
  if (!hasRi && !hasSg && !hasHardness) return []

  const query = {}
  if (hasRi) {
    query.refractiveIndexMin = { $lte: riMax + RI_EXPAND }
    query.refractiveIndexMax = { $gte: riMin - RI_EXPAND }
  }
  if (hasSg) {
    query.specificGravityMin = { $lte: sg + SG_EXPAND }
    query.specificGravityMax = { $gte: sg - SG_EXPAND }
  }
  if (hasHardness) {
    query.hardnessMin = { $lte: hardness + H_EXPAND }
    query.hardnessMax = { $gte: hardness - H_EXPAND }
  }

  const candidates = await GemReference.find(query).lean()

  const rawWeightSum =
    (hasRi ? WEIGHTS.ri : 0) + (hasSg ? WEIGHTS.sg : 0) + (hasHardness ? WEIGHTS.hardness : 0)
  const wRi = hasRi ? WEIGHTS.ri / rawWeightSum : 0
  const wSg = hasSg ? WEIGHTS.sg / rawWeightSum : 0
  const wH = hasHardness ? WEIGHTS.hardness / rawWeightSum : 0

  return candidates
    .map((ref) => {
      let score = 0
      if (hasRi) score += wRi * scoreRange(riMin, riMax, ref.refractiveIndexMin, ref.refractiveIndexMax, RI_DECAY_TOL)
      if (hasSg) score += wSg * scorePoint(sg, ref.specificGravityMin, ref.specificGravityMax, SG_DECAY_TOL)
      if (hasHardness) score += wH * scorePoint(hardness, ref.hardnessMin, ref.hardnessMax, H_DECAY_TOL)
      return { ...ref, matchScore: Math.round(score * 100) }
    })
    .filter((ref) => ref.matchScore >= MIN_SCORE)
    .sort((a, b) => b.matchScore - a.matchScore)
}
