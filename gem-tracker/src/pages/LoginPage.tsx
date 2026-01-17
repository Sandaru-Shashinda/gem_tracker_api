import { useState } from "react"
import { Navigate } from "react-router-dom"
import { Microscope, ArrowRight, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useGem } from "@/hooks/useGemStore"
import { MOCK_USERS } from "@/lib/constants"
import { api } from "@/lib/api"

export function LoginPage() {
  const { user, setUser } = useGem()
  const [loading, setLoading] = useState<string | null>(null)

  if (user) {
    return <Navigate to='/dashboard' replace />
  }

  const handleMockLogin = async (mockUser: any) => {
    setLoading(mockUser.id)
    try {
      // Mock login implementation in api.ts will handle this
      const loggedInUser = await api.login(mockUser.name)
      setUser(loggedInUser)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className='min-h-screen bg-slate-100 flex items-center justify-center p-4'>
      <Card className='w-full max-w-md p-8 space-y-8'>
        <div className='text-center'>
          <div className='w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-200'>
            <Microscope className='text-white' size={32} />
          </div>
          <h1 className='text-3xl font-bold text-slate-900'>Gem Tracker</h1>
          <p className='text-slate-500 mt-2'>Select a laboratory role to enter (Mock Login)</p>
        </div>

        <div className='space-y-3'>
          {MOCK_USERS.map((u) => (
            <button
              key={u.id}
              onClick={() => handleMockLogin(u)}
              disabled={!!loading}
              className='w-full flex items-center p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all group relative overflow-hidden bg-white'
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold mr-4 ${
                  u.role === "ADMIN"
                    ? "bg-purple-100 text-purple-700"
                    : u.role === "HELPER"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-blue-100 text-blue-700"
                }`}
              >
                {u.avatar}
              </div>
              <div className='text-left flex-1'>
                <p className='font-bold text-slate-900 group-hover:text-blue-700'>{u.name}</p>
                <p className='text-xs text-slate-500 font-medium'>{u.role}</p>
              </div>
              {loading === u.id ? (
                <Loader2 className='animate-spin text-blue-500' size={20} />
              ) : (
                <ArrowRight
                  size={18}
                  className='text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all'
                />
              )}
            </button>
          ))}
        </div>

        <div className='pt-6 border-t border-slate-100'>
          <p className='text-center text-xs text-slate-400 font-medium italic'>
            "Scientific Integrity in Precious Stones"
          </p>
        </div>
      </Card>
    </div>
  )
}
