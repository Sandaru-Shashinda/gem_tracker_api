/**
 * SUPERSEDED — do not run. R.I. is a range again, so this script now migrates in the
 * wrong direction; migrate-ri-range-hardness-single.js is the current one. It is kept
 * because its notes record what happened to the data, and because a database where its
 * --drop-pair step was run needs that history to make sense of the rebuilt ranges.
 *
 * One-time migration: R.I. used to be stored as a riMin/riMax pair on every test
 * stage, but the form now records a single reading, and the reference matcher
 * scores that value as a point against each species' published R.I. range.
 *
 * These are NOT mirrored duplicates. Most stored pairs are genuine two-reading
 * birefringence measurements — 1.76-1.77 for corundum, 1.545-1.552 for quartz,
 * 1.57-1.58 for beryl — so collapsing them drops a reading the tester really took.
 * At the time of writing 62 of 70 records held a real range and only 8 a single
 * value. That is why this script keeps riMin/riMax by default: `ri` becomes the
 * value the app reads, and the original pair stays on the record so the second
 * reading is recoverable.
 *
 * The lower reading is kept by default; pass --collapse=max or --collapse=mid to
 * choose differently. Note that a handful of records were entered inverted
 * (riMin > riMax), so "lower" means the true minimum of the two, not the riMin
 * field. Every collapsed record is printed for review.
 *
 * Once you are satisfied with the values, `--drop-pair` removes riMin/riMax and
 * leaves exactly one R.I. field. That step is irreversible; everything else here
 * is safe to re-run.
 *
 *   node src/scripts/migrate-ri-single.js              # set ri, keep the pair
 *   node src/scripts/migrate-ri-single.js --dry-run    # print, write nothing
 *   node src/scripts/migrate-ri-single.js --drop-pair  # later: remove riMin/riMax
 */

import dotenv from "dotenv"
dotenv.config()

import mongoose from "mongoose"
import connectDB from "../config/db.js"
import GemTest1 from "../models/GemTest1.js"
import GemTest2 from "../models/GemTest2.js"
import GemFinalApproval from "../models/GemFinalApproval.js"

const DRY_RUN = process.argv.includes("--dry-run")
const DROP_PAIR = process.argv.includes("--drop-pair")

const COLLAPSE = (() => {
  const arg = process.argv.find((a) => a.startsWith("--collapse="))
  const mode = arg ? arg.split("=")[1] : "min"
  if (!["min", "max", "mid"].includes(mode)) {
    console.error(`Unknown --collapse mode "${mode}". Use min, max or mid.`)
    process.exit(1)
  }
  return mode
})()

// Work on the raw collections: riMin/riMax are no longer in the schemas, so a normal
// Mongoose read would strip the very fields this script exists to read.
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
  if (COLLAPSE === "mid") return Math.round(((low + high) / 2) * 1000) / 1000
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
    `${prefix}Collapsing R.I. using "${COLLAPSE}"; ` +
      `${DROP_PAIR ? "REMOVING riMin/riMax after" : "keeping riMin/riMax as a backup"}.\n`,
  )

  let updated = 0
  let skipped = 0
  let empty = 0
  let collapsed = 0
  let dropped = 0
  let errors = 0

  for (const [label, model] of stages) {
    const collection = raw(model)
    const docs = await collection.find({}).toArray()
    console.log(`${prefix}${label}: ${docs.length} record(s).`)

    for (const doc of docs) {
      try {
        const unset = DROP_PAIR ? { $unset: { riMin: "", riMax: "" } } : {}
        const hasPair = num(doc.riMin) !== null || num(doc.riMax) !== null

        // Already migrated: leave the value alone, but honour a later --drop-pair.
        if (num(doc.ri) !== null) {
          if (DROP_PAIR && hasPair) {
            if (!DRY_RUN) await collection.updateOne({ _id: doc._id }, unset)
            dropped++
          }
          skipped++
          continue
        }

        const value = collapse(num(doc.riMin), num(doc.riMax))

        if (value === null) {
          // Nothing was ever recorded, so there is no reading to carry over.
          if (DROP_PAIR && hasPair) {
            if (!DRY_RUN) await collection.updateOne({ _id: doc._id }, unset)
            dropped++
          }
          empty++
          continue
        }

        if (num(doc.riMin) !== null && num(doc.riMax) !== null && doc.riMin !== doc.riMax) {
          console.log(`  ! ${label} ${doc._id}: ${doc.riMin} - ${doc.riMax} -> ${value}`)
          collapsed++
        }

        if (!DRY_RUN) {
          await collection.updateOne({ _id: doc._id }, { $set: { ri: value }, ...unset })
        }
        if (DROP_PAIR) dropped++
        updated++
      } catch (err) {
        console.error(`  x ${label} ${doc._id}: ${err.message}`)
        errors++
      }
    }
  }

  console.log(
    `\n${prefix}Done. R.I. set: ${updated}, already single: ${skipped}, ` +
      `no reading recorded: ${empty}, ranges collapsed: ${collapsed}, ` +
      `pairs removed: ${dropped}, errors: ${errors}`,
  )
  process.exit(errors ? 1 : 0)
}

migrate().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
