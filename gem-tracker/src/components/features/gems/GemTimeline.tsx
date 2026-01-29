import type { Gem } from "@/lib/types"
import { CheckCircle2, Clock, Circle } from "lucide-react"
import { cn } from "@/lib/utils"

interface TimelineStep {
  id: string
  label: string
  status: "completed" | "current" | "pending"
  timestamp?: string | Date
  helperText?: string
}

interface GemTimelineProps {
  gem: Gem
}

export function GemTimeline({ gem }: GemTimelineProps) {
  const steps: TimelineStep[] = [
    {
      id: "INTAKE",
      label: "Intake",
      status: "completed", // Always completed if gem exists
      timestamp: gem.intake?.timestamp,
      helperText: "Gem received",
    },
    {
      id: "READY_FOR_T1",
      label: "Test 1",
      status:
        gem.status === "READY_FOR_T1"
          ? "current"
          : gem.test1?.timestamp ||
              ["READY_FOR_T2", "READY_FOR_APPROVAL", "COMPLETED"].includes(gem.status)
            ? "completed"
            : "pending",
      timestamp: gem.test1?.timestamp,
      helperText: "Basic analysis",
    },
    {
      id: "READY_FOR_T2",
      label: "Test 2",
      status:
        gem.status === "READY_FOR_T2"
          ? "current"
          : gem.test2?.timestamp || ["READY_FOR_APPROVAL", "COMPLETED"].includes(gem.status)
            ? "completed"
            : "pending",
      timestamp: gem.test2?.timestamp,
      helperText: "Second verification",
    },
    {
      id: "READY_FOR_APPROVAL",
      label: "Approval",
      status:
        gem.status === "READY_FOR_APPROVAL"
          ? "current"
          : gem.finalApproval?.timestamp || gem.status === "COMPLETED"
            ? "completed"
            : "pending",
      timestamp: gem.finalApproval?.timestamp,
      helperText: "Final review",
    },
    {
      id: "COMPLETED",
      label: "Completed",
      status: gem.status === "COMPLETED" ? "completed" : "pending",
      timestamp: gem.status === "COMPLETED" ? gem.updatedAt : undefined,
      helperText: "Report ready",
    },
  ]

  return (
    <div className='w-full py-8 px-4'>
      <div className='relative flex items-center justify-between gap-8'>
        {/* Progress Bar Background */}
        <div className='absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-slate-100' />

        {/* Active Progress Bar */}
        <div
          className='absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-blue-500 transition-all duration-500'
          style={{
            width: `${(steps.filter((s) => s.status === "completed").length - 1) * 25}%`,
          }}
        />

        {steps.map((step, index) => {
          const isCompleted = step.status === "completed"
          const isCurrent = step.status === "current"

          return (
            <div key={step.id} className='relative flex flex-col items-center flex-1 group'>
              {/* Text Above/Below logic (alternating) */}
              <div
                className={cn(
                  "absolute -top-10 text-center transition-all duration-500",
                  index % 2 !== 0 ? "opacity-0" : "opacity-100",
                )}
              >
                <p
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wider",
                    isCompleted ? "text-green-600" : isCurrent ? "text-blue-500" : "text-slate-400",
                  )}
                >
                  {step.label}
                </p>
                {step.timestamp && (
                  <p className='text-[8px] text-slate-500'>
                    {new Date(step.timestamp).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Node */}
              <div
                className={cn(
                  "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-500",
                  isCompleted
                    ? "border-green-500 bg-white"
                    : isCurrent
                      ? "border-blue-500 bg-blue-50 animate-pulse"
                      : "border-slate-200 bg-slate-50",
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className='h-5 w-5 text-green-500' />
                ) : isCurrent ? (
                  <Clock className='h-5 w-5 text-blue-500' />
                ) : (
                  <Circle className='h-3 w-3 text-slate-300' />
                )}
              </div>

              {/* Text Below/Above logic (alternating) */}
              <div
                className={cn(
                  "absolute -bottom-10 text-center transition-all duration-500",
                  index % 2 === 0 ? "opacity-0" : "opacity-100",
                )}
              >
                <p
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wider",
                    isCompleted ? "text-blue-600" : isCurrent ? "text-blue-500" : "text-slate-400",
                  )}
                >
                  {step.label}
                </p>
                {step.timestamp && (
                  <p className='text-[8px] text-slate-500'>
                    {new Date(step.timestamp).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Helper Text (Subtitles) */}
              <div className='absolute -bottom-16 w-32 text-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300'>
                <p className='text-[9px] text-slate-400 italic leading-tight'>{step.helperText}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
