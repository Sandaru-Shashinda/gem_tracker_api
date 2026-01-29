import { useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { differenceInYears } from "date-fns"
import { Edit2, Loader2 } from "lucide-react"
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
import type { User } from "@/lib/types"

interface EditUserModalProps {
  user: User | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: UserFormValues) => Promise<void>
  isSubmitting: boolean
}

export function EditUserModal({
  user,
  isOpen,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: EditUserModalProps) {
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
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
    }
  }, [dob, setValue])

  useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        email: user.email || "",
        role: user.role,
        age: user.age?.toString() || "",
        dob: user.dob ? new Date(user.dob).toISOString().split("T")[0] : "",
        idNumber: user.idNumber || "",
        address: user.address || "",
      })
    }
  }, [user, reset])

  const handleFormSubmit = async (data: UserFormValues) => {
    console.log("Submitting User Data:", data)
    await onSubmit(data)
  }

  const onInvalid = (errors: any) => {
    console.error("Form Validation Errors:", errors)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Edit2 size={18} className='text-blue-500' /> Update Account Details
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit, onInvalid)} className='space-y-6 pt-4'>
          <div className='grid grid-cols-1 gap-6'>
            <div className='space-y-1.5'>
              <label className='text-[10px] font-black uppercase text-slate-400'>Full Name</label>
              <Input {...register("name")} required />
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className='h-10 border-slate-200 bg-white'>
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
              <Input type='email' {...register("email")} />
              {errors.email && (
                <p className='text-[10px] text-red-500 font-bold'>{errors.email.message}</p>
              )}
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-1.5'>
                <label className='text-[10px] font-black uppercase text-slate-400'>
                  Age (Auto)
                </label>
                <Input
                  className='bg-slate-50 border-slate-200 cursor-not-allowed opacity-70'
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
              <Input {...register("idNumber")} />
            </div>

            <div className='space-y-1.5'>
              <label className='text-[10px] font-black uppercase text-slate-400'>Address</label>
              <Input {...register("address")} />
            </div>
          </div>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type='submit' className='min-w-[120px]' disabled={isSubmitting || !isValid}>
              {isSubmitting ? <Loader2 className='animate-spin' size={18} /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
