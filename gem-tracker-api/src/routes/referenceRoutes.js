import express from "express"
import { searchReferences, seedReferences } from "../controllers/referenceController.js"
import { protect, authorize } from "../middleware/authMiddleware.js"

const router = express.Router()

router.get("/search", protect, searchReferences)
router.post("/seed", protect, authorize("ADMIN"), seedReferences)

export default router
