import { ReactNode } from "react"
import { Navigate } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { MobileHeader } from "./MobileHeader"
import { useGem } from "@/hooks/useGemStore"

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user } = useGem()

  if (!user) {
    return <Navigate to='/' replace />
  }

  return (
    <div className='min-h-screen bg-slate-50 flex font-sans text-slate-900'>
      <Sidebar />
      <MobileHeader />
      <main className='flex-1 p-4 md:p-8 pt-20 md:pt-8 overflow-y-auto h-screen'>
        <div className='max-w-6xl mx-auto'>{children}</div>
      </main>
    </div>
  )
}
