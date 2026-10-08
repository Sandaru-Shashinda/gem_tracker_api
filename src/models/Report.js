import mongoose from "mongoose"
import { REPORT_TYPES } from "../constants/index.js"

/**
 * One row of a custom card: a label and the words printed against it.
 *
 * No _id, because a row has no identity worth keeping — its position in the list is
 * the whole of what distinguishes it, and the page that draws the card mints its own
 * keys on the way in.
 */
const customCardRowSchema = new mongoose.Schema(
  {
    label: { type: String, default: "", trim: true },
    value: { type: String, default: "", trim: true },
    // This row's own type size in px; absent, it prints at its block's size.
    fontSize: { type: Number, min: 4, max: 72 },
  },
  { _id: false },
)

/**
 * Type sizes in px per text element, absent where the element prints at its template's
 * size. One set of keys serves all three sheets; each reads the ones it has.
 */
const fontSizeField = { type: Number, min: 4, max: 72 }
const customFontSizesSchema = new mongoose.Schema(
  {
    rows: fontSizeField,
    comments: fontSizeField,
    gemName: fontSizeField,
    weightLine: fontSizeField,
    heatLine: fontSizeField,
    imageCaption: fontSizeField,
    title: fontSizeField,
    resultsHeading: fontSizeField,
    termsLine: fontSizeField,
    reportNumberLine: fontSizeField,
    dateLine: fontSizeField,
    headings: fontSizeField,
    treatments: fontSizeField,
    specialNote: fontSizeField,
    statement: fontSizeField,
  },
  { _id: false },
)

/**
 * Where a custom report departs from its template's geometry rather than its words:
 * the scanned signature's size and nudge, the gem image's frame and zoom, and the type
 * sizes. Every default leaves the template exactly as it is. Shared by all three sheets.
 */
const customLayoutFields = {
  signatureScale: { type: Number, default: 1, min: 0.25, max: 4 },
  signatureX: { type: Number, default: 0, min: -500, max: 500 },
  signatureY: { type: Number, default: 0, min: -500, max: 500 },
  imageBoxScale: { type: Number, default: 1, min: 0.25, max: 4 },
  imageScale: { type: Number, default: 1, min: 0.25, max: 6 },
  fontSizes: { type: customFontSizesSchema, default: () => ({}) },
}

/**
 * A one-off rewrite of the small card this report prints.
 *
 * Set only on reports somebody has actually customised, and read as a signal as much
 * as a document: a report carrying one prints this instead of the card built from the
 * gem, everywhere the card is drawn, including the public QR verification page.
 *
 * Nothing here flows back into the gem. It is what a single printed certificate says,
 * not what the lab determined about the stone — those are deliberately different
 * records, and this one is free to disagree with the other.
 */
const customCardSchema = new mongoose.Schema(
  {
    rows: { type: [customCardRowSchema], default: [] },
    commentsLabel: { type: String, default: "Comments" },
    comments: { type: String, default: "" },
    heatLine: { type: String, default: "" },
    showHeatLine: { type: Boolean, default: false },
    gemName: { type: String, default: "" },
    weightLine: { type: String, default: "" },
    imageCaption: { type: String, default: "" },
    qrValue: { type: String, default: "" },
    showLogo: { type: Boolean, default: true },
    showWatermark: { type: Boolean, default: true },
    showGemImage: { type: Boolean, default: true },
    showSignature: { type: Boolean, default: true },
    showQr: { type: Boolean, default: true },
    ...customLayoutFields,
  },
  { _id: false },
)

/**
 * A one-off rewrite of the A5 report this report prints.
 *
 * Its own field rather than a variant of the card above, because the two describe
 * different sheets of paper: the card has one block of rows, the A5 has two plus a
 * clarity scale, a footer and a pair of signature fields. A report prints at one size,
 * so only the field matching its reportType is ever read.
 *
 * The clarity scale stores which grade is marked, not the scale itself — those cells
 * are the lab's published grades, not this report's wording.
 */
const customMediumCardSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    rows: { type: [customCardRowSchema], default: [] },
    resultsHeading: { type: String, default: "Results" },
    resultRows: { type: [customCardRowSchema], default: [] },
    commentsLabel: { type: String, default: "Comments" },
    comments: { type: String, default: "" },
    clarityGrade: { type: String, default: "" },
    showClarityTable: { type: Boolean, default: true },
    qrValue: { type: String, default: "" },
    showQr: { type: Boolean, default: true },
    termsLine: { type: String, default: "" },
    imageCaption: { type: String, default: "" },
    showGemImage: { type: Boolean, default: true },
    showWatermark: { type: Boolean, default: true },
    heatLine: { type: String, default: "" },
    showHeatLine: { type: Boolean, default: false },
    gemName: { type: String, default: "" },
    weightLine: { type: String, default: "" },
    signatoryName: { type: String, default: "" },
    signatoryRole: { type: String, default: "" },
    signatoryCompany: { type: String, default: "" },
    showTypedSignature: { type: Boolean, default: true },
    showSignatureImage: { type: Boolean, default: true },
    ...customLayoutFields,
  },
  { _id: false },
)

