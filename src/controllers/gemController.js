import Gem from "../models/Gem.js"
import Image from "../models/Image.js"
import { generateGemId, buildGemQuery } from "../services/gem.service.js"
import { GEM_STATUSES, ROLES, REPORT_TYPES } from "../const/const.js"
import Report from "../models/Report.js"
import { generateReportId } from "../services/report.service.js"

// @desc    Get all gems
// @route   GET /api/gems
// @access  Private
export const getGems = async (req, res) => {
  try {
    const pageSize = Math.min(Number(req.query.limit) || 10, 100) // Cap at 100
    const page = Math.max(Number(req.query.page) || 1, 1) // Minimum page 1

    const query = buildGemQuery(req.query, req.user)
    const count = await Gem.countDocuments(query)

    const gems = await Gem.find(query)
      .populate("currentAssignee", "name role")
      .populate("intake.helperId", "name role")
      .sort({ updatedAt: -1 })
      .limit(pageSize)
      .skip(pageSize * (page - 1))
      .lean() // Faster queries when you don't need Mongoose documents

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
      .populate("test1.testerId", "name role")
      .populate("test2.testerId", "name role")
      .populate("finalApproval.approverId", "name role")
      .populate("customerId", "customerName companyName")

    if (!gem) return res.status(404).json({ message: "Gem not found" })

    // Authorization check - testers can only view their assigned gems
    if (
      req.user.role === ROLES.TESTER &&
      gem.currentAssignee?.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Access denied" })
    }

    res.json(gem)
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
    const { color, weight, itemDescription, testerId1, testerId2, customerId, status, imageIds } =
      req.body

    // Validation
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
      intake: {
        helperId: req.user._id,
        timestamp: new Date(),
      },
    })

    const createdGem = await gem.save()

    // Populate before returning
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

    // Handle image update (replacing with new list of image IDs)
    if (req.body.imageIds && Array.isArray(req.body.imageIds)) {
      gem.images = req.body.imageIds
    }

    // Allow deleting specific images if imageIdsToDelete is provided in body
    if (req.body.imageIdsToDelete) {
      const toDelete = Array.isArray(req.body.imageIdsToDelete)
        ? req.body.imageIdsToDelete
        : req.body.imageIdsToDelete.split(",")

      for (const id of toDelete) {
        // Just remove from gem. Note: Image deletion is handled by deleteImage endpoint now if needed,
        // but for backward compatibility we keep it here if they insist,
        // although "separate edits" suggest managing images independently.
        gem.images = gem.images.filter((imgId) => imgId.toString() !== id.toString())
      }
    }

    // Mapping tester IDs from frontend to model fields
    if (req.body.testerId1 !== undefined) {
      req.body.assignedTester1 = req.body.testerId1
      if (gem.status === GEM_STATUSES.DRAFT_INTAKE || gem.status === GEM_STATUSES.READY_FOR_T1)
        req.body.currentAssignee = req.body.testerId1
    }
    if (req.body.testerId2 !== undefined) {
      req.body.assignedTester2 = req.body.testerId2
      if (gem.status === GEM_STATUSES.READY_FOR_T2) req.body.currentAssignee = req.body.testerId2
    }

    // Directly apply all incoming fields to the gem object
    Object.keys(req.body).forEach((field) => {
      if (field === "weight") {
        gem[field] =
          req.body[field] === "" || req.body[field] === null ? null : Number(req.body[field])
      } else {
        gem[field] = req.body[field]
      }
    })

    const updatedGem = await gem.save()

    // Populate before returning
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
    const { ri, sg, hardness, observations, status } = req.body

    const gem = await Gem.findById(req.params.id)
    if (!gem) return res.status(404).json({ message: "Gem not found" })

    // Build update object
    const test1Data = { ...gem.test1.toObject() }
    if (ri !== undefined) test1Data.ri = Number(ri)
    if (sg !== undefined) test1Data.sg = Number(sg)
    if (hardness !== undefined) test1Data.hardness = Number(hardness)
    if (observations !== undefined) {
      test1Data.observations = { ...(test1Data.observations || {}), ...observations }
    }

    test1Data.testerId = req.user._id
    test1Data.timestamp = new Date()
    test1Data.correctionRequested = false

    gem.test1 = test1Data

    // Status transition if submitted
    if (status === GEM_STATUSES.READY_FOR_T2) {
      gem.status = GEM_STATUSES.READY_FOR_T2
      gem.currentAssignee = gem.assignedTester2
    } else if (status) {
      gem.status = status
    }

    const updatedGem = await gem.save()
    await updatedGem.populate("currentAssignee", "name role")
    await updatedGem.populate("test1.testerId", "name role")

    res.json(updatedGem)
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
    const { ri, sg, hardness, observations, status } = req.body

    const gem = await Gem.findById(req.params.id)
    if (!gem) return res.status(404).json({ message: "Gem not found" })

    // Build update object
    const test2Data = { ...gem.test2.toObject() }
    if (ri !== undefined) test2Data.ri = Number(ri)
    if (sg !== undefined) test2Data.sg = Number(sg)
    if (hardness !== undefined) test2Data.hardness = Number(hardness)
    if (observations !== undefined) {
      test2Data.observations = { ...(test2Data.observations || {}), ...observations }
    }

    test2Data.testerId = req.user._id
    test2Data.timestamp = new Date()
    test2Data.correctionRequested = false

    gem.test2 = test2Data

    // Status transition if submitted
    if (status === GEM_STATUSES.READY_FOR_APPROVAL) {
      gem.status = GEM_STATUSES.READY_FOR_APPROVAL
      gem.currentAssignee = null // unassigned, ready for admin to pick up
    } else if (status) {
      gem.status = status
    }

    const updatedGem = await gem.save()
    await updatedGem.populate("currentAssignee", "name role")
    await updatedGem.populate("test2.testerId", "name role")

    res.json(updatedGem)
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
    const { ri, sg, hardness, finalObservations, status } = req.body

    const gem = await Gem.findById(req.params.id)
    if (!gem) return res.status(404).json({ message: "Gem not found" })

    // Build update object
    const finalData = { ...gem.finalApproval.toObject() }
    if (ri !== undefined) finalData.ri = Number(ri)
    if (sg !== undefined) finalData.sg = Number(sg)
    if (hardness !== undefined) finalData.hardness = Number(hardness)
    if (finalObservations !== undefined) {
      finalData.finalObservations = {
        ...(finalData.finalObservations || {}),
        ...finalObservations,
      }
    }

    finalData.approverId = req.user._id
    finalData.timestamp = new Date()

    gem.finalApproval = finalData

    // Status transition
    if (status) {
      gem.status = status

      // Auto-generate report entry if submitted for report
      if (status === GEM_STATUSES.SUBMITTED_FOR_REPORT) {
        // Check if report already exists
        const existingReport = await Report.findOne({ gemId: gem._id })

        if (!existingReport) {
          const reportId = await generateReportId()

          const newReport = new Report({
            gemId: gem._id,
            reportType: REPORT_TYPES.SMALL, // Default type
            reportId,
            issuedDate: new Date(),
          })

          const savedReport = await newReport.save()
          gem.reportId = savedReport._id
        }
      }
    } else {
      gem.status = GEM_STATUSES.DRAFT_APPROVAL
    }

    const updatedGem = await gem.save()
    await updatedGem.populate("finalApproval.approverId", "name role")

    res.json(updatedGem)
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

    // Delete all images associated with the gem
    if (gem.images && gem.images.length > 0) {
      for (const imageId of gem.images) {
        await Image.findByIdAndDelete(imageId)
      }
    }

    await gem.deleteOne()
    res.json({ message: "Gem deleted successfully" })
  } catch (error) {
    console.error("Error deleting gem:", error)
    res.status(500).json({ message: "Error deleting gem", error: error.message })
  }
}

