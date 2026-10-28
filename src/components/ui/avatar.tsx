import * as React from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"

// Initials on a flat tint, never a gradient circle. Photo first when there is one.
function Avatar({
  name,
  src,
  size = "md",
  tone = "now",
  className,
}: {
  name: string
  src?: string
  size?: "sm" | "md" | "lg"
  tone?: "now" | "progress" | "neutral"
  className?: string
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
  return (
    <span
      data-slot="avatar"
      title={name}
      className={cn(
        "relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-semibold",
        size === "sm" && "size-8 text-xs",
        size === "md" && "size-10 text-sm",
        size === "lg" && "size-14 text-lg",
        tone === "now" && "bg-now-soft text-now-strong",
        tone === "progress" && "bg-progress-soft text-progress-ink",
        tone === "neutral" && "bg-muted text-ink-2",
        className
      )}
    >
      {/* remote photo hosts (R2, D3) must be listed in next.config images.remotePatterns */}
      {src ? <Image src={src} alt={name} fill sizes="56px" className="object-cover" /> : <span aria-hidden>{initials}</span>}
      {!src && <span className="sr-only">{name}</span>}
    </span>
  )
}

export { Avatar }
