import crypto from "crypto"
import sharp from "sharp"
import Image from "../models/Image.js"
import GemReference from "../models/GemReference.js"
import GemFinalApproval from "../models/GemFinalApproval.js"
import GemAiInsight from "../models/GemAiInsight.js"
import { fetchFileRange, isDriveConfigured, listFolder } from "./drive.service.js"
import { generateJson } from "./gemini.service.js"
import { scoreReferences, hasScorableReadings } from "./referenceMatch.service.js"
import {
  AI_SHAPES,
  AI_CUTTING_STYLES,
  AI_TRANSPARENCY,
  AI_TONE_SATURATION,
  AI_GRADES,
  AI_CLARITY_STANDARD,
  AI_CLARITY_EMERALD,
  AI_CLARITY_ENHANCEMENT,
  AI_STANDARD_COLOURS,
  AI_TREATMENT_KEYS,
} from "../constants/aiOptions.js"

/**
 * AI insights for one gem: what its photos and the readings entered so far suggest
 * for the rest of the report.
 *
 * Accuracy comes from narrowing, not from the model knowing best. The readings are run
 * through the same reference scorer as the Scientific Suggestions panel, and the model
 * is told to choose only among the species that scorer still allows, using the photos
 * to rank them. Each reading the tester adds shrinks that list, so the answer tightens
 * as the analysis fills in. The result is then checked here, deterministically: a
 * confidence the readings do not support is capped, and every candidate is tested
 * against the S.G. its weight and size imply.
 *
 * Only instrument readings go in — never the stone's other stage records — so one
 * tester's findings cannot reach the other through the AI.
 */

/** Bump when the prompt or schema changes, so cached answers to the old one are not reused. */
const PROMPT_VERSION = 3

// Mirrored in the app (lib/api/aiInsights.ts) so it can count the photos the AI will use.
const MAX_INTAKE_IMAGES = 2
const MAX_DRIVE_IMAGES = 3
const MAX_DRIVE_IMAGE_BYTES = 20 * 1024 * 1024
const IMAGE_EDGE_PX = 1280

const MAX_CANDIDATES_IN_PROMPT = 8
const MAX_CANDIDATES_OUT = 4

export const AI_FIELD_KEYS = [
  "colour", "hue", "tone", "saturation", "transparency", "cuttingShape", "crownStyle",
  "pavilionStyle", "clarityGrade", "clarityEnhancement", "grade",
]

const FIELD_ENUMS = {
  tone: AI_TONE_SATURATION,
  saturation: AI_TONE_SATURATION,
  transparency: AI_TRANSPARENCY,
  cuttingShape: AI_SHAPES,
  crownStyle: AI_CUTTING_STYLES,
  pavilionStyle: AI_CUTTING_STYLES,
  clarityGrade: [...AI_CLARITY_STANDARD, ...AI_CLARITY_EMERALD],
  clarityEnhancement: AI_CLARITY_ENHANCEMENT,
  grade: AI_GRADES,
}

// ── Readings ───────────────────────────────────────────────────────────────

