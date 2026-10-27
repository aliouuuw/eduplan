import * as React from "react"

import { cn } from "@/lib/utils"

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "inline-flex h-6 min-w-6 items-center justify-center rounded-[7px] bg-progress-faint px-1.5 font-sans text-[12.5px] font-medium text-ink-2 shadow-[inset_0_0_0_1px_var(--border),0_1px_0_var(--border)]",
        className
      )}
      {...props}
    />
  )
}

export { Kbd }
