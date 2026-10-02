import express from "express"
import {
  loginUser,
  registerUser,
  getUserProfile,
  getUsers,
  deleteUser,
  updateUser,
  updateUserProfile,
  changePassword,
  uploadProfileImage,
  removeProfileImage,
} from "../controllers/authController.js"
import { protect, authorize } from "../middleware/authMiddleware.js"
import upload from "../middleware/uploadMiddleware.js"

const authRoutes = express.Router()

authRoutes.post("/login", loginUser)
authRoutes.post("/register", protect, authorize("ADMIN", "HELPER"), registerUser)
authRoutes.get("/users", protect, authorize("ADMIN", "HELPER", "TESTER"), getUsers)
authRoutes.post("/users/:id", protect, authorize("ADMIN", "HELPER"), updateUser)
authRoutes.delete("/users/:id", protect, authorize("ADMIN", "HELPER"), deleteUser)
// Self-service: every signed-in user manages their own profile, whatever their role.
authRoutes.get("/profile", protect, getUserProfile)
authRoutes.put("/profile", protect, updateUserProfile)
authRoutes.put("/profile/password", protect, changePassword)
authRoutes.post("/profile/image", protect, upload.single("image"), uploadProfileImage)
authRoutes.delete("/profile/image", protect, removeProfileImage)

export default authRoutes
