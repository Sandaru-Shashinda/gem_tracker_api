import Report from "../models/Report.js"
import Gem from "../models/Gem.js"
import { generateQRCode } from "../utils/qrGenerator.js"
import { createPDFReport } from "../utils/pdfGenerator.js"
import { generateReportId } from "../services/report.service.js"
import { REPORT_TYPES } from "../const/const.js"

// @desc    Get all reports
// @route   GET /api/reports
// @access  Private
export const getReports = async (req, res) => {
  try {
    const pageSize = Number(req.query.limit) || 10
    const page = Number(req.query.page) || 1

    const count = await Report.countDocuments()
    const reports = await Report.find()
      .populate("gemId", "gemId color weight")
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

// @desc    Generate a report for a completed gem
// @route   POST /api/reports/:id/generate
// @access  Private/Admin
export const generateReport = async (req, res) => {
  try {
    const { reportType } = req.body

    if (!reportType || !Object.values(REPORT_TYPES).includes(reportType)) {
      return res.status(400).json({ message: "Invalid report type" })
    }

    const gem = await Gem.findById(req.params.id)

    if (!gem) {
      return res.status(404).json({ message: "Gem not found" })
    }

    if (gem.status !== "COMPLETED" && gem.status !== "DONE") {
      return res
        .status(400)
        .json({ message: "Gem workflow must be completed before generating report" })
    }

    // 1. Generate Report ID
    const reportId = await generateReportId()

    // 2. Generate QR Code pointing to digital report URL
    const publicUrl = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`
    const verificationUrl = `${publicUrl}/api/reports/${reportId}/verify`
    const qrDataUrl = await generateQRCode(verificationUrl)

    // 3. Generate PDF (Pass QR code separately since it's not on gem anymore)
    const reportPath = await createPDFReport(gem, qrDataUrl)

    // 4. Create Report record
    const report = new Report({
      gemId: gem._id,
      reportType,
      qrCode: qrDataUrl,
      reportId,
      reportUrl: reportPath, // We should add this field to the model if not there
    })

    const savedReport = await report.save()

    // 5. Update Gem with report reference
    gem.reportId = savedReport._id
    await gem.save()

    res.status(201).json({
      message: "Report generated successfully",
      report: savedReport,
    })
  } catch (error) {
    console.error("Error generating report:", error)
    res.status(500).json({ message: "Error generating report", error: error.message })
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
