import { Link, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  ClipboardCheck,
  Plus,
  Activity,
  LogOut,
  Microscope,
  Users,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGem } from "@/hooks/useGemStore"

interface NavButtonProps {
  icon: LucideIcon
  label: string
  to: string
}

function NavButton({ icon: Icon, label, to }: NavButtonProps) {
  const location = useLocation()
  const active = location.pathname === to

  return (
    <Link to={to}>
      <button
        className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          active
            ? "bg-blue-600 text-white shadow-sm"
            : "text-slate-400 hover:text-white hover:bg-slate-800"
        }`}
      >
        <Icon size={18} className='mr-3' />
        {label}
      </button>
    </Link>
  )
}

export function Sidebar() {
  const { user, setUser } = useGem()

  if (!user) return null

  return (
    <aside className='hidden md:flex flex-col w-64 bg-slate-900 text-white'>
      <div className='p-6 border-b border-slate-800 flex items-center gap-2'>
        <div className='w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center'>
          <Microscope size={20} className='text-white' />
        </div>
        <span className='font-bold text-lg tracking-tight'>GemChecker</span>
      </div>

      <nav className='flex-1 p-4 space-y-1'>
        <NavButton icon={LayoutDashboard} label='Dashboard' to='/dashboard' />
        <NavButton icon={ClipboardCheck} label='My Queue' to='/queue' />
        {user.role === "HELPER" && <NavButton icon={Plus} label='Intake Gem' to='/intake' />}
        {user.role === "ADMIN" && (
          <>
            <NavButton icon={Activity} label='Tester Stats' to='/stats' />
            <NavButton icon={Users} label='Users' to='/users' />
          </>
        )}
      </nav>

      <div className='p-4 border-t border-slate-800'>
        <div className='flex items-center gap-3 mb-4'>
          <div className='w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold'>
            {user.avatar}
          </div>
          <div className='overflow-hidden'>
            <p className='text-sm font-medium truncate'>{user.name}</p>
            <p className='text-xs text-slate-400 truncate'>{user.role.replace("_", " ")}</p>
          </div>
        </div>
        <Button
          variant='secondary'
          className='w-full justify-start text-xs border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
          onClick={() => setUser(null)}
        >
          <LogOut size={14} className='mr-2' /> Sign Out
        </Button>
      </div>
    </aside>
  )
}
