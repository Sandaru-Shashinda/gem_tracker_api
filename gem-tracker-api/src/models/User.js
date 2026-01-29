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
    age: { type: Schema.Types.Mixed, required: true },
    dob: { type: Schema.Types.Mixed, required: true },
    idNumber: { type: Schema.Types.Mixed, required: true },
    address: { type: Schema.Types.Mixed, required: true },
    email: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
)

// Method to check password
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}

// Hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next()
  }
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

export default mongoose.model("User", UserSchema)
