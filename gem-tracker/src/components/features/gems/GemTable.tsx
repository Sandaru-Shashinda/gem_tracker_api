import { useNavigate } from "react-router-dom"
import { Search } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Gem, GemStatus } from "@/lib/types"

interface GemTableProps {
  gems: Gem[]
}

export function GemTable({ gems }: GemTableProps) {
  const navigate = useNavigate()

  const getStatusVariant = (status: GemStatus) => {
    switch (status) {
      case "COMPLETED":
        return "default"
      case "READY_FOR_T1":
      case "READY_FOR_T2":
        return "secondary"
      case "READY_FOR_APPROVAL":
        return "outline"
      default:
        return "secondary"
    }
  }

  return (
    <Card className='overflow-hidden'>
      <table className='min-w-full divide-y divide-slate-200'>
        <thead className='bg-slate-50'>
          <tr>
            <th className='px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider'>
              Gem ID
            </th>
            <th className='px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider'>
              Status
            </th>
            <th className='px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider'>
              Intake Info
            </th>
            <th className='px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider'>
              Date
            </th>
            <th className='px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider'>
              Action
            </th>
          </tr>
        </thead>
        <tbody className='bg-white divide-y divide-slate-200'>
          {gems.map((gem) => (
            <tr key={gem._id} className='hover:bg-slate-50 transition-colors'>
              <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900'>
                {gem.gemId}
              </td>
              <td className='px-6 py-4 whitespace-nowrap'>
                <Badge variant={getStatusVariant(gem.status)}>
                  {gem.status.replace(/_/g, " ")}
                </Badge>
              </td>
              <td className='px-6 py-4 whitespace-nowrap text-sm text-slate-500'>
                {gem.intake?.color} / {gem.intake?.weight}ct
              </td>
              <td className='px-6 py-4 whitespace-nowrap text-sm text-slate-500'>
                {new Date(gem.updatedAt).toLocaleDateString()}
              </td>
              <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                <Button
                  variant='ghost'
                  onClick={() => navigate(`/gems/${gem._id}`)}
                  className='text-blue-600 hover:text-blue-900'
                >
                  View
                </Button>
              </td>
            </tr>
          ))}
          {gems.length === 0 && (
            <tr>
              <td colSpan={5} className='px-6 py-12 text-center text-slate-500'>
                <div className='flex flex-col items-center'>
                  <Search className='w-8 h-8 mb-2 text-slate-300' />
                  <p>No gems found in this queue.</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  )
}
