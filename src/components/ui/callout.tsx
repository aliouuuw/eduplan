import * as React from "react"

import { cn } from "@/lib/utils"

// A tinted strip that asks for attention or offers a suggestion, with at most one action.
// attention = coral wash (unjustified absences, late work). info = lavender (a suggestion).
function Callout({
  tone = "attention",
  title,
  children,
  action,
  className,
}: {
  tone?: "attention" | "info"
  title: React.ReactNode
  children?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      data-slot="callout"
      role={tone === "attention" ? "status" : undefined}
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg px-[18px] py-3.5",
        tone === "attention" ? "wash-attention" : "bg-progress-faint",
        className
      )}
    >
      <div className="min-w-[12rem] flex-1">
        <p className="font-medium">{title}</p>
        {children && (
          <p className={cn("text-[13.5px]", tone === "attention" ? "text-now-ink" : "text-ink-2")}>{children}</p>
        )}
      </div>
      {action && (
        <div
          className={cn(
            "shrink-0 text-sm font-medium [&_a]:transition-colors",
            tone === "attention" ? "text-now-ink [&_a:hover]:text-foreground" : "text-progress-ink"
          )}
        >
          {action}
        </div>
      )}
    </div>
  )
}

export { Callout }
