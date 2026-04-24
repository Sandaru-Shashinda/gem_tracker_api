import generateToken from "../utils/generateToken.js"

export const serializeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  age: user.age,
  dob: user.dob,
  idNumber: user.idNumber,
  address: user.address,
  phoneNumber: user.phoneNumber,
})

export { generateToken }
