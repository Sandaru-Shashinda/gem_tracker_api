import Image from "../models/Image.js"
import sharp from "sharp"

export const handleImageUpload = async (file, user = null, options = {}) => {
  if (!file) return null

  try {
    // Compression logic to target roughly 30KB
    let buffer = file.buffer
    let quality = 80
    let compressedBuffer = await sharp(buffer).jpeg({ quality }).toBuffer()

    // Iteratively reduce quality if file is too large
    if (compressedBuffer.length > 35000) {
      quality = 50
      compressedBuffer = await sharp(buffer).jpeg({ quality }).toBuffer()
    }
    if (compressedBuffer.length > 35000) {
      quality = 30
      compressedBuffer = await sharp(buffer).jpeg({ quality }).toBuffer()
    }

    const base64Data = compressedBuffer.toString("base64")
    const dataUri = `data:image/jpeg;base64,${base64Data}`

    // Store in Image collection
    const newImage = new Image({
      name: options.name || file.originalname,
      originalName: file.originalname,
      url: dataUri,
      data: base64Data,
      category: options.category || "gem",
      description: options.description || "",
      tags: options.tags || [],
      mimeType: "image/jpeg",
      size: compressedBuffer.length,
      uploadedBy: user ? user._id : null,
      metadata: options.metadata || {},
    })

    const savedImage = await newImage.save()
    return savedImage
  } catch (error) {
    console.error("Failed to upload/compress image:", error)
    throw new Error("Image upload/compression failed")
  }
}

export const MAX_PROFILE_IMAGE_STORED_BYTES = 20 * 1024

// Profile pictures only ever show as small circles, so a square crop kept under 20 KB is
// plenty and stays cheap to send along with every user record. Quality drops first; only
// a very detailed photo that still does not fit is shrunk further.
export const toProfileImageDataUri = async (buffer) => {
  for (const size of [256, 192, 128, 96]) {
    for (const quality of [80, 70, 60, 50, 40, 30]) {
      const compressed = await sharp(buffer)
        .rotate()
        .resize(size, size, { fit: "cover" })
        .jpeg({ quality, mozjpeg: true })
        .toBuffer()
      if (compressed.length <= MAX_PROFILE_IMAGE_STORED_BYTES) {
        return `data:image/jpeg;base64,${compressed.toString("base64")}`
      }
    }
  }
  throw new Error("Could not compress the image to 20 KB")
}

/**
 * Turning a photo of a signature into something that can sit on a certificate.
 *
 * A signature arrives as a phone photo or a scan: dark ink on paper that is rarely quite
 * white, often with the edge of the page or a scanner's frame showing. Laid on a report
 * as it is, the paper would print as a pale rectangle across the watermark. So the paper
 * is made transparent and only the ink is kept, in its own colour, and the result is
 * trimmed to the ink so it can be placed by its own edges.
 *
 * - Contrast is normalised first, so grey paper in a dim photo reads as white.
 * - A pixel at least as dark as INK is kept whole; at least as light as PAPER is dropped;
 *   between the two it fades, which keeps the stroke edges smooth rather than jagged.
 * - A thin band around the photo's border is cleared, because that is where the edge of
 *   the paper and scanner frames show up, and a signature never runs to the very edge.
 */
const SIGNATURE_INK = 110
const SIGNATURE_PAPER = 200
const SIGNATURE_EDGE_BAND = 0.015
export const MAX_SIGNATURE_STORED_BYTES = 60 * 1024

export const toSignatureDataUri = async (buffer) => {
  const { data, info } = await sharp(buffer)
    .rotate()
    .flatten({ background: "#ffffff" })
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .normalise()
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height, channels } = info
  const rgba = Buffer.alloc(width * height * 4)
  const bandX = Math.round(width * SIGNATURE_EDGE_BAND)
  const bandY = Math.round(height * SIGNATURE_EDGE_BAND)
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * channels
      const r = data[src]
      const g = channels >= 3 ? data[src + 1] : r
      const b = channels >= 3 ? data[src + 2] : r
      const lum = 0.299 * r + 0.587 * g + 0.114 * b
      let alpha =
        lum <= SIGNATURE_INK
          ? 255
          : lum >= SIGNATURE_PAPER
            ? 0
            : Math.round(((SIGNATURE_PAPER - lum) / (SIGNATURE_PAPER - SIGNATURE_INK)) * 255)
      if (x < bandX || x >= width - bandX || y < bandY || y >= height - bandY) alpha = 0

      const out = (y * width + x) * 4
      rgba[out] = r
      rgba[out + 1] = g
      rgba[out + 2] = b
      rgba[out + 3] = alpha

      // Only clearly inked pixels decide the trim, so faint noise cannot widen it.
      if (alpha > 96) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  if (maxX < 0) throw new Error("No signature could be found in that image")

  const pad = 4
  const left = Math.max(0, minX - pad)
  const top = Math.max(0, minY - pad)
  const region = {
    left,
    top,
    width: Math.min(width, maxX + pad + 1) - left,
    height: Math.min(height, maxY + pad + 1) - top,
  }

  for (const maxWidth of [900, 700, 500, 360]) {
    const png = await sharp(rgba, { raw: { width, height, channels: 4 } })
      .extract(region)
      .resize({ width: maxWidth, height: maxWidth, fit: "inside", withoutEnlargement: true })
      .png({ palette: true, compressionLevel: 9 })
      .toBuffer()
    if (png.length <= MAX_SIGNATURE_STORED_BYTES) {
      return `data:image/png;base64,${png.toString("base64")}`
    }
  }
  throw new Error("Could not compress the signature to 60 KB")
}

export const handleMultipleImagesUpload = async (files, user = null) => {
  if (!files || files.length === 0) return []

  const imageIds = []
  for (const file of files) {
    const savedImage = await handleImageUpload(file, user)
    if (savedImage) imageIds.push(savedImage._id)
  }
  return imageIds
}
