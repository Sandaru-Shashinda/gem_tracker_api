import { useState, useEffect } from "react"
import { Users, UserPlus, Trash2 } from "lucide-react"
import { MainLayout } from "@/components/layout/MainLayout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import type { User } from "@/lib/types"

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [newUser, setNewUser] = useState({ name: "", role: "TESTER" as any, avatar: "" })

  const loadUsers = async () => {
    const data = await api.getUsers()
    setUsers(data)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUser.name) return
    const u: User = {
      id: `u${Date.now()}`,
      name: newUser.name,
      role: newUser.role,
      avatar: newUser.name.charAt(0).toUpperCase(),
    }
    await api.createUser(u)
    setNewUser({ name: "", role: "TESTER", avatar: "" })
    loadUsers()
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this user?")) {
      await api.deleteUser(id)
      loadUsers()
    }
  }

  return (
    <MainLayout>
      <div className='space-y-6'>
        <div className='flex justify-between items-center'>
          <h2 className='text-2xl font-bold text-slate-800 flex items-center gap-2'>
            <Users /> User Management
          </h2>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* Add User Form */}
          <Card className='p-6 h-fit'>
            <h3 className='font-semibold mb-4 flex items-center gap-2'>
              <UserPlus size={18} /> New User
            </h3>
            <form onSubmit={handleAddUser} className='space-y-4'>
              <div className='space-y-2'>
                <label className='text-sm font-medium'>Full Name</label>
                <Input
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder='e.g. John Doe'
                  required
                />
              </div>
              <div className='space-y-2'>
                <label className='text-sm font-medium'>System Role</label>
                <select
                  className='w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm'
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                >
                  <option value='TESTER'>TESTER</option>
                  <option value='HELPER'>HELPER</option>
                  <option value='FINAL_APPROVER'>FINAL APPROVER</option>
                  <option value='ADMIN'>ADMIN</option>
                </select>
              </div>
              <Button type='submit' className='w-full'>
                Create Account
              </Button>
            </form>
          </Card>

          {/* User List */}
          <Card className='lg:col-span-2 overflow-hidden'>
            <table className='min-w-full divide-y divide-slate-200 text-sm'>
              <thead className='bg-slate-50'>
                <tr>
                  <th className='px-6 py-3 text-left font-medium text-slate-500 uppercase'>User</th>
                  <th className='px-6 py-3 text-left font-medium text-slate-500 uppercase'>Role</th>
                  <th className='px-6 py-3 text-right font-medium text-slate-500 uppercase'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-slate-200'>
                {users.map((u) => (
                  <tr key={u.id} className='hover:bg-slate-50'>
                    <td className='px-6 py-4 flex items-center gap-3'>
                      <div className='w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs'>
                        {u.avatar}
                      </div>
                      <span className='font-medium'>{u.name}</span>
                    </td>
                    <td className='px-6 py-4'>
                      <span
                        className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                          u.role === "ADMIN"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className='px-6 py-4 text-right'>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => handleDelete(u.id)}
                        className='text-slate-300 hover:text-red-500'
                        disabled={u.id === "u1"} // Protect main admin
                      >
                        <Trash2 size={16} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}
