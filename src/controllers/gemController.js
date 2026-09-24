import Gem from "../models/Gem.js"
import GemTest1 from "../models/GemTest1.js"
import GemTest2 from "../models/GemTest2.js"
import GemFinalApproval from "../models/GemFinalApproval.js"
import Image from "../models/Image.js"
import { buildGemQuery, populateGemStages, resolveTest1HandOff } from "../services/gem.service.js"
import { GEM_STATUSES, ROLES } from "../constants/index.js"
import { createReportForGem } from "../services/report.service.js"

// Shared field-extraction and null-coercion for test stage updates.
// Keeps updateTest1 and updateTest2 from duplicating the same ~50 lines.
const toNumberOrNull = (value) => (value === "" || value === null ? null : Number(value))

function applyTestData(stageData, body, userId) {
  const { riMin, riMax, sg, hardness, colour, weight, observations, selectedVariety } = body
  const data = { ...stageData }
  if (riMin !== undefined) data.riMin = toNumberOrNull(riMin)
  if (riMax !== undefined) data.riMax = toNumberOrNull(riMax)
  if (sg !== undefined) data.sg = toNumberOrNull(sg)
  if (hardness !== undefined) data.hardness = toNumberOrNull(hardness)
  if (colour !== undefined) data.colour = typeof colour === "string" ? colour.trim() : colour
  if (weight !== undefined) data.weight = toNumberOrNull(weight)
  if (selectedVariety !== undefined) data.selectedVariety = selectedVariety
  if (observations !== undefined) data.observations = { ...(data.observations || {}), ...observations }
  data.testerId = userId
  data.timestamp = new Date()
  data.correctionRequested = false
  return data
}

// A tester owns their stage only while the gem is sitting in it. Submitting hands the
// stone on, and that seals their record: the next stage reads it, and a reading that can
// be rewritten afterwards is not the independent second opinion the workflow is built on.
// Reopening it is the admin's call — requestCorrection moves the gem back to the stage,
// and write access follows from the move. The app mirrors this in resolveActiveStage.
const TESTER_WRITABLE_AT = {
  test1: [GEM_STATUSES.READY_FOR_T1, GEM_STATUSES.DRAFT_TEST_1],
  test2: [GEM_STATUSES.READY_FOR_T2, GEM_STATUSES.DRAFT_TEST_2],
}

/**
 * Why this tester may not write to this stage, or null when they may. Admins are not
 * held to either rule: they own whichever stage the gem sits in.
 */
function describeStageDenial(gem, user, stage) {
  if (user.role !== ROLES.TESTER) return null

  const assignee = stage === "test1" ? gem.assignedTester1 : gem.assignedTester2
  const label = stage === "test1" ? "Test 1" : "Test 2"
  if (assignee?.toString() !== user._id.toString()) {
    return `Not authorized to edit ${label}`
  }
  if (!TESTER_WRITABLE_AT[stage].includes(gem.status)) {
    return `${label} has already been submitted and can no longer be edited. Ask an admin to request a correction.`
  }
  return null
}

// Each stage keeps the colour and weight its own owner recorded, and the Gem carries
// the most recent of them. That gem-level pair is what the queue table, the reports, the
// public verification endpoint and the approval form's seed all read, so "the gem's
// latest" stays a single field rather than something every reader has to recompute.
//
// A blank is never written back: a half-filled draft must not wipe what intake recorded,
// nor erase the previous tester's reading for the next one.
function applyGemColourAndWeight(gem, colour, weight) {
  if (typeof colour === "string" && colour.trim()) gem.color = colour.trim()
  const parsed = toNumberOrNull(weight)
  if (parsed !== null && Number.isFinite(parsed) && parsed > 0) gem.weight = parsed
}

