import { AlertTriangle, Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface DeleteUserDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  isDeleting: boolean
}

export function DeleteUserDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  isDeleting,
}: DeleteUserDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100'>
            <AlertTriangle className='h-6 w-6 text-red-600' />
          </div>
          <AlertDialogTitle className='text-center uppercase tracking-wider font-black'>
            Confirm Account Deletion
          </AlertDialogTitle>
          <AlertDialogDescription className='text-center'>
            Are you sure you want to delete this user? This action cannot be undone and will
            permanently remove their access to the laboratory system.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className='sm:justify-center'>
          <AlertDialogCancel className='rounded-xl'>Discard Action</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
            className='bg-red-600 hover:bg-red-700 transition-colors rounded-xl shadow-lg shadow-red-100'
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className='animate-spin' size={18} /> : "Permanently Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
