/**
 * One-time migration: the A4 that used to be called the "large" report is now the
 * "premium" report, and "large" names a new, simpler A4.
 *
 * Every report and gem written before that change means the old sheet when it says
 * "large" — it is the one that was printed and handed over — so each has to be renamed
 * to "premium" or its QR page starts drawing a certificate that does not match the paper.
 *
 *   - reports: reportType "large" -> "premium"
 *   - gems:    "large" in reportTypes -> "premium"
 *
 * A report's saved custom A4 stays in customLargeCard; that field is read by premium
 * reports now and needs no change.
 *
 * NOT safe to re-run once new large reports exist: it cannot tell a new "large" from an
 * old one except by date. Run it once, when the renamed app is deployed. If it has to be
 * run later than that, pass the deploy time as --before so anything raised since is left
 * alone. Nothing is written without --apply.
 *
 *   node src/scripts/migrate-large-to-premium.js                       # print, write nothing
 *   node src/scripts/migrate-large-to-premium.js --apply               # rename
 *   node src/scripts/migrate-large-to-premium.js --apply --before=2026-10-13T12:00:00Z
 */

import dotenv from "dotenv"
dotenv.config()

import connectDB from "../config/db.js"
import Gem from "../models/Gem.js"
import Report from "../models/Report.js"
import { REPORT_TYPES } from "../constants/index.js"

const APPLY = process.argv.includes("--apply")

const BEFORE = (() => {
  const arg = process.argv.find((a) => a.startsWith("--before="))
  if (!arg) return new Date()
  const date = new Date(arg.split("=")[1])
  if (isNaN(date)) {
    console.error(`Unreadable --before date "${arg.split("=")[1]}". Use an ISO date.`)
    process.exit(1)
  }
  return date
})()

const migrate = async () => {
  await connectDB()

  const prefix = APPLY ? "" : "[dry run] "
  console.log(`${prefix}Renaming "large" to "premium" on records created before ${BEFORE.toISOString()}.\n`)

  const reportFilter = { reportType: REPORT_TYPES.LARGE, createdAt: { $lt: BEFORE } }
  const gemFilter = { reportTypes: REPORT_TYPES.LARGE, createdAt: { $lt: BEFORE } }

  const reports = await Report.find(reportFilter).select("reportId").lean()
  const gems = await Gem.find(gemFilter).select("gemId").lean()

  console.log(`${prefix}reports: ${reports.length}`)
  for (const report of reports) console.log(`  ${report.reportId}`)
  console.log(`${prefix}gems: ${gems.length}`)
  for (const gem of gems) console.log(`  ${gem.gemId}`)

  if (APPLY) {
    const reportResult = await Report.updateMany(reportFilter, {
      $set: { reportType: REPORT_TYPES.PREMIUM },
    })
    const gemResult = await Gem.updateMany(
      gemFilter,
      { $set: { "reportTypes.$[type]": REPORT_TYPES.PREMIUM } },
      { arrayFilters: [{ type: REPORT_TYPES.LARGE }] },
    )
    console.log(
      `\nDone. Reports renamed: ${reportResult.modifiedCount}, gems renamed: ${gemResult.modifiedCount}`,
    )
  } else {
    console.log("\nNothing written. Re-run with --apply to rename these.")
  }
  process.exit(0)
}

migrate().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
