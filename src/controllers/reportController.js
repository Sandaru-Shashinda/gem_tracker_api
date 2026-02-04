import Report from "../models/Report.js"
import Gem from "../models/Gem.js"
import { GEM_STATUSES } from "../const/const.js"

// @desc    Get all reports
// @route   GET /api/reports
// @access  Private
export const getReports = async (req, res) => {
  try {
    const pageSize = Number(req.query.limit) || 10
    const page = Number(req.query.page) || 1

    const count = await Report.countDocuments()
    const reports = await Report.find()
      .populate("gemId", "gemId color weight status")
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
// @access  Private
export const getReportById = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).populate("gemId")
    if (!report) return res.status(404).json({ message: "Report not found" })
    res.json(report)
  } catch (error) {
    res.status(500).json({ message: "Error fetching report", error: error.message })
  }
}

// @desc    Verify/View digital report data
// @route   GET /api/reports/:reportId/verify
// @access  Public
export const verifyReport = async (req, res) => {
  try {
    const report = await Report.findOne({ reportId: req.params.reportId }).populate({
      path: "gemId",
      populate: [
        { path: "intake.helperId", select: "name" },
        { path: "test1.testerId", select: "name" },
        { path: "test2.testerId", select: "name" },
        { path: "finalApproval.approverId", select: "name" },
      ],
    })

    if (!report || !report.gemId) {
      return res.status(404).json({ message: "Valid report not found for this ID" })
    }

    const gem = report.gemId

    // Return limited data for public verification
    res.json({
      reportId: report.reportId,
      gemId: gem.gemId,
      status: gem.status,
      identification: gem.finalApproval.finalVariety,
      measurements: {
        ri: gem.finalApproval.ri,
        sg: gem.finalApproval.sg,
        hardness: gem.finalApproval.hardness,
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

    const updatedReport = await Report.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })

    // Update associated Gem status to DONE
    await Gem.findByIdAndUpdate(report.gemId, { status: GEM_STATUSES.DONE })

    res.json(updatedReport)
  } catch (error) {
    res.status(500).json({ message: "Error updating report", error: error.message })
  }
}
