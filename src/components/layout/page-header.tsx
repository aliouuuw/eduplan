import * as React from "react"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

import { cn } from "@/lib/utils"

// Page title block: optional crumb back to the parent, the title in the display voice, a quiet
// subtitle, and actions on the right (one primary at most).
export function PageHeader({
  title,
  subtitle,
  crumb,
  actions,
  className,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  crumb?: { href: string; label: string }
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <header className={cn("flex flex-col gap-2.5", className)}>
      {crumb && (
        <Link
          href={crumb.href}
          className="flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          {crumb.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[38px] leading-tight">{title}</h1>
          {subtitle && <p className="mt-1.5 text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    </header>
  )
}
