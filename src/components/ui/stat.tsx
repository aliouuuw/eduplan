import * as React from "react"

import { cn } from "@/lib/utils"

type Tone = "progress" | "now"

// A big number with its unit and a one-line caption (A+ home: "9 sur 15", "53 copies").
function Stat({
  label,
  value,
  unit,
  caption,
  className,
  children,
}: {
  label: string
  value: React.ReactNode
  unit?: string
  caption?: React.ReactNode
  className?: string
  /** a Meter, usually */
  children?: React.ReactNode
}) {
  return (
    <div data-slot="stat" className={cn("flex flex-col", className)}>
      <span className="text-[15px] text-ink-2">{label}</span>
      <span className="mt-3.5 flex items-baseline gap-2">
        <span className="font-display text-[52px] leading-none">{value}</span>
        {unit && <span className="text-muted-foreground">{unit}</span>}
      </span>
      {children && <div className="mt-4">{children}</div>}
      {caption && <span className="mt-2.5 text-sm text-muted-foreground">{caption}</span>}
    </div>
  )
}

/** Dots meter: one dot per item, filled ones settle in one after another. */
function MeterDots({ total, done, tone = "progress", label }: { total: number; done: number; tone?: Tone; label: string }) {
  return (
    <div role="img" aria-label={label} className="flex gap-[5px]">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-2 flex-1 rounded-full",
            i < done
              ? cn(tone === "now" ? "fill-now" : "fill-progress", "animate-fill [animation-fill-mode:backwards]")
              : tone === "now"
                ? "bg-now-soft"
                : "bg-progress-soft",
            i === done - 1 && (tone === "now" ? "shadow-glow-now" : "shadow-glow-progress")
          )}
          style={i < done ? { animationDelay: `${i * 45}ms` } : undefined}
        />
      ))}
    </div>
  )
}

/** Split meter: parts side by side, sized by value (e.g. 22 devoirs maison · 31 contrôles papier). */
function MeterSplit({ parts, label }: { parts: { value: number; tone: Tone | "soft-now" | "soft-progress" }[]; label: string }) {
  return (
    <div role="img" aria-label={label} className="flex gap-1">
      {/* An empty part would still take a gap slot and push the bar off the edge. */}
      {parts.filter((p) => p.value > 0).map((p, i) => (
        <span
          key={i}
          style={{ flexGrow: p.value }}
          className={cn(
            "h-2 basis-0 rounded-full",
            p.tone === "progress" && "fill-progress animate-fill",
            p.tone === "now" && "fill-now animate-fill",
            p.tone === "soft-now" && "bg-now-soft",
            p.tone === "soft-progress" && "bg-progress-edge"
          )}
        />
      ))}
    </div>
  )
}

export { Stat, MeterDots, MeterSplit }
