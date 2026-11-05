import express from "express"
import {
  uploadImage,
  getImages,
  getImageById,
  updateImage,
  deleteImage,
} from "../controllers/imageController.js"
import { protect, authorize } from "../middleware/authMiddleware.js"
import upload from "../middleware/uploadMiddleware.js"

const imageRoutes = express.Router()

imageRoutes.route("/").get(protect, getImages).post(protect, upload.single("image"), uploadImage)

// Deleting an image also pulls it off its gem, and so off that gem's report.
imageRoutes
  .route("/:id")
  .get(getImageById)
  .put(protect, authorize("ADMIN", "HELPER"), updateImage)
  .delete(protect, authorize("ADMIN", "HELPER"), deleteImage)

export default imageRoutes
