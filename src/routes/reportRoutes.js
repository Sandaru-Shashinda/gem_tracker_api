import express from "express"
import { generateReport, verifyReport } from "../controllers/reportController.js"
import { protect, authorize } from "../middleware/authMiddleware.js"

const reportRoutes = express.Router()

reportRoutes.post("/:id/generate", protect, authorize("ADMIN"), generateReport)
reportRoutes.get("/:id/verify", verifyReport)

export default reportRoutes
