import jwt from "jsonwebtoken"
import Gem from "../models/Gem.js"
import Report from "../models/Report.js"
import {
  createFolder,
  createUploadSession,
  driveFolderUrl,
  driveRequest,
  fetchFileRange,
  getFile,
  isDriveConfigured,
  listFolder,
  trashFile,
} from "../services/drive.service.js"
import { chunkedRange, driveFileId, relayRange } from "../utils/driveVideo.js"

/**
 * A gem's photos and videos, kept in its own Drive folder.
 *
 * Nothing about the files is copied into the database — Drive is the record, and the
 * gem holds only where its folder is. Anyone at the lab can still add or tidy files in
 * Drive itself, and the app shows whatever is there.
 */

const MEDIA_TOKEN_TYPE = "drive-media"

// <img> and <video> cannot send the Authorization header, so each file in a listing
// comes with a token of its own, good for that one file only and never for signing in
// (it names no user, so protect() turns it away).
const signMediaToken = (fileId) =>
  jwt.sign({ typ: MEDIA_TOKEN_TYPE, fileId }, process.env.JWT_SECRET, { expiresIn: "6h" })

const hasMediaToken = (req) => {
  try {
    const decoded = jwt.verify(String(req.query.t || ""), process.env.JWT_SECRET)
    return decoded.typ === MEDIA_TOKEN_TYPE && decoded.fileId === req.params.fileId
  } catch {
    return false
  }
}

const mediaKind = (mimeType = "") =>
  mimeType.startsWith("image/") ? "image" : mimeType.startsWith("video/") ? "video" : "other"

const notConfigured = (res) =>
  res.status(503).json({ message: "Google Drive is not set up on this server", code: "DRIVE_NOT_CONFIGURED" })

/**
 * The gem's folder, made now if it has none.
 *
 * Two uploads started together would each make one, so the id is written only where
 * none is set yet; the one that loses trashes its folder and uses the winner's.
 */
const ensureGemFolder = async (gem) => {
  if (gem.driveFolderId) return gem.driveFolderId

  const { id } = await createFolder(gem.gemId)
  const claimed = await Gem.findOneAndUpdate(
    { _id: gem._id, driveFolderId: { $exists: false } },
    { $set: { driveFolderId: id } },
    { new: true },
  )
  if (claimed) return id

  await trashFile(id).catch((error) => console.error("Could not trash duplicate gem folder:", error))
  const winner = await Gem.findById(gem._id).select("driveFolderId").lean()
  return winner.driveFolderId
}

/** The gem and a file in its folder, or null when the file is not one of its own. */
const findGemFile = async (gemId, fileId, fields) => {
  const gem = await Gem.findById(gemId).select("driveFolderId reportId")
  if (!gem?.driveFolderId) return null
  const file = await getFile(fileId, `parents${fields ? `, ${fields}` : ""}`).catch((error) => {
    if (error.status === 404) return null
    throw error
  })
  return file?.parents?.includes(gem.driveFolderId) ? { gem, file } : null
}

// @desc    List a gem's photos and videos
// @route   GET /api/gems/:id/media
// @access  Private
export const listGemMedia = async (req, res) => {
  if (!isDriveConfigured()) return notConfigured(res)
  try {
    const gem = await Gem.findById(req.params.id).select("driveFolderId").lean()
    if (!gem) return res.status(404).json({ message: "Gem not found" })
    if (!gem.driveFolderId) return res.json({ folderUrl: null, files: [] })

    const files = await listFolder(gem.driveFolderId)
    res.json({
      folderUrl: driveFolderUrl(gem.driveFolderId),
      files: files.map((file) => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        kind: mediaKind(file.mimeType),
        size: file.size ? Number(file.size) : null,
        createdTime: file.createdTime,
        durationMillis: file.videoMediaMetadata?.durationMillis
          ? Number(file.videoMediaMetadata.durationMillis)
          : null,
        hasThumbnail: !!file.thumbnailLink,
        token: signMediaToken(file.id),
      })),
    })
  } catch (error) {
    console.error("Error listing gem media:", error)
    res.status(500).json({ message: "Error listing gem media", error: error.message })
  }
}

