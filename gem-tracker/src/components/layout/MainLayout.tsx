import type { ReactNode } from "react"
import { Navigate } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { Sidebar } from "./Sidebar"
import { MobileHeader } from "./MobileHeader"
import { useGem } from "@/hooks/useGemStore"

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user, loading, refreshing } = useGem()

  if (!user) {
    return <Navigate to='/' replace />
  }

  return (
    <div className='min-h-screen bg-slate-50 flex font-sans text-slate-900'>
      <Sidebar />
      <MobileHeader />
      <main className='flex-1 p-4 md:p-8 pt-20 md:pt-8 overflow-y-auto h-screen relative'>
        {loading && (
          <div className='absolute inset-0 z-50 flex items-center justify-center bg-slate-50/50 backdrop-blur-[1px]'>
            <div className='flex flex-col items-center gap-2'>
              <div className='h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200 animate-bounce'>
                <div className='h-6 w-6 border-b-2 border-white rounded-full animate-spin' />
              </div>
              <p className='text-xs font-bold text-blue-600 uppercase tracking-widest'>
                Loading Laboratory Data...
              </p>
            </div>
          </div>
        )}
        <div className='max-w-6xl mx-auto'>{children}</div>

        {refreshing && !loading && (
          <div className='fixed bottom-4 left-4 z-50 bg-white/80 backdrop-blur-md border border-slate-200 rounded-full px-3 py-1.5 shadow-sm flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2'>
            <Loader2 className='animate-spin text-blue-500' size={14} />
            <span className='text-[10px] font-bold text-slate-500 uppercase tracking-wider'>
              Synchronizing...
            </span>
          </div>
        )}
      </main>
    </div>
  )
}