// @desc    Get all gems
// @route   GET /api/gems
// @access  Private
export const getGems = async (req, res) => {
  try {
    const pageSize = Math.min(Number(req.query.limit) || 10, 100)
    const page = Math.max(Number(req.query.page) || 1, 1)

    const query = buildGemQuery(req.query, req.user)
    const count = await Gem.countDocuments(query)

    const gems = await Gem.find(query)
      .populate("currentAssignee", "name role")
      .populate("intake.helperId", "name role")
      .sort({ updatedAt: -1 })
      .limit(pageSize)
      .skip(pageSize * (page - 1))
      .lean()

    res.json({
      gems,
      page,
      pages: Math.ceil(count / pageSize),
      total: count,
    })
  } catch (error) {
    console.error("Error fetching gems:", error)
    res.status(500).json({ message: "Error fetching gems", error: error.message })
  }
}

// @desc    Get dashboard statistics
// @route   GET /api/gems/stats
// @access  Private
export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id

    const totalGems = await Gem.countDocuments()
    const pendingWorkflow = await Gem.countDocuments({ status: { $ne: GEM_STATUSES.DONE } })
    const completedGems = await Gem.countDocuments({ status: GEM_STATUSES.DONE })
    const myActionItems = await Gem.countDocuments({ currentAssignee: userId })

    const recentGems = await Gem.find()
      .populate("currentAssignee", "name role")
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean()

    res.json({
      totalGems,
      pendingWorkflow,
      completedGems,
      myActionItems,
      recentGems,
    })
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    res.status(500).json({ message: "Error fetching dashboard stats", error: error.message })
  }
}

// @desc    Get gem by ID
// @route   GET /api/gems/:id
// @access  Private
export const getGemById = async (req, res) => {
  try {
    const gem = await Gem.findById(req.params.id)
      .populate("currentAssignee", "name role")
      .populate("intake.helperId", "name role")
      .populate("customerId", "customerName companyName")

    if (!gem) return res.status(404).json({ message: "Gem not found" })

    res.json(await populateGemStages(gem))
  } catch (error) {
    console.error("Error fetching gem:", error)
    res.status(500).json({ message: "Error fetching gem", error: error.message })
  }
}

// @desc    Get the last created gem's GRC number
// @route   GET /api/gems/last-grc
// @access  Private
export const getLastGrc = async (req, res) => {
  try {
    const gem = await Gem.findOne().sort({ createdAt: -1 }).select("gemId").lean()
    res.json({ gemId: gem ? gem.gemId : null })
  } catch (error) {
    res.status(500).json({ message: "Error fetching last GRC", error: error.message })
  }
}

// @desc    Create a new gem (Intake)
// @route   POST /api/gems/intake
// @access  Private/Helper
export const intakeGem = async (req, res) => {
  try {
    const {
      gemId,
      color,
      weight,
      itemDescription,
      testerId1,
      testerId2,
      customerId,
      status,
      imageIds,
      reportTypes,
      skipTesting,
    } = req.body

    if (!gemId) {
      return res.status(400).json({ message: "GRC Number is required" })
    }

    const duplicate = await Gem.findOne({ gemId })
    if (duplicate) {
      return res.status(400).json({ message: "A gem with this GRC Number already exists" })
    }

    const bypassTesting = Boolean(skipTesting)
    const isDraft = status === GEM_STATUSES.DRAFT_INTAKE

    if (!isDraft && (!color || !weight)) {
      return res.status(400).json({ message: "Missing required fields: color, weight" })
    }

    // Only the first reading is compulsory. Leaving Tester 2 unassigned is a real
    // choice — the stone gets one reading and goes straight to approval — so it is not
    // treated as a missing field. See the Test 1 hand-off in updateTest1.
    if (!isDraft && !bypassTesting && !testerId1) {
      return res.status(400).json({
        message: "Missing required field: testerId1",
      })
    }

    // Bypassing the testing flow means no testers are assigned and the record
    // lands directly on the approver's desk.
    const initialStatus = !isDraft && bypassTesting ? GEM_STATUSES.READY_FOR_APPROVAL : status

    const gem = new Gem({
      gemId,
      status: initialStatus,
      color,
      weight: weight ? Number(weight) : null,
      itemDescription,
      images: imageIds || [],
      skipTesting: bypassTesting,
      assignedTester1: bypassTesting ? null : testerId1 || null,
      assignedTester2: bypassTesting ? null : testerId2 || null,
      currentAssignee: bypassTesting ? null : testerId1 || null,
      customerId: customerId || null,
      reportTypes: reportTypes || [],
      intake: {
        helperId: req.user._id,
        timestamp: new Date(),
      },
    })

    const createdGem = await gem.save()
    await createdGem.populate("currentAssignee", "name role")
    await createdGem.populate("intake.helperId", "name role")

    res.status(201).json(createdGem)
  } catch (error) {
    console.error("Error creating gem:", error)
    res.status(500).json({ message: "Error saving gem", error: error.message })
  }
}

