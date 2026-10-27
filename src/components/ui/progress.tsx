import * as React from "react"

import { cn } from "@/lib/utils"

type ProgressProps = React.ComponentProps<"div"> & {
  /** 0 to 100 */
  value: number
  /** Where the pace says we should be, 0 to 100. Drawn as a thin ink marker. */
  expected?: number
  /** progress = lavender (progress, notions, grades). now = coral (the live course). */
  tone?: "progress" | "now"
  /** A tinted glow under the fill, for the one bar that matters on the screen. */
  glow?: boolean
  label: string
}

// A+ progress: a gradient fill on a soft track that settles on load (final state if motion is off).
function Progress({ value, expected, tone = "progress", glow, label, className, ...props }: ProgressProps) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      data-slot="progress"
      className={cn(
        "relative h-2 w-full rounded-full",
        tone === "now" ? "bg-now-soft" : "bg-progress-soft",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "absolute inset-y-0 left-0 animate-fill rounded-full",
          tone === "now" ? "fill-now" : "fill-progress",
          glow && (tone === "now" ? "shadow-glow-now" : "shadow-glow-progress")
        )}
        style={{ width: `${pct}%` }}
      />
      {expected !== undefined && (
        <span
          aria-hidden
          className="absolute -top-1 h-4 w-0.5 -translate-x-1/2 rounded-full bg-ink-2"
          style={{ left: `${Math.max(0, Math.min(100, expected))}%` }}
        />
      )}
    </div>
  )
}

export { Progress }
