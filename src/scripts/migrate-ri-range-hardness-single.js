/**
 * One-time migration for the field-shape change that came with the reordered analysis
 * form. It moves every test stage to the shapes the app now reads:
 *
 *   R.I.      single `ri`            -> `riMin` / `riMax` range
 *   Hardness  `hardnessMin`/`Max`    -> single `hardness`
 *
 * R.I. is going back to a range because the reading genuinely is one: a doubly
 * refractive stone gives two values (birefringence), and the earlier collapse to a
 * single `ri` dropped the second one. Where migrate-ri-single.js was run WITHOUT
 * --drop-pair the original riMin/riMax are still on the record, so this script simply
 * leaves them in place and the second reading comes back untouched. Where only `ri`
 * survives, both ends are filled from it — that stone reads as a single reading, which
 * is all the record still knows.
 *
 * Hardness goes the other way. The lab records one measured value; the min/max range
 * that matters is the species' published one, and that lives on GemReference. The lower
 * of the two stored readings is kept by default (--collapse=max or =mid to choose
 * differently), and a handful of records were entered inverted, so "lower" means the
 * true minimum of the two rather than whichever sits in hardnessMin.
 *
 * Nothing is deleted by default: `ri`, `hardnessMin` and `hardnessMax` stay on the
 * record as a backup, and the app reads them as a fallback either way. Once you are
 * satisfied with the values, --drop-legacy removes them. That step is irreversible;
 * everything else here is safe to re-run.
 *
 *   node src/scripts/migrate-ri-range-hardness-single.js               # migrate, keep legacy
 *   node src/scripts/migrate-ri-range-hardness-single.js --dry-run     # print, write nothing
 *   node src/scripts/migrate-ri-range-hardness-single.js --drop-legacy # later: remove them
 */

import dotenv from "dotenv"
dotenv.config()

import mongoose from "mongoose"
import connectDB from "../config/db.js"
import GemTest1 from "../models/GemTest1.js"
import GemTest2 from "../models/GemTest2.js"
import GemFinalApproval from "../models/GemFinalApproval.js"

const DRY_RUN = process.argv.includes("--dry-run")
const DROP_LEGACY = process.argv.includes("--drop-legacy")

const COLLAPSE = (() => {
  const arg = process.argv.find((a) => a.startsWith("--collapse="))
  const mode = arg ? arg.split("=")[1] : "min"
  if (!["min", "max", "mid"].includes(mode)) {
    console.error(`Unknown --collapse mode "${mode}". Use min, max or mid.`)
    process.exit(1)
  }
  return mode
})()

// Work on the raw collections: the legacy fields are no longer in the schemas, so a
// normal Mongoose read would strip the very fields this script exists to read.
const raw = (model) => mongoose.connection.collection(model.collection.name)

const num = (value) => (typeof value === "number" && Number.isFinite(value) ? value : null)

// Some records were entered inverted, so order the two readings before choosing.
const collapse = (a, b) => {
  if (a === null) return b
  if (b === null) return a
  const low = Math.min(a, b)
  const high = Math.max(a, b)
  if (low === high) return low
  if (COLLAPSE === "max") return high
  if (COLLAPSE === "mid") return Math.round(((low + high) / 2) * 100) / 100
  return low
}

const migrate = async () => {
  await connectDB()

  const stages = [
    ["test 1", GemTest1],
    ["test 2", GemTest2],
    ["final approval", GemFinalApproval],
  ]

  const prefix = DRY_RUN ? "[dry run] " : ""
  console.log(
    `${prefix}Restoring the R.I. range and collapsing hardness using "${COLLAPSE}"; ` +
      `${DROP_LEGACY ? "REMOVING ri/hardnessMin/hardnessMax after" : "keeping them as a backup"}.\n`,
  )

  let riRestored = 0
  let riAlreadyRange = 0
  let riFromSingle = 0
  let hardnessSet = 0
  let hardnessCollapsed = 0
  let untouched = 0
  let dropped = 0
  let errors = 0

  for (const [label, model] of stages) {
    const collection = raw(model)
    const docs = await collection.find({}).toArray()
    console.log(`${prefix}${label}: ${docs.length} record(s).`)

    for (const doc of docs) {
      try {
        const set = {}

        // ── R.I. ────────────────────────────────────────────────────────────
        const storedMin = num(doc.riMin)
        const storedMax = num(doc.riMax)
        const single = num(doc.ri)

        if (storedMin !== null || storedMax !== null) {
          // migrate-ri-single.js kept the pair, so the two readings are still here.
          // Order them, since some were entered high-then-low.
          const low = storedMin ?? storedMax
          const high = storedMax ?? storedMin
          const min = Math.min(low, high)
          const max = Math.max(low, high)
          riAlreadyRange++
          if (min !== storedMin || max !== storedMax) {
            set.riMin = min
            set.riMax = max
          }
        } else if (single !== null) {
          // Only the collapsed value survives, so it stands for both ends.
          set.riMin = single
          set.riMax = single
          riFromSingle++
          console.log(`  ~ ${label} ${doc._id}: R.I. ${single} -> ${single} - ${single}`)
        }
        if (set.riMin !== undefined) riRestored++

        // ── Hardness ────────────────────────────────────────────────────────
        if (num(doc.hardness) === null) {
          const value = collapse(num(doc.hardnessMin), num(doc.hardnessMax))
          if (value !== null) {
            set.hardness = value
            hardnessSet++
            if (
              num(doc.hardnessMin) !== null &&
              num(doc.hardnessMax) !== null &&
              doc.hardnessMin !== doc.hardnessMax
            ) {
              console.log(
                `  ! ${label} ${doc._id}: hardness ${doc.hardnessMin} - ${doc.hardnessMax} -> ${value}`,
              )
              hardnessCollapsed++
            }
          }
        }

        // ── Write ───────────────────────────────────────────────────────────
        const hasLegacy =
          doc.ri !== undefined || doc.hardnessMin !== undefined || doc.hardnessMax !== undefined
        const unset =
          DROP_LEGACY && hasLegacy ? { $unset: { ri: "", hardnessMin: "", hardnessMax: "" } } : {}

        if (Object.keys(set).length === 0 && Object.keys(unset).length === 0) {
          untouched++
          continue
        }

        if (!DRY_RUN) {
          const update = { ...unset }
          if (Object.keys(set).length > 0) update.$set = set
          await collection.updateOne({ _id: doc._id }, update)
        }
        if (Object.keys(unset).length > 0) dropped++
      } catch (err) {
        console.error(`  x ${label} ${doc._id}: ${err.message}`)
        errors++
      }
    }
  }

  console.log(
    `\n${prefix}Done. R.I. ranges written: ${riRestored}; ` +
      `${riAlreadyRange} record(s) already held both readings, ` +
      `${riFromSingle} rebuilt from a single value. ` +
      `Hardness set: ${hardnessSet} (${hardnessCollapsed} were a real range), ` +
      `nothing to do: ${untouched}, legacy fields removed: ${dropped}, errors: ${errors}`,
  )
  process.exit(errors ? 1 : 0)
}

migrate().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
