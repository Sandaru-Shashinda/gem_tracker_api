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
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("password123")
  const [error, setError] = useState<string | null>(null)

  if (user) {
    return <Navigate to='/dashboard' replace />
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading("manual")
    setError(null)
    try {
      const loggedInUser = await api.login(username, password)
      setUser(loggedInUser)
    } catch (err: any) {
      setError(err.message || "Login failed")
    } finally {
      setLoading(null)
    }
  }

  const handleMockLogin = async (mockUser: any) => {
    setLoading(mockUser.id)
    setError(null)
    try {
      // For mock users, we use their role as username for demo
      const userKey = mockUser.role.toLowerCase()
      const loggedInUser = await api.login(userKey, "password123")
      setUser(loggedInUser)
    } catch (err: any) {
      setError(
        "This user doesn't exist in the database yet. Use 'admin' / 'password123' if seeded.",
      )
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
          <p className='text-slate-500 mt-2'>Laboratory Management System</p>
        </div>

        <form onSubmit={handleLogin} className='space-y-4'>
          <div className='space-y-2'>
            <label className='text-xs font-bold text-slate-500 uppercase'>Username</label>
            <input
              type='text'
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className='w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500'
              placeholder='e.g. admin, helper, tester'
            />
          </div>
          <div className='space-y-2'>
            <label className='text-xs font-bold text-slate-500 uppercase'>Password</label>
            <input
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className='w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500'
            />
          </div>
          {error && <p className='text-xs text-red-500 font-medium'>{error}</p>}
          <button
            type='submit'
            disabled={!!loading}
            className='w-full h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all disabled:opacity-50 flex items-center justify-center'
          >
            {loading === "manual" ? <Loader2 className='animate-spin' size={20} /> : "Sign In"}
          </button>
        </form>

        <div className='relative'>
          <div className='absolute inset-0 flex items-center'>
            <div className='w-full border-t border-slate-200'></div>
          </div>
          <div className='relative flex justify-center text-xs uppercase'>
            <span className='bg-white px-2 text-slate-500 font-bold'>Or quick select</span>
          </div>
        </div>

        <div className='space-y-3 max-h-48 overflow-y-auto pr-1'>
          {MOCK_USERS.map((u) => (
            <button
              key={u.id}
              onClick={() => handleMockLogin(u)}
              disabled={!!loading}
              className='w-full flex items-center p-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all group relative bg-white'
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
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
                <p className='text-sm font-bold text-slate-900 group-hover:text-blue-700'>
                  {u.name}
                </p>
                <p className='text-[10px] text-slate-500 font-medium uppercase'>{u.role}</p>
              </div>
              {loading === u.id ? (
                <Loader2 className='animate-spin text-blue-500' size={16} />
              ) : (
                <ArrowRight
                  size={16}
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
