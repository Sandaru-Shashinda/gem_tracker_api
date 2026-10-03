import Report from "../models/Report.js"
import Gem from "../models/Gem.js"
import Image from "../models/Image.js"
import GemFinalApproval from "../models/GemFinalApproval.js"
import { GEM_STATUSES, REPORT_MODES, REPORT_TYPES } from "../constants/index.js"
import { populateGemStages } from "../services/gem.service.js"

/**
 * The report list's filters, as a Report query.
 *
 * Status and certificate type live on the gem, so they narrow the reports to those of
 * the matching gems. `from`/`to` are instants, not dates: the app turns the day the
 * user picked into its own local midnight, so the filter agrees with the issued date
 * the table shows. `to` is exclusive.
 */
async function buildReportQuery({ search, status, type, mode, from, to }) {
  const query = {}

  if (type && Object.values(REPORT_TYPES).includes(type)) query.reportType = type

  const fromDate = from ? new Date(from) : null
  const toDate = to ? new Date(to) : null
  if (fromDate && !isNaN(fromDate)) query.issuedDate = { ...query.issuedDate, $gte: fromDate }
  if (toDate && !isNaN(toDate)) query.issuedDate = { ...query.issuedDate, $lt: toDate }

  const gemFilter = {}
  if (status && Object.values(GEM_STATUSES).includes(status)) gemFilter.status = status
  if (mode === REPORT_MODES.CUSTOM) gemFilter.reportMode = REPORT_MODES.CUSTOM
  // Gems taken in before the choice existed carry no mode, and are standard.
  if (mode === REPORT_MODES.DEFAULT) gemFilter.reportMode = { $ne: REPORT_MODES.CUSTOM }
  if (Object.keys(gemFilter).length) {
    query.gemId = { $in: await Gem.distinct("_id", gemFilter) }
  }

  const term = typeof search === "string" ? search.trim() : ""
  if (term) {
    const pattern = { $regex: term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" }
    const matchingGems = await Gem.distinct("_id", { gemId: pattern })
    query.$or = [{ reportId: pattern }, { gemId: { $in: matchingGems } }]
  }

  return query
}

// @desc    Get all reports
// @route   GET /api/reports?search=&status=&type=&mode=&from=&to=
// @access  Private
export const getReports = async (req, res) => {
  try {
    const pageSize = Number(req.query.limit) || 10
    const page = Number(req.query.page) || 1

    const query = await buildReportQuery(req.query)
    const count = await Report.countDocuments(query)
    const reports = await Report.find(query)
      .populate("gemId", "gemId color weight status reportTypes reportMode")
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
    // The signatory's signature comes along so the digital copy can carry it where the
    // paper copy carries it in ink.
    const report = await Report.findById(req.params.id)
      .populate("gemId")
      .populate("signedBy", "name role signatureImage")
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

/** Anchored, case-insensitive exact match — customers rarely type the case we print. */
const exactInsensitive = (value) => ({
  $regex: `^${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
  $options: "i",
})

// @desc    Verify/View digital report data
// @route   GET /api/reports/:reportId/verify
// @access  Public
export const verifyReport = async (req, res) => {
  try {
    const identifier = (req.params.reportId || "").trim()

    if (!identifier) {
      return res.status(404).json({ message: "Valid report not found for this ID" })
    }

    // Two different numbers reach this route. Staff quote the report number
    // (REP-YYYY-MM-NNNNN), but the number printed on the certificate under
    // "GRC Number" is the gem's id (GRC-YYYY-MM-NNNNN) — that is the one a
    // customer holding a certificate will type. Matching only the former sent
    // every such visitor to a "not found" page for a certificate we had issued.
    let report = await Report.findOne({ reportId: exactInsensitive(identifier) })
    let gem = null

    if (report) {
      gem = await Gem.findById(report.gemId).populate("intake.helperId", "name")
    } else {
      gem = await Gem.findOne({ gemId: exactInsensitive(identifier) }).populate(
        "intake.helperId",
        "name",
      )
      if (gem) {
        report = await Report.findOne({ gemId: gem._id }).sort({ createdAt: -1 })
      }
    }

    if (!report || !gem) {
      return res.status(404).json({ message: "Valid report not found for this ID" })
    }

    const finalApproval = await GemFinalApproval.findOne({ gemId: gem._id })
      .populate("approverId", "name")
      .lean()

    res.json({
      // The public site looks a certificate up by its printed GRC number, but the
      // full report view is addressed by _id — the same value the certificate QR
      // encodes. Returning it here is what lets a typed-in number land on exactly
      // the page a scan produces, instead of a second, thinner summary of it.
      _id: report._id,
      reportType: report.reportType,
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

/**
 * Which stored document a paper size prints from. A report prints at one size, so only
 * its own field is ever written or read — a medium report carrying a saved card from
 * back when it was small keeps it, unread, rather than losing it to a size change.
 */
const CUSTOM_CARD_FIELDS = {
  small: "customCard",
  medium: "customMediumCard",
  large: "customLargeCard",
}

// @desc    Save the custom card a report prints, or clear it
// @route   PUT /api/reports/:id/custom-card
// @access  Private/Admin
//
// Deliberately not folded into updateReport. That route moves the gem to DONE as a
// side effect of saving report settings, which is right for the settings and wrong
// here: rewording a printed certificate says nothing about where the stone is in the
// workflow, and a lab that customises a card should not find it has advanced the gem.
//
// Sending null clears the customisation, and the report goes back to printing the
// card built from the gem.
export const updateCustomCard = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
    if (!report) return res.status(404).json({ message: "Report not found" })

    // The size is the caller's, defaulting to the card so requests written before the
    // A5 existed keep meaning what they meant.
    const field = CUSTOM_CARD_FIELDS[req.body.reportSize] || CUSTOM_CARD_FIELDS.small

    const { customCard } = req.body
    const update = customCard ? { $set: { [field]: customCard } } : { $unset: { [field]: 1 } }

    const updatedReport = await Report.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    }).populate("signedBy", "name role")

    res.json(updatedReport)
  } catch (error) {
    res.status(500).json({ message: "Error saving custom card", error: error.message })
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
