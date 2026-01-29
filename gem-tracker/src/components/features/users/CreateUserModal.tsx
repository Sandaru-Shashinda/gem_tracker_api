import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { differenceInYears } from "date-fns"
import { UserPlus, Loader2, Eye, EyeOff } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { userSchema, type UserFormValues } from "@/lib/validations/user"

interface CreateUserModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: UserFormValues) => Promise<void>
  isSubmitting: boolean
}

export function CreateUserModal({
  isOpen,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: CreateUserModalProps) {
  const [showPassword, setShowPassword] = useState(false)
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "TESTER",
      age: "",
      dob: new Date(1998, 0, 5).toISOString().split("T")[0],
      idNumber: "",
      address: "",
      password: "",
    },
    mode: "onChange",
  })

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isValid },
    reset,
  } = form

  const dob = watch("dob")

  useEffect(() => {
    if (dob) {
      const age = differenceInYears(new Date(), new Date(dob))
      setValue("age", age.toString())
    } else {
      setValue("age", "")
    }
  }, [dob, setValue])

  const handleFormSubmit = async (data: UserFormValues) => {
    await onSubmit(data)
    reset()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <UserPlus size={18} className='text-blue-600' /> Register System Account
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className='space-y-4 pt-4'>
          <div className='grid grid-cols-1 gap-4'>
            <div className='space-y-1.5'>
              <label className='text-[10px] font-black uppercase text-slate-400'>Full Name</label>
              <Input
                className='bg-slate-50 border-slate-200'
                {...register("name")}
                placeholder='e.g. John Doe'
              />
              {errors.name && (
                <p className='text-[10px] text-red-500 font-bold'>{errors.name.message}</p>
              )}
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-1.5'>
                <label className='text-[10px] font-black uppercase text-slate-400'>Role</label>
                <Controller
                  name='role'
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className='bg-slate-50 border-slate-200 h-10'>
                        <SelectValue placeholder='Select role' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='TESTER'>TESTER</SelectItem>
                        <SelectItem value='HELPER'>HELPER</SelectItem>
                        <SelectItem value='ADMIN'>ADMIN</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <div className='space-y-1.5'>
              <label className='text-[10px] font-black uppercase text-slate-400'>
                Email Address
              </label>
              <Input
                className='bg-slate-50 border-slate-200'
                type='email'
                {...register("email")}
                placeholder='john@grc.lk'
              />
              {errors.email && (
                <p className='text-[10px] text-red-500 font-bold'>{errors.email.message}</p>
              )}
            </div>

            <div className='space-y-1.5'>
              <label className='text-[10px] font-black uppercase text-slate-400'>
                System Password
              </label>
              <div className='relative'>
                <Input
                  className='bg-slate-50 border-slate-200 pr-10'
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  placeholder='••••••••'
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(!showPassword)}
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 outline-none transition-colors'
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className='text-[10px] text-red-500 font-bold'>{errors.password.message}</p>
              )}
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-1.5'>
                <label className='text-[10px] font-black uppercase text-slate-400'>
                  Age (Auto)
                </label>
                <Input
                  className='bg-slate-100 border-slate-200 cursor-not-allowed opacity-70'
                  type='number'
                  {...register("age")}
                  readOnly
                  placeholder='Calculated from DOB'
                />
              </div>
              <div className='space-y-1.5'>
                <label className='text-[10px] font-black uppercase text-slate-400'>DOB</label>
                <Input className='bg-slate-50 border-slate-200' type='date' {...register("dob")} />
              </div>
            </div>

            <div className='space-y-1.5'>
              <label className='text-[10px] font-black uppercase text-slate-400'>ID Number</label>
              <Input
                className='bg-slate-50 border-slate-200'
                {...register("idNumber")}
                placeholder='NIC or Passport'
              />
            </div>

            <div className='space-y-1.5'>
              <label className='text-[10px] font-black uppercase text-slate-400'>Address</label>
              <Input
                className='bg-slate-50 border-slate-200'
                {...register("address")}
                placeholder='Residential Address'
              />
            </div>
          </div>
          <DialogFooter className='pt-4 border-t'>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type='submit'
              className='min-w-[140px] bg-blue-600 hover:bg-blue-700'
              disabled={isSubmitting || !isValid}
            >
              {isSubmitting ? <Loader2 className='animate-spin' size={18} /> : "Create Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
