import mongoose from "mongoose"
import Gem from "../models/Gem.js"
import { generateInsight, getLatestInsight } from "../services/gemInsight.service.js"

const findGem = async (id) =>
  mongoose.isValidObjectId(id) ? Gem.findById(id).select("gemId images driveFolderId").lean() : null

const fail = (res, error, fallback) => {
  const status = error.status || 500
  if (status >= 500) console.error(fallback, error)
  res.status(status).json({ message: status >= 500 && !error.code ? fallback : error.message, code: error.code })
}

// @desc    The latest AI insight this user asked for on a gem
// @route   GET /api/gems/:id/ai-insights
// @access  Private (TESTER, ADMIN)
export const getGemAiInsight = async (req, res) => {
  try {
    const gem = await findGem(req.params.id)
    if (!gem) return res.status(404).json({ message: "Gem not found" })
    res.json(await getLatestInsight(gem._id, req.user._id))
  } catch (error) {
    fail(res, error, "Error loading AI insights")
  }
}

// @desc    Ask the AI about a gem, from its photos and the readings sent
// @route   POST /api/gems/:id/ai-insights   body: { readings }
// @access  Private (TESTER, ADMIN)
export const createGemAiInsight = async (req, res) => {
  try {
    const gem = await findGem(req.params.id)
    if (!gem) return res.status(404).json({ message: "Gem not found" })
    res.json(await generateInsight(gem, req.body?.readings || {}, req.user))
  } catch (error) {
    fail(res, error, "Error generating AI insights")
  }
}
