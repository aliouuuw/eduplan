import * as React from "react"

import { cn } from "@/lib/utils"

// One line of a list in a sheet: optional leading (check, avatar), title + meta, optional trailing value.
// Rows in a list are separated by hairlines; wrap them in <ListRows>.
function ListRows({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="list-rows" className={cn("[&>*+*]:border-t [&>*+*]:border-border", className)} {...props} />
}

function ListRow({
  leading,
  title,
  meta,
  trailing,
  trailingMeta,
  trailingTone,
  className,
  children,
}: {
  leading?: React.ReactNode
  title: React.ReactNode
  meta?: React.ReactNode
  trailing?: React.ReactNode
  trailingMeta?: React.ReactNode
  trailingTone?: "now" | "progress"
  className?: string
  /** extra content under the row (e.g. previews of student answers) */
  children?: React.ReactNode
}) {
  return (
    <div
      data-slot="list-row"
      className={cn("grid grid-cols-[auto_1fr_auto] items-start gap-x-3.5 py-3.5", !leading && "grid-cols-[1fr_auto]", className)}
    >
      {leading && <div className="mt-0.5">{leading}</div>}
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        {meta && <p className="text-[13.5px] text-muted-foreground">{meta}</p>}
      </div>
      {(trailing || trailingMeta) && (
        <div className="text-right">
          {trailing && <p className="font-medium">{trailing}</p>}
          {trailingMeta && (
            <p
              className={cn(
                "text-[12.5px] text-muted-foreground",
                trailingTone === "now" && "text-now-ink",
                trailingTone === "progress" && "text-progress-ink"
              )}
            >
              {trailingMeta}
            </p>
          )}
        </div>
      )}
      {children && <div className={cn(leading ? "col-start-2" : "col-start-1", "col-end-[-1] mt-2")}>{children}</div>}
    </div>
  )
}

export { ListRows, ListRow }
