import express from "express"
import {
  getGems,
  getDashboardStats,
  getActivity,
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
import {
  listGemMedia,
  createGemUpload,
  getGemMediaThumbnail,
  streamGemMedia,
  deleteGemMedia,
} from "../controllers/mediaController.js"
import { protect, authorize } from "../middleware/authMiddleware.js"

const gemRoutes = express.Router()

gemRoutes.route("/").get(protect, getGems)
gemRoutes.get("/stats", protect, getDashboardStats)
gemRoutes.get("/stats/activity", protect, getActivity)
gemRoutes.get("/last-grc", protect, getLastGrc)

gemRoutes.post("/intake", protect, authorize("HELPER", "ADMIN"), intakeGem)

// A report prints the gem's own record, so these writes are closed to TESTER: a tester
// reads reports, and records readings only through the stage routes below.
gemRoutes
  .route("/:id")
  .get(protect, getGemById)
  .put(protect, authorize("ADMIN", "HELPER"), updateGem)
  .delete(protect, authorize("ADMIN"), deleteGem)

gemRoutes.put("/:id/test1", protect, authorize("TESTER", "ADMIN"), updateTest1)
gemRoutes.put("/:id/test2", protect, authorize("TESTER", "ADMIN"), updateTest2)
gemRoutes.put("/:id/final-approval", protect, authorize("ADMIN"), updateFinalApproval)
gemRoutes.post("/:id/images", protect, authorize("ADMIN", "HELPER"), addGemImages)
gemRoutes.put("/:id/request-correction", protect, authorize("ADMIN"), requestCorrection)
gemRoutes.put("/:id/request-approver-correction", protect, authorize("ADMIN"), requestApproverCorrection)
gemRoutes.put("/:id/dismiss-approver-correction", protect, authorize("ADMIN"), dismissApproverCorrection)

// The gem's Drive folder. Anyone working on the stone may add to it; removing is kept
// to those who can remove its intake images. The thumbnail and stream routes are loaded
// by <img> and <video>, which cannot send a token header, so they check the per-file
// token the listing hands out instead of protect.
gemRoutes.get("/:id/media", protect, listGemMedia)
gemRoutes.post("/:id/media/uploads", protect, createGemUpload)
gemRoutes.get("/:id/media/:fileId/thumbnail", getGemMediaThumbnail)
gemRoutes.get("/:id/media/:fileId/stream", streamGemMedia)
gemRoutes.delete("/:id/media/:fileId", protect, authorize("ADMIN", "HELPER"), deleteGemMedia)

export default gemRoutes
