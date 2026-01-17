import { MainLayout } from "@/components/layout/MainLayout"
import { ErrorRateWidget } from "@/components/features/dashboard/ErrorRateWidget"
import { useGem } from "@/hooks/useGemStore"

export function StatsPage() {
  const { gems } = useGem()

  return (
    <MainLayout>
      <div className='space-y-6'>
        <h2 className='text-2xl font-bold text-slate-800'>Tester Performance Analytics</h2>
        <ErrorRateWidget gems={gems} />
      </div>
    </MainLayout>
  )
}