const positiveOrNull = (v) => {
  if (v === null || v === undefined || v === "") return null
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

const riOrNull = (v) => (typeof v === "string" && v.trim() === "-" ? "-" : positiveOrNull(v))

/**
 * The readings the client sent, reduced to what the AI is given. The app normalises
 * the form the same way (lib/api/aiInsights.ts) to tell when a result is out of date.
 */
export const normalizeReadings = (raw = {}) => {
  const spectrum = typeof raw.spectroscopy === "string" ? raw.spectroscopy.trim().slice(0, 600) : ""
  return {
    riMin: riOrNull(raw.riMin),
    riMax: riOrNull(raw.riMax),
    sg: positiveOrNull(raw.sg),
    hardness: positiveOrNull(raw.hardness),
    weight: positiveOrNull(raw.weight),
    length: positiveOrNull(raw.length),
    width: positiveOrNull(raw.width),
    height: positiveOrNull(raw.height),
    spectroscopy: spectrum || null,
  }
}

// ── Weight and size → S.G. ─────────────────────────────────────────────────

/**
 * Carat-estimation factors for coloured stones: ct ≈ L × W × H × S.G. × factor. Turned
 * round, a weighed and measured stone gives an approximate S.G. — an independent check
 * on the identification, and the only S.G. evidence when it has not been measured.
 */
const SHAPE_FACTORS = [
  [/round|ball/i, 0.0018],
  [/oval/i, 0.002],
  [/cushion/i, 0.0022],
  [/octagon|rectangle|square|baguette|lozenge|trapeze/i, 0.0025],
  [/pear|drop|briolette/i, 0.00175],
  [/maquise|marquise|navette/i, 0.0016],
  [/heart/i, 0.0018],
  [/triangle|trillion/i, 0.0016],
]
const DEFAULT_FACTOR = 0.002
// Wide on purpose: deep native cuts and shallow windowed stones both stray well off the
// formula, so this only ever nudges — it never rules a species out.
const IMPLIED_SG_TOLERANCE = 0.25

export const impliedSg = (readings, shape) => {
  const { weight, length, width, height } = readings
  if (!weight || !length || !width || !height) return null
  const match = shape ? SHAPE_FACTORS.find(([pattern]) => pattern.test(shape)) : null
  const factor = match ? match[1] : DEFAULT_FACTOR
  const value = weight / (length * width * height * factor)
  if (!Number.isFinite(value) || value < 1 || value > 8) return null
  const round = (n) => Math.round(n * 100) / 100
  return {
    value: round(value),
    low: round(value * (1 - IMPLIED_SG_TOLERANCE)),
    high: round(value * (1 + IMPLIED_SG_TOLERANCE)),
    shape: match ? shape : null,
  }
}

// ── Photos ─────────────────────────────────────────────────────────────────

/**
 * Which photos the AI will look at, without downloading any: the gem's cropped intake
 * photos first (the stone fills the frame), then the newest full-size photos from its
 * Drive folder. Their ids go into the cache key, so adding a photo asks again.
 */
const listImageSources = async (gem) => {
  const sources = (gem.images || [])
    .slice(0, MAX_INTAKE_IMAGES)
    .map((id) => ({ kind: "intake", id: String(id) }))

  if (gem.driveFolderId && isDriveConfigured()) {
    try {
      const files = await listFolder(gem.driveFolderId)
      files
        .filter((f) => f.mimeType?.startsWith("image/") && Number(f.size || 0) <= MAX_DRIVE_IMAGE_BYTES)
        .slice(0, MAX_DRIVE_IMAGES)
        .forEach((f) => sources.push({ kind: "drive", id: f.id }))
    } catch (error) {
      console.warn("AI insights: could not list Drive photos:", error.message)
    }
  }
  return sources
}

const toJpeg = (buffer) =>
  sharp(buffer)
    .rotate()
    .resize({ width: IMAGE_EDGE_PX, height: IMAGE_EDGE_PX, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer()

/** The photos as Gemini inline parts. One that cannot be read is skipped, not fatal. */
const loadImageParts = async (sources) => {
  const intakeIds = sources.filter((s) => s.kind === "intake").map((s) => s.id)
  const intakeDocs = intakeIds.length
    ? await Image.find({ _id: { $in: intakeIds }, isDeleted: { $ne: true } }).select("data").lean()
    : []
  const intakeById = new Map(intakeDocs.map((d) => [String(d._id), d]))

  const loaded = await Promise.all(
    sources.map(async (source) => {
      try {
        let buffer
        if (source.kind === "intake") {
          const doc = intakeById.get(source.id)
          if (!doc?.data) return null
          buffer = Buffer.from(doc.data, "base64")
        } else {
          const response = await fetchFileRange(source.id, "bytes=0-")
          if (!response.ok) return null
          buffer = Buffer.from(await response.arrayBuffer())
        }
        const jpeg = await toJpeg(buffer)
        return { inline_data: { mime_type: "image/jpeg", data: jpeg.toString("base64") } }
      } catch (error) {
        console.warn(`AI insights: skipped ${source.kind} photo ${source.id}:`, error.message)
        return null
      }
    }),
  )
  return loaded.filter(Boolean)
}

// ── Context from the lab's own records ─────────────────────────────────────

/**
 * A few recently approved reports for the likeliest varieties — or the latest ones when
 * there is no candidate yet — so suggestions come back in the lab's own vocabulary.
 * They are style examples only; nothing about them is evidence about this stone.
 */
const loadLabExamples = async (gemId, varieties) => {
  const filter = { gemId: { $ne: gemId }, approverId: { $exists: true } }
  if (varieties.length) {
    filter.finalVariety = { $in: varieties.map((v) => new RegExp(`^${escapeRegex(v)}$`, "i")) }
  }
  const docs = await GemFinalApproval.find(filter)
    .sort({ timestamp: -1 })
    .limit(3)
    .select("finalVariety colour weight finalObservations")
    .lean()
  return docs.map((d) => {
    const o = d.finalObservations || {}
    return {
      species: o.species,
      variety: d.finalVariety || o.variety,
      colour: d.colour,
      hue: o.hue,
      tone: o.tone,
      saturation: o.saturation,
      transparency: o.transparency,
      cuttingShape: o.cuttingShape,
      crownStyle: o.crownStyle,
      pavilionStyle: o.pavilionStyle,
      clarityGrade: o.clarityGrade,
      itemDescription: o.itemDescription,
    }
  })
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// ── Prompt ─────────────────────────────────────────────────────────────────

export const SYSTEM_INSTRUCTION = `You assist the gemmologists of GRC, a gem testing laboratory in Sri Lanka, in completing a gem identification report. You are given photos of one stone and whatever instrument readings the tester has entered so far. Your answer pre-fills a form that a qualified gemmologist reviews; it never replaces their tests.

EVIDENCE RULES
1. Instrument readings (R.I., S.G., hardness, spectrum) are authoritative. Never rank a species above one whose published constants fit the readings better. If the photos seem to contradict a reading, report it in "conflicts" instead of overriding the reading.
2. When reference candidates are supplied, choose only from them and copy their species and variety names exactly. Use the photos (colour, lustre, inclusions, optical effects) only to rank among them. If none fits the photos, say so in "conflicts".
3. With no readings, identify from appearance alone, keep every candidate's confidence at 60 or below, and use "nextSteps" to name the tests that would best separate them.
4. The S.G. implied by weight and size is a rough estimate (about ±25%; deep native cuts weigh more than the formula expects, shallow windowed stones less). Treat it as weak supporting evidence only, and ignore it when S.G. was measured.
5. Calibrate confidence (0-100): 85 or more only when readings and appearance clearly agree; 50-84 likely; below 50 a guess. An honest low score is better than a confident wrong one.

FIELD RULES
- Include a field in "fields" only when the photos actually show it; leave it out otherwise. Each field has a short "reason" naming what in the photos supports it.
- colour: prefer a name from the lab's colour list. hue: a short phrase such as "Violetish blue" or "Slightly purplish red".
- Photo colour depends on lighting and white balance: keep colour, tone and saturation confidence moderate unless the photos agree with each other.
- clarityGrade: the standard scale (FL, LC 1 ... HI 2) for most stones; the emerald scale (LC, EC, SI, MI, HI) only for emeralds. clarityEnhancement only for emeralds.
- crownStyle and pavilionStyle: the facet style of the crown and of the pavilion; cabochons use Single or Double cabochon.
- grade is the shape grade: how well-formed and symmetrical the outline is.
- Dimensions are always Length x Width x Height in millimetres.
- Origin and most treatments cannot be seen in photos: list them in "notDeterminable". Put a treatment in "checkFor" only when the photos show a specific visual sign of it (for example a flash effect in fractures, dye concentrated in cracks, colour concentrated along facet junctions), and describe that sign.
- itemDescription: one short sentence describing the stone as seen (cut, shape, colour, transparency), in the style of the lab's examples when given. Name the species only if the readings confirm it.
- summary: one or two plain sentences on what the stone most likely is and what is still uncertain.
- nextSteps: up to 3 tests not yet done, most informative first, each saying how it would narrow the result.`

const fieldSchema = (description, values) => ({
  type: "OBJECT",
  description,
  properties: {
    value: values ? { type: "STRING", enum: values } : { type: "STRING" },
    confidence: { type: "INTEGER" },
    reason: { type: "STRING" },
  },
  required: ["value", "confidence", "reason"],
  propertyOrdering: ["value", "confidence", "reason"],
})

export const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    summary: { type: "STRING" },
    candidates: {
      type: "ARRAY",
      description: "Most likely identifications, best first, at most 4.",
      items: {
        type: "OBJECT",
        properties: {
          species: { type: "STRING" },
          variety: { type: "STRING" },
          confidence: { type: "INTEGER" },
          reasoning: { type: "STRING" },
        },
        required: ["species", "variety", "confidence", "reasoning"],
        propertyOrdering: ["species", "variety", "confidence", "reasoning"],
      },
    },
    fields: {
      type: "OBJECT",
      properties: {
        colour: fieldSchema("Body colour, preferably from the lab's colour list"),
        hue: fieldSchema("Hue phrase, e.g. Violetish blue"),
        tone: fieldSchema("Tone", AI_TONE_SATURATION),
        saturation: fieldSchema("Saturation", AI_TONE_SATURATION),
        transparency: fieldSchema("Transparency", AI_TRANSPARENCY),
        cuttingShape: fieldSchema("Outline shape", AI_SHAPES),
        crownStyle: fieldSchema("Crown facet style", AI_CUTTING_STYLES),
        pavilionStyle: fieldSchema("Pavilion facet style", AI_CUTTING_STYLES),
        clarityGrade: fieldSchema("Clarity grade", [...AI_CLARITY_STANDARD, ...AI_CLARITY_EMERALD]),
        clarityEnhancement: fieldSchema("Emerald clarity enhancement", AI_CLARITY_ENHANCEMENT),
        grade: fieldSchema("Shape grade", AI_GRADES),
      },
    },
    itemDescription: { type: "STRING" },
    conflicts: { type: "ARRAY", items: { type: "STRING" } },
    nextSteps: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { test: { type: "STRING" }, why: { type: "STRING" } },
        required: ["test", "why"],
      },
    },
    checkFor: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          treatment: { type: "STRING", enum: AI_TREATMENT_KEYS },
          sign: { type: "STRING" },
        },
        required: ["treatment", "sign"],
      },
    },
    notDeterminable: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["summary", "candidates", "fields", "conflicts", "nextSteps", "notDeterminable"],
  propertyOrdering: [
    "summary", "candidates", "fields", "itemDescription", "conflicts", "nextSteps",
    "checkFor", "notDeterminable",
  ],
}

