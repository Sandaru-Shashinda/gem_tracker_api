import mongoose, { Schema } from "mongoose"
import bcrypt from "bcryptjs"

const UserSchema = new mongoose.Schema(
  {
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["ADMIN", "HELPER", "TESTER"],
      required: true,
    },
    name: { type: String, required: true },
    age: { type: Schema.Types.Mixed, required: false },
    dob: { type: Schema.Types.Mixed, required: false },
    idNumber: { type: Schema.Types.Mixed, required: false },
    address: { type: Schema.Types.Mixed, required: false },
    email: { type: String, required: true },
    phoneNumber: { type: String, required: false },
    // Small square JPEG as a data URI, set by the user from their own profile page.
    profileImage: { type: String, required: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
)

// Method to check password
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}

// Hash password before saving
UserSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return
  }
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

export default mongoose.model("User", UserSchema)
