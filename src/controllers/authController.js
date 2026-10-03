import User from "../models/User.js"
import asyncHandler from "../utils/asyncHandler.js"
import { serializeUser, generateToken } from "../services/auth.service.js"
import { toProfileImageDataUri, toSignatureDataUri } from "../services/image.service.js"

const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body
  const user = await User.findOne({ email, isDeleted: { $ne: true } })

  if (user && (await user.matchPassword(password))) {
    res.json({
      ...serializeUser(user),
      token: generateToken(user._id),
    })
  } else {
    res.status(401).json({ message: "Invalid email or password" })
  }
})

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Private/Admin
export const registerUser = asyncHandler(async (req, res) => {
  const { password, role, name, age, dob, idNumber, address, email, phoneNumber } = req.body

  if (req.user.role !== "ADMIN" && role === "ADMIN") {
    res.status(403).json({ message: "Only an admin can create admin accounts" })
    return
  }

  const userExists = await User.findOne({ email })

  if (userExists) {
    if (userExists.isDeleted) {
      res.status(400).json({ message: "Email already exists (deactivated account)" })
      return
    }
    res.status(400).json({ message: "User already exists" })
    return
  }

  const user = await User.create({ password, role, name, age, dob, idNumber, address, phoneNumber, email })

  if (user) {
    res.status(201).json(serializeUser(user))
  } else {
    res.status(400).json({ message: "Invalid user data" })
  }
})

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.user._id, isDeleted: { $ne: true } })

  if (user) {
    res.json(serializeUser(user))
  } else {
    res.status(404).json({ message: "User not found" })
  }
})

// @desc    Update own profile details (never role or password)
// @route   PUT /api/auth/profile
// @access  Private
export const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.user._id, isDeleted: { $ne: true } })

  if (!user) {
    res.status(404).json({ message: "User not found" })
    return
  }

  const { name, email } = req.body

  if (name !== undefined) {
    if (!String(name).trim()) {
      res.status(400).json({ message: "Name is required" })
      return
    }
    user.name = String(name).trim()
  }

  if (email !== undefined && email !== user.email) {
    if (!String(email).trim()) {
      res.status(400).json({ message: "Email is required" })
      return
    }
    const emailExists = await User.findOne({ email, _id: { $ne: user._id } })
    if (emailExists) {
      res.status(400).json({ message: "Email already in use" })
      return
    }
    user.email = email
  }

  // Unlike the admin edit, an empty value here clears the field.
  for (const field of ["age", "dob", "idNumber", "address", "phoneNumber"]) {
    if (req.body[field] !== undefined) user[field] = req.body[field] || undefined
  }

  const updatedUser = await user.save()
  res.json(serializeUser(updatedUser))
})

// @desc    Change own password
// @route   PUT /api/auth/profile/password
// @access  Private
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body
  const user = await User.findOne({ _id: req.user._id, isDeleted: { $ne: true } })

  if (!user) {
    res.status(404).json({ message: "User not found" })
    return
  }

  if (!currentPassword || !(await user.matchPassword(currentPassword))) {
    res.status(400).json({ message: "Current password is incorrect" })
    return
  }

  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ message: "New password must be at least 6 characters" })
    return
  }

  user.password = newPassword
  await user.save()
  res.json({ message: "Password updated" })
})

// @desc    Upload own profile image
// @route   POST /api/auth/profile/image
// @access  Private
export const uploadProfileImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: "No image file provided" })
    return
  }
  if (req.file.size > MAX_PROFILE_IMAGE_BYTES) {
    res.status(400).json({ message: "Image must be 5 MB or smaller" })
    return
  }

  const user = await User.findOne({ _id: req.user._id, isDeleted: { $ne: true } })
  if (!user) {
    res.status(404).json({ message: "User not found" })
    return
  }

  user.profileImage = await toProfileImageDataUri(req.file.buffer)
  const updatedUser = await user.save()
  res.json(serializeUser(updatedUser))
})

// @desc    Remove own profile image
// @route   DELETE /api/auth/profile/image
// @access  Private
export const removeProfileImage = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.user._id, isDeleted: { $ne: true } })
  if (!user) {
    res.status(404).json({ message: "User not found" })
    return
  }

  user.profileImage = undefined
  const updatedUser = await user.save()
  res.json(serializeUser(updatedUser))
})

// @desc    Upload own signature
// @route   POST /api/auth/profile/signature
// @access  Private
//
// Only ever one's own: a signature is printed on certificates under the signer's name,
// so nobody sets it on another person's behalf.
export const uploadSignatureImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: "No image file provided" })
    return
  }
  if (req.file.size > MAX_PROFILE_IMAGE_BYTES) {
    res.status(400).json({ message: "Image must be 5 MB or smaller" })
    return
  }

  const user = await User.findOne({ _id: req.user._id, isDeleted: { $ne: true } })
  if (!user) {
    res.status(404).json({ message: "User not found" })
    return
  }

  try {
    user.signatureImage = await toSignatureDataUri(req.file.buffer)
  } catch (error) {
    res.status(400).json({ message: error.message })
    return
  }
  const updatedUser = await user.save()
  res.json(serializeUser(updatedUser))
})

// @desc    Remove own signature
// @route   DELETE /api/auth/profile/signature
// @access  Private
export const removeSignatureImage = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.user._id, isDeleted: { $ne: true } })
  if (!user) {
    res.status(404).json({ message: "User not found" })
    return
  }

  user.signatureImage = undefined
  const updatedUser = await user.save()
  res.json(serializeUser(updatedUser))
})

// @desc    Get all users
// @route   GET /api/auth/users
// @access  Private/Admin
export const getUsers = asyncHandler(async (req, res) => {
  const filter = { isDeleted: { $ne: true } }
  if (req.query.role) filter.role = req.query.role

  // Signatures stay out of user lists — every list of testers would otherwise carry
  // tens of kilobytes of image per person for no screen that shows them.
  const users = await User.find(filter).select("-password -signatureImage")
  res.json(users)
})

// @desc    Update user
// @route   PUT /api/auth/users/:id
// @access  Private/Admin
export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)

  if (!user) {
    res.status(404).json({ message: "User not found" })
    return
  }

  // A helper manages staff accounts but can never touch or create an admin.
  if (req.user.role !== "ADMIN" && (user.role === "ADMIN" || req.body.role === "ADMIN")) {
    res.status(403).json({ message: "Only an admin can modify admin accounts" })
    return
  }

  user.name = req.body.name || user.name
  user.role = req.body.role || user.role
  user.age = req.body.age || user.age
  user.dob = req.body.dob || user.dob
  user.idNumber = req.body.idNumber || user.idNumber
  user.address = req.body.address || user.address
  user.phoneNumber = req.body.phoneNumber || user.phoneNumber

  if (req.body.email && req.body.email !== user.email) {
    const emailExists = await User.findOne({ email: req.body.email, _id: { $ne: user._id } })
    if (emailExists) {
      res.status(400).json({ message: "Email already in use" })
      return
    }
    user.email = req.body.email
  }

  if (req.body.password) user.password = req.body.password

  const updatedUser = await user.save()
  res.json(serializeUser(updatedUser))
})

// @desc    Soft delete user
// @route   DELETE /api/auth/users/:id
// @access  Private/Admin
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)

  if (user && req.user.role !== "ADMIN" && user.role === "ADMIN") {
    res.status(403).json({ message: "Only an admin can remove admin accounts" })
    return
  }

  if (user) {
    user.isDeleted = true
    await user.save()
    res.json({ message: "User removed (soft delete)" })
  } else {
    res.status(404).json({ message: "User not found" })
  }
})
