import express from "express"
import {
  searchReferences,
  seedReferences,
  getAllReferences,
  getAllSpecies,
  getIdentifications,
  getHiddenSuggestions,
  hideSuggestion,
  restoreSuggestion,
} from "../controllers/referenceController.js"
import { protect, authorize } from "../middleware/authMiddleware.js"

const referenceRoutes = express.Router()

referenceRoutes.get("/", protect, getAllReferences)
referenceRoutes.get("/species", protect, getAllSpecies)
referenceRoutes.get("/identifications", protect, getIdentifications)
referenceRoutes.get("/search", protect, searchReferences)
// Testers type these suggestions too, so every signed-in role can tidy them.
referenceRoutes.get("/suggestions/hidden", protect, getHiddenSuggestions)
referenceRoutes.post("/suggestions/hidden", protect, hideSuggestion)
referenceRoutes.delete("/suggestions/hidden/:id", protect, restoreSuggestion)
referenceRoutes.post("/seed", protect, authorize("ADMIN"), seedReferences)

export default referenceRoutes
