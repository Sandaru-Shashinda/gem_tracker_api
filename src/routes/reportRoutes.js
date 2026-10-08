import express from "express"
import {
  verifyReport,
  getReports,
  getReportById,
  deleteReport,
  updateReport,
  updateCustomCard,
  updateReportVideo,
} from "../controllers/reportController.js"
import { protect, authorize } from "../middleware/authMiddleware.js"

const reportRoutes = express.Router()

reportRoutes.route("/").get(protect, getReports)

reportRoutes.get("/:reportId/verify", verifyReport)

reportRoutes.route("/:id/custom-card").put(protect, authorize("ADMIN"), updateCustomCard)

reportRoutes.route("/:id/video").put(protect, authorize("ADMIN"), updateReportVideo)

reportRoutes
  .route("/:id")
  .get(getReportById)
  .put(protect, authorize("ADMIN"), updateReport)
  .delete(protect, authorize("ADMIN"), deleteReport)

export default reportRoutes
