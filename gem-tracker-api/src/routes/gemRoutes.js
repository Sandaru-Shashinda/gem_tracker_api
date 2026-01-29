import express from "express"
import {
  getGems,
  getGemById,
  intakeGem,
  submitTest,
  approveGem,
} from "../controllers/gemController.js"
import { protect, authorize } from "../middleware/authMiddleware.js"
import upload from "../middleware/uploadMiddleware.js"

const gemRoutes = express.Router()

gemRoutes.route("/").get(protect, getGems)

gemRoutes.post("/intake", protect, authorize("HELPER", "ADMIN"), upload.single("image"), intakeGem)

gemRoutes.route("/:id").get(protect, getGemById)

gemRoutes.put("/:id/test", protect, authorize("TESTER", "ADMIN"), submitTest)
gemRoutes.put("/:id/approve", protect, authorize("ADMIN"), approveGem)

export default gemRoutes
