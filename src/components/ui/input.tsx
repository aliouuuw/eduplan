import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-full px-4 text-[15px] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground bg-muted shadow-[inset_0_0_0_1px_var(--input)] placeholder:text-muted-foreground transition-[background-color,box-shadow] outline-none focus-visible:bg-card focus-visible:shadow-[inset_0_0_0_1.5px_var(--ring)] aria-invalid:shadow-[inset_0_0_0_1.5px_var(--destructive)] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