const fmtRange = (min, max) => (min == null ? "?" : max == null || max === min ? `${min}` : `${min}-${max}`)

export const buildPromptText = ({ readings, imageCount, references, implied, examples, knownSpecies }) => {
  const r = readings
  const lines = []

  lines.push(
    imageCount
      ? `PHOTOS: ${imageCount} attached. Cropped intake photos come first, full-size photos after.`
      : "PHOTOS: none. Do not suggest any fields; rank identifications from the readings only.",
  )

  lines.push("", "INSTRUMENT READINGS ENTERED SO FAR")
  if (r.riMin === "-" || r.riMax === "-") {
    lines.push("- R.I.: negative (no reading on the refractometer, beyond its range)")
  } else if (r.riMin != null || r.riMax != null) {
    const lo = Math.min(r.riMin ?? r.riMax, r.riMax ?? r.riMin)
    const hi = Math.max(r.riMin ?? r.riMax, r.riMax ?? r.riMin)
    lines.push(
      lo === hi
        ? `- R.I.: ${lo} (single reading)`
        : `- R.I.: ${lo} - ${hi} (birefringence ${(hi - lo).toFixed(3)})`,
    )
  } else lines.push("- R.I.: not taken")
  lines.push(`- S.G.: ${r.sg ?? "not taken"}`)
  lines.push(`- Hardness: ${r.hardness ?? "not taken"}`)
  lines.push(`- Weight: ${r.weight != null ? `${r.weight} ct` : "not taken"}`)
  lines.push(
    r.length && r.width && r.height
      ? `- Dimensions (L x W x H): ${r.length} x ${r.width} x ${r.height} mm`
      : "- Dimensions: not taken",
  )
  if (implied) {
    lines.push(
      `- S.G. implied by weight and size (typical cut proportions assumed): about ${implied.value} (plausible ${implied.low}-${implied.high})`,
    )
  }
  lines.push(`- Spectrum: ${r.spectroscopy ?? "not recorded"}`)

  if (references.length) {
    lines.push(
      "",
      "REFERENCE CANDIDATES — the lab's reference table scored against the readings (matchScore out of 100). Choose only from these:",
    )
    references.slice(0, MAX_CANDIDATES_IN_PROMPT).forEach((ref) => {
      lines.push(
        `- ${ref.species} / ${ref.variety}: R.I. ${fmtRange(ref.refractiveIndexMin, ref.refractiveIndexMax)}, S.G. ${fmtRange(ref.specificGravityMin, ref.specificGravityMax)}, H ${fmtRange(ref.hardnessMin, ref.hardnessMax)}, matchScore ${ref.matchScore}`,
      )
    })
  } else if (knownSpecies.length) {
    lines.push("", `SPECIES IN THE LAB'S REFERENCE TABLE (use these names where they fit): ${knownSpecies.join(", ")}`)
  }

  lines.push("", `LAB'S COLOUR LIST: ${AI_STANDARD_COLOURS.join("; ")}`)

  if (examples.length) {
    lines.push(
      "",
      "RECENTLY APPROVED REPORTS FROM THIS LAB — vocabulary and style examples only, not evidence about this stone:",
    )
    examples.forEach((e) => {
      const parts = Object.entries(e)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => `${k}: ${v}`)
      lines.push(`- ${parts.join("; ")}`)
    })
  }

  return lines.join("\n")
}

