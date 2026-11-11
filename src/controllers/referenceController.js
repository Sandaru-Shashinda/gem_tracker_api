import GemReference from "../models/GemReference.js"
import Gem from "../models/Gem.js"
import GemTest1 from "../models/GemTest1.js"
import GemTest2 from "../models/GemTest2.js"
import GemFinalApproval from "../models/GemFinalApproval.js"
import HiddenSuggestion from "../models/HiddenSuggestion.js"
import { scoreReferences } from "../services/referenceMatch.service.js"

// @desc    Get gem references based on parameters
// @route   GET /api/references/search
// @access  Private
//
// Scoring lives in referenceMatch.service, which the AI insights share, so the two
// panels never disagree about which species the readings still allow.
export const searchReferences = async (req, res) => {
  try {
    const { riMin, riMax, sg, hardness } = req.query
    res.json(await scoreReferences({ riMin, riMax, sg, hardness }))
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

/**
 * Folds several name lists into one sorted list, matching case-insensitively so a
 * tester's "sapphire" does not sit in the dropdown beside the table's "Sapphire".
 * The first spelling seen wins, which is why the reference table is passed first.
 */
const mergeNames = (...lists) => {
  const seen = new Map()
  for (const list of lists) {
    for (const raw of list) {
      if (typeof raw !== "string") continue
      const name = raw.trim()
      if (!name) continue
      const key = name.toLowerCase()
      if (!seen.has(key)) seen.set(key, name)
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b))
}

// @desc    Every species and variety the lab has on file: the published reference table
//          plus every name actually recorded on a gem. Both identification fields take
//          free text — a stone the table does not cover still has to be named — so what
//          one tester types is history the next tester should be offered. The other
//          free-text fields (the four written notes, colour, shape and the two cutting
//          styles) ride along as `history`.
// @route   GET /api/references/identifications
// @access  Private
export const getIdentifications = async (req, res) => {
  try {
    const [
      refSpecies,
      refVarieties,
      t1Species,
      t1Varieties,
      t1Selected,
      t2Species,
      t2Varieties,
      t2Selected,
      approvalSpecies,
      approvalVarieties,
      approvalSelected,
      hiddenRows,
    ] = await Promise.all([
      GemReference.distinct("species"),
      GemReference.distinct("variety"),
      GemTest1.distinct("observations.species"),
      GemTest1.distinct("observations.variety"),
      GemTest1.distinct("selectedVariety"),
      GemTest2.distinct("observations.species"),
      GemTest2.distinct("observations.variety"),
      GemTest2.distinct("selectedVariety"),
      GemFinalApproval.distinct("finalObservations.species"),
      GemFinalApproval.distinct("finalObservations.variety"),
      GemFinalApproval.distinct("finalVariety"),
      HiddenSuggestion.find({}, { field: 1, key: 1 }).lean(),
    ])

    // The other free-text fields are offered back the same way: whatever has been saved
    // on a gem is the history, so there is no separate list to keep in step with it.
    const observed = async (field) =>
      mergeNames(
        ...(await Promise.all([
          GemTest1.distinct(`observations.${field}`),
          GemTest2.distinct(`observations.${field}`),
          GemFinalApproval.distinct(`finalObservations.${field}`),
        ])),
      )
    const [
      intakeDescriptions,
      itemDescription,
      comments,
      specialNote,
      treatment,
      cuttingShape,
      crownStyle,
      pavilionStyle,
      ...colours
    ] = await Promise.all([
      Gem.distinct("itemDescription"),
      observed("itemDescription"),
      observed("comments"),
      observed("specialNote"),
      observed("treatment"),
      observed("cuttingShape"),
      observed("crownStyle"),
      observed("pavilionStyle"),
      // Colour sits on the stage record itself, and on the gem from intake.
      Gem.distinct("color"),
      GemTest1.distinct("colour"),
      GemTest2.distinct("colour"),
      GemFinalApproval.distinct("colour"),
    ])

    // Values taken off a dropdown on the References page stay off it.
    const hidden = new Map()
    for (const { field, key } of hiddenRows) {
      if (!hidden.has(field)) hidden.set(field, new Set())
      hidden.get(field).add(key)
    }
    const shown = (field, list) => {
      const keys = hidden.get(field)
      return keys ? list.filter((name) => !keys.has(name.toLowerCase())) : list
    }

    res.json({
      history: {
        itemDescription: shown("itemDescription", mergeNames(intakeDescriptions, itemDescription)),
        comments: shown("comments", comments),
        specialNote: shown("specialNote", specialNote),
        treatment: shown("treatment", treatment),
        colour: shown("colour", mergeNames(...colours)),
        cuttingShape: shown("cuttingShape", cuttingShape),
        crownStyle: shown("crownStyle", crownStyle),
        pavilionStyle: shown("pavilionStyle", pavilionStyle),
      },
      species: shown("species", mergeNames(refSpecies, t1Species, t2Species, approvalSpecies)),
      varieties: shown(
        "varieties",
        mergeNames(
          refVarieties,
          t1Varieties,
          t1Selected,
          t2Varieties,
          t2Selected,
          approvalVarieties,
          approvalSelected,
        ),
      ),
    })
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message })
  }
}

/** The dropdowns a suggestion can be taken off — the keys getIdentifications answers with. */
const SUGGESTION_FIELDS = [
  "species",
  "varieties",
  "itemDescription",
  "comments",
  "specialNote",
  "treatment",
  "colour",
  "cuttingShape",
  "crownStyle",
  "pavilionStyle",
]

// @desc    Suggestions taken off the dropdowns, newest first
// @route   GET /api/references/suggestions/hidden
// @access  Private/Admin, Helper
export const getHiddenSuggestions = async (req, res) => {
  try {
    const rows = await HiddenSuggestion.find({}).sort({ createdAt: -1 }).lean()
    res.json(rows)
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message })
  }
}

// @desc    Take a suggestion off a dropdown. The gem records it came from are not touched.
// @route   POST /api/references/suggestions/hidden   { field, value }
// @access  Private/Admin, Helper
export const hideSuggestion = async (req, res) => {
  try {
    const field = req.body?.field
    const value = typeof req.body?.value === "string" ? req.body.value.trim() : ""
    if (!SUGGESTION_FIELDS.includes(field)) {
      return res.status(400).json({ message: "Unknown suggestion field" })
    }
    if (!value) return res.status(400).json({ message: "A value is required" })

    const key = value.toLowerCase()
    // Hiding it twice is the same as hiding it once.
    const row = await HiddenSuggestion.findOneAndUpdate(
      { field, key },
      { $setOnInsert: { field, key, value, hiddenBy: req.user?._id } },
      { upsert: true, new: true },
    )
    res.status(201).json(row)
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message })
  }
}

// @desc    Put a hidden suggestion back on its dropdown
// @route   DELETE /api/references/suggestions/hidden/:id
// @access  Private/Admin, Helper
export const restoreSuggestion = async (req, res) => {
  try {
    const row = await HiddenSuggestion.findByIdAndDelete(req.params.id)
    if (!row) return res.status(404).json({ message: "Suggestion not found" })
    res.json({ message: "Suggestion restored" })
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
