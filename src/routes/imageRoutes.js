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

imageRoutes
  .route("/:id")
  .get(protect, getImageById)
  .put(protect, updateImage)
  .delete(protect, authorize("ADMIN"), deleteImage)

export default imageRoutes
