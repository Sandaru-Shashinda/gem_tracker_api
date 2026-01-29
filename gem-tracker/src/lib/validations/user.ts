import * as z from "zod"

export const userSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address").or(z.literal("")),
    role: z.enum(["ADMIN", "HELPER", "TESTER"]),
    password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
    age: z.string().optional().or(z.literal("")),
    dob: z.string().optional().or(z.literal("")),
    idNumber: z.string().optional().or(z.literal("")),
    address: z.string().optional().or(z.literal("")),
})

export type UserFormValues = z.infer<typeof userSchema>