/**
 * A treatment answer on a custom A4: "Yes", "No", or "" for not assessed — the same
 * tri-state the stage records hold, since "not tested" and "tested, not present" are
 * different claims on a certificate. Keys mirror the app's lib/treatments.ts.
 */
const treatmentAnswer = { type: String, enum: ["", "Yes", "No"], default: "" }

const customTreatmentsSchema = new mongoose.Schema(
  {
    heatTreatment: treatmentAnswer,
    irradiationTreatment: treatmentAnswer,
    hpht: treatmentAnswer,
    diffusionTreatment: treatmentAnswer,
    dyeing: treatmentAnswer,
    bleaching: treatmentAnswer,
    fractureFillingOil: treatmentAnswer,
    fractureFillingResinGlass: treatmentAnswer,
    laserDrilling: treatmentAnswer,
    hpnt: treatmentAnswer,
    coating: treatmentAnswer,
    assembledStone: treatmentAnswer,
  },
  { _id: false },
)

/**
 * A one-off rewrite of the A4 report this report prints.
 *
 * The A4 carries structure the smaller sheets do not — a colour breakdown, a treatment
 * checklist, a clarity chart and a statement — so it has its own field rather than a
 * variant of theirs. As with them, a report prints at one size, so only the field
 * matching its reportType is ever read.
 *
 * The scales and the treatment list are the lab's published vocabulary; what is stored
 * about them is the answer each records, never the scale itself.
 */
const customLargeCardSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    reportNumberLine: { type: String, default: "" },
    dateLine: { type: String, default: "" },
    showLogo: { type: Boolean, default: true },
    showQr: { type: Boolean, default: true },
    qrValue: { type: String, default: "" },

    detailsHeading: { type: String, default: "DETAILS" },
    detailRows: { type: [customCardRowSchema], default: [] },
    cutRows: { type: [customCardRowSchema], default: [] },
    colourRows: { type: [customCardRowSchema], default: [] },
    toneLabel: { type: String, default: "Tone" },
    tone: { type: String, enum: ["", "Low", "Medium", "High"], default: "" },
    saturationLabel: { type: String, default: "Saturation" },
    saturation: { type: String, enum: ["", "Low", "Medium", "High"], default: "" },

    resultsHeading: { type: String, default: "RESULTS" },
    resultRows: { type: [customCardRowSchema], default: [] },
    treatmentHeading: { type: String, default: "TREATMENT" },
    treatments: { type: customTreatmentsSchema, default: () => ({}) },
    specialNoteHeading: { type: String, default: "SPECIAL NOTE" },
    specialNote: { type: String, default: "" },
    showSpecialNote: { type: Boolean, default: false },

    clarityHeading: { type: String, default: "CLARITY CHART" },
    clarityGrade: { type: String, default: "" },
    showClarityChart: { type: Boolean, default: true },
    statementHeading: { type: String, default: "STATEMENT" },
    statement: { type: String, default: "" },
    showStatement: { type: Boolean, default: true },

    showGemImage: { type: Boolean, default: true },
    imageCaption: { type: String, default: "" },
    heatLine: { type: String, default: "" },
    showHeatLine: { type: Boolean, default: false },
    gemName: { type: String, default: "" },
    weightLine: { type: String, default: "" },
    signatoryName: { type: String, default: "" },
    signatoryRole: { type: String, default: "" },
    signatoryCompany: { type: String, default: "" },
    showTypedSignature: { type: Boolean, default: true },
    showSignatureImage: { type: Boolean, default: true },

    termsLine: { type: String, default: "" },
    showWatermark: { type: Boolean, default: true },
    ...customLayoutFields,
  },
  { _id: false },
)

const reportSchema = new mongoose.Schema(
  {
    gemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gem",
      required: true,
    },
    reportType: {
      type: String,
      enum: Object.values(REPORT_TYPES),
      required: true,
    },

    qrCode: {
      type: String,
    },
    issuedDate: {
      type: Date,
      default: Date.now,
    },
    reportId: {
      type: String,
      required: true,
      unique: true,
    },
    reportUrl: {
      type: String,
    },
    isClientDataAdd: {
      type: Boolean,
      default: false,
    },
    // Link to a video of the stone (a Google Drive share link). When set, the page a QR
    // scan opens offers to play it. Absent means no video, whatever intake asked for.
    videoUrl: {
      type: String,
      trim: true,
    },
    // The consultant gemologist whose name is printed on the left-hand signature
    // field of the medium and large reports. Held as a reference so the printed
    // name tracks the user record instead of a copy of it.
    signedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // Absent unless this report has been customised — its presence is what tells the
    // previews to print the custom card rather than the gem's own.
    customCard: {
      type: customCardSchema,
      default: undefined,
    },
    // The same idea one paper size up. Read only by a medium report, as customCard is
    // read only by a small one, so switching size never prints the other's wording.
    customMediumCard: {
      type: customMediumCardSchema,
      default: undefined,
    },
    // And the A4. Read only by a large report.
    customLargeCard: {
      type: customLargeCardSchema,
      default: undefined,
    },
  },

  { timestamps: true },
)

const Report = mongoose.model("Report", reportSchema)

export default Report
