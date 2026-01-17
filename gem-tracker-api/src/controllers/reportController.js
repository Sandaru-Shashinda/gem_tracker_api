import Gem from "../models/Gem.js"
import { generateQRCode } from "../utils/qrGenerator.js"
import { createPDFReport } from "../utils/pdfGenerator.js"

// @desc    Generate a report for a completed gem
// @route   POST /api/reports/:id/generate
// @access  Private/Approver
export const generateReport = async (req, res) => {
  const gem = await Gem.findById(req.params.id)

  if (!gem) {
    return res.status(404).json({ message: "Gem not found" })
  }

  if (gem.status !== "COMPLETED") {
    return res
      .status(400)
      .json({ message: "Gem workflow must be completed before generating report" })
  }

  try {
    // 1. Generate QR Code pointing to digital report URL
    const publicUrl = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`
    const verificationUrl = `${publicUrl}/api/reports/${gem._id}/verify`
    const qrDataUrl = await generateQRCode(verificationUrl)

    gem.qrCode = qrDataUrl

    // 2. Generate PDF
    const reportPath = await createPDFReport(gem)

    gem.reportUrl = reportPath
    await gem.save()

    res.json({
      message: "Report generated successfully",
      reportUrl: gem.reportUrl,
      qrCode: gem.qrCode,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error generating report" })
  }
}

// @desc    Verify/View digital report data
// @route   GET /api/reports/:id/verify
// @access  Public
export const verifyReport = async (req, res) => {
  const gem = await Gem.findById(req.params.id)
    .populate("intake.helperId", "name")
    .populate("test1.testerId", "name")
    .populate("test2.testerId", "name")
    .populate("finalApproval.approverId", "name")

  if (!gem) {
    return res.status(404).json({ message: "Valid report not found for this ID" })
  }

  // Return limited data for public verification
  res.json({
    gemId: gem.gemId,
    status: gem.status,
    identification: gem.finalApproval.finalVariety,
    measurements: {
      ri: gem.finalApproval.ri,
      sg: gem.finalApproval.sg,
      hardness: gem.finalApproval.hardness,
    },
    descriptions: {
      weight: gem.intake.weight,
      color: gem.intake.color,
    },
    verifiedAt: gem.updatedAt,
  })
}
