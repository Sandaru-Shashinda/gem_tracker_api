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

export const handleMultipleImagesUpload = async (files, user = null) => {
  if (!files || files.length === 0) return []

  const imageIds = []
  for (const file of files) {
    const savedImage = await handleImageUpload(file, user)
    if (savedImage) imageIds.push(savedImage._id)
  }
  return imageIds
}
