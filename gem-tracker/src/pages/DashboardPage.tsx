import { useMemo } from "react"
import { MainLayout } from "@/components/layout/MainLayout"
import { StatCard } from "@/components/features/dashboard/StatCard"
import { ErrorRateWidget } from "@/components/features/dashboard/ErrorRateWidget"
import { SpeciesDistributionWidget } from "@/components/features/dashboard/SpeciesDistributionWidget"
import { FileText, Activity, CheckCircle, AlertCircle } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useGem } from "@/hooks/useGemStore"
import { api } from "@/lib/api"
import type { GemStatus } from "@/lib/types"

export function DashboardPage() {
  const { user, gems } = useGem()

  const stats = useMemo(() => {
    return {
      total: gems.length,
      pending: gems.filter((g) => g.status !== "COMPLETED").length,
      completed: gems.filter((g) => g.status === "COMPLETED").length,
      myPending: gems.filter((g) => {
        if (user?.role === "HELPER") return g.status === "INTAKE"
        if (user?.role === "TESTER")
          return g.status === "READY_FOR_T1" || g.status === "READY_FOR_T2"
        if (user?.role === "ADMIN") return g.status === "READY_FOR_APPROVAL"
        return false
      }).length,
    }
  }, [gems, user])

  const getStatusVariant = (status: GemStatus) => {
    switch (status) {
      case "COMPLETED":
        return "default"
      default:
        return "secondary"
    }
  }

  return (
    <MainLayout>
      <div className='space-y-6'>
        <div className='flex justify-between items-center'>
          <h2 className='text-2xl font-bold text-slate-800'>
            Welcome back, {user?.name.split(" ")[0]}
          </h2>
          <span className='text-sm text-slate-500'>{new Date().toLocaleDateString()}</span>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          <StatCard title='Total Gems' value={stats.total} icon={FileText} color='blue' />
          <StatCard title='Pending Workflow' value={stats.pending} icon={Activity} color='amber' />
          <StatCard title='Completed' value={stats.completed} icon={CheckCircle} color='emerald' />
          <StatCard
            title='My Action Items'
            value={stats.myPending}
            icon={AlertCircle}
            color='purple'
          />
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          <div className='lg:col-span-2'>
            <SpeciesDistributionWidget gems={gems} />
          </div>
          <div className='space-y-6'>
            <Card className='p-6'>
              <h3 className='font-semibold text-lg mb-4'>Recent Activity</h3>
              <div className='space-y-4'>
                {gems.slice(0, 5).map((gem) => (
                  <div
                    key={gem._id}
                    className='flex items-center gap-3 py-2 border-b border-slate-100 last:border-0'
                  >
                    <div className='h-10 w-10 shrink-0 rounded bg-slate-100 overflow-hidden border border-slate-200'>
                      {gem.imageUrl ? (
                        <img
                          src={`${api.BASE_URL}${gem.imageUrl}`}
                          alt={gem.gemId}
                          className='h-full w-full object-cover'
                        />
                      ) : (
                        <div className='h-full w-full flex items-center justify-center text-slate-300'>
                          <FileText size={16} />
                        </div>
                      )}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='font-medium text-slate-800 truncate'>{gem.gemId}</p>
                      <p className='text-[10px] text-slate-500'>
                        {new Date(gem.updatedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <Badge variant={getStatusVariant(gem.status)} className='text-[10px] px-1.5'>
                      {gem.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            {user?.role === "ADMIN" && <ErrorRateWidget gems={gems} />}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
