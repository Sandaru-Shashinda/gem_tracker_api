/**
 * One-time migration for colour and weight becoming per-stage.
 *
 * Until now the gem held one colour and one weight, and every stage overwrote them, so
 * the record cannot say what each tester actually observed — only what the last one to
 * save did. There is no way to recover the individual readings; they were never stored.
 *
 * What this does is stop old records reading as blank. Any stage that has real work on
 * it (a tester or approver stamped it) but no colour or weight of its own is given the
 * gem's value, because at the time that stage was written the gem's value *was* the
 * value that stage was looking at. Stages that were never filled in are left alone.
 *
 * This does copy one value onto up to three stages, so a gem tested twice will show both
 * testers agreeing on colour when in truth only one figure was ever recorded. That is
 * the honest reconstruction available — the alternative is showing every historical test
 * as having no colour at all. New work from here on records each stage separately.
 *
 *   node src/scripts/migrate-stage-colour-weight.js            # migrate
 *   node src/scripts/migrate-stage-colour-weight.js --dry-run  # print, write nothing
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

const has = (value) => value !== undefined && value !== null && value !== ""

const migrate = async () => {
  await connectDB()

  const stages = [
    ["test 1", GemTest1, "testerId"],
    ["test 2", GemTest2, "testerId"],
    ["final approval", GemFinalApproval, "approverId"],
  ]

  const prefix = DRY_RUN ? "[dry run] " : ""
  console.log(`${prefix}Seeding stage colour/weight from the gem where a stage has none.\n`)

  let seeded = 0
  let alreadySet = 0
  let neverWorked = 0
  let noGemValue = 0
  let errors = 0

  for (const [label, model, ownerField] of stages) {
    const docs = await model.find({}).lean()
    console.log(`${prefix}${label}: ${docs.length} record(s).`)

    for (const doc of docs) {
      try {
        // An untouched stage has nothing to reconstruct — leave it blank so it stays
        // visibly "not done" rather than looking like someone recorded a colour.
        if (!doc[ownerField]) {
          neverWorked++
          continue
        }
        if (has(doc.colour) && has(doc.weight)) {
          alreadySet++
          continue
        }

        const gem = await Gem.findById(doc.gemId).lean()
        if (!gem) {
          noGemValue++
          continue
        }

        const set = {}
        if (!has(doc.colour) && has(gem.color)) set.colour = gem.color
        if (!has(doc.weight) && has(gem.weight)) set.weight = gem.weight

        if (Object.keys(set).length === 0) {
          noGemValue++
          continue
        }

        console.log(
          `  ~ ${label} ${doc._id}: ${Object.entries(set)
            .map(([key, value]) => `${key} = ${value}`)
            .join(", ")}`,
        )
        if (!DRY_RUN) await model.updateOne({ _id: doc._id }, { $set: set })
        seeded++
      } catch (err) {
        console.error(`  x ${label} ${doc._id}: ${err.message}`)
        errors++
      }
    }
  }

  console.log(
    `\n${prefix}Done. Stages seeded: ${seeded}, already had their own: ${alreadySet}, ` +
      `never worked on: ${neverWorked}, nothing on the gem to copy: ${noGemValue}, errors: ${errors}`,
  )
  process.exit(errors ? 1 : 0)
}

migrate().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
