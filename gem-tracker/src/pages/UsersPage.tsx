import { useState, useEffect } from "react"
import {
  Users,
  UserPlus,
  Trash2,
  AlertTriangle,
  Loader2,
  Edit2,
  MapPin,
  CreditCard,
  Calendar,
  User as UserIcon,
  Mail,
} from "lucide-react"
import { MainLayout } from "@/components/layout/MainLayout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { api } from "@/lib/api"
import type { User, UserRole } from "@/lib/types"

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newUser, setNewUser] = useState<{
    name: string
    username: string
    email: string
    role: UserRole
    age: string
    dob: string
    idNumber: string
    address: string
  }>({
    name: "",
    username: "",
    email: "",
    role: "TESTER",
    age: "",
    dob: "",
    idNumber: "",
    address: "",
  })
  const [userToDelete, setUserToDelete] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadUsers = async () => {
    const data = await api.getUsers()
    setUsers(data)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUser.name || !newUser.username) return
    setIsSubmitting(true)
    try {
      await api.createUser({
        ...newUser,
        age: parseInt(newUser.age) || undefined,
      })
      setNewUser({
        name: "",
        username: "",
        email: "",
        role: "TESTER",
        age: "",
        dob: "",
        idNumber: "",
        address: "",
      })
      await loadUsers()
      setIsCreateModalOpen(false)
    } catch (error) {
      console.error("Failed to add user:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    setIsSubmitting(true)
    try {
      await api.updateUser(editingUser.id, {
        name: editingUser.name,
        role: editingUser.role,
        age: editingUser.age,
        dob: editingUser.dob,
        idNumber: editingUser.idNumber,
        address: editingUser.address,
        email: editingUser.email,
      })
      setEditingUser(null)
      await loadUsers()
    } catch (error) {
      console.error("Failed to update user:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (userToDelete) {
      setIsDeleting(true)
      try {
        await api.deleteUser(userToDelete)
        setUserToDelete(null)
        await loadUsers()
      } catch (error) {
        console.error("Failed to delete user:", error)
      } finally {
        setIsDeleting(false)
      }
    }
  }

  return (
    <MainLayout>
      <div className='space-y-6'>
        <div className='flex justify-between items-center'>
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-200'>
              <Users className='text-white' size={24} />
            </div>
            <div>
              <h2 className='text-2xl font-bold text-slate-800'>User Management</h2>
              <p className='text-xs text-slate-500 font-medium'>
                Manage laboratory personnel credentials and profiles
              </p>
            </div>
          </div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className='bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-100 flex items-center gap-2 h-11 px-6 rounded-xl transition-all active:scale-95'
          >
            <UserPlus size={18} />
            <span className='font-bold'>Create New User</span>
          </Button>
        </div>

        <div className='grid grid-cols-1 gap-6'>
          {/* User List */}
          <Card className='overflow-hidden border-slate-200 shadow-sm'>
            <div className='overflow-x-auto'>
              <table className='min-w-full divide-y divide-slate-100 text-sm'>
                <thead className='bg-slate-50'>
                  <tr>
                    <th className='px-6 py-4 text-left text-[10px] font-black uppercase text-slate-400 tracking-wider'>
                      User Identity
                    </th>
                    <th className='px-6 py-4 text-left text-[10px] font-black uppercase text-slate-400 tracking-wider'>
                      Extended Profile
                    </th>
                    <th className='px-6 py-4 text-left text-[10px] font-black uppercase text-slate-400 tracking-wider'>
                      Role
                    </th>
                    <th className='px-6 py-4 text-right text-[10px] font-black uppercase text-slate-400 tracking-wider'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className='bg-white divide-y divide-slate-50'>
                  {users.map((u) => (
                    <tr key={u.id} className='hover:bg-slate-50/50 transition-colors group'>
                      <td className='px-6 py-4'>
                        <div className='flex items-center gap-4'>
                          <div className='w-10 h-10 rounded-xl bg-linear-to-br from-slate-100 to-slate-200 flex items-center justify-center font-black text-slate-500 shadow-inner'>
                            {u.avatar}
                          </div>
                          <div>
                            <p className='font-bold text-slate-800 leading-tight'>{u.name}</p>
                            <p className='text-[10px] text-slate-400 font-mono'>
                              @{u.username || u.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className='px-6 py-4'>
                        <div className='space-y-1.5'>
                          <div className='flex items-center gap-2 text-[10px] text-slate-500'>
                            <Mail size={12} className='text-slate-300' />
                            <span className='font-medium text-blue-600'>
                              {u.email || "No email"}
                            </span>
                          </div>
                          <div className='flex items-center gap-2 text-[10px] text-slate-500'>
                            <CreditCard size={12} className='text-slate-300' />
                            <span className='font-bold uppercase tracking-tight'>ID:</span>
                            <span className='font-medium'>{u.idNumber || "N/A"}</span>
                          </div>
                          <div className='flex items-center gap-2 text-[10px] text-slate-500'>
                            <Calendar size={12} className='text-slate-300' />
                            <span className='font-bold uppercase tracking-tight'>DOB:</span>
                            <span className='font-medium'>
                              {u.dob ? new Date(u.dob).toLocaleDateString() : "N/A"}{" "}
                              {u.age ? `(${u.age}y)` : ""}
                            </span>
                          </div>
                          <div className='flex items-center gap-2 text-[10px] text-slate-500'>
                            <MapPin size={12} className='text-slate-300' />
                            <span className='font-medium line-clamp-1'>
                              {u.address || "No address provided"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className='px-6 py-4'>
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${
                            u.role === "ADMIN"
                              ? "bg-purple-50 text-purple-600 border border-purple-100"
                              : "bg-blue-50 text-blue-600 border border-blue-100"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className='px-6 py-4 text-right'>
                        <div className='flex items-center justify-end gap-1'>
                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => setEditingUser(u)}
                            className='h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all rounded-lg'
                          >
                            <Edit2 size={14} />
                          </Button>
                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => setUserToDelete(u.id)}
                            className='h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all rounded-lg'
                            disabled={u.id === "u1" || u.role === "ADMIN"} // Protect admins
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={4} className='py-20 text-center text-slate-400'>
                        <UserIcon className='mx-auto h-12 w-12 text-slate-100 mb-4' />
                        <p className='font-medium uppercase text-xs tracking-[0.2em]'>
                          No users registered in system
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* Create User Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <UserPlus size={18} className='text-blue-600' /> Register System Account
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddUser} className='space-y-6 py-4'>
            <div className='grid grid-cols-1 gap-4'>
              <div className='space-y-1.5'>
                <label className='text-[10px] font-black uppercase text-slate-400'>Full Name</label>
                <Input
                  className='bg-slate-50 border-slate-200'
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder='e.g. John Doe'
                  required
                />
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-1.5'>
                  <label className='text-[10px] font-black uppercase text-slate-400'>
                    Username
                  </label>
                  <Input
                    className='bg-slate-50 border-slate-200'
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    placeholder='john_doe'
                    required
                  />
                </div>
                <div className='space-y-1.5'>
                  <label className='text-[10px] font-black uppercase text-slate-400'>Role</label>
                  <select
                    className='w-full px-3 py-2 border border-slate-200 rounded-lg outline-none bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500 transition-all font-sans'
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                  >
                    <option value='TESTER'>TESTER</option>
                    <option value='HELPER'>HELPER</option>
                    <option value='ADMIN'>ADMIN</option>
                  </select>
                </div>
              </div>
              <div className='space-y-1.5'>
                <label className='text-[10px] font-black uppercase text-slate-400'>
                  Email Address
                </label>
                <Input
                  className='bg-slate-50 border-slate-200'
                  type='email'
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder='john@grc.lk'
                />
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-1.5'>
                  <label className='text-[10px] font-black uppercase text-slate-400'>Age</label>
                  <Input
                    className='bg-slate-50 border-slate-200'
                    type='number'
                    value={newUser.age}
                    onChange={(e) => setNewUser({ ...newUser, age: e.target.value })}
                    placeholder='25'
                  />
                </div>
                <div className='space-y-1.5'>
                  <label className='text-[10px] font-black uppercase text-slate-400'>DOB</label>
                  <Input
                    className='bg-slate-50 border-slate-200'
                    type='date'
                    value={newUser.dob}
                    onChange={(e) => setNewUser({ ...newUser, dob: e.target.value })}
                  />
                </div>
              </div>

              <div className='space-y-1.5'>
                <label className='text-[10px] font-black uppercase text-slate-400'>ID Number</label>
                <Input
                  className='bg-slate-50 border-slate-200'
                  value={newUser.idNumber}
                  onChange={(e) => setNewUser({ ...newUser, idNumber: e.target.value })}
                  placeholder='NIC or Passport'
                />
              </div>

              <div className='space-y-1.5'>
                <label className='text-[10px] font-black uppercase text-slate-400'>Address</label>
                <Input
                  className='bg-slate-50 border-slate-200'
                  value={newUser.address}
                  onChange={(e) => setNewUser({ ...newUser, address: e.target.value })}
                  placeholder='Residential Address'
                />
              </div>
            </div>
            <DialogFooter className='pt-4 border-t'>
              <Button type='button' variant='ghost' onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type='submit'
                className='min-w-[140px] bg-blue-600 hover:bg-blue-700'
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className='animate-spin' size={18} /> : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <Edit2 size={18} className='text-blue-500' /> Update Account Details
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateUser} className='space-y-6 py-4'>
            <div className='grid grid-cols-1 gap-6'>
              <div className='space-y-1.5'>
                <label className='text-[10px] font-black uppercase text-slate-400'>Full Name</label>
                <Input
                  value={editingUser?.name || ""}
                  onChange={(e) =>
                    setEditingUser((prev) => (prev ? { ...prev, name: e.target.value } : null))
                  }
                  required
                />
              </div>

              <div className='space-y-1.5'>
                <label className='text-[10px] font-black uppercase text-slate-400'>
                  Email Address
                </label>
                <Input
                  type='email'
                  value={editingUser?.email || ""}
                  onChange={(e) =>
                    setEditingUser((prev) => (prev ? { ...prev, email: e.target.value } : null))
                  }
                />
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-1.5'>
                  <label className='text-[10px] font-black uppercase text-slate-400'>Role</label>
                  <select
                    className='w-full px-3 py-2 border border-slate-200 rounded-lg outline-none bg-white text-sm focus:ring-2 focus:ring-blue-500 font-sans'
                    value={editingUser?.role || "TESTER"}
                    onChange={(e) =>
                      setEditingUser((prev) =>
                        prev ? { ...prev, role: e.target.value as UserRole } : null,
                      )
                    }
                  >
                    <option value='TESTER'>TESTER</option>
                    <option value='HELPER'>HELPER</option>
                    <option value='ADMIN'>ADMIN</option>
                  </select>
                </div>
                <div className='space-y-1.5'>
                  <label className='text-[10px] font-black uppercase text-slate-400'>Age</label>
                  <Input
                    type='number'
                    value={editingUser?.age || ""}
                    onChange={(e) =>
                      setEditingUser((prev) =>
                        prev ? { ...prev, age: parseInt(e.target.value) } : null,
                      )
                    }
                  />
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-1.5'>
                  <label className='text-[10px] font-black uppercase text-slate-400'>DOB</label>
                  <Input
                    type='date'
                    value={
                      editingUser?.dob ? new Date(editingUser.dob).toISOString().split("T")[0] : ""
                    }
                    onChange={(e) =>
                      setEditingUser((prev) => (prev ? { ...prev, dob: e.target.value } : null))
                    }
                  />
                </div>
                <div className='space-y-1.5'>
                  <label className='text-[10px] font-black uppercase text-slate-400'>
                    ID Number
                  </label>
                  <Input
                    value={editingUser?.idNumber || ""}
                    onChange={(e) =>
                      setEditingUser((prev) =>
                        prev ? { ...prev, idNumber: e.target.value } : null,
                      )
                    }
                  />
                </div>
              </div>

              <div className='space-y-1.5'>
                <label className='text-[10px] font-black uppercase text-slate-400'>Address</label>
                <Input
                  value={editingUser?.address || ""}
                  onChange={(e) =>
                    setEditingUser((prev) => (prev ? { ...prev, address: e.target.value } : null))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button type='button' variant='ghost' onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button type='submit' className='min-w-[120px]' disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className='animate-spin' size={18} /> : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
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
              onClick={handleDelete}
              className='bg-red-600 hover:bg-red-700 transition-colors rounded-xl shadow-lg shadow-red-100'
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className='animate-spin' size={18} /> : "Permanently Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  )
}
