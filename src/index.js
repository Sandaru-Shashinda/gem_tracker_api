import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import morgan from "morgan"
import path from "path"
import { fileURLToPath } from "url"
import connectDB from "./config/db.js"
import authRoutes from "./routes/authRoutes.js"
import gemRoutes from "./routes/gemRoutes.js"
import referenceRoutes from "./routes/referenceRoutes.js"
import reportRoutes from "./routes/reportRoutes.js"
import customerRoutes from "./routes/customerRoutes.js"
import imageRoutes from "./routes/imageRoutes.js"

dotenv.config()
connectDB()

const app = express()
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// CORS Configuration - Must be BEFORE routes
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  }),
)

app.use(express.json())
app.use(morgan("dev"))

// Static folders for reports and uploads
app.use("/reports", express.static(path.join(__dirname, "../reports")))
app.use("/uploads", express.static(path.join(__dirname, "../uploads")))

// Routes
app.get("/", (req, res) => {
  res.send("Gem Tracker API is running...")
})

app.use("/api/auth", authRoutes)
app.use("/api/gems", gemRoutes)
app.use("/api/customers", customerRoutes)
app.use("/api/references", referenceRoutes)
app.use("/api/reports", reportRoutes)
app.use("/api/images", imageRoutes)

// Error handling middleware (add at the end)
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err : {},
  })
})

// Export app for Vercel
export default app

const PORT = process.env.PORT || 5000

if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`)
  })
}
