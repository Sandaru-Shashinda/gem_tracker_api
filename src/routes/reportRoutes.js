import express from "express"
import {
  generateReport,
  verifyReport,
  getReports,
  getReportById,
  deleteReport,
  updateReport,
} from "../controllers/reportController.js"
import { protect, authorize } from "../middleware/authMiddleware.js"

const reportRoutes = express.Router()

reportRoutes.route("/").get(protect, getReports)

reportRoutes.get("/:reportId/verify", verifyReport)

reportRoutes
  .route("/:id")
  .get(getReportById)
  .put(protect, authorize("ADMIN"), updateReport)
  .delete(protect, authorize("ADMIN"), deleteReport)

reportRoutes.post("/:id/generate", protect, authorize("ADMIN"), generateReport)

export default reportRoutes
