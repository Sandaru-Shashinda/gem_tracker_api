import express from "express"
import { loginUser, registerUser, getUserProfile } from "../controllers/authController.js"
import { protect, authorize } from "../middleware/authMiddleware.js"

const router = express.Router()

router.post("/login", loginUser)
router.post("/register", protect, authorize("ADMIN"), registerUser)
router.get("/profile", protect, getUserProfile)

export default router
