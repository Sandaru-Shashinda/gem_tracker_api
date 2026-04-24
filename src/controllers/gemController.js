import Gem from "../models/Gem.js"
import GemTest1 from "../models/GemTest1.js"
import GemTest2 from "../models/GemTest2.js"
import GemFinalApproval from "../models/GemFinalApproval.js"
import Image from "../models/Image.js"
import { generateGemId, buildGemQuery, populateGemStages } from "../services/gem.service.js"
import { GEM_STATUSES, ROLES } from "../constants/index.js"
import { createReportForGem } from "../services/report.service.js"

// Shared field-extraction and null-coercion for test stage updates.
// Keeps updateTest1 and updateTest2 from duplicating the same ~50 lines.
function applyTestData(stageData, body, userId) {
  const { riMin, riMax, sg, hardnessMin, hardnessMax, observations, selectedVariety } = body
  const data = { ...stageData }
  if (riMin !== undefined) data.riMin = riMin === "" || riMin === null ? null : Number(riMin)
  if (riMax !== undefined) data.riMax = riMax === "" || riMax === null ? null : Number(riMax)
  if (sg !== undefined) data.sg = sg === "" || sg === null ? null : Number(sg)
  if (hardnessMin !== undefined) data.hardnessMin = hardnessMin === "" || hardnessMin === null ? null : Number(hardnessMin)
  if (hardnessMax !== undefined) data.hardnessMax = hardnessMax === "" || hardnessMax === null ? null : Number(hardnessMax)
  if (selectedVariety !== undefined) data.selectedVariety = selectedVariety
  if (observations !== undefined) data.observations = { ...(data.observations || {}), ...observations }
  data.testerId = userId
  data.timestamp = new Date()
  data.correctionRequested = false
  return data
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

// @desc    Create a new gem (Intake)
// @route   POST /api/gems/intake
// @access  Private/Helper
export const intakeGem = async (req, res) => {
  try {
    const { color, weight, itemDescription, testerId1, testerId2, customerId, status, imageIds, reportTypes } =
      req.body

    if (status !== GEM_STATUSES.DRAFT_INTAKE && (!color || !weight || !testerId1 || !testerId2)) {
      return res.status(400).json({
        message: "Missing required fields: color, weight, testerId1, testerId2",
      })
    }

    const gemId = await generateGemId()

    const gem = new Gem({
      gemId,
      status,
      color,
      weight: weight ? Number(weight) : null,
      itemDescription,
      images: imageIds || [],
      assignedTester1: testerId1 || null,
      assignedTester2: testerId2 || null,
      currentAssignee: testerId1 || null,
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
      req.body.assignedTester1 = req.body.testerId1
      if (gem.status === GEM_STATUSES.DRAFT_INTAKE || gem.status === GEM_STATUSES.READY_FOR_T1)
        req.body.currentAssignee = req.body.testerId1
    }
    if (req.body.testerId2 !== undefined) {
      req.body.assignedTester2 = req.body.testerId2
      if (gem.status === GEM_STATUSES.READY_FOR_T2) req.body.currentAssignee = req.body.testerId2
    }

    Object.keys(req.body).forEach((key) => {
      const val = req.body[key]
      if (val === undefined) return
      if (["test1", "test2", "finalApproval", "testerId1", "testerId2", "imageIdsToDelete"].includes(key)) return

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

    if (req.user.role === ROLES.TESTER && gem.assignedTester1?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to edit Test 1" })
    }

    const existing = await GemTest1.findOne({ gemId: gem._id })
    const test1Data = applyTestData(existing?.toObject() || {}, req.body, req.user._id)
    // Remove _id from existing data to avoid conflicts on upsert
    delete test1Data._id

    const updatedTest1 = await GemTest1.findOneAndUpdate(
      { gemId: gem._id },
      { $set: { ...test1Data, gemId: gem._id } },
      { upsert: true, new: true },
    ).populate("testerId", "name role")

    if (req.body.status === GEM_STATUSES.READY_FOR_T2) {
      gem.status = GEM_STATUSES.READY_FOR_T2
      gem.currentAssignee = gem.assignedTester2
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

    if (req.user.role === ROLES.TESTER && gem.assignedTester2?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to edit Test 2" })
    }

    const existing = await GemTest2.findOne({ gemId: gem._id })
    const test2Data = applyTestData(existing?.toObject() || {}, req.body, req.user._id)
    delete test2Data._id

    const updatedTest2 = await GemTest2.findOneAndUpdate(
      { gemId: gem._id },
      { $set: { ...test2Data, gemId: gem._id } },
      { upsert: true, new: true },
    ).populate("testerId", "name role")

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
      riMin,
      riMax,
      sg,
      hardnessMin,
      hardnessMax,
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

    if (riMin !== undefined) finalData.riMin = riMin === "" || riMin === null ? null : Number(riMin)
    if (riMax !== undefined) finalData.riMax = riMax === "" || riMax === null ? null : Number(riMax)
    if (sg !== undefined) finalData.sg = sg === "" || sg === null ? null : Number(sg)
    if (hardnessMin !== undefined)
      finalData.hardnessMin = hardnessMin === "" || hardnessMin === null ? null : Number(hardnessMin)
    if (hardnessMax !== undefined)
      finalData.hardnessMax = hardnessMax === "" || hardnessMax === null ? null : Number(hardnessMax)
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
