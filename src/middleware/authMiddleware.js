import jwt from "jsonwebtoken"
import User from "../models/User.js"

export const protect = async (req, res, next) => {
  if (!req.headers.authorization || !req.headers.authorization.startsWith("Bearer")) {
    return res.status(401).json({ message: "Not authorized, no token" })
  }

  let decoded
  try {
    decoded = jwt.verify(req.headers.authorization.split(" ")[1], process.env.JWT_SECRET)
  } catch (error) {
    // An expired token is the ordinary end of a session, not a fault worth a stack trace.
    // The app signs the user out on any 401; the code lets it say why.
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: "Session expired, please log in again", code: "TOKEN_EXPIRED" })
    }
    console.error(error)
    return res.status(401).json({ message: "Not authorized, token failed" })
  }

  // Outside the try so a database error surfaces as a 500 rather than a 401 that signs the user out.
  req.user = await User.findById(decoded.id).select("-password")
  if (!req.user) {
    return res.status(401).json({ message: "Not authorized, user no longer exists" })
  }
  next()
}

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `User role ${req.user.role} is not authorized to access this route`,
      })
    }
    next()
  }
}
