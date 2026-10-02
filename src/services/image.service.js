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

export const handleMultipleImagesUpload = async (files, user = null) => {
  if (!files || files.length === 0) return []

  const imageIds = []
  for (const file of files) {
    const savedImage = await handleImageUpload(file, user)
    if (savedImage) imageIds.push(savedImage._id)
  }
  return imageIds
}
