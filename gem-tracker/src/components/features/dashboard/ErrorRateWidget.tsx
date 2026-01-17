import { useMemo } from "react"
import { Card } from "@/components/ui/card"
import type { Gem } from "@/lib/types"

interface ErrorRateWidgetProps {
  gems: Gem[]
}

export function ErrorRateWidget({ gems }: ErrorRateWidgetProps) {
  const stats = useMemo(() => {
    const testers: Record<
      string,
      { name: string; total: number; errors: number; testerId: string }
    > = {}
    const completed = gems.filter((g) => g.status === "COMPLETED")

    completed.forEach((g) => {
      const final = g.finalApproval?.finalVariety
      ;[g.test1, g.test2].forEach((test, idx) => {
        if (!test?.testerId) return
        if (!testers[test.testerId])
          testers[test.testerId] = {
            name: `Tester ${idx + 1}`,
            total: 0,
            errors: 0,
            testerId: test.testerId,
          }

        testers[test.testerId].total++
        if (test.selectedVariety !== final) testers[test.testerId].errors++
      })
    })

    return Object.values(testers).map((t) => ({
      ...t,
      rate: t.total === 0 ? 0 : Math.round((t.errors / t.total) * 100),
    }))
  }, [gems])

  return (
    <Card className='p-6'>
      <h3 className='font-semibold text-lg mb-4'>Tester Disagreement Rates</h3>
      <div className='space-y-4'>
        {stats.length === 0 ? (
          <p className='text-slate-500 text-sm'>No completed data yet.</p>
        ) : (
          stats.map((stat, i) => (
            <div key={i} className='space-y-2'>
              <div className='flex justify-between text-sm'>
                <span className='font-medium text-slate-700'>
                  {stat.name} (ID: {stat.testerId})
                </span>
                <span
                  className={`font-bold ${stat.rate > 10 ? "text-red-600" : "text-emerald-600"}`}
                >
                  {stat.rate}% Error
                </span>
              </div>
              <div className='w-full bg-slate-100 rounded-full h-2.5'>
                <div
                  className={`h-2.5 rounded-full ${stat.rate > 10 ? "bg-red-500" : "bg-emerald-500"}`}
                  style={{ width: `${Math.max(stat.rate, 5)}%` }}
                ></div>
              </div>
              <p className='text-xs text-slate-500 text-right'>
                {stat.errors} disagreements / {stat.total} tests
              </p>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}
