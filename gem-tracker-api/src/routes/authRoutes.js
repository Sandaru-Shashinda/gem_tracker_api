import express from "express"
import {
  loginUser,
  registerUser,
  getUserProfile,
  getUsers,
  deleteUser,
  updateUser,
} from "../controllers/authController.js"
import { protect, authorize } from "../middleware/authMiddleware.js"

const authRoutes = express.Router()

authRoutes.post("/login", loginUser)
authRoutes.post("/register", protect, authorize("ADMIN"), registerUser)
authRoutes.get("/users", protect, authorize("ADMIN"), getUsers)
authRoutes.put("/users/:id", protect, authorize("ADMIN"), updateUser)
authRoutes.delete("/users/:id", protect, authorize("ADMIN"), deleteUser)
authRoutes.get("/profile", protect, getUserProfile)

export default authRoutes
