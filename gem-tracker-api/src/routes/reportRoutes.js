import express from "express"
import { generateReport, verifyReport } from "../controllers/reportController.js"
import { protect, authorize } from "../middleware/authMiddleware.js"

const router = express.Router()

router.post("/:id/generate", protect, authorize("FINAL_APPROVER", "ADMIN"), generateReport)
router.get("/:id/verify", verifyReport)

export default router
