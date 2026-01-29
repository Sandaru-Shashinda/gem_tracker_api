import { useState, useEffect } from "react"
import { Users, UserPlus } from "lucide-react"
import { MainLayout } from "@/components/layout/MainLayout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import type { User } from "@/lib/types"
import { UserTable } from "@/components/features/users/UserTable"
import { CreateUserModal } from "@/components/features/users/CreateUserModal"
import { EditUserModal } from "@/components/features/users/EditUserModal"
import { DeleteUserDialog } from "@/components/features/users/DeleteUserDialog"
import type { UserFormValues } from "@/lib/validations/user"

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadUsers = async () => {
    try {
      const data = await api.getUsers()
      setUsers(data)
    } catch (error) {
      console.error("Failed to load users:", error)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleAddUser = async (values: UserFormValues) => {
    setIsSubmitting(true)
    try {
      const data = {
        ...values,
        age: values.age ? parseInt(values.age) : undefined,
      }
      await api.createUser(data)
      await loadUsers()
      setIsCreateModalOpen(false)
    } catch (error) {
      console.error("Failed to add user:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateUser = async (values: UserFormValues) => {
    if (!editingUser) return
    setIsSubmitting(true)
    try {
      const data = {
        ...values,
        age: values.age ? parseInt(values.age) : undefined,
      }
      await api.updateUser(editingUser.id, data)
      setEditingUser(null)
      await loadUsers()
    } catch (error) {
      console.error("Failed to update user:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!userToDelete) return
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

        <UserTable
          data={users}
          onEdit={setEditingUser}
          onDelete={setUserToDelete}
          pagination={pagination}
          onPaginationChange={setPagination}
        />
      </div>

      <CreateUserModal
        isOpen={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSubmit={handleAddUser}
        isSubmitting={isSubmitting}
      />

      <EditUserModal
        user={editingUser}
        isOpen={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
        onSubmit={handleUpdateUser}
        isSubmitting={isSubmitting}
      />

      <DeleteUserDialog
        isOpen={!!userToDelete}
        onOpenChange={(open) => !open && setUserToDelete(null)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </MainLayout>
  )
}