// ── Checking the answer ────────────────────────────────────────────────────

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(n) || 0)))
const str = (v, max = 400) => (typeof v === "string" ? v.trim().slice(0, max) : "")
const lower = (s) => (s || "").toLowerCase().trim()

/**
 * The model's answer, made safe to put in front of a tester: values outside the form's
 * lists are dropped, and confidence is capped where the readings cannot back it.
 *
 * - With no readings, appearance alone never scores above 60.
 * - With readings, a candidate never scores more than 15 above how well its published
 *   constants match them, and one outside the reference table scores at most 40.
 * - When S.G. was not measured, a candidate whose S.G. range misses what the weight and
 *   size imply is flagged and loses 10 points — a nudge, since cut proportions vary.
 */
export const postProcess = (raw, { readings, references, refsByVariety, imageCount }) => {
  const hasReadings = hasScorableReadings(readings)
  const refKey = (species, variety) => `${lower(species)}|${lower(variety)}`
  const scored = new Map(references.map((ref) => [refKey(ref.species, ref.variety), ref]))
  const scoredByVariety = new Map(references.map((ref) => [lower(ref.variety), ref]))

  // Fields first — the suggested shape refines the implied S.G. used just below.
  const fields = {}
  if (imageCount > 0) {
    for (const key of AI_FIELD_KEYS) {
      const f = raw?.fields?.[key]
      const value = str(f?.value, 120)
      if (!value) continue
      if (FIELD_ENUMS[key] && !FIELD_ENUMS[key].includes(value)) continue
      fields[key] = { value, confidence: clamp(f.confidence, 0, 100), reason: str(f.reason, 300) }
    }
  }
  // A measured S.G. outranks any estimate, so the estimate is only used without one.
  const implied = readings.sg == null ? impliedSg(readings, fields.cuttingShape?.value) : null

  const candidates = (Array.isArray(raw?.candidates) ? raw.candidates : [])
    .map((c) => {
      const species = str(c.species, 80)
      const variety = str(c.variety, 80)
      if (!species && !variety) return null
      const ref = scored.get(refKey(species, variety)) || scoredByVariety.get(lower(variety))
      const tableRef = ref || refsByVariety.get(lower(variety))

      let confidence = clamp(c.confidence, 0, 100)
      if (!hasReadings) confidence = Math.min(confidence, 60)
      else if (ref) confidence = Math.min(confidence, ref.matchScore + 15)
      else confidence = Math.min(confidence, 40)

      let sgFit = null
      if (implied && tableRef?.specificGravityMin != null && tableRef?.specificGravityMax != null) {
        sgFit = tableRef.specificGravityMax >= implied.low && tableRef.specificGravityMin <= implied.high
        if (!sgFit) confidence = Math.max(0, confidence - 10)
      }

      return {
        species: ref?.species || species,
        variety: ref?.variety || variety,
        confidence,
        reasoning: str(c.reasoning, 500),
        readingMatch: ref ? ref.matchScore : null,
        inReferenceTable: !!tableRef,
        sgFit,
        referenceSg: tableRef ? [tableRef.specificGravityMin, tableRef.specificGravityMax] : null,
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, MAX_CANDIDATES_OUT)

  const list = (v, max = 6) => (Array.isArray(v) ? v.map((s) => str(s, 300)).filter(Boolean).slice(0, max) : [])

  return {
    summary: str(raw?.summary, 600),
    candidates,
    fields,
    itemDescription: imageCount > 0 ? str(raw?.itemDescription, 400) : "",
    conflicts: list(raw?.conflicts),
    nextSteps: (Array.isArray(raw?.nextSteps) ? raw.nextSteps : [])
      .map((s) => ({ test: str(s?.test, 120), why: str(s?.why, 300) }))
      .filter((s) => s.test)
      .slice(0, 3),
    checkFor: (Array.isArray(raw?.checkFor) ? raw.checkFor : [])
      .filter((t) => AI_TREATMENT_KEYS.includes(t?.treatment))
      .map((t) => ({ treatment: t.treatment, sign: str(t.sign, 300) }))
      .slice(0, 4),
    notDeterminable: list(raw?.notDeterminable),
    impliedSg: implied,
    narrowedFrom: hasReadings ? references.length : null,
  }
}

// ── Entry points ───────────────────────────────────────────────────────────

const toResponse = (doc, cached) => ({
  id: String(doc._id),
  createdAt: doc.createdAt,
  model: doc.model,
  cached,
  readings: doc.readings,
  imageCount: doc.imageCount,
  imageSourceCount: doc.imageSourceCount ?? null,
  result: doc.result,
})

/** The latest insight this user asked for on this gem, or null. */
export const getLatestInsight = async (gemId, userId) => {
  const doc = await GemAiInsight.findOne({ gem: gemId, requestedBy: userId }).sort({ createdAt: -1 }).lean()
  return doc ? toResponse(doc, true) : null
}

/** An error with the status the API answers with. */
const badRequest = (message, code) => Object.assign(new Error(message), { status: 400, code })

/**
 * Insights for the gem from its photos and the readings given. Answers from the cache
 * when the same photos and readings were sent before.
 */
export const generateInsight = async (gem, rawReadings, user) => {
  const readings = normalizeReadings(rawReadings)
  const sources = await listImageSources(gem)

  if (!sources.length && !hasScorableReadings(readings)) {
    throw badRequest("Add a photo of the gem or a reading (R.I., S.G. or hardness) first.", "AI_NO_INPUT")
  }

  const inputHash = crypto
    .createHash("sha256")
    .update(JSON.stringify({ v: PROMPT_VERSION, readings, images: sources.map((s) => `${s.kind}:${s.id}`) }))
    .digest("hex")

  const found = await GemAiInsight.findOne({ gem: gem._id, inputHash }).sort({ createdAt: -1 }).lean()
  if (found) {
    // Same hash means the same photo list, so its length stands in on results saved before it was recorded.
    const cached = { ...found, imageSourceCount: found.imageSourceCount ?? sources.length }
    // Recorded against this user too, so it is what they see next time they open the gem.
    if (String(cached.requestedBy) !== String(user._id)) {
      const { _id, createdAt, updatedAt, __v, ...rest } = cached
      const copy = await GemAiInsight.create({ ...rest, requestedBy: user._id })
      return toResponse(copy.toObject(), true)
    }
    return toResponse(cached, true)
  }

  const references = await scoreReferences(readings)
  const topVarieties = references.slice(0, 3).map((r) => r.variety).filter(Boolean)

  const [imageParts, examples, knownSpecies] = await Promise.all([
    loadImageParts(sources),
    loadLabExamples(gem._id, topVarieties),
    references.length ? [] : GemReference.distinct("species").then((s) => s.filter(Boolean).sort()),
  ])

  if (!imageParts.length && !hasScorableReadings(readings)) {
    throw badRequest("The gem's photos could not be read. Add a photo or a reading and try again.", "AI_NO_INPUT")
  }

  const text = buildPromptText({
    readings,
    imageCount: imageParts.length,
    references,
    implied: readings.sg == null ? impliedSg(readings) : null,
    examples,
    knownSpecies,
  })

  const { model, data } = await generateJson({
    systemInstruction: SYSTEM_INSTRUCTION,
    parts: [...imageParts, { text }],
    responseSchema: RESPONSE_SCHEMA,
  })

  // Reference rows for named candidates the scorer did not return, so their S.G. can
  // still be checked against the weight and size.
  const outsideVarieties = (data?.candidates || [])
    .map((c) => str(c?.variety, 80))
    .filter((v) => v && !references.some((r) => lower(r.variety) === lower(v)))
  const extraRefs = outsideVarieties.length
    ? await GemReference.find({
        variety: { $in: outsideVarieties.map((v) => new RegExp(`^${escapeRegex(v)}$`, "i")) },
      }).lean()
    : []
  const refsByVariety = new Map(extraRefs.map((r) => [lower(r.variety), r]))

  const result = postProcess(data, { readings, references, refsByVariety, imageCount: imageParts.length })

  const doc = await GemAiInsight.create({
    gem: gem._id,
    requestedBy: user._id,
    inputHash,
    readings,
    imageCount: imageParts.length,
    imageSourceCount: sources.length,
    model,
    result,
  })
  return toResponse(doc.toObject(), false)
}