// @desc    Update gem basic info or image
// @route   PUT /api/gems/:id
// @access  Private
export const updateGem = async (req, res) => {
  try {
    const gem = await Gem.findById(req.params.id)

    if (!gem) return res.status(404).json({ message: "Gem not found" })

    if (req.body.imageIds && Array.isArray(req.body.imageIds)) {
      gem.images = req.body.imageIds
    }

    if (req.body.imageIdsToDelete) {
      const toDelete = Array.isArray(req.body.imageIdsToDelete)
        ? req.body.imageIdsToDelete
        : req.body.imageIdsToDelete.split(",")

      for (const id of toDelete) {
        gem.images = gem.images.filter((imgId) => imgId.toString() !== id.toString())
      }
    }

    if (req.body.testerId1 !== undefined) {
      req.body.assignedTester1 = req.body.testerId1 || null
      if (gem.status === GEM_STATUSES.DRAFT_INTAKE || gem.status === GEM_STATUSES.READY_FOR_T1)
        req.body.currentAssignee = req.body.testerId1 || null
    }
    if (req.body.testerId2 !== undefined) {
      req.body.assignedTester2 = req.body.testerId2 || null
      // The second reading is optional, so it can also be taken away again. Doing that
      // while the gem is waiting on it would leave it with nobody to pick it up, so it
      // moves on to approval instead — the same place Test 1 hands off to when no second
      // tester was ever assigned. Judged against where this request leaves the gem rather
      // than where it found it, since an intake edit that rewinds the gem to Test 1 has
      // already answered the question.
      const targetStatus = req.body.status || gem.status
      const waitingOnT2 =
        targetStatus === GEM_STATUSES.READY_FOR_T2 || targetStatus === GEM_STATUSES.DRAFT_TEST_2
      if (waitingOnT2) {
        if (req.body.testerId2) {
          req.body.currentAssignee = req.body.testerId2
        } else {
          req.body.status = GEM_STATUSES.READY_FOR_APPROVAL
          req.body.currentAssignee = null
        }
      }
    }

    // Bypassing the testing flow drops the tester assignments and re-routes any
    // Test 1 hand-off straight to approval. Applied after the tester block above
    // so it always wins.
    if (req.body.skipTesting !== undefined && Boolean(req.body.skipTesting)) {
      req.body.skipTesting = true
      req.body.assignedTester1 = null
      req.body.assignedTester2 = null
      req.body.currentAssignee = null
      if (req.body.status === GEM_STATUSES.READY_FOR_T1) {
        req.body.status = GEM_STATUSES.READY_FOR_APPROVAL
      }
    }

    Object.keys(req.body).forEach((key) => {
      const val = req.body[key]
      if (val === undefined) return
      if (["gemId", "test1", "test2", "finalApproval", "testerId1", "testerId2", "imageIdsToDelete"].includes(key)) return

      if (key === "weight") {
        gem[key] = val === "" || val === null ? null : Number(val)
      } else {
        gem[key] = val
      }
    })

    const updatedGem = await gem.save()
    await updatedGem.populate("currentAssignee", "name role")
    await updatedGem.populate("intake.helperId", "name role")

    res.json(updatedGem)
  } catch (error) {
    console.error("Error updating gem:", error)
    res.status(500).json({ message: "Error updating gem", error: error.message })
  }
}

