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

dotenv.config()
connectDB()

const app = express()
const __dirname = path.dirname(fileURLToPath(import.meta.url))

app.use(cors())
app.use(express.json())
app.use(morgan("dev"))

// Static folder for reports
app.use("/reports", express.static(path.join(__dirname, "../reports")))

// Routes
app.get("/", (req, res) => {
  res.send("Gem Tracker API is running...")
})

app.use("/api/auth", authRoutes)
app.use("/api/gems", gemRoutes)
app.use("/api/references", referenceRoutes)
app.use("/api/reports", reportRoutes)

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`)
})
