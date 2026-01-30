import express from "express"
import {
  searchReferences,
  seedReferences,
  getAllReferences,
  getAllSpecies,
} from "../controllers/referenceController.js"
import { protect, authorize } from "../middleware/authMiddleware.js"

const referenceRoutes = express.Router()

referenceRoutes.get("/", protect, getAllReferences)
referenceRoutes.get("/species", protect, getAllSpecies)
referenceRoutes.get("/search", protect, searchReferences)
referenceRoutes.post("/seed", protect, authorize("ADMIN"), seedReferences)

export default referenceRoutes
