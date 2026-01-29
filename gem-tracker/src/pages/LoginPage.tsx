import { useState } from "react"
import { Navigate } from "react-router-dom"
import { Microscope, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useGem } from "@/hooks/useGemStore"
import { api } from "@/lib/api"

export function LoginPage() {
  const { user, setUser } = useGem()
  const [loading, setLoading] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  if (user) return <Navigate to='/dashboard' replace />

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading("manual")
    setError(null)
    try {
      const loggedInUser = await api.login(email, password)
      setUser(loggedInUser)
    } catch (err: any) {
      setError(err.message || "Login failed")
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
            <label className='text-xs font-bold text-slate-500 uppercase'>Email</label>
            <input
              type='text'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

        <div className='pt-6 border-t border-slate-100'>
          <p className='text-center text-xs text-slate-400 font-medium italic'>
            "Scientific Integrity in Precious Stones"
          </p>
        </div>
      </Card>
    </div>
  )
}