// @desc    Start uploading a photo or video into a gem's folder
// @route   POST /api/gems/:id/media/uploads
// @access  Private
//
// Answers with the address the browser sends the file to; see createUploadSession.
export const createGemUpload = async (req, res) => {
  if (!isDriveConfigured()) return notConfigured(res)
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : ""
    const mimeType = typeof req.body.mimeType === "string" ? req.body.mimeType : ""
    const size = Number(req.body.size) || undefined
    if (!name) return res.status(400).json({ message: "A file name is required" })
    if (mediaKind(mimeType) === "other") {
      return res.status(400).json({ message: "Only photos and videos can be added to a gem" })
    }

    const gem = await Gem.findById(req.params.id).select("gemId driveFolderId")
    if (!gem) return res.status(404).json({ message: "Gem not found" })

    const folderId = await ensureGemFolder(gem)
    const uploadUrl = await createUploadSession({
      folderId,
      name,
      mimeType,
      size,
      origin: req.headers.origin,
    })
    res.status(201).json({ uploadUrl })
  } catch (error) {
    console.error("Error starting gem media upload:", error)
    res.status(500).json({ message: "Error starting upload", error: error.message })
  }
}

// @desc    A photo or video's preview image
// @route   GET /api/gems/:id/media/:fileId/thumbnail?t=<token>&size=<px>
// @access  Media token
//
// Drive's own thumbnail, sized on request — small for the grid, large for viewing a
// photo. The original could be far over the response limit, and the preview is plenty.
export const getGemMediaThumbnail = async (req, res) => {
  if (!isDriveConfigured()) return notConfigured(res)
  if (!hasMediaToken(req)) return res.status(401).json({ message: "Not authorized" })
  try {
    const found = await findGemFile(req.params.id, req.params.fileId, "thumbnailLink")
    if (!found?.file.thumbnailLink) return res.status(404).json({ message: "No preview for this file" })

    const size = Math.min(Math.max(Number(req.query.size) || 400, 64), 2000)
    const upstream = await driveRequest(found.file.thumbnailLink.replace(/=s\d+$/, `=s${size}`))
    if (!upstream.ok) return res.status(502).json({ message: "Drive did not serve the preview" })

    res.set({
      "Content-Type": upstream.headers.get("content-type") || "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    })
    res.end(Buffer.from(await upstream.arrayBuffer()))
  } catch (error) {
    console.error("Error fetching gem media preview:", error)
    res.status(500).json({ message: "Error fetching preview", error: error.message })
  }
}

// @desc    Play a video from a gem's folder
// @route   GET /api/gems/:id/media/:fileId/stream?t=<token>
// @access  Media token
export const streamGemMedia = async (req, res) => {
  if (!isDriveConfigured()) return notConfigured(res)
  if (!hasMediaToken(req)) return res.status(401).json({ message: "Not authorized" })
  try {
    if (!(await findGemFile(req.params.id, req.params.fileId))) {
      return res.status(404).json({ message: "File not found" })
    }
    const upstream = await fetchFileRange(req.params.fileId, chunkedRange(req.headers.range))
    await relayRange(res, upstream, "private, max-age=3600")
  } catch (error) {
    console.error("Error streaming gem media:", error)
    res.status(500).json({ message: "Error streaming video", error: error.message })
  }
}

// @desc    Remove a photo or video from a gem's folder
// @route   DELETE /api/gems/:id/media/:fileId
// @access  Private/Admin, Helper
//
// A video that was the report's video stops being it, so the QR page does not offer
// one that is no longer there.
export const deleteGemMedia = async (req, res) => {
  if (!isDriveConfigured()) return notConfigured(res)
  try {
    const found = await findGemFile(req.params.id, req.params.fileId)
    if (!found) return res.status(404).json({ message: "File not found" })

    await trashFile(req.params.fileId)

    if (found.gem.reportId) {
      const report = await Report.findById(found.gem.reportId).select("videoUrl")
      if (report?.videoUrl && driveFileId(report.videoUrl) === req.params.fileId) {
        await Report.updateOne({ _id: report._id }, { $unset: { videoUrl: 1 } })
      }
    }

    res.json({ message: "File moved to the Drive trash" })
  } catch (error) {
    console.error("Error deleting gem media:", error)
    res.status(500).json({ message: "Error deleting file", error: error.message })
  }
}
