import Image from "../models/Image.js"
import Customer from "../models/Customer.js"
import Gem from "../models/Gem.js"
import { handleImageUpload } from "../services/image.service.js"

// @desc    Upload image
// @route   POST /api/images
// @access  Private
export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" })
    }

    const { category, description, tags, name, metadata } = req.body

    const savedImage = await handleImageUpload(req.file, req.user, {
      category,
      description,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(",").map((t) => t.trim())) : [],
      name,
      metadata: metadata ? (typeof metadata === "string" ? JSON.parse(metadata) : metadata) : {},
    })

    await savedImage.populate("uploadedBy", "name role")
    res.status(201).json(savedImage)
  } catch (error) {
    console.error("Error uploading image:", error)
    res.status(500).json({ message: "Error uploading image", error: error.message })
  }
}

// @desc    Get all images
// @route   GET /api/images
// @access  Private
export const getImages = async (req, res) => {
  try {
    const { category } = req.query
    const query = { isDeleted: false }
    if (category) {
      query.category = category
    }

    const images = await Image.find(query)
      .populate("uploadedBy", "name role")
      .sort({ createdAt: -1 })
    res.json(images)
  } catch (error) {
    console.error("Error fetching images:", error)
    res.status(500).json({ message: "Error fetching images", error: error.message })
  }
}

// @desc    Get image by ID
// @route   GET /api/images/:id
// @access  Private
export const getImageById = async (req, res) => {
  try {
    const image = await Image.findById(req.params.id).populate("uploadedBy", "name role")

    if (!image) {
      return res.status(404).json({ message: "Image not found" })
    }

    res.json(image)
  } catch (error) {
    console.error("Error fetching image:", error)
    res.status(500).json({ message: "Error fetching image", error: error.message })
  }
}

// @desc    Update image
// @route   PUT /api/images/:id
// @access  Private
export const updateImage = async (req, res) => {
  try {
    const { category, description, tags, name, metadata } = req.body
    const image = await Image.findById(req.params.id)

    if (!image) {
      return res.status(404).json({ message: "Image not found" })
    }

    if (category) image.category = category
    if (description) image.description = description
    if (name) image.name = name
    if (tags) {
      image.tags = Array.isArray(tags) ? tags : tags.split(",").map((t) => t.trim())
    }
    if (metadata) {
      image.metadata = typeof metadata === "string" ? JSON.parse(metadata) : metadata
    }

    const updatedImage = await image.save()
    await updatedImage.populate("uploadedBy", "name role")
    res.json(updatedImage)
  } catch (error) {
    console.error("Error updating image:", error)
    res.status(500).json({ message: "Error updating image", error: error.message })
  }
}

// @desc    Delete image
// @route   DELETE /api/images/:id
// @access  Private
export const deleteImage = async (req, res) => {
  try {
    const image = await Image.findById(req.params.id)
    if (!image) {
      return res.status(404).json({ message: "Image not found" })
    }

    const imageId = image._id

    // Remove references from Customers
    await Customer.updateMany({ logo: imageId.toString() }, { $set: { logo: "" } })

    // Remove references from Gems
    await Gem.updateMany({ images: imageId }, { $pull: { images: imageId } })

    await image.deleteOne()
    res.json({ message: "Image deleted successfully" })
  } catch (error) {
    console.error("Error deleting image:", error)
    res.status(500).json({ message: "Error deleting image", error: error.message })
  }
}
