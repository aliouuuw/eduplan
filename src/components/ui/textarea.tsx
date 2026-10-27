import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full rounded-lg px-4 py-3.5 text-[15px] leading-relaxed bg-muted shadow-[inset_0_0_0_1px_var(--input)] placeholder:text-muted-foreground transition-[background-color,box-shadow] outline-none focus-visible:bg-card focus-visible:shadow-[inset_0_0_0_1.5px_var(--ring)] aria-invalid:shadow-[inset_0_0_0_1.5px_var(--destructive)] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