// @desc    Update or Add Test 1 results
// @route   PUT /api/gems/:id/test1
// @access  Private/Tester/Admin
export const updateTest1 = async (req, res) => {
  try {
    const gem = await Gem.findById(req.params.id)
    if (!gem) return res.status(404).json({ message: "Gem not found" })

    if (gem.status === GEM_STATUSES.DONE) {
      return res.status(403).json({ message: "Cannot edit a completed gem" })
    }

    const denial = describeStageDenial(gem, req.user, "test1")
    if (denial) return res.status(403).json({ message: denial })

    const existing = await GemTest1.findOne({ gemId: gem._id })
    const test1Data = applyTestData(existing?.toObject() || {}, req.body, req.user._id)
    // Remove _id from existing data to avoid conflicts on upsert
    delete test1Data._id

    const updatedTest1 = await GemTest1.findOneAndUpdate(
      { gemId: gem._id },
      { $set: { ...test1Data, gemId: gem._id } },
      { upsert: true, new: true },
    ).populate("testerId", "name role")

    applyGemColourAndWeight(gem, req.body.colour, req.body.weight)

    // Handing Test 1 on. Where it lands is resolved here rather than taken from the
    // request, because only the assignment says whether a second reading is happening.
    // Either hand-off status is accepted as "I am done with Test 1"; anything else is a
    // draft save, and that status is the caller's to set.
    const handingOn =
      req.body.status === GEM_STATUSES.READY_FOR_T2 ||
      req.body.status === GEM_STATUSES.READY_FOR_APPROVAL
    if (handingOn) {
      const next = resolveTest1HandOff(gem)
      gem.status = next.status
      gem.currentAssignee = next.currentAssignee
    } else if (req.body.status) {
      gem.status = req.body.status
    }

    const updatedGem = await gem.save()
    await updatedGem.populate("currentAssignee", "name role")

    res.json({ gem: updatedGem, test1: updatedTest1 })
  } catch (error) {
    console.error("Error updating test 1:", error)
    res.status(500).json({ message: "Error updating test 1", error: error.message })
  }
}

// @desc    Update or Add Test 2 results
// @route   PUT /api/gems/:id/test2
// @access  Private/Tester/Admin
export const updateTest2 = async (req, res) => {
  try {
    const gem = await Gem.findById(req.params.id)
    if (!gem) return res.status(404).json({ message: "Gem not found" })

    if (gem.status === GEM_STATUSES.DONE) {
      return res.status(403).json({ message: "Cannot edit a completed gem" })
    }

    const denial = describeStageDenial(gem, req.user, "test2")
    if (denial) return res.status(403).json({ message: denial })

    const existing = await GemTest2.findOne({ gemId: gem._id })
    const test2Data = applyTestData(existing?.toObject() || {}, req.body, req.user._id)
    delete test2Data._id

    const updatedTest2 = await GemTest2.findOneAndUpdate(
      { gemId: gem._id },
      { $set: { ...test2Data, gemId: gem._id } },
      { upsert: true, new: true },
    ).populate("testerId", "name role")

    applyGemColourAndWeight(gem, req.body.colour, req.body.weight)

    if (req.body.status === GEM_STATUSES.READY_FOR_APPROVAL) {
      gem.status = GEM_STATUSES.READY_FOR_APPROVAL
      gem.currentAssignee = null
    } else if (req.body.status) {
      gem.status = req.body.status
    }

    const updatedGem = await gem.save()
    await updatedGem.populate("currentAssignee", "name role")

    res.json({ gem: updatedGem, test2: updatedTest2 })
  } catch (error) {
    console.error("Error updating test 2:", error)
    res.status(500).json({ message: "Error updating test 2", error: error.message })
  }
}

