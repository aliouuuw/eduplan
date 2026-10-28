import * as React from "react"

import { cn } from "@/lib/utils"

// An empty list never shows a blank table: it says what is missing and offers the next action.
function EmptyState({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon?: React.ReactNode
  title: string
  children?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div data-slot="empty-state" className={cn("flex flex-col items-center px-6 py-10 text-center", className)}>
      {icon && <span className="mb-4 text-progress [&_svg]:size-7 [&_svg]:stroke-[1.5]">{icon}</span>}
      <p className="font-display text-lg">{title}</p>
      {children && <p className="mt-1.5 max-w-sm text-[14.5px] text-muted-foreground">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export { EmptyState }
