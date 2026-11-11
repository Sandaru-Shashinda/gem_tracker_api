/**
 * One real AI-insights call, for checking the Gemini key, model and schema — without a
 * database or a running API (so it is safe to run anywhere, production .env included).
 *
 *   node src/scripts/test-gemini.js path/to/gem-photo.jpg [riMin] [riMax] [hardness]
 *
 * e.g. node src/scripts/test-gemini.js ruby.jpg 1.762 1.770 9
 * Reads GEMINI_API_KEY (and the optional GEMINI_MODEL / GEMINI_FALLBACK_MODEL) from .env.
 * With readings given there is no reference table to narrow against here, so the model
 * answers from the photo and readings alone.
 */
import "dotenv/config"
import fs from "fs"
import sharp from "sharp"
import { generateJson } from "../services/gemini.service.js"
import {
  RESPONSE_SCHEMA,
  SYSTEM_INSTRUCTION,
  buildPromptText,
  impliedSg,
  normalizeReadings,
  postProcess,
} from "../services/gemInsight.service.js"

const [photo, riMin, riMax, hardness] = process.argv.slice(2)
if (!photo || !fs.existsSync(photo)) {
  console.error("Usage: node src/scripts/test-gemini.js path/to/gem-photo.jpg [riMin] [riMax] [hardness]")
  process.exit(1)
}

const jpeg = await sharp(fs.readFileSync(photo))
  .rotate()
  .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
  .jpeg({ quality: 85 })
  .toBuffer()

const readings = normalizeReadings({ riMin, riMax, hardness })
const text = buildPromptText({
  readings,
  imageCount: 1,
  references: [],
  implied: impliedSg(readings),
  examples: [],
  knownSpecies: [],
})

console.log("Asking Gemini…")
const started = Date.now()
try {
  const { model, data } = await generateJson({
    systemInstruction: SYSTEM_INSTRUCTION,
    parts: [{ inline_data: { mime_type: "image/jpeg", data: jpeg.toString("base64") } }, { text }],
    responseSchema: RESPONSE_SCHEMA,
  })
  const result = postProcess(data, { readings, references: [], refsByVariety: new Map(), imageCount: 1 })
  console.log(`\nModel: ${model} (${((Date.now() - started) / 1000).toFixed(1)}s)\n`)
  console.log(JSON.stringify(result, null, 2))
} catch (error) {
  console.error(`\nFailed (${error.status ?? "?"} ${error.code ?? ""}): ${error.message}`)
  process.exit(1)
}
