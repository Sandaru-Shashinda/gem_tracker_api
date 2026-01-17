import User from "../models/User.js"
import generateToken from "../utils/generateToken.js"

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  const { username, password } = req.body

  const user = await User.findOne({ username })

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
  const { username, password, role, name } = req.body

  const userExists = await User.findOne({ username })

  if (userExists) {
    res.status(400).json({ message: "User already exists" })
    return
  }

  const user = await User.create({
    username,
    password,
    role,
    name,
  })

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      username: user.username,
      role: user.role,
    })
  } else {
    res.status(400).json({ message: "Invalid user data" })
  }
}

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = async (req, res) => {
  const user = await User.findById(req.user._id)

  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      username: user.username,
      role: user.role,
    })
  } else {
    res.status(404).json({ message: "User not found" })
  }
}
