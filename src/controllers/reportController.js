import Report from "../models/Report.js"
import Gem from "../models/Gem.js"
import Image from "../models/Image.js"
import GemFinalApproval from "../models/GemFinalApproval.js"
import { GEM_STATUSES } from "../constants/index.js"
import { populateGemStages } from "../services/gem.service.js"

// @desc    Get all reports
// @route   GET /api/reports
// @access  Private
export const getReports = async (req, res) => {
  try {
    const pageSize = Number(req.query.limit) || 10
    const page = Number(req.query.page) || 1

    const count = await Report.countDocuments()
    const reports = await Report.find()
      .populate("gemId", "gemId color weight status reportTypes")
      .sort({ createdAt: -1 })
      .limit(pageSize)
      .skip(pageSize * (page - 1))

    res.json({
      reports,
      page,
      pages: Math.ceil(count / pageSize),
      total: count,
    })
  } catch (error) {
    res.status(500).json({ message: "Error fetching reports", error: error.message })
  }
}

// @desc    Get single report by ID
// @route   GET /api/reports/:id
// @access  Public
export const getReportById = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate("gemId")
      .populate("signedBy", "name role")
    if (!report) return res.status(404).json({ message: "Report not found" })

    const gem = report.gemId.toObject()

    const finalApproval = await GemFinalApproval.findOne({ gemId: report.gemId._id })
      .populate("approverId", "name role")
      .lean()

    // This route is public so the QR verification page works for anyone. Those
    // visitors have no token and so cannot call the protected /api/images/:id,
    // which left the report artwork blank. Ship the gem's images alongside the
    // report instead — they are small data URIs and already public via the report.
    //
    // `metadata` carries the crop box the certificate needs to draw the stone at its
    // measured size. Leaving it out here silently downgraded every QR visitor to the
    // approximate fallback, while signed-in staff — who fetch the image itself — saw
    // the sized version, so the same report looked different on a phone.
    const gemImages = await Image.find({ _id: { $in: gem.images || [] }, isDeleted: false })
      .select("_id name url metadata")
      .lean()

    res.json({
      ...report.toObject(),
      gemId: { ...gem, finalApproval: finalApproval || {} },
      gemImages,
    })
  } catch (error) {
    res.status(500).json({ message: "Error fetching report", error: error.message })
  }
}

// @desc    Verify/View digital report data
// @route   GET /api/reports/:reportId/verify
// @access  Public
export const verifyReport = async (req, res) => {
  try {
    const report = await Report.findOne({ reportId: req.params.reportId })

    if (!report) {
      return res.status(404).json({ message: "Valid report not found for this ID" })
    }

    const gem = await Gem.findById(report.gemId).populate("intake.helperId", "name")
    if (!gem) {
      return res.status(404).json({ message: "Valid report not found for this ID" })
    }

    const finalApproval = await GemFinalApproval.findOne({ gemId: gem._id })
      .populate("approverId", "name")
      .lean()

    res.json({
      reportId: report.reportId,
      gemId: gem.gemId,
      status: gem.status,
      identification: finalApproval?.finalVariety,
      measurements: {
        // R.I. is the range the lab read; `ri` is the single value older records hold.
        ri: finalApproval
          ? {
              min: finalApproval.riMin ?? finalApproval.ri ?? null,
              max: finalApproval.riMax ?? finalApproval.ri ?? null,
            }
          : null,
        sg: finalApproval?.sg,
        hardness: finalApproval?.hardness ?? finalApproval?.hardnessMin ?? null,
      },
      descriptions: {
        weight: gem.weight,
        color: gem.color,
      },
      issuedDate: report.issuedDate,
      verifiedAt: new Date(),
    })
  } catch (error) {
    res.status(500).json({ message: "Error verifying report", error: error.message })
  }
}

// @desc    Delete a report
// @route   DELETE /api/reports/:id
// @access  Private/Admin
export const deleteReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
    if (!report) return res.status(404).json({ message: "Report not found" })

    // Unlink from gem
    await Gem.findOneAndUpdate({ reportId: report._id }, { $unset: { reportId: 1 } })

    await report.deleteOne()
    res.json({ message: "Report deleted successfully" })
  } catch (error) {
    res.status(500).json({ message: "Error deleting report", error: error.message })
  }
}

// @desc    Update a report
// @route   PUT /api/reports/:id
// @access  Private/Admin
export const updateReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
    if (!report) return res.status(404).json({ message: "Report not found" })

    // signedBy is populated on the way out so the response matches the shape
    // getReportById returns — the configuration page renders the preview straight
    // from it and reads the signatory's name off the populated document.
    const updatedReport = await Report.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("signedBy", "name role")

    // Update associated Gem status to DONE
    await Gem.findByIdAndUpdate(report.gemId, { status: GEM_STATUSES.DONE })

    res.json(updatedReport)
  } catch (error) {
    res.status(500).json({ message: "Error updating report", error: error.message })
  }
}
