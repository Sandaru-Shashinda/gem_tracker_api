import express from "express"
import {
  getGems,
  getGemById,
  intakeGem,
  submitTest,
  approveGem,
} from "../controllers/gemController.js"
import { protect, authorize } from "../middleware/authMiddleware.js"

const router = express.Router()

router.route("/").get(protect, getGems)

router.post("/intake", protect, authorize("HELPER", "ADMIN"), intakeGem)

router.route("/:id").get(protect, getGemById)

router.put("/:id/test", protect, authorize("TESTER", "ADMIN"), submitTest)
router.put("/:id/approve", protect, authorize("FINAL_APPROVER", "ADMIN"), approveGem)

export default router
