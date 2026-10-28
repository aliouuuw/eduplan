"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

// Toasts sit on a white sheet with the popover shadow. Errors use the attention ink, never red.
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "!rounded-lg !bg-card !text-foreground !shadow-pop !border-0 !font-sans !text-[14.5px] !gap-3 !px-[18px] !py-3.5",
          description: "!text-muted-foreground !text-[13.5px]",
          actionButton: "!rounded-full !bg-primary !text-primary-foreground !font-medium",
          cancelButton: "!rounded-full !bg-progress-faint !text-foreground",
          success: "[&_[data-icon]]:!text-progress-ink",
          error: "[&_[data-icon]]:!text-now-ink [&_[data-title]]:!text-now-ink",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
