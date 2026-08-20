/**
 * One-time backfill: colour used to be stored per test stage as
 * observations.colour / finalObservations.colour, while the gem kept whatever
 * intake typed. Reports, the queue table and the public verification endpoint
 * all read gem.color, so any colour the lab entered on the analysis form never
 * reached them.
 *
 * This copies the most authoritative stage colour (final approval > test 2 >
 * test 1) onto gem.color, then drops the stage copies.
 *
 * Gems that never had a stage colour keep their intake value untouched.
 * Safe to re-run: once the stage copies are gone there is nothing left to move.
 *
 * Run once, after deploying the code that stores colour on the gem:
 *   node src/scripts/backfill-gem-colour.js
 *
 * Pass --dry-run to print what would change without writing anything.
 */

import dotenv from "dotenv"
dotenv.config()

import mongoose from "mongoose"
import connectDB from "../config/db.js"
import Gem from "../models/Gem.js"
import GemTest1 from "../models/GemTest1.js"
import GemTest2 from "../models/GemTest2.js"
import GemFinalApproval from "../models/GemFinalApproval.js"

const DRY_RUN = process.argv.includes("--dry-run")

// Work on the raw collections: `colour` is no longer in the schemas, so a normal
// Mongoose read would strip the very field this script exists to move. Names come
// from the models so they cannot drift from what the app actually uses.
const raw = (model) => mongoose.connection.collection(model.collection.name)

const clean = (value) => (typeof value === "string" ? value.trim() : "")

const backfill = async () => {
  await connectDB()

  const gems = await raw(Gem).find({}).toArray()
  console.log(`${DRY_RUN ? "[dry run] " : ""}Found ${gems.length} gem(s) to check.\n`)

  let updated = 0
  let unchanged = 0
  let cleared = 0
  let errors = 0

  for (const gem of gems) {
    try {
      const [test1, test2, approval] = await Promise.all([
        raw(GemTest1).findOne({ gemId: gem._id }),
        raw(GemTest2).findOne({ gemId: gem._id }),
        raw(GemFinalApproval).findOne({ gemId: gem._id }),
      ])

      // Later stages overrule earlier ones — the approver has the final say.
      const stageColour =
        clean(approval?.finalObservations?.colour) ||
        clean(test2?.observations?.colour) ||
        clean(test1?.observations?.colour)

      const current = clean(gem.color)

      if (stageColour && stageColour !== current) {
        console.log(`  ${gem.gemId}: "${current || "(empty)"}" -> "${stageColour}"`)
        if (!DRY_RUN) {
          await raw(Gem).updateOne({ _id: gem._id }, { $set: { color: stageColour } })
        }
        updated++
      } else {
        unchanged++
      }

      // Drop the stage copies so there is exactly one colour left in the database.
      if (!DRY_RUN) {
        const unsets = [
          [raw(GemTest1), test1, "observations.colour"],
          [raw(GemTest2), test2, "observations.colour"],
          [raw(GemFinalApproval), approval, "finalObservations.colour"],
        ]
        for (const [collection, doc, path] of unsets) {
          if (!doc) continue
          const result = await collection.updateOne({ _id: doc._id }, { $unset: { [path]: "" } })
          if (result.modifiedCount) cleared++
        }
      }
    } catch (err) {
      console.error(`  x ${gem.gemId}: ${err.message}`)
      errors++
    }
  }

  console.log(
    `\n${DRY_RUN ? "[dry run] " : ""}Done. Colour updated: ${updated}, already correct: ${unchanged}, ` +
      `stage copies removed: ${cleared}, errors: ${errors}`,
  )
  process.exit(errors ? 1 : 0)
}

backfill().catch((err) => {
  console.error("Backfill failed:", err)
  process.exit(1)
})