// @desc    Update or Add Final Approval
// @route   PUT /api/gems/:id/final-approval
// @access  Private/Admin
export const updateFinalApproval = async (req, res) => {
  try {
    const {
      colour,
      weight,
      riMin,
      riMax,
      sg,
      hardness,
      finalObservations,
      finalVariety,
      itemDescription,
      status,
    } = req.body

    const gem = await Gem.findById(req.params.id)
    if (!gem) return res.status(404).json({ message: "Gem not found" })

    const existing = await GemFinalApproval.findOne({ gemId: gem._id })
    const finalData = existing ? existing.toObject() : {}
    delete finalData._id

    if (riMin !== undefined) finalData.riMin = toNumberOrNull(riMin)
    if (riMax !== undefined) finalData.riMax = toNumberOrNull(riMax)
    if (sg !== undefined) finalData.sg = toNumberOrNull(sg)
    if (hardness !== undefined) finalData.hardness = toNumberOrNull(hardness)
    // The approval's own colour and weight: seeded from the gem's latest by the client,
    // then whatever the approver settles on. This pair is what the certificate prints.
    if (colour !== undefined) finalData.colour = typeof colour === "string" ? colour.trim() : colour
    if (weight !== undefined) finalData.weight = toNumberOrNull(weight)
    if (finalVariety !== undefined) finalData.finalVariety = finalVariety
    if (finalObservations !== undefined) {
      finalData.finalObservations = { ...(finalData.finalObservations || {}), ...finalObservations }
    }

    finalData.approverId = req.user._id
    finalData.timestamp = new Date()

    const updatedApproval = await GemFinalApproval.findOneAndUpdate(
      { gemId: gem._id },
      { $set: { ...finalData, gemId: gem._id } },
      { upsert: true, new: true },
    ).populate("approverId", "name role")

    if (itemDescription !== undefined) gem.itemDescription = itemDescription

    applyGemColourAndWeight(gem, colour, weight)

    if (status) {
      gem.status = status

      if (status === GEM_STATUSES.SUBMITTED_FOR_REPORT) {
        gem.reportId = await createReportForGem(gem._id)
      }
    } else {
      gem.status = GEM_STATUSES.DRAFT_APPROVAL
    }

    const updatedGem = await gem.save()

    res.json({ gem: updatedGem, finalApproval: updatedApproval })
  } catch (error) {
    console.error("Error updating final approval:", error)
    res.status(500).json({ message: "Error updating final approval", error: error.message })
  }
}

// @desc    Delete a gem
// @route   DELETE /api/gems/:id
// @access  Private/Admin
export const deleteGem = async (req, res) => {
  try {
    const gem = await Gem.findById(req.params.id)

    if (!gem) return res.status(404).json({ message: "Gem not found" })

    if (gem.images && gem.images.length > 0) {
      for (const imageId of gem.images) {
        await Image.findByIdAndDelete(imageId)
      }
    }

    await Promise.all([
      GemTest1.deleteOne({ gemId: gem._id }),
      GemTest2.deleteOne({ gemId: gem._id }),
      GemFinalApproval.deleteOne({ gemId: gem._id }),
    ])

    await gem.deleteOne()
    res.json({ message: "Gem deleted successfully" })
  } catch (error) {
    console.error("Error deleting gem:", error)
    res.status(500).json({ message: "Error deleting gem", error: error.message })
  }
}

