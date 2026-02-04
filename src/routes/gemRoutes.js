import express from "express"
import {
  getGems,
  getDashboardStats,
  getGemById,
  intakeGem,
  updateGem,
  requestCorrection,
  updateTest1,
  updateTest2,
  updateFinalApproval,
} from "../controllers/gemController.js"
import { protect, authorize } from "../middleware/authMiddleware.js"
import upload from "../middleware/uploadMiddleware.js"

const gemRoutes = express.Router()

gemRoutes.route("/").get(protect, getGems)
gemRoutes.get("/stats", protect, getDashboardStats)

gemRoutes.post("/intake", protect, authorize("HELPER", "ADMIN"), upload.single("image"), intakeGem)

gemRoutes
  .route("/:id")
  .get(protect, getGemById)
  .put(protect, authorize("ADMIN", "HELPER", "TESTER"), upload.single("image"), updateGem)

gemRoutes.put("/:id/test1", protect, authorize("TESTER", "ADMIN"), updateTest1)
gemRoutes.put("/:id/test2", protect, authorize("TESTER", "ADMIN"), updateTest2)
gemRoutes.put("/:id/final-approval", protect, authorize("ADMIN"), updateFinalApproval)
gemRoutes.put("/:id/request-correction", protect, authorize("ADMIN"), requestCorrection)

export default gemRoutes