//TODO
// @desc    Request correction from a tester (Admin)
// @route   PUT /api/gems/:id/request-correction
// @access  Private/Admin
export const requestCorrection = async (req, res) => {
  try {
    const { stage, note } = req.body

    // Validation
    if (!stage || !["test1", "test2"].includes(stage)) {
      return res.status(400).json({
        message: "Invalid stage. Must be 'test1' or 'test2'",
      })
    }

    const gem = await Gem.findById(req.params.id)

    if (!gem) return res.status(404).json({ message: "Gem not found" })

    if (stage === "test1") {
      if (!gem.test1 || !gem.test1.testerId) {
        return res.status(400).json({
          message: "Test 1 has not been completed yet",
        })
      }
      gem.test1.correctionRequested = true
      gem.test1.correctionNote = note.trim()
      gem.status = GEM_STATUSES.READY_FOR_T1
      gem.currentAssignee = gem.assignedTester1
    } else if (stage === "test2") {
      if (!gem.test2 || !gem.test2.testerId) {
        return res.status(400).json({
          message: "Test 2 has not been completed yet",
        })
      }
      gem.test2.correctionRequested = true
      gem.test2.correctionNote = note.trim()
      gem.status = GEM_STATUSES.READY_FOR_T2
      gem.currentAssignee = gem.assignedTester2
    }

    const updatedGem = await gem.save()

    // Populate before returning
    await updatedGem.populate("currentAssignee", "name role")
    await updatedGem.populate("test1.testerId", "name role")
    await updatedGem.populate("test2.testerId", "name role")

    res.json(updatedGem)
  } catch (error) {
    console.error("Error requesting correction:", error)
    res.status(500).json({ message: "Error requesting correction", error: error.message })
  }
}

// @desc    Add images to an existing gem
// @route   POST /api/gems/:id/images
// @access  Private
export const addGemImages = async (req, res) => {
  try {
    const gem = await Gem.findById(req.params.id)

    if (!gem) {
      return res.status(404).json({ message: "Gem not found" })
    }

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
