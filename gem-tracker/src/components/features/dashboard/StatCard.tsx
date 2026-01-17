import type { LucideIcon } from "lucide-react"
import { Card } from "@/components/ui/card"

interface StatCardProps {
  title: string
  value: number
  icon: LucideIcon
  color: "blue" | "amber" | "emerald" | "purple"
}

export function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
    purple: "bg-purple-50 text-purple-600",
  }

  return (
    <Card className='p-6 flex items-center gap-4'>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${colors[color]}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className='text-sm font-medium text-slate-500'>{title}</p>
        <p className='text-2xl font-bold text-slate-900'>{value}</p>
      </div>
    </Card>
  )
}
