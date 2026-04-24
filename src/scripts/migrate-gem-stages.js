/**
 * One-time migration: moves embedded test1, test2, finalApproval subdocuments
 * from the gems collection into their own separate collections.
 *
 * Run BEFORE deploying new code against any database that has existing gem data:
 *   node src/scripts/migrate-gem-stages.js
 */

import dotenv from "dotenv"
dotenv.config()

import mongoose from "mongoose"
import connectDB from "../config/db.js"

// Import models in dependency order so Mongoose registers them
import Gem from "../models/Gem.js"
import GemTest1 from "../models/GemTest1.js"
import GemTest2 from "../models/GemTest2.js"
import GemFinalApproval from "../models/GemFinalApproval.js"

// Access the raw collection to read embedded fields before schema strips them
const rawGemCollection = () => mongoose.connection.collection("gems")

const migrate = async () => {
  await connectDB()

  const rawGems = await rawGemCollection().find({}).toArray()
  console.log(`Found ${rawGems.length} gem(s) to process.`)

  let migrated = 0
  let skipped = 0

  for (const raw of rawGems) {
    const gemObjectId = raw._id

    try {
      if (raw.test1 && raw.test1.testerId) {
        const exists = await GemTest1.findOne({ gemId: gemObjectId })
        if (!exists) {
          const { _id, ...test1Data } = raw.test1
          await GemTest1.create({ gemId: gemObjectId, ...test1Data })
          console.log(`  ✓ test1 migrated for gem ${raw.gemId}`)
        } else {
          console.log(`  – test1 already exists for gem ${raw.gemId}, skipping`)
        }
      }

      if (raw.test2 && raw.test2.testerId) {
        const exists = await GemTest2.findOne({ gemId: gemObjectId })
        if (!exists) {
          const { _id, ...test2Data } = raw.test2
          await GemTest2.create({ gemId: gemObjectId, ...test2Data })
          console.log(`  ✓ test2 migrated for gem ${raw.gemId}`)
        } else {
          console.log(`  – test2 already exists for gem ${raw.gemId}, skipping`)
        }
      }

      if (raw.finalApproval && raw.finalApproval.approverId) {
        const exists = await GemFinalApproval.findOne({ gemId: gemObjectId })
        if (!exists) {
          const { _id, ...approvalData } = raw.finalApproval
          await GemFinalApproval.create({ gemId: gemObjectId, ...approvalData })
          console.log(`  ✓ finalApproval migrated for gem ${raw.gemId}`)
        } else {
          console.log(`  – finalApproval already exists for gem ${raw.gemId}, skipping`)
        }
      }

      // Strip the embedded subdocs from the gem document
      await rawGemCollection().updateOne(
        { _id: gemObjectId },
        { $unset: { test1: "", test2: "", finalApproval: "" } },
      )

      migrated++
    } catch (err) {
      console.error(`  ✗ Error processing gem ${raw.gemId}:`, err.message)
      skipped++
    }
  }

  console.log(`\nMigration complete. Processed: ${migrated}, Errors: ${skipped}`)
  process.exit(0)
}

migrate().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
