"use client"
import { useState } from "react"

type StepState = "pending" | "active" | "done" | "error"

interface Step {
  label: string
  state: StepState
  detail?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  output?: any
}

const CheckIcon = () => (
  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
)

const Spinner = () => (
  <span className="w-2.5 h-2.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
)

function StepDot({ state }: { state: StepState }) {
  if (state === "done") {
    return (
      <span className="w-4 h-4 rounded-full bg-[var(--brand)] text-white flex items-center justify-center shadow-[0_0_0_2px_rgba(148,163,184,0.16)]">
        <CheckIcon />
      </span>
    )
  }
  if (state === "active") {
    return (
      <span className="w-4 h-4 rounded-full bg-[var(--brand)] text-white flex items-center justify-center shadow-[0_0_0_2px_rgba(43,110,246,0.12)]">
        <Spinner />
      </span>
    )
  }
  if (state === "error") {
    return (
      <span className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-bold">!</span>
    )
  }
  return null
}

export function StepBar({ steps }: { steps: Step[] }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  return (
    <div className="w-full mb-1">
      <div className="px-1.5 py-1.5 relative">
        {steps.length > 1 && (
          <span className="absolute left-[8px] top-[18px] bottom-[12px] w-px bg-[var(--line-soft)]" />
        )}
        {steps.map((step, i) => {
          const isExpanded = expandedIdx === i
          const canExpand = Boolean(step.output)
          return (
            <div key={i} className="relative pl-6 pb-2 last:pb-0">
              <span className="absolute left-[-5] top-1.5">
                <StepDot state={step.state} />
              </span>

              <button
                onClick={() => canExpand && setExpandedIdx(isExpanded ? null : i)}
                className={`w-full text-left rounded-md px-1 py-0.5 transition-colors ${canExpand ? "cursor-pointer hover:bg-[var(--surface-soft)]" : "cursor-default"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[12px] leading-tight ${
                      step.state === "done"
                        ? "text-slate-500"
                        : step.state === "active"
                          ? "text-[var(--brand)] font-medium"
                          : step.state === "error"
                            ? "text-red-500"
                            : "text-slate-500"
                    }`}
                  >
                    {step.label}
                  </span>
                  {canExpand && (
                    <span className="text-[11px] text-gray-400">{isExpanded ? "收起" : "展开"}</span>
                  )}
                </div>
                {step.state === "active" && step.detail && (
                  <p className="mt-1 text-[10px] text-gray-500 truncate">{step.detail}</p>
                )}
              </button>

              {isExpanded && step.output && (
                <div className="mt-1.5 rounded-md border border-[var(--line-soft)] bg-[var(--surface-soft)] px-2 py-1.5">
                  <pre className="text-[11px] text-gray-600 whitespace-pre-wrap break-all font-mono leading-5 max-h-44 overflow-y-auto hide-scrollbar">
                    {JSON.stringify(step.output, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Legacy exports kept for compatibility but unused now
export function ToolLoading({ toolName, state }: { toolName: string; input?: unknown; state?: string }) {
  void toolName; void state;
  return null
}

export function ToolDone({ toolName, output }: { toolName: string; output?: unknown }) {
  void toolName; void output;
  return null
}
