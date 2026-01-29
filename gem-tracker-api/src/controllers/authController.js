import User from "../models/User.js"
import generateToken from "../utils/generateToken.js"

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  const { username, password } = req.body
  const user = await User.findOne({ username, isDeleted: { $ne: true } })

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      name: user.name,
      username: user.username,
      role: user.role,
      token: generateToken(user._id),
    })
  } else {
    res.status(401).json({ message: "Invalid username or password" })
  }
}

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Private/Admin
export const registerUser = async (req, res) => {
  const { username, password, role, name, age, dob, idNumber, address, email } = req.body

  const userExists = await User.findOne({ username })

  if (userExists) {
    if (userExists.isDeleted) {
      // Re-activate deleted user if needed, or just error
      res.status(400).json({ message: "Username already exists (deactivated account)" })
      return
    }
    res.status(400).json({ message: "User already exists" })
    return
  }

  const user = await User.create({
    username,
    password,
    role,
    name,
    age,
    dob,
    idNumber,
    address,
    email,
  })

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      username: user.username,
      role: user.role,
      age: user.age,
      dob: user.dob,
      idNumber: user.idNumber,
      address: user.address,
      email: user.email,
    })
  } else {
    res.status(400).json({ message: "Invalid user data" })
  }
}

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = async (req, res) => {
  const user = await User.findOne({ _id: req.user._id, isDeleted: { $ne: true } })

  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      username: user.username,
      role: user.role,
      age: user.age,
      dob: user.dob,
      idNumber: user.idNumber,
      address: user.address,
      email: user.email,
    })
  } else {
    res.status(404).json({ message: "User not found" })
  }
}

// @desc    Get all users
// @route   GET /api/auth/users
// @access  Private/Admin
export const getUsers = async (req, res) => {
  const users = await User.find({ isDeleted: { $ne: true } })
  res.json(users)
}

// @desc    Update user
// @route   PUT /api/auth/users/:id
// @access  Private/Admin
export const updateUser = async (req, res) => {
  const user = await User.findById(req.params.id)

  if (user) {
    user.name = req.body.name || user.name
    user.role = req.body.role || user.role
    user.age = req.body.age || user.age
    user.dob = req.body.dob || user.dob
    user.idNumber = req.body.idNumber || user.idNumber
    user.address = req.body.address || user.address
    user.email = req.body.email || user.email

    if (req.body.password) {
      user.password = req.body.password
    }

    const updatedUser = await user.save()

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      username: updatedUser.username,
      role: updatedUser.role,
      age: updatedUser.age,
      dob: updatedUser.dob,
      idNumber: updatedUser.idNumber,
      address: updatedUser.address,
      email: updatedUser.email,
    })
  } else {
    res.status(404).json({ message: "User not found" })
  }
}

// @desc    Soft delete user
// @route   DELETE /api/auth/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res) => {
  const user = await User.findById(req.params.id)

  if (user) {
    user.isDeleted = true
    await user.save()
    res.json({ message: "User removed (soft delete)" })
  } else {
    res.status(404).json({ message: "User not found" })
  }
}