// @desc    Request correction from a tester (Admin)
// @route   PUT /api/gems/:id/request-correction
// @access  Private/Admin
export const requestCorrection = async (req, res) => {
  try {
    const { stage, note } = req.body

    if (!stage || !["test1", "test2"].includes(stage)) {
      return res.status(400).json({
        message: "Invalid stage. Must be 'test1' or 'test2'",
      })
    }

    const gem = await Gem.findById(req.params.id)
    if (!gem) return res.status(404).json({ message: "Gem not found" })

    if (stage === "test1") {
      const t1 = await GemTest1.findOne({ gemId: gem._id })
      if (!t1 || !t1.testerId) {
        return res.status(400).json({ message: "Test 1 has not been completed yet" })
      }
      await GemTest1.findOneAndUpdate(
        { gemId: gem._id },
        { correctionRequested: true, correctionNote: note.trim() },
      )
      gem.status = GEM_STATUSES.READY_FOR_T1
      gem.currentAssignee = gem.assignedTester1
    } else if (stage === "test2") {
      const t2 = await GemTest2.findOne({ gemId: gem._id })
      if (!t2 || !t2.testerId) {
        return res.status(400).json({ message: "Test 2 has not been completed yet" })
      }
      await GemTest2.findOneAndUpdate(
        { gemId: gem._id },
        { correctionRequested: true, correctionNote: note.trim() },
      )
      gem.status = GEM_STATUSES.READY_FOR_T2
      gem.currentAssignee = gem.assignedTester2
    }

    const updatedGem = await gem.save()
    await updatedGem.populate("currentAssignee", "name role")

    res.json(await populateGemStages(updatedGem))
  } catch (error) {
    console.error("Error requesting correction:", error)
    res.status(500).json({ message: "Error requesting correction", error: error.message })
  }
}

// @desc    Flag a correction note on the final approval stage (no workflow re-route)
// @route   PUT /api/gems/:id/request-approver-correction
// @access  Private/Admin
export const requestApproverCorrection = async (req, res) => {
  try {
    const { note } = req.body

    if (!note || !note.trim()) {
      return res.status(400).json({ message: "A correction note is required" })
    }

    const gem = await Gem.findById(req.params.id)
    if (!gem) return res.status(404).json({ message: "Gem not found" })

    await GemFinalApproval.findOneAndUpdate(
      { gemId: gem._id },
      { approverCorrectionRequested: true, approverCorrectionNote: note.trim() },
    )

    await gem.populate("currentAssignee", "name role")
    res.json(await populateGemStages(gem))
  } catch (error) {
    console.error("Error requesting approver correction:", error)
    res.status(500).json({ message: "Error requesting approver correction", error: error.message })
  }
}

// @desc    Dismiss the approver correction flag
// @route   PUT /api/gems/:id/dismiss-approver-correction
// @access  Private/Admin
export const dismissApproverCorrection = async (req, res) => {
  try {
    const gem = await Gem.findById(req.params.id)
    if (!gem) return res.status(404).json({ message: "Gem not found" })

    await GemFinalApproval.findOneAndUpdate(
      { gemId: gem._id },
      { approverCorrectionRequested: false, approverCorrectionNote: "" },
    )

    await gem.populate("currentAssignee", "name role")
    res.json(await populateGemStages(gem))
  } catch (error) {
    console.error("Error dismissing approver correction:", error)
    res.status(500).json({ message: "Error dismissing approver correction", error: error.message })
  }
}

// @desc    Add images to an existing gem
// @route   POST /api/gems/:id/images
// @access  Private
export const addGemImages = async (req, res) => {
  try {
    const gem = await Gem.findById(req.params.id)

    if (!gem) return res.status(404).json({ message: "Gem not found" })

    const { imageIds } = req.body

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return res.status(400).json({ message: "No imageIds provided" })
    }

    gem.images = [...(gem.images || []), ...imageIds]

    const updatedGem = await gem.save()
    await updatedGem.populate("currentAssignee", "name role")

    res.json(updatedGem)
  } catch (error) {
    console.error("Error adding images to gem:", error)
    res.status(500).json({ message: "Error adding images", error: error.message })
  }
}
