import express from "express"
import {
  getCustomers,
  getCustomerById, // Corrected export name
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "../controllers/customerController.js"
import { protect, authorize } from "../middleware/authMiddleware.js"
import upload from "../middleware/uploadMiddleware.js"

const router = express.Router()

router
  .route("/")
  .get(protect, getCustomers)
  .post(protect, authorize("ADMIN", "HELPER"), upload.single("logo"), createCustomer)

router
  .route("/:id")
  .get(protect, getCustomerById)
  .put(protect, authorize("ADMIN", "HELPER"), upload.single("logo"), updateCustomer)
  .delete(protect, authorize("ADMIN", "HELPER"), deleteCustomer)

export default router
