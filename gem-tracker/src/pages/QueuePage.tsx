import { useMemo } from "react"
import { MainLayout } from "@/components/layout/MainLayout"
import { GemTable } from "@/components/features/gems/GemTable"
import { useGem } from "@/hooks/useGemStore"

export function QueuePage() {
  const { user, gems } = useGem()

  const queue = useMemo(() => {
    if (user?.role === "ADMIN") return gems
    if (user?.role === "TESTER")
      return gems.filter((g) => g.status === "READY_FOR_T1" || g.status === "READY_FOR_T2")
    if (user?.role === "HELPER") return gems
    return []
  }, [gems, user])

  return (
    <MainLayout>
      <div className='space-y-6'>
        <div className='flex justify-between items-center'>
          <h2 className='text-2xl font-bold text-slate-800'>
            {user?.role === "ADMIN" ? "System Gems" : "My Queue"}
          </h2>
          <span className='bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded'>
            {queue.length} Items
          </span>
        </div>

        <GemTable gems={queue} />
      </div>
    </MainLayout>
  )
}
