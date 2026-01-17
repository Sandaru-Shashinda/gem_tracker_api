import Gem from "../models/Gem.js"

// @desc    Get all gems
// @route   GET /api/gems
// @access  Private
export const getGems = async (req, res) => {
  const gems = await Gem.find({}).sort({ updatedAt: -1 })
  res.json(gems)
}

// @desc    Get gem by ID
// @route   GET /api/gems/:id
// @access  Private
export const getGemById = async (req, res) => {
  const gem = await Gem.findById(req.params.id)
  if (gem) {
    res.json(gem)
  } else {
    res.status(404).json({ message: "Gem not found" })
  }
}

// @desc    Create a new gem (Intake)
// @route   POST /api/gems/intake
// @access  Private/Helper
export const intakeGem = async (req, res) => {
  const { weight, color, gemId } = req.body

  const gem = new Gem({
    gemId,
    status: "READY_FOR_T1",
    intake: {
      weight,
      color,
      helperId: req.user._id,
      timestamp: new Date(),
    },
  })

  const createdGem = await gem.save()
  res.status(201).json(createdGem)
}

// @desc    Update gem with test results (Tester)
// @route   PUT /api/gems/:id/test
// @access  Private/Tester
export const submitTest = async (req, res) => {
  const { ri, sg, hardness, notes, selectedVariety } = req.body
  const gem = await Gem.findById(req.params.id)

  if (gem) {
    if (gem.status === "READY_FOR_T1") {
      gem.test1 = {
        ri,
        sg,
        hardness,
        notes,
        selectedVariety,
        testerId: req.user._id,
        timestamp: new Date(),
      }
      gem.status = "READY_FOR_T2"
    } else if (gem.status === "READY_FOR_T2") {
      gem.test2 = {
        ri,
        sg,
        hardness,
        notes,
        selectedVariety,
        testerId: req.user._id,
        timestamp: new Date(),
      }
      gem.status = "READY_FOR_APPROVAL"
    } else {
      return res.status(400).json({ message: "Invalid status for testing" })
    }

    const updatedGem = await gem.save()
    res.json(updatedGem)
  } else {
    res.status(404).json({ message: "Gem not found" })
  }
}

// @desc    Final approval (Approver)
// @route   PUT /api/gems/:id/approve
// @access  Private/Approver
export const approveGem = async (req, res) => {
  const { ri, sg, hardness, notes, finalVariety } = req.body
  const gem = await Gem.findById(req.params.id)

  if (gem) {
    gem.finalApproval = {
      ri,
      sg,
      hardness,
      notes,
      finalVariety,
      approverId: req.user._id,
      timestamp: new Date(),
    }
    gem.status = "COMPLETED"

    const updatedGem = await gem.save()
    res.json(updatedGem)
  } else {
    res.status(404).json({ message: "Gem not found" })
  }
}
