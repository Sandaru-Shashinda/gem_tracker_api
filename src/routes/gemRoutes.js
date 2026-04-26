import express from "express"
import {
  getGems,
  getDashboardStats,
  getGemById,
  getLastGrc,
  intakeGem,
  updateGem,
  deleteGem,
  addGemImages,
  requestCorrection,
  requestApproverCorrection,
  dismissApproverCorrection,
  updateTest1,
  updateTest2,
  updateFinalApproval,
} from "../controllers/gemController.js"
import { protect, authorize } from "../middleware/authMiddleware.js"

const gemRoutes = express.Router()

gemRoutes.route("/").get(protect, getGems)
gemRoutes.get("/stats", protect, getDashboardStats)
gemRoutes.get("/last-grc", protect, getLastGrc)

gemRoutes.post("/intake", protect, authorize("HELPER", "ADMIN"), intakeGem)

gemRoutes
  .route("/:id")
  .get(protect, getGemById)
  .put(protect, authorize("ADMIN", "HELPER", "TESTER"), updateGem)
  .delete(protect, authorize("ADMIN"), deleteGem)

gemRoutes.put("/:id/test1", protect, authorize("TESTER", "ADMIN"), updateTest1)
gemRoutes.put("/:id/test2", protect, authorize("TESTER", "ADMIN"), updateTest2)
gemRoutes.put("/:id/final-approval", protect, authorize("ADMIN"), updateFinalApproval)
gemRoutes.post("/:id/images", protect, addGemImages)
gemRoutes.put("/:id/request-correction", protect, authorize("ADMIN"), requestCorrection)
gemRoutes.put("/:id/request-approver-correction", protect, authorize("ADMIN"), requestApproverCorrection)
gemRoutes.put("/:id/dismiss-approver-correction", protect, authorize("ADMIN"), dismissApproverCorrection)

export default gemRoutes
