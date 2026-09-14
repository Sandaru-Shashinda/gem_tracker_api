import ContactMessage from "../models/ContactMessage.js"
import { CONTACT_STATUSES } from "../constants/index.js"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Window in which the same address sending the same message again is treated as a
 * repeat submit rather than a new enquiry. Kept in the database rather than in
 * memory because the API runs as serverless functions — an in-process counter
 * would reset on every cold start and guard nothing.
 */
const DUPLICATE_WINDOW_MS = 60 * 1000

const FIELD_LIMITS = { name: 100, phone: 40, email: 160, message: 5000 }

const asText = (value) => (typeof value === "string" ? value.trim() : "")

// @desc    Receive a message from the public contact form
// @route   POST /api/contact
// @access  Public
export const createContactMessage = async (req, res) => {
  try {
    // Honeypot: a field the real form keeps hidden and empty. Anything that fills
    // it is scripted, so answer as though it worked and store nothing.
    if (asText(req.body.website)) {
      return res.status(201).json({ message: "Message received" })
    }

    const name = asText(req.body.name)
    const phone = asText(req.body.phone)
    const email = asText(req.body.email).toLowerCase()
    const messageBody = asText(req.body.message)
    const source = asText(req.body.source) || "grc.lk"

    const errors = {}
    if (!name) errors.name = "Name is required."
    if (!phone) errors.phone = "Phone is required."
    if (!email) {
      errors.email = "Email is required."
    } else if (!EMAIL_PATTERN.test(email)) {
      errors.email = "Please enter a valid email address."
    }

    for (const [field, limit] of Object.entries(FIELD_LIMITS)) {
      const value = { name, phone, email, message: messageBody }[field]
      if (value.length > limit) errors[field] = `Please keep this under ${limit} characters.`
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: "Please check the form and try again.", errors })
    }

    const recentDuplicate = await ContactMessage.findOne({
      email,
      message: messageBody,
      createdAt: { $gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
    })
      .select("_id")
      .lean()

    // A double-click or a retry should not produce two rows in the inbox, and the
    // sender has no way to tell the difference — both answers are "received".
    if (recentDuplicate) {
      return res.status(201).json({ message: "Message received" })
    }

    await ContactMessage.create({
      name,
      phone,
      email,
      message: messageBody,
      source: source.slice(0, 120),
    })

    res.status(201).json({ message: "Message received" })
  } catch (error) {
    res.status(500).json({ message: "Could not send your message", error: error.message })
  }
}

// @desc    List contact messages for the laboratory inbox
// @route   GET /api/contact
// @access  Private/Admin
export const getContactMessages = async (req, res) => {
  try {
    const pageSize = Number(req.query.limit) || 10
    const page = Number(req.query.page) || 1

    const query = { isDeleted: { $ne: true } }

    if (req.query.status && Object.values(CONTACT_STATUSES).includes(req.query.status)) {
      query.status = req.query.status
    }

    if (req.query.search) {
      const searchRegex = { $regex: req.query.search, $options: "i" }
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { message: searchRegex },
      ]
    }

    const [count, messages, newCount] = await Promise.all([
      ContactMessage.countDocuments(query),
      ContactMessage.find(query)
        .populate("handledBy", "name email")
        .sort({ createdAt: -1 })
        .limit(pageSize)
        .skip(pageSize * (page - 1)),
      // Unfiltered, so the sidebar badge keeps counting while a filter is applied.
      ContactMessage.countDocuments({
        isDeleted: { $ne: true },
        status: CONTACT_STATUSES.NEW,
      }),
    ])

    res.json({
      messages,
      page,
      pages: Math.ceil(count / pageSize),
      total: count,
      newCount,
    })
  } catch (error) {
    res.status(500).json({ message: "Error fetching messages", error: error.message })
  }
}

// @desc    Move a message between NEW / READ / ARCHIVED
// @route   PUT /api/contact/:id
// @access  Private/Admin
export const updateContactMessage = async (req, res) => {
  try {
    const { status } = req.body
    if (!status || !Object.values(CONTACT_STATUSES).includes(status)) {
      return res.status(400).json({ message: "Unknown message status" })
    }

    const contactMessage = await ContactMessage.findById(req.params.id)
    if (!contactMessage || contactMessage.isDeleted) {
      return res.status(404).json({ message: "Message not found" })
    }

    contactMessage.status = status

    // Who dealt with it, and when. Returning a message to NEW clears both, so the
    // stamp always describes the state the message is actually in.
    if (status === CONTACT_STATUSES.NEW) {
      contactMessage.handledBy = undefined
      contactMessage.handledAt = undefined
    } else {
      contactMessage.handledBy = req.user._id
      contactMessage.handledAt = new Date()
    }

    const saved = await contactMessage.save()
    await saved.populate("handledBy", "name email")

    res.json(saved)
  } catch (error) {
    res.status(500).json({ message: "Error updating message", error: error.message })
  }
}

// @desc    Remove a message from the inbox
// @route   DELETE /api/contact/:id
// @access  Private/Admin
export const deleteContactMessage = async (req, res) => {
  try {
    const contactMessage = await ContactMessage.findById(req.params.id)
    if (!contactMessage || contactMessage.isDeleted) {
      return res.status(404).json({ message: "Message not found" })
    }

    contactMessage.isDeleted = true
    await contactMessage.save()

    res.json({ message: "Message removed" })
  } catch (error) {
    res.status(500).json({ message: "Error deleting message", error: error.message })
  }
}
