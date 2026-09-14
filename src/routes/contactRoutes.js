import express from "express"
import {
  createContactMessage,
  getContactMessages,
  updateContactMessage,
  deleteContactMessage,
} from "../controllers/contactController.js"
import { protect, authorize } from "../middleware/authMiddleware.js"

const contactRoutes = express.Router()

// POST is deliberately open — it is the public form on grc.lk. Everything that
// reads or changes the inbox is admin only.
contactRoutes
  .route("/")
  .post(createContactMessage)
  .get(protect, authorize("ADMIN"), getContactMessages)

contactRoutes
  .route("/:id")
  .put(protect, authorize("ADMIN"), updateContactMessage)
  .delete(protect, authorize("ADMIN"), deleteContactMessage)

export default contactRoutes
